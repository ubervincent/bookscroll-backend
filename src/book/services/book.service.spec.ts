import { Test, TestingModule } from '@nestjs/testing';
import { BookService } from '../services/book.service';
import { BookRepository } from '../repositories/book.repository';
import { SnippetExtractionService } from './snippet-extraction.service';
import { EpubParserService } from './epub-parser.service';
import { FileStorageService } from './file-storage.service';
import { DatabaseModule } from 'src/database/database.module';

describe('BookService', () => {
  let service: BookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookService, BookRepository, SnippetExtractionService, EpubParserService, FileStorageService],
      imports: [DatabaseModule],
    }).compile();

    service = module.get<BookService>(BookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
