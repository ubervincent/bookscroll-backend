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
  originalTextWithIndices: string;
}

const SnippetsSchema =
  z.object({
    snippets: z.array(
      z.object({
        snippetText: z.string(),
        reason: z.string(),
        themes: z.array(z.string()),
        originalTextWithIndices: z.string(),
      })
    ),
  });

export interface SnippetResponse {
  startSentence: number;
  endSentence: number;
  snippetText: string;
  reason: string;
  themes: string[];
  originalTextWithIndices: string;
}

const SNIPPET_MAX_LENGTH = 25;
const SNIPPET_MIN_LENGTH = 6;


const MAX_CONCURRENT_REQUESTS = 15;

const JOIN_SENTENCES_THRESHOLD = 30;

const SYSTEM_INSTRUCTIONS = `
You are a social-media content editor.  
Your task: Extract highly-shareable, coherent, inspirational snippets from the passage below that works on its own (without additional context), and that is ready for scrolling, quoting, reposting.

Requirements:
- The snippets must be between ${SNIPPET_MIN_LENGTH} and ${SNIPPET_MAX_LENGTH} words.  
- It must stand alone: a reader should understand and share it without needing the original text. 
- Sometimes you're given gibberish sentences like index, table of contents, copyright, bibliography, etc. Ignore them and do not produce the snippet text for them.
- Do not include text that is purely chapter headings, citations, legal boilerplate, or out-of-context fragments.  
- If the passage offers no suitable snippets, respond with an empty array.

For the snippets:
- “themes” is an array of broad, general, lowercase theme-words (e.g., ["self-belief","creative-flow"]).  
- “start_sentence” and “end_sentence” refer to the index numbers of the sentence(s) in the source paragraph you used <index></index> tags.  
- If you choose more than one sentence, the snippets should feel unified and coherent.

Return the originalTextWithIndices with indices tags along with the sentences you used to extract the snippets.
Example of the originalTextWithIndices:
<1>This is the first sentence.</1> <2>This is the second sentence.</2>...<n>This is the nth sentence.</n>

DO NOT PRODUCE THE SNIPPET TEXT IF YOU CANNOT PRODUCE THE INDEXED SENTENCES

Tone: warm, encouraging, readable in a single glance.  
Focus: key idea or concept in the book passage that evokes insight or action.

`;

const logger = new Logger('SnippetExtractionService');

@Injectable()
export class SnippetExtractionService {

  async getSnippetFromBook(book: Book, progressPercentageMap: Map<number, number>, bookId: number) {

    const sentences = Object.entries(book.sentences);
    const taggedSentences = Object.keys(book.sentences).map(key => `<${key}>${book.sentences[key]}</${key}>`);

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

          const result = await this.callOpenAI(paragraph);

            snippets = [...snippets, ...result.snippets.map(snippet => {
            const indices = this.parseOriginalTextIndices(snippet.originalTextWithIndices);
            return {
              ...snippet,
              startSentence: Math.min(...indices),
              endSentence: Math.max(...indices),
              sentenceText: this.parseSentenceTextFromIndices(snippet.originalTextWithIndices).join(' '),
            };
          })];

          completeCount++;
          progressPercentageMap.set(bookId, Math.round(completeCount / paragraphs.length * 95));

          logger.log(`Progress percentage: ${progressPercentageMap.get(bookId)}`);
          logger.log(`OpenAI responded for paragraph ${index}/${paragraphs.length}`);

        })));

    return snippets;
  }

  private parseOriginalTextIndices(sentence: string): number[] {
    if (sentence.length === 0) {
      return [1];
    }
    const matches = [...sentence.matchAll(/<(\d+)>/g)]
    if (matches.length === 0) {
      logger.error(`No indices found for sentence: ${sentence}`);
      return [1];
    }
    return matches.map(m => parseInt(m[1], 10));
  }

  private parseSentenceTextFromIndices(sentence: string): string[] {
    if (sentence.length === 0) {
      return [""];
    }
    const matches = [...sentence.matchAll(/<\d+>(.*?)<\/\d+>/g)];
    if (matches.length === 0) {
      logger.error(`No sentences found for sentence: ${sentence}`);
      return [""];
    }
    return matches.map(m => m[1].trim());
  }

  private async callOpenAI(paragraph: string) {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.parse({
      model: "gpt-5-nano-2025-08-07",
      reasoning: { effort: "low" },
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