import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snippet } from 'src/book/entities/snippet.entity';

@Injectable()
export class FeedRepository {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {}

  async getFeed(): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({
      select: {
        book: {
          id: true,
        },
      },
      relations: ['book', 'themes'],
    });
  }

  async getNSnippets(limit?: number): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet)
      .createQueryBuilder('snippet')
      .leftJoinAndSelect('snippet.book', 'book')
      .leftJoinAndSelect('snippet.themes', 'themes')
      .orderBy('RANDOM()') // PostgreSQL
      .limit(limit || 10)
      .getMany();
  }

  async getFeedByBookIdAndLimit(bookId: number, limit?: number): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({
      where: { book: { id: bookId } },
      take: limit,
      select: {
        book: {
          id: true,
        },
      },
      relations: ['book', 'themes'],
    });
  }

  async getFeedByTheme(theme: string, limit?: number): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet)
    .createQueryBuilder('snippet')
    .leftJoinAndSelect('snippet.book', 'book')
    .leftJoinAndSelect('snippet.themes', 'themes')
    .where('themes.name ILIKE :theme', { theme: `%${theme}%` })
    .orderBy('RANDOM()')
    .limit(limit || 10)
    .getMany();
  }
}