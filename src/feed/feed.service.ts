import { Injectable } from '@nestjs/common';
import { FeedRepository } from './repositories/feed.repository';
import { Snippet } from 'src/book/entities/snippet.entity';
import { FeedResponseDto } from './dto/feed.dto';

@Injectable()
export class FeedService {
  constructor(private readonly feedRepository: FeedRepository) {}

  async getFeed(limit?: number): Promise<FeedResponseDto[]> {
    if (limit) {
      const snippets = await this.feedRepository.getNSnippets(limit);
      const feeds = snippets.map(snippet => this.toFeed(snippet));
      return this.randomizeFeed(feeds);
    } else {
      const snippets = await this.feedRepository.getFeed();
      const feeds = snippets.map(snippet => this.toFeed(snippet));
      return this.randomizeFeed(feeds);
    }
  }

  async getFeedByBookIdAndLimit(bookId: number, limit?: number): Promise<FeedResponseDto[]> {
    const snippets = await this.feedRepository.getFeedByBookIdAndLimit(bookId, limit);
    return snippets.map(snippet => this.toFeed(snippet));
  }

  async getFeedByTheme(theme: string, limit?: number): Promise<FeedResponseDto[]> {
    const snippets = await this.feedRepository.getFeedByTheme(theme, limit);
    return snippets.map(snippet => this.toFeed(snippet));
  }

  private randomizeFeed(feed: FeedResponseDto[]): FeedResponseDto[] {
    return feed.sort(() => Math.random() - 0.5);
  }

  private toFeed(snippet: Snippet): FeedResponseDto {
    const response: FeedResponseDto = {
      bookTitle: snippet.book.title as string,
      bookAuthor: snippet.book.author as string,
      bookId: snippet.book.id as number,
      snippetId: snippet.id as number,
      snippetText: snippet.snippetText,
      reason: snippet.reason,
      startSentence: snippet.startSentence,
      endSentence: snippet.endSentence,
      sentenceText: snippet.sentenceText,
      textToSearch: snippet.sentenceText.split(' ').slice(0, 8).join(' '),
      themes: snippet.themes.map(theme => theme.name),
    };
    return response;
  }
}
