import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snippet } from 'src/book/entities/snippet.entity';

@Injectable()
export class FeedRepository {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) { }

  async getRandomSnippets(limit: number): Promise<Snippet[]> {
    return this.dataSource
      .getRepository(Snippet)
      .createQueryBuilder('snippet')
      .leftJoinAndSelect('snippet.themes', 'themes')
      .leftJoin('snippet.book', 'book')
      .addSelect(['book.id', 'book.title', 'book.author'])
      .orderBy('RANDOM()')
      .limit(limit || 10)
      .getMany();
  }

  async getRandomSnippetsByBookId(bookId: number, limit: number): Promise<Snippet[]> {
    return this.dataSource
      .getRepository(Snippet)
      .createQueryBuilder('snippet')
      .leftJoin('snippet.book', 'book')
      .addSelect(['book.id', 'book.title', 'book.author'])
      .leftJoinAndSelect('snippet.themes', 'themes')
      .where('snippet.bookId = :bookId', { bookId })
      .orderBy('RANDOM()')
      .limit(limit || 10)
      .getMany();
  }

  async getRandomSnippetsByTheme(theme: string, limit: number): Promise<Snippet[]> {
    return this.dataSource
      .getRepository(Snippet)
      .createQueryBuilder('snippet')
      .leftJoin('snippet.book', 'book')
      .addSelect(['book.id', 'book.title', 'book.author'])
      .leftJoinAndSelect('snippet.themes', 'themes')
      .innerJoin('snippet.themes', 'theme')
      .where('LOWER(theme.name) LIKE LOWER(:theme)', { theme: `%${theme}%` })
      .orderBy('RANDOM()')
      .limit(limit || 10)
      .getMany();
  }
}