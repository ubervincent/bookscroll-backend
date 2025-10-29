import { Injectable, Logger } from '@nestjs/common';
import { EPub } from 'epub2';
import path from 'path';
import fs from 'fs';
import * as cheerio from 'cheerio';
import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod.mjs';
import { z } from 'zod';
import pLimit from 'p-limit';

const MAX_CONCURRENT_REQUESTS = 15;

const SENTENCE_LENGTH_THRESHOLD = 5;
const JOIN_SENTENCES_THRESHOLD = 20;

const SNIPPET_MAX_LENGTH = 20;
const SNIPPET_MIN_LENGTH = 5;

const SYSTEM_INSTRUCTIONS = `
You are a social media expert that extracts and paraphrases social media worthy, coherent, inspirational shareable, highly quotable snippets that stand on its own for scrolling purposes.

Don't include any text that doesn't make sense without its context, doesn't make sense on its own or can't be quoted and shared. 

Don't include any text that is not relevant to the book.

Every sentence is tagged with its index. Return the start and end sentence from which the snippet is taken.

The snippets should be no more than ${SNIPPET_MAX_LENGTH} words.

The snippets should be no less than ${SNIPPET_MIN_LENGTH} words.

You have the freedom to return absolutely nothing if no snippets are found.

`;

const SnippetsSchema = 
z.object({
  snippets: z.array(
  z.object({
      startSentence: z.number(),
      endSentence: z.number(),
      snippetText: z.string(),
      reason: z.string(),
      originalText: z.string(),
    })
  ),
});

export interface ProcessedSentence {
  [index: number]: string;
}

export interface Book {
  title: string;
  author: string;
  sentences: ProcessedSentence;
  snippets: Snippet[];
}

export interface Snippet {
  startSentence: number;
  endSentence: number;
}

const logger = new Logger('BookService');

@Injectable()
export class BookService {
  async upload(file: Express.Multer.File) {
    const filePath = this.saveBook(file);
    let book = await this.parseEpub(filePath);
    book.snippets = await this.getSnippetFromBook(book);

    return {
      message: `Book ${book.title} uploaded successfully`,
      snippets: book.snippets,
    };
    
  }

  private saveBook(book: Express.Multer.File) {
    const epubsDir = path.join(process.cwd(), 'epubs');
    if (!fs.existsSync(epubsDir)) {
      fs.mkdirSync(epubsDir, { recursive: true });
    }

    const newFilePath = path.join(epubsDir, book.originalname);
    fs.writeFileSync(newFilePath, book.buffer);

    return newFilePath;
  }

  private async callOpenAI(paragraph: string) {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.log(`Calling OpenAI...`);

    const response = await client.responses.parse({
      model: "gpt-5-nano-2025-08-07",
      reasoning: { effort: "minimal" },
      input: [
        {
          role: "system",
          content: SYSTEM_INSTRUCTIONS
        },
        {
          role: "user",
          content: paragraph,
        }
      ],
      text: {
        format: zodTextFormat(SnippetsSchema, "snippets"),
      }
    });

    logger.log(`OpenAI response: ${response.output_parsed}`);

    return response.output_parsed as { snippets: Snippet[] };
  }

  private async getSnippetFromBook(book: Book) {

    const sentences = Object.entries(book.sentences);
    const taggedSentences = sentences.map(([index, sentence]) => `<${index}>${sentence}</${index}>`);

    const paragraphs: string[] = [];
    for (let i = 0; i < taggedSentences.length; i += JOIN_SENTENCES_THRESHOLD) {
      const paragraph = taggedSentences.slice(i, i + JOIN_SENTENCES_THRESHOLD);
      paragraphs.push(paragraph.join(' '));
    }
    
    const test = paragraphs.slice(0, 4);

    let snippets: Snippet[] = [];
    const limit = pLimit(MAX_CONCURRENT_REQUESTS);

    await Promise.all(test.map(paragraph => limit(async () => {
      const result = await this.callOpenAI(paragraph);
      snippets = [...snippets, ...result.snippets];
    })));

    snippets = snippets.map(snippet => ({
      ...snippet,
      sentenceText: this.getSnippetTextFromIndices(book, snippet.startSentence, snippet.endSentence),
    }));

    return snippets;
  }

  private getSnippetTextFromIndices(book: Book, startIndex: number, endIndex: number) {
    let text = '';
    
    if (startIndex === endIndex) {
      text = book.sentences[startIndex];
      return text
    } else {
      const numSentences = endIndex - startIndex;
      for (let i = 0; i < numSentences; i++) {
        text += book.sentences[startIndex + i];
      }
    }
    return text;
  }

  private getChapterRawAsync(epub, id: string) {
    return new Promise((resolve, reject) => {
      epub.getChapterRaw(id, (error, text) => {
        if (error) reject(error);
        resolve(text);
      });
    });
  }

  private async getProcessedSentences(chapter: string, epub: EPub, startIndex: number) {

    let processedSentences: ProcessedSentence = {};

    const tags = ['p', 'li', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    const text = await this.getChapterRawAsync(epub, chapter);
    const $ = cheerio.load(text as string);
    const sentences = $(tags.join(',')).toArray().map(el => $(el).text());

    for (const [index, sentence] of sentences.entries()) {
      const normalisedSentence = this.normaliseSentence(sentence);
      if (normalisedSentence.split(' ').length > SENTENCE_LENGTH_THRESHOLD) {
        processedSentences[startIndex + index + 1] = normalisedSentence;
      }
    }

    return processedSentences;
  }

  private async parseEpub(filePath: string) {
    let epub = await EPub.createAsync(filePath);

    const book: Book = {
      title: epub.metadata.title,
      author: epub.metadata.author,
      sentences: {},
      snippets: [],
    }

    let globalSentenceIndex = 0;

    for (const chapter of epub.flow) {
      const chapterSentences = await this.getProcessedSentences(chapter.id, epub, globalSentenceIndex);
      book.sentences = { ...book.sentences, ...chapterSentences };
      globalSentenceIndex += Object.keys(chapterSentences).length;
    }

    return book;
  }

  private normaliseSentence(sentence: string) {
    return sentence.replace(/[\t\n]/g, '');
  }
}
