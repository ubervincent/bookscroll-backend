import { Injectable, Logger, NotFoundException, } from '@nestjs/common';
import { Snippet, SnippetExtractionService } from './snippet-extraction.service';
import { ProcessedSentence, EpubParserService } from './epub-parser.service';
import { FileStorageService } from './file-storage.service';
import { BookRepository } from '../repositories/book.repository';
import { Book as BookEntity } from '../entities/book.entity';
import { Snippet as SnippetEntity } from '../entities/snippet.entity';
import { Theme as ThemeEntity } from '../entities/theme.entity';
import { SentencesResponseDto, BookResponseDto } from '../dto/book.dto';
import { EmbeddingService } from './embedding.service';

export interface Book {
  title: string;
  author: string;
  sentences: ProcessedSentence;
  snippets: Snippet[];
}

const logger = new Logger('BookService');


@Injectable()
export class BookService {
  constructor(
    private readonly snippetExtractionService: SnippetExtractionService,
    private readonly epubParserService: EpubParserService,
    private readonly bookRepository: BookRepository,
    private readonly fileStorageService: FileStorageService,
    private readonly embeddingService: EmbeddingService,
  ) { }

  private progressPercentageMap = new Map<number, number>();
  
  async upload(file: Express.Multer.File) {
    const filePath = this.fileStorageService.saveBook(file);
    let book = await this.epubParserService.parseEpub(await filePath);

    await this.fileStorageService.deleteBook(await filePath);

    const bookEntity: BookEntity = await this.bookRepository.saveBook(this.toBookEntity(book));

    if (!bookEntity.id) {
      throw new Error('Book ID is required');
    }

    await this.bookRepository.updateBookStatus(bookEntity.id, 'processing');

    this.extractSnippets(book, bookEntity);

    return {
      message: `Book ${bookEntity.id} - ${bookEntity.title} processing started`,
    }
  }
  
  private async extractSnippets(book: Book, bookEntity: BookEntity ) {
    const snippets = await this.snippetExtractionService.getSnippetFromBook(
      book, 
      this.progressPercentageMap,
      bookEntity.id!
    );

    const themes = this.getAllUniqueThemes(snippets);
    const themesEntities = themes.map(theme => this.toThemeEntity(theme));
    const savedThemesEntities = await this.bookRepository.upsertThemesByName(themesEntities);

    const snippetsEntities = snippets.map(snippet => this.toSnippetEntity(snippet, savedThemesEntities));

    const snippetsEntitiesWithEmbeddings = await this.embeddingService.getEmbeddingsFromSnippets(
      snippetsEntities, 
      this.progressPercentageMap, 
      bookEntity.id!
    );

    await this.bookRepository.updateBookStatus(bookEntity.id!, 'completed');

    await this.bookRepository.saveSnippetsByBook(bookEntity, snippetsEntitiesWithEmbeddings);
  }

  async getBookProcessingStatus(bookId: number) {
    const status = await this.bookRepository.getBookStatus(bookId);
    return {
      status: status,
      progressPercentage: this.progressPercentageMap.get(bookId) ?? 100,
    };
  }

  async getAllBooks(): Promise<BookResponseDto[]> {
    const books = await this.bookRepository.getAllBooks();
    return books;
  }

  async getBookSentencesByIndices(bookId: number, startSentence: number, endSentence: number): Promise<SentencesResponseDto> {
    const from = Math.min(startSentence, endSentence);
    const to = Math.max(startSentence, endSentence);

    const windowResult = await this.bookRepository.getSentenceWindowByIndices(bookId, from, to);

    const totalSentences = await this.bookRepository.getTotalSentences(bookId);

    if (!windowResult) {
      throw new NotFoundException(`Book with id ${bookId} not found`);
    }

    const response: SentencesResponseDto = {
      bookId: bookId,
      bookTitle: windowResult.title ?? '',
      bookAuthor: windowResult.author ?? '',
      totalSentences: totalSentences,
      startSentence: from,
      endSentence: to,
      fullSentence: windowResult.fullText,
      previousSentence: windowResult.prevText,
      nextSentence: windowResult.nextText,
    };

    return response;
  }

  async deleteById(id: number) {
    const result = await this.bookRepository.deleteBook(id);
    return result;
  }

  private toSnippetEntity(snippet: Snippet, savedThemesEntities: ThemeEntity[]): SnippetEntity {
    const snippetEntity = new SnippetEntity();
    snippetEntity.startSentence = snippet.startSentence;
    snippetEntity.endSentence = snippet.endSentence;
    snippetEntity.snippetText = snippet.snippetText;
    snippetEntity.reason = snippet.reason;
    snippetEntity.sentenceText = snippet.sentenceText;
    snippetEntity.themes = snippet.themes.map(theme => savedThemesEntities.find(t => t.name === theme) as ThemeEntity);
    return snippetEntity;
  }

  private toBookEntity(book: Book): BookEntity {
    const bookEntity = new BookEntity();
    bookEntity.title = book.title;
    bookEntity.author = book.author;
    bookEntity.sentences = book.sentences;
    return bookEntity;
  }

  private getAllUniqueThemes(snippets: Snippet[]): string[] {
    return Array.from(new Set(snippets.flatMap(s => s.themes)));
  }

  private toThemeEntity(theme: string): ThemeEntity {
    const themeEntity = new ThemeEntity();
    themeEntity.name = theme;
    return themeEntity;
  }
}

