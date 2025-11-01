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

const SNIPPET_MAX_LENGTH = 25;
const SNIPPET_MIN_LENGTH = 6;


const MAX_CONCURRENT_REQUESTS = 15;

const JOIN_SENTENCES_THRESHOLD = 30;

const SYSTEM_INSTRUCTIONS = `
You are a social media expert that extracts and paraphrases social media worthy,
 
coherent, inspirational, shareable, highly quotable snippets about key ideas 

and concepts in the book that makes sense on its own for scrolling purposes.

Don't include any text that doesn't make sense without its context, doesn't make sense on its own or can't be quoted and shared. 

If there is no good reason to extract a snippet, return an empty array.

Sometimes you're given a paragraph that is not relevant to the book, like copyright text or chapter titles or citations. In these cases, don't choose any sentences from it.

Extract the themes of the snippet and return them in the themes array. The themes should be broad and general and in lower case.

Every sentence is tagged with its index. Return the start and end sentence from which the snippet is taken.

The snippets should be no more than ${SNIPPET_MAX_LENGTH} words.

The snippets should be no less than ${SNIPPET_MIN_LENGTH} words.

`;

const logger = new Logger('SnippetExtractionService');

@Injectable()
export class SnippetExtractionService {

  async getSnippetFromBook(book: Book, progressPercentageMap: Map<number, number>, bookId: number) {

    const sentences = Object.entries(book.sentences);
    const taggedSentences = sentences.map(([index, sentence]) => `<${index}>${sentence}</${index}>`);

    const paragraphs: string[] = [];
    for (let i = 0; i < taggedSentences.length; i += JOIN_SENTENCES_THRESHOLD) {
      const paragraph = taggedSentences.slice(i, i + JOIN_SENTENCES_THRESHOLD);
      paragraphs.push(paragraph.join(' '));
    }

    logger.log(`Total paragraphs: ${paragraphs.length}`);

    let snippets: Snippet[] = [];
    const limit = pLimit(MAX_CONCURRENT_REQUESTS);

    let completeCount = 0;

    await Promise.all(
      paragraphs.map((paragraph, index) =>
        limit(async () => {
          logger.log(`Calling OpenAI for paragraph ${index}/${paragraphs.length}`);

          const result = await this.callOpenAI(paragraph, index);

          snippets = [...snippets, ...result.snippets.map(snippet => ({
            ...snippet,
            sentenceText: this.getSentenceTextFromIndices(book, snippet.startSentence, snippet.endSentence),
          }))];

          completeCount++ ;
          progressPercentageMap.set(bookId, Math.round(completeCount / paragraphs.length * 50));

          logger.log(`Progress percentage: ${progressPercentageMap.get(bookId)}`);
          logger.log(`OpenAI responded for paragraph ${index}/${paragraphs.length}`);

        })));

    return snippets;
  }

  private getSentenceTextFromIndices(book: Book, startIndex: number, endIndex: number) {
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

  private async callOpenAI(paragraph: string, paragraphIndex: number) {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.parse({
      model: "gpt-5-nano-2025-08-07",
      reasoning: { effort: "high" },
      input: [
        {
          role: "system",
          content: SYSTEM_INSTRUCTIONS
        },
        {
          role: "user",
          content: `Extract snippets from this paragraph: ${paragraph}`,
        }
      ],
      text: {
        format: zodTextFormat(SnippetsSchema, "snippets"),
      }
    });

    return response.output_parsed as { snippets: SnippetResponse[] };
  }
}