export class FeedResponseDto {
  items: FeedItem[];
}

export class FeedItem {
  bookId?: number;
  bookTitle?: string;
  bookAuthor?: string;
  snippetId?: number;
  snippetText?: string;
  context?: string;
  sentenceText?: string;
  textToSearch?: string;
  themes?: string[];
  startSentence?: number;
  endSentence?: number;
  originalTextWithIndices?: string;
}