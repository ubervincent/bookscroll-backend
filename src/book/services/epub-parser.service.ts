import { Injectable } from '@nestjs/common';
import { EPub } from 'epub2';
import * as cheerio from 'cheerio';
import { Book } from './book.service';
const SENTENCE_LENGTH_THRESHOLD = 5;

export interface ProcessedSentence {
    [index: number]: string;
}

@Injectable()
export class EpubParserService {
    private getChapterRawAsync(epub, id: string) {
        return new Promise((resolve, reject) => {
            epub.getChapterRaw(id, (error, text) => {
                if (error) return reject(error);
                resolve(text);
            });
        });
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
        ];

        const text = await this.getChapterRawAsync(epub, chapter);
        const $ = cheerio.load(text as string);
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

    async parseEpub(filePath: string) {
        let epub = await EPub.createAsync(filePath);

        const book: Book = {
            title: epub.metadata.title,
            author: epub.metadata.author,
            sentences: {},
            snippets: [],
        };

        let globalSentenceIndex = 0;

        for (const chapter of epub.flow) {
            const chapterSentences = await this.getProcessedSentences(
                chapter.id,
                epub,
                globalSentenceIndex,
            );
            book.sentences = { ...book.sentences, ...chapterSentences };
            globalSentenceIndex += Object.keys(chapterSentences).length;
        }

        return book;
    }

    private normaliseSentence(sentence: string) {
        return sentence.replace(/[\t\n]/g, '');
    }
}
