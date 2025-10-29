import { Injectable } from '@nestjs/common';
import { FeedRepository } from './repositories/feed.repository';
import { Snippet } from 'src/book/entities/snippet.entity';

export interface Feed {
  bookId: number;
  snippetId: number;
  snippetText: string;
  reason: string;
  textToSearch: string;
  themes: string[];
}

@Injectable()
export class FeedService {
  constructor(private readonly feedRepository: FeedRepository) {}

  async getFeed(): Promise<Feed[]> {
    const snippets = await this.feedRepository.getFeed();
    return snippets.map(snippet => this.toFeed(snippet));
  }

  private toFeed(snippet: Snippet): Feed {
    return {
      bookId: snippet.book.id as number,
      snippetId: snippet.id as number,
      snippetText: snippet.snippetText,
      reason: snippet.reason,
      textToSearch: snippet.sentenceText.split(' ').slice(0, 8).join(' '),
      themes: snippet.themes.map(theme => theme.name),
    };
  }
}
