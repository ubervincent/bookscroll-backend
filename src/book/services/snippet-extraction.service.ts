import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import pLimit from 'p-limit';
import { Book } from './book.service';

export interface Snippet {
  startSentence: number;
  endSentence: number;
  snippetText: string;
  reason: string;
  themes: string[];
  sentenceText: string;
}

const SnippetsSchema = 
z.object({
  snippets: z.array(
  z.object({
      startSentence: z.number(),
      endSentence: z.number(),
      snippetText: z.string(),
      reason: z.string(),
      themes: z.array(z.string()),
    })
  ),
});

export interface SnippetResponse {
    startSentence: number;
    endSentence: number;
    snippetText: string;
    reason: string;
    themes: string[];
  }

const SNIPPET_MAX_LENGTH = 20;
const SNIPPET_MIN_LENGTH = 5;


const MAX_CONCURRENT_REQUESTS = 15;

const JOIN_SENTENCES_THRESHOLD = 25;

const SYSTEM_INSTRUCTIONS = `
You are a social media expert that extracts and paraphrases social media worthy, coherent, inspirational shareable, highly quotable snippets that stand on its own for scrolling purposes.

Don't include any text that doesn't make sense without its context, doesn't make sense on its own or can't be quoted and shared. 

Sometimes you're given a paragraph that is not relevant to the book, like copyright text. In this case, don't choose any sentences from it.

Extract the themes of the book and return them in the themes array. The themes should be broad and general and in lower case.

Every sentence is tagged with its index. Return the start and end sentence from which the snippet is taken.

The snippets should be no more than ${SNIPPET_MAX_LENGTH} words.

The snippets should be no less than ${SNIPPET_MIN_LENGTH} words.

You have the freedom to return absolutely nothing if no snippets are found.
`;

const logger = new Logger('SnippetExtractionService');

@Injectable()
export class SnippetExtractionService {

  async getSnippetFromBook(book: Book) {

    const sentences = Object.entries(book.sentences);
    const taggedSentences = sentences.map(([index, sentence]) => `<${index}>${sentence}</${index}>`);

    const paragraphs: string[] = [];
    for (let i = 0; i < taggedSentences.length; i += JOIN_SENTENCES_THRESHOLD) {
      const paragraph = taggedSentences.slice(i, i + JOIN_SENTENCES_THRESHOLD);
      paragraphs.push(paragraph.join(' '));
    }
    
    const test = paragraphs.slice(0, 1);

    let snippets: Snippet[] = [];
    const limit = pLimit(MAX_CONCURRENT_REQUESTS);

    await Promise.all(test.map(paragraph => limit(async () => {
      const result = await this.callOpenAI(paragraph);
      snippets = [...snippets, ...result.snippets.map(snippet => ({
        ...snippet,
        sentenceText: this.getSnippetTextFromIndices(book, snippet.startSentence, snippet.endSentence),
      }))];
    })));

    return snippets;
  }

  private getSnippetTextFromIndices(book: Book, startIndex: number, endIndex: number) {
    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    const parts: string[] = [];
    for (let i = from; i <= to; i++) {
      const s = book.sentences[i];
      if (s) {
        parts.push(s);
      }
    }
    return parts.join(' ').trim();
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
    
        return response.output_parsed as { snippets: SnippetResponse[] };
      }
}