import { Injectable, Inject } from '@nestjs/common';
import { DataSource, ILike } from 'typeorm';
import { Snippet } from 'src/book/entities/snippet.entity';

@Injectable()
export class FeedRepository {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {}

  async getFeed(): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({
      select: {
        book: {
          id: true,
          title: true,
          author: true,
        },
      },
      relations: ['book', 'themes'],
    });
  }

  async getTotalSnippets(): Promise<number> {
    return this.dataSource.getRepository(Snippet).count();
  }

  async getTotalSnippetsByBookId(bookId: number): Promise<number> {
    return this.dataSource.getRepository(Snippet).count({ where: { book: { id: bookId } } });
  }

  async getTotalSnippetsByTheme(theme: string): Promise<number> {
    return this.dataSource.getRepository(Snippet).count({ where: { themes: { name: ILike(`%${theme}%`) } } });
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
          title: true, 
          author: true,
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