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
    const book = await this.dataSource.getRepository(Book).findOne({ where: { id }, select: ['id', 'title', 'author', 'sentences'] });
    if (!book) {
      throw new NotFoundException(`Book with id ${id} not found`);
    }
    return book;
  }

  async updateBookStatus(id: number, status: 'processing' | 'completed' | 'failed') {
    await this.dataSource.getRepository(Book).update(id, { status });
  }

  async getBookStatus(id: number) {
    const book = await this.dataSource.getRepository(Book).findOne({ where: { id }, select: ['status'] });
    if (!book) {
      throw new NotFoundException(`Book with id ${id} not found`);
    }
    return book.status;
  }

  async deleteBook(id: number) : Promise<{ message: string }> {
    await this.dataSource.getRepository(Book).delete(id);
    return { message: `Book with id ${id} deleted successfully` };
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

  async getTotalSentences(bookId: number): Promise<number> {
    const rows = await this.dataSource.query(
      `
      select (
        select count(*) 
        from jsonb_each_text(b.sentences) e
      ) as count
      from book b
      where b.id = $1
      `,
      [bookId]
    );
    return parseInt(rows[0].count, 10) || 0;
  }

  async getSentenceWindowByIndices(
    bookId: number,
    from: number,
    to: number,
  ): Promise<{ title: string | null; author: string | null; fullText: string; prevText: string; nextText: string } | null> {
    const rows = await this.dataSource.query(
      `
      select
        b.title as title,
        b.author as author,
        coalesce(
          (
            select string_agg(e.value, ' ' order by (e.key)::int)
            from jsonb_each_text(b.sentences) e
            where (e.key)::int between $2 and $3
          ), ''
        ) as "fullText",
        coalesce(
          (
            select string_agg(e.value, ' ' order by (e.key)::int)
            from jsonb_each_text(b.sentences) e
            where (e.key)::int = $2-1
          ), ''
        ) as "prevText",
        coalesce(
          (
            select string_agg(e.value, ' ' order by (e.key)::int)
            from jsonb_each_text(b.sentences) e
            where (e.key)::int = $3+1
          ), ''
        ) as "nextText"
      from book b
      where b.id = $1
      `,
      [bookId, from, to]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0] as { title: string | null; author: string | null; fulltext: string; prevtext: string; nexttext: string } & Record<string, any>;

    // Ensure consistent casing regardless of driver behavior
    return {
      title: row.title ?? null,
      author: row.author ?? null,
      fullText: (row.fullText ?? row.fulltext ?? ''),
      prevText: (row.prevText ?? row.prevtext ?? ''),
      nextText: (row.nextText ?? row.nexttext ?? ''),
    };
  }
}