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

const JOIN_SENTENCES_THRESHOLD = 20;

const SYSTEM_INSTRUCTIONS = `
You are a social-media content editor.  
Your task: Extract and paraphrase **one** highly-shareable, coherent, inspirational snippet from the passage below that works on its own (without additional context), and that is ready for scrolling, quoting, reposting.

Requirements:
- The snippet must be between ${SNIPPET_MIN_LENGTH} and ${SNIPPET_MAX_LENGTH} words.  
- It must stand alone: a reader should understand and share it without needing the original text.  
- Do not include text that is purely chapter headings, citations, legal boilerplate, or out-of-context fragments.  
- If the passage offers no suitable snippet, respond with an empty array.

For the snippet:
- “themes” is an array of broad, general, lowercase theme-words (e.g., ["self-belief","creative-flow"]).  
- “start_sentence” and “end_sentence” refer to the index numbers of the sentence(s) in the source paragraph you used.  
- If you choose more than one sentence, the snippet should feel unified and coherent.

Tone: warm, encouraging, readable in a single glance.  
Focus: key idea or concept in the book passage that evokes insight or action.

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