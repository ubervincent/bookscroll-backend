import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Book  } from '../entities/book.entity';
import { Snippet  } from '../entities/snippet.entity';
import { Theme } from '../entities/theme.entity';

const logger = new Logger('BookRepository');

@Injectable()
export class BookRepository {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {}

  async saveBook(book: Book): Promise<Book> {
    const bookEntity = await this.dataSource.getRepository(Book).save(book);
    return bookEntity;
  }

  async saveSnippetsByBook(book: Book, snippets: Snippet[]) {
    await this.dataSource.getRepository(Snippet).save(snippets.map(snippet => ({ ...snippet, book: book })));
  }

  async upsertThemesByName(themes: Theme[]) {
    await this.dataSource.getRepository(Theme).upsert(themes, { conflictPaths: ['name'] });
    return await this.dataSource.getRepository(Theme).find();
  }

  async getBookById(id: number): Promise<Book> {
    const book = await this.dataSource.getRepository(Book).findOne({ where: { id }, relations: ['snippets', 'snippets.themes'] });
    if (!book) {
      throw new NotFoundException(`Book with id ${id} not found`);
    }
    return book;
  }

  async deleteBook(book: Book) {
    await this.dataSource.getRepository(Book).remove(book);
  }

  async getSnippetsByBookId(id: number): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({ where: { book: { id } }, relations: ['book', 'themes'] });
  }

  async getSnippetsByTheme(theme: string): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({ where: { themes: { name: theme } }, relations: ['book', 'themes'] });
  }

  async getAllBooks(): Promise<Book[]> {
    return this.dataSource.getRepository(Book).find({
      select: ['id', 'title', 'author'],
    });
  }
}