import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snippet } from 'src/book/entities/snippet.entity';

@Injectable()
export class FeedRepository {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) { }

  async getRandomSnippets(userId: string, limit: number): Promise<Snippet[]> {
    return this.dataSource
      .getRepository(Snippet)
      .createQueryBuilder('snippet')
      .leftJoinAndSelect('snippet.themes', 'themes')
      .leftJoin('snippet.book', 'book')
      .addSelect(['book.id', 'book.title', 'book.author'])
      .andWhere('snippet.userId = :userId', { userId })
      .orderBy('RANDOM()')
      .limit(limit || 10)
      .getMany();
  }

  async getRandomSnippetsByBookId(userId: string, bookId: number, limit: number): Promise<Snippet[]> {
    return this.dataSource
      .getRepository(Snippet)
      .createQueryBuilder('snippet')
      .leftJoin('snippet.book', 'book')
      .addSelect(['book.id', 'book.title', 'book.author'])
      .leftJoinAndSelect('snippet.themes', 'themes')
      .where('snippet.bookId = :bookId', { bookId })
      .andWhere('snippet.userId = :userId', { userId })
      .orderBy('RANDOM()')
      .limit(limit || 10)
      .getMany();
  }

  async getRandomSnippetsByTheme(userId: string, theme: string, limit: number): Promise<Snippet[]> {
    return this.dataSource
      .getRepository(Snippet)
      .createQueryBuilder('snippet')
      .leftJoin('snippet.book', 'book')
      .addSelect(['book.id', 'book.title', 'book.author'])
      .leftJoinAndSelect('snippet.themes', 'themes')
      .innerJoin('snippet.themes', 'theme')
      .where('LOWER(theme.name) LIKE LOWER(:theme)', { theme: `%${theme}%` })
      .andWhere('snippet.userId = :userId', { userId })
      .orderBy('RANDOM()')
      .limit(limit || 10)
      .getMany();
  }
}