export class FeedResponseDto {
  bookId?: number;
  bookTitle?: string;
  bookAuthor?: string;
  snippetId?: number;
  snippetText?: string;
  reason?: string;
  sentenceText?: string;
  textToSearch?: string;
  themes?: string[];
  startSentence?: number;
  endSentence?: number;
}