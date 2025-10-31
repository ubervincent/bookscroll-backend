import { BadRequestException, Injectable } from '@nestjs/common';
import { EPub } from 'epub2';
import * as cheerio from 'cheerio';
import { Book } from './book.service';
import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import Groq from 'groq-sdk'
import { zodTextFormat } from 'openai/helpers/zod.mjs';
import { z } from 'zod';

const logger = new Logger('EpubParserService');

const SENTENCE_LENGTH_THRESHOLD = 5;

export interface ProcessedSentence {
    [index: number]: string;
}

const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_INSTRUCTIONS = `You are a helpful assistant that determines if a section of the book should be rejected from further analysis
                                 Reject sections like cover page, title page, dedication, epigraph, frontmatter, glossary, index, table of contents,
                                 about the author, acknowledgments, praise, footnote, copyright, bibliography etc. They may come in short form like toc, copy etc. Reject them as well 
                                 If unsure, reject it by returning true. 

                                 Anything else such as chapter, descriptive text of a chapter, introduction, conclusion, things 
                                 that are relevant to the main idea of the book should be included in the further analysis.
                    `

@Injectable()
export class EpubParserService {
    private getChapterRawAsync(epub: EPub, id: string): Promise<string> {
        return new Promise((resolve, reject) => {
            epub.getChapterRaw(id, (error, text) => {
                if (error) {
                    return reject(error as Error);
                }
                return resolve(text as string);
            });
        });
    }

    async parseEpub(filePath: string) {
        let epub = await EPub.createAsync(filePath);

        const book: Book = {
            title: epub.metadata.title,
            author: epub.metadata.creator,
            sentences: {},
            snippets: [],
        };

        let globalSentenceIndex = 0;

        logger.log(`Total chapters: ${epub.flow.length}`);

        if (epub.flow.length === 0) {
            throw new BadRequestException('Epub has no chapters');
        }

        for (const chapter of epub.flow) {

            const rejectChapter = await this.rejectChapter(chapter.id);

            if (rejectChapter) {
                logger.log(`Chapter ${chapter.id} rejected`);
                continue;
            }


            logger.log(`Chapter ${chapter.id} accepted`);

            
            const chapterSentences = await this.getProcessedSentences(
                chapter.id,
                epub,
                globalSentenceIndex,
            );

            logger.log(`Processing ${Object.keys(chapterSentences).length} sentences from chapter ${chapter.id}`);

            book.sentences = { ...book.sentences, ...chapterSentences };
            globalSentenceIndex += Object.keys(chapterSentences).length;
        }

        return book;
    }

    private async getProcessedSentences(
        chapter: string,
        epub: EPub,
        startIndex: number,
    ) {
        let processedSentences: ProcessedSentence = {};

        const tags = [
            'p',
            'li',
            'blockquote',
            'pre',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'div'
        ];

        const text = await this.getChapterRawAsync(epub, chapter);
        const type = this.typeOfText(text as string);
        const $ = cheerio.load(text as string, { xmlMode: type === 'xml' || type === 'xhtml' });

        const sentences = $(tags.join(','))
            .toArray()
            .map((el) => $(el).text());


        for (const [index, sentence] of sentences.entries()) {
            const normalisedSentence = this.normaliseSentence(sentence);
            if (normalisedSentence.split(' ').length > SENTENCE_LENGTH_THRESHOLD) {
                processedSentences[startIndex + index + 1] = normalisedSentence;
            }
        }

        return processedSentences;
    }

    private async rejectChapter(chapter: string): Promise<boolean> {

        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        const response = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
                { role: "system", content: SYSTEM_INSTRUCTIONS },
                { role: "user", content: `Discern this section of the book: ${chapter}` },
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                  name: "rejectChapter",
                  schema: {
                    type: "object",
                    properties: {
                      rejectChapter: { type: "boolean" },
                    },
                    required: ["rejectChapter"],
                    additionalProperties: false
                  }
                },
            },

        });
        
        const result = JSON.parse(response.choices[0].message.content || "{}");

        return result.rejectChapter ?? false;
    }

    private typeOfText(text: string) {
        const hasXMLDeclaration = text.startsWith('<?xml');
        const hasXHTMLNamespace = text.includes('xmlns="http://www.w3.org/1999/xhtml"');

        if (hasXMLDeclaration && hasXHTMLNamespace) {
            return 'xhtml';
        } else if (hasXMLDeclaration && !hasXHTMLNamespace) {
            return 'xml';
        } else {
            return 'html';
        }
    }

    private normaliseSentence(sentence: string) {
        return sentence.replace(/[\t\n]/g, '');
    }
}
