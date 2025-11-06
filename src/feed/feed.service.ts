import { Injectable } from '@nestjs/common';
import { FeedRepository } from './repositories/feed.repository';
import { Snippet } from 'src/book/entities/snippet.entity';
import { FeedItem, FeedResponseDto } from './dto/feed.dto';

@Injectable()
export class FeedService {
  constructor(private readonly feedRepository: FeedRepository) {}

  async getFeed(userId: string, limit: number): Promise<FeedResponseDto> {
    const snippets = await this.feedRepository.getRandomSnippets(userId, limit);
    const feeds = snippets.map((snippet) => this.toFeedItem(snippet));

    return {
      items: feeds,
    };
  }

  async getFeedByBookId(userId: string, bookId: number, limit: number): Promise<FeedResponseDto> {
    const snippets = await this.feedRepository.getRandomSnippetsByBookId(userId, bookId, limit);
    const feeds = snippets.map((snippet) => this.toFeedItem(snippet));

    return {
      items: feeds,
    };
  }

  async getFeedByTheme(userId: string, theme: string, limit: number): Promise<FeedResponseDto> {
    const snippets = await this.feedRepository.getRandomSnippetsByTheme(userId, theme, limit);
    const feeds = snippets.map((snippet) => this.toFeedItem(snippet));

    return {
      items: feeds,
    };
  }

  private toFeedItem(snippet: Snippet): FeedItem {
    const response: FeedItem = {
      bookTitle: snippet.book.title as string,
      bookAuthor: snippet.book.author as string,
      bookId: snippet.book.id as number,
      snippetId: snippet.id as number,
      snippetText: snippet.snippetText,
      context: snippet.context,
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
