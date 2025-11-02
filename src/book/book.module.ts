import { Module } from '@nestjs/common';
import { BookService } from './services/book.service';
import { BookController } from './book.controller';
import { SnippetExtractionService } from './services/snippet-extraction.service';
import { EpubParserService } from './services/epub-parser.service';
import { FileStorageService } from './services/file-storage.service';
import { DatabaseModule } from 'src/database/database.module';
import { BookRepository } from './repositories/book.repository';
import { EmbeddingService } from './services/embedding.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [BookController],
  providers: [
    BookService,
    SnippetExtractionService,
    EpubParserService,
    FileStorageService,
    EmbeddingService,
    BookRepository,
  ],
  imports: [DatabaseModule, AuthModule],
})
export class BookModule { }
