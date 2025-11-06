import { Injectable, Logger, NotFoundException, } from '@nestjs/common';
import { Snippet, SnippetExtractionService } from './snippet-extraction.service';
import { ProcessedSentence, EpubParserService } from './epub-parser.service';
import { FileStorageService } from './file-storage.service';
import { BookRepository } from '../repositories/book.repository';
import { Book as BookEntity } from '../entities/book.entity';
import { Snippet as SnippetEntity } from '../entities/snippet.entity';
import { Theme as ThemeEntity } from '../entities/theme.entity';
import { SentencesResponseDto, BookResponseDto, SearchResponseDto } from '../dto/book.dto';
import { EmbeddingService } from './embedding.service';
import { FeedItem } from '../../feed/dto/feed.dto';

export interface Book {
  title: string;
  author: string;
  sentences: ProcessedSentence;
  snippets: Snippet[];
}

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
  
  async upload(file: Express.Multer.File, userId: string) {
    const filePath = this.fileStorageService.saveBook(file);
    let book = await this.epubParserService.parseEpub(await filePath);

    await this.fileStorageService.deleteBook(await filePath);

    const bookEntity: BookEntity = await this.bookRepository.saveBook(this.toBookEntity(book, userId));

    if (!bookEntity.id) {
      throw new Error('Book ID is required');
    }

    await this.bookRepository.updateBookStatus(bookEntity.id, 'processing');

    this.extractSnippets(book, bookEntity, userId);

    return {
      message: `Book ${bookEntity.id} - ${bookEntity.title} processing started`,
      bookId: bookEntity.id,
    }
  }
  
  private async extractSnippets(book: Book, bookEntity: BookEntity, userId: string) {
    const snippets = await this.snippetExtractionService.getSnippetFromBook(
      book, 
      this.progressPercentageMap,
      bookEntity.id!
    );

    const themes = this.getAllUniqueThemes(snippets, userId);
    const themesEntities = themes.map(theme => this.toThemeEntity(theme, userId));
    const savedThemesEntities = await this.bookRepository.upsertThemesByName(themesEntities);

    const snippetsEntities = snippets.map(snippet => this.toSnippetEntity(snippet, savedThemesEntities, userId));

    const snippetsEntitiesWithEmbeddings = await this.embeddingService.getEmbeddingsFromSnippets(
      snippetsEntities, 
      this.progressPercentageMap, 
      bookEntity.id!
    );

    
    await this.bookRepository.saveSnippetsByBook(bookEntity, snippetsEntitiesWithEmbeddings);
    await this.bookRepository.updateBookStatus(bookEntity.id!, 'completed');
  }

  async getBookProcessingStatus(bookId: number) {
    const status = await this.bookRepository.getBookStatus(bookId);
    return {
      id: bookId,
      status: status,
      progressPercentage: this.progressPercentageMap.get(bookId) ?? 0,
    };
  }

  async getAllBooks(userId: string): Promise<BookResponseDto[]> {
    const books = await this.bookRepository.getAllBooks(userId);
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

  async deleteById(id: number, userId: string) {
    const result = await this.bookRepository.deleteBook(id, userId);
    return result;
  }

  private toSnippetEntity(snippet: Snippet, savedThemesEntities: ThemeEntity[], userId: string): SnippetEntity {
    const snippetEntity = new SnippetEntity();
    snippetEntity.startSentence = snippet.startSentence;
    snippetEntity.endSentence = snippet.endSentence;
    snippetEntity.snippetText = snippet.snippetText;
    snippetEntity.context = snippet.context;
    snippetEntity.sentenceText = snippet.sentenceText;
    snippetEntity.originalTextWithIndices = snippet.originalTextWithIndices;
    const uniqueThemeNames = Array.from(new Set(snippet.themes));
    snippetEntity.themes = uniqueThemeNames
      .map(theme => savedThemesEntities.find(t => t.name === theme))
      .filter((theme): theme is ThemeEntity => theme !== undefined);
    snippetEntity.userId = userId;
    return snippetEntity;
  }

  private toBookEntity(book: Book, userId: string): BookEntity {
    const bookEntity = new BookEntity();
    bookEntity.title = book.title;
    bookEntity.author = book.author;
    bookEntity.sentences = book.sentences;
    bookEntity.userId = userId;
    return bookEntity;
  }

  private getAllUniqueThemes(snippets: Snippet[] , userId: string): string[] {
    return Array.from(new Set(snippets.flatMap(s => s.themes)));
  }

  private toThemeEntity(theme: string, userId: string): ThemeEntity {
    const themeEntity = new ThemeEntity();
    themeEntity.name = theme;
    themeEntity.userId = userId;
    return themeEntity;
  }

  async searchSnippets(searchQuery: string, userId: string, limit: number): Promise<SearchResponseDto> {
    const snippets = await this.bookRepository.searchSnippets(searchQuery, userId, limit);
    const results = snippets.map((snippet) => this.toFeedItem(snippet));
    return { results };
  }

  private toFeedItem(snippet: SnippetEntity): FeedItem {
    return {
      bookTitle: snippet.book.title as string,
      bookAuthor: snippet.book.author as string,
      bookId: snippet.book.id as number,
      snippetId: snippet.id as number,
      snippetText: snippet.snippetText,
      context: snippet.context,
      startSentence: snippet.startSentence,
      endSentence: snippet.endSentence,
      sentenceText: snippet.sentenceText,
      originalTextWithIndices: snippet.originalTextWithIndices,
      textToSearch: snippet.sentenceText.split(' ').slice(0, 8).join(' '),
      themes: snippet.themes.map(theme => theme.name),
    };
  }
}

