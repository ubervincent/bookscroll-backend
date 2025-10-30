export class SentencesResponseDto {
  bookId?: number;
  bookTitle?: string;
  bookAuthor?: string;
  startSentence: number;
  endSentence: number;
  fullSentence: string;
  previousSentence: string;
  nextSentence: string;
}