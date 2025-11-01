import { Injectable, Inject } from '@nestjs/common';
import { DataSource, ILike, MoreThan } from 'typeorm';
import { Snippet } from 'src/book/entities/snippet.entity';

@Injectable()
export class FeedRepository {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) { }

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

  async getLastSnippetId(): Promise<number> {
    const snippet = await this.dataSource
      .getRepository(Snippet)
      .createQueryBuilder('snippet')
      .orderBy('snippet.id', 'DESC')
      .limit(1)
      .getOne();
    
    return snippet?.id ?? 0;
  }

  async getLastSnippetIdByBookId(bookId: number): Promise<number> {
    const lastSnippet = await this.dataSource.getRepository(Snippet).findOne({ select: { id: true }, where: { book: { id: bookId } }, order: { id: 'DESC' } });
    return lastSnippet?.id || 0;
  }

  async getLastSnippetIdByTheme(theme: string): Promise<number> {
    const lastSnippet = await this.dataSource.getRepository(Snippet).findOne({ select: { id: true }, where: { themes: { name: ILike(`%${theme}%`) } }, order: { id: 'DESC' } });
    return lastSnippet?.id || 0;
  }

  async getNSnippets(limit: number, cursor: number): Promise<Snippet[]> {
    return this.dataSource.getRepository(Snippet).find({
      take: limit || 10,
      relations: ['book', 'themes'],
      select: {
        book: {
          id: true,
          title: true,
          author: true,
        },
      },
      where: {
        id: MoreThan(cursor),
      },
    });
  }

  async getFeedByBookIdAndLimit(bookId: number, limit: number, cursor: number): Promise<Snippet[]> {
    return await this.dataSource.getRepository(Snippet).find({
      take: limit,
      select: {
        book: {
          id: true,
          title: true,
          author: true,
        },
      },
      where: { book: { id: bookId }, id: MoreThan(cursor) },
      relations: ['book', 'themes'],
    });
  }

  async getFeedByTheme(theme: string, limit: number, cursor: number): Promise<Snippet[]> {
    return await this.dataSource.getRepository(Snippet).find({
      take: limit,
      select: {
        book: {
          id: true,
          title: true,
          author: true,
        },
      },
      where: { themes: { name: ILike(`%${theme}%`) }, id: MoreThan(cursor) },
      relations: ['book', 'themes'],
    });
  }
}