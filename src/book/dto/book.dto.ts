import { FeedItem } from '../../feed/dto/feed.dto';

export class SentencesResponseDto {
  bookId?: number;
  bookTitle?: string;
  bookAuthor?: string;
  totalSentences: number;
  startSentence: number;
  endSentence: number;
  fullSentence: string;
  previousSentence: string;
  nextSentence: string;
}

export class BookResponseDto {
  id?: number;
  title?: string;
  author?: string;
}

export class SearchResponseDto {
  results: FeedItem[];
}