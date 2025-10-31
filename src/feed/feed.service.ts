import { Injectable } from '@nestjs/common';
import { FeedRepository } from './repositories/feed.repository';
import { Snippet } from 'src/book/entities/snippet.entity';
import { FeedResponseDto } from './dto/feed.dto';

@Injectable()
export class FeedService {
  constructor(private readonly feedRepository: FeedRepository) {}

  async getFeed(limit: number): Promise<FeedResponseDto[]> {
    const snippets = await this.feedRepository.getNSnippets(limit);
    const totalSnippets = await this.feedRepository.getTotalSnippets();
    return snippets.map(snippet => this.toFeed(snippet, totalSnippets));
  }

  async getFeedByBookIdAndLimit(bookId: number, limit?: number): Promise<FeedResponseDto[]> {
    const snippets = await this.feedRepository.getFeedByBookIdAndLimit(bookId, limit);
    const totalSnippets = await this.feedRepository.getTotalSnippetsByBookId(bookId);
    const feeds = snippets.map(snippet => this.toFeed(snippet, totalSnippets));
    return this.randomizeFeed(feeds);
  }

  async getFeedByTheme(theme: string, limit?: number): Promise<FeedResponseDto[]> {
    const snippets = await this.feedRepository.getFeedByTheme(theme, limit);
    const totalSnippets = await this.feedRepository.getTotalSnippetsByTheme(theme);
    const feeds = snippets.map(snippet => this.toFeed(snippet, totalSnippets));
    return this.randomizeFeed(feeds);
  }

  private randomizeFeed(feed: FeedResponseDto[]): FeedResponseDto[] {
    return feed.sort(() => Math.random() - 0.5);
  }

  private toFeed(snippet: Snippet, totalSnippets: number): FeedResponseDto {
    const response: FeedResponseDto = {
      bookTitle: snippet.book.title as string,
      bookAuthor: snippet.book.author as string,
      bookId: snippet.book.id as number,
      snippetId: snippet.id as number,
      snippetText: snippet.snippetText,
      reason: snippet.reason,
      totalSnippets: totalSnippets,
      startSentence: snippet.startSentence,
      endSentence: snippet.endSentence,
      sentenceText: snippet.sentenceText,
      textToSearch: snippet.sentenceText.split(' ').slice(0, 8).join(' '),
      themes: snippet.themes.map(theme => theme.name),
    };
    return response;
  }
}
