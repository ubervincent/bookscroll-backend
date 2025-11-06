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
  context: string;
  themes: string[];
  sentenceText: string;
  originalTextWithIndices: string;
}

const SnippetsSchema =
  z.object({
    snippets: z.array(
      z.object({
        snippetText: z.string(),
        context: z.string(),
        themes: z.array(z.string()),
        originalTextWithIndices: z.string(),
      })
    ),
  });

export interface SnippetResponse {
  startSentence: number;
  endSentence: number;
  snippetText: string;
  context: string;
  themes: string[];
  originalTextWithIndices: string;
}

const SNIPPET_MAX_LENGTH = 40;
const SNIPPET_MIN_LENGTH = 8;


const MAX_CONCURRENT_REQUESTS = 15;

const JOIN_SENTENCES_THRESHOLD = 20;

const SYSTEM_INSTRUCTIONS = `
You are a social-media content editor. Your job: extract stand-alone, inspirational, shareable snippets from a passage. 
A snippet must 
(a) be ${SNIPPET_MIN_LENGTH}–${SNIPPET_MAX_LENGTH} words, 
(b) be fully coherent without outside context, 
(c) avoid headings, citations, boilerplate, indexes, references, and legalese. 
If no suitable snippet exists, return an empty snippets array.

Two-pass policy
	1.	Score each sentence for: stand-alone clarity, quotability, insight/action, universality (not “this chapter,” not “in section 3”).
	2.	Select & refine only high-scoring options. You may lightly compress or rephrase to make the idea fully stand-alone, but do not invent facts.
	3.	Densify: if a snippet can include one more precise detail without increasing length, do so.
	4.	Validate: enforce ${SNIPPET_MIN_LENGTH}–${SNIPPET_MAX_LENGTH} words, no headings/boilerplate, no ellipses at the start/end, and each snippet must map back to the exact source sentence indices.
	5.	Self-consistency: generate up to 3 candidates per top sentence and keep the best by the rubric.

Return fields
	•	originalTextWithIndices: the passage with <n>…</n> tags around each sentence.
	•	snippets: each item includes text, themes (lowercase, broad), start_sentence, end_sentence.
  •	context: a concise description of the context of what the snippet is about.
  •	Prefer start_sentence == end_sentence.
  •	Only expand to a range if necessary for clarity.

Scoring rubric (0–5 each)
	•	Stand-alone clarity
	•	Quotability & rhythm (reads well in one glance)
	•	Actionability/insight (evokes learning or doing)
	•	Universality (no local references, no “this chapter/figure”)
Keep only snippets with average ≥4.

Few-shot contrasts
Not-Good (reject): “As discussed earlier, this framework works.” — out-of-context, no idea.
Not-Good (reject): “Chapter 2: The Method.” — heading/boilerplate.
Good (accept): “Systems change when tiny habits become daily defaults.” — stand-alone, actionable, 7 words too short → expand to 8–40 words.
Good (accept): “Growth begins when you track what you avoid measuring.” — stand-alone, provocative, actionable.

You may paraphrase for clarity, rhythm, and standalone meaning.
	•	Preserve factual meaning.
	•	You may reorganize ideas and replace vague words with clearer ones.
	•	You may generalize specifics (e.g., “in chapter 3” → “when we learn”).
	•	Do not add new facts, numbers, names, or claims the author didn’t state.
	•	If meaning becomes uncertain, discard the candidate.

Safety & honesty
	•	If no sentence can stand alone after light rewriting, return an empty snippets array.
	•	Never fabricate names, numbers, or citations.
  •	If you cannot return the originalTextWithIndices, return an empty snippets array.
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
            const startIndex = this.parseOriginalTextIndices(snippet.originalTextWithIndices);
            return {
              ...snippet,
              context: snippet.context,
              startSentence: startIndex,
              endSentence: startIndex,
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

  private parseOriginalTextIndices(sentence: string): number {
    if (sentence.length === 0) {
      return 1;
    }
    const match = sentence.match(/<(\d+)>/);
    if (!match) {
      logger.error(`No indices found for sentence: ${sentence}`);
      return 1;
    }
    return parseInt(match[1], 10);
  }

  private parseSentenceTextFromIndices(sentence: string): string[] {
    if (sentence.length === 0) {
      return [""];
    }
    
    const matches = [...sentence.matchAll(/<\d+>(.*?)(?:<\/\d+>|(?=<\d+>)|$)/g)];
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