import { ConsoleLogger, Injectable } from '@nestjs/common';
import { FeedRepository } from './repositories/feed.repository';
import { Snippet } from 'src/book/entities/snippet.entity';
import { FeedItem, FeedResponseDto } from './dto/feed.dto';

@Injectable()
export class FeedService {
  constructor(private readonly feedRepository: FeedRepository) {}

  private buildFeedResponse(
    feeds: FeedItem[],
    lastSnippetId: number,
    cursor: number
  ): FeedResponseDto {
    if (feeds.length === 0) {
      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
      };
    }
    const nextCursor = feeds.length > 0 ? feeds[feeds.length - 1].snippetId : undefined;
    const hasMore = nextCursor !== undefined && lastSnippetId > nextCursor;

    return {
      items: feeds,
      nextCursor,
      hasMore,
    };
  }

  async getFeed(limit: number, cursor: number): Promise<FeedResponseDto> {
    const [snippets, lastSnippetId] = await Promise.all([
      this.feedRepository.getNSnippets(limit, cursor),
      this.feedRepository.getLastSnippetId(),
    ]);
    const feeds = snippets.map((snippet) => this.toFeedItem(snippet));
    return this.buildFeedResponse(feeds, lastSnippetId, cursor);
  }

  async getFeedByBookIdAndLimit(bookId: number, limit: number, cursor: number): Promise<FeedResponseDto> {
    const [snippets, lastSnippetId] = await Promise.all([
      this.feedRepository.getFeedByBookIdAndLimit(bookId, limit, cursor),
      this.feedRepository.getLastSnippetIdByBookId(bookId),
    ]);
    const feeds = snippets.map((snippet) => this.toFeedItem(snippet));
    return this.buildFeedResponse(feeds, lastSnippetId, cursor);
  }

  async getFeedByTheme(theme: string, limit: number, cursor: number): Promise<FeedResponseDto> {
    const [snippets, lastSnippetId] = await Promise.all([
      this.feedRepository.getFeedByTheme(theme, limit, cursor),
      this.feedRepository.getLastSnippetIdByTheme(theme),
    ]);
    const feeds = snippets.map((snippet) => this.toFeedItem(snippet));
    return this.buildFeedResponse(feeds, lastSnippetId, cursor);
  }


  private toFeedItem(snippet: Snippet): FeedItem {
    const response: FeedItem = {
      bookTitle: snippet.book.title as string,
      bookAuthor: snippet.book.author as string,
      bookId: snippet.book.id as number,
      snippetId: snippet.id as number,
      snippetText: snippet.snippetText,
      reason: snippet.reason,
      startSentence: snippet.startSentence,
      endSentence: snippet.endSentence,
      sentenceText: snippet.sentenceText,
      originalTextWithIndices: snippet.originalTextWithIndices,
      textToSearch: snippet.sentenceText.split(' ').slice(0, 8).join(' '),
      themes: snippet.themes.map(theme => theme.name),
    };
    return response;
  }
}
