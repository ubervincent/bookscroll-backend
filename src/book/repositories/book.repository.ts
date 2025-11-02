import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Book } from '../entities/book.entity';
import { Snippet } from '../entities/snippet.entity';
import { Theme } from '../entities/theme.entity';
import OpenAI from 'openai';

const logger = new Logger('BookRepository');

@Injectable()
export class BookRepository {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) { }

  async saveBook(book: Book): Promise<Book> {
    const bookEntity = await this.dataSource.getRepository(Book).save(book);
    return bookEntity;
  }

  async saveSnippetsByBook(book: Book, snippets: Snippet[]) {
    const snippetsWithoutIds = snippets.map(snippet => {
      const { id, ...rest } = snippet;
      return { ...rest, book: book };
    });
    
    await this.dataSource.getRepository(Snippet).save(snippetsWithoutIds);
  }

  async upsertThemesByName(themes: Theme[]) {
    await this.dataSource.getRepository(Theme).upsert(themes, { conflictPaths: ['name'] });
    return await this.dataSource.getRepository(Theme).find( { where: { name: In(themes.map(theme => theme.name)) } });
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

  async deleteBook(id: number, userId: string): Promise<{ message: string }> {
    await this.dataSource.getRepository(Book).delete({ id, userId });
    return { message: `Book with id ${id} deleted successfully` };
  }

  async getSnippetsByBookId(id: number): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({ where: { book: { id } }, relations: ['book', 'themes'] });
  }

  async getSnippetsByTheme(theme: string): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({ where: { themes: { name: theme } }, relations: ['book', 'themes'] });
  }

  async getAllBooks(userId: string): Promise<Book[]> {
    return this.dataSource.getRepository(Book).find({
      where: { userId },
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

    if (!rows || rows.length === 0 || !rows[0]) {
      return 0;
    }

    const countValue = rows[0].count;
    if (countValue === null || countValue === undefined) {
      return 0;
    }

    return parseInt(countValue, 10) || 0;
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

  async searchSnippets(searchText: string, userId: string, limit: number = 10): Promise<Snippet[]> {
    const embedding = await this.getEmbedding(searchText);

    const rows = await this.dataSource.query(
      `
      WITH semantic_scores AS (
        SELECT 
          s.id,
          (1 - (s.embedding <=> $1::vector)) as semantic_score
        FROM snippet s
        INNER JOIN book b ON s."bookId" = b.id
        WHERE b."userId" = $2 AND s.embedding IS NOT NULL
      ),
      keyword_scores AS (
        SELECT 
          s.id,
          ts_rank(
            to_tsvector('english', s."snippetText"),
            plainto_tsquery('english', $3)
          ) as keyword_score
        FROM snippet s
        INNER JOIN book b ON s."bookId" = b.id
        WHERE b."userId" = $2
      )
      SELECT 
        s.id
      FROM snippet s
      LEFT JOIN semantic_scores sem ON s.id = sem.id
      LEFT JOIN keyword_scores key ON s.id = key.id
      INNER JOIN book b ON s."bookId" = b.id
      WHERE b."userId" = $2
        AND (sem.semantic_score IS NOT NULL OR key.keyword_score > 0)
      ORDER BY (COALESCE(sem.semantic_score * 0.7, 0) + COALESCE(key.keyword_score * 0.3, 0)) DESC
      LIMIT $4
      `,
      [JSON.stringify(embedding), userId, searchText, limit]
    );

    const snippetIds = rows.map(row => row.id);
    
    if (snippetIds.length === 0) {
      return [];
    }

    return this.dataSource.getRepository(Snippet).find({
      where: { id: In(snippetIds) },
      relations: ['book', 'themes'],
    });
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}