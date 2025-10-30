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

  async getNSnippets(limit: number): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({
      take: limit,
      relations: ['book', 'themes'],
      select: {
        book: {
          id: true,
        },
      },
    });
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
}