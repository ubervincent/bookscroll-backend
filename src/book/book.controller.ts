import { Controller, UseInterceptors, UploadedFile, Post, Body, UsePipes } from '@nestjs/common';
import { BookService } from './services/book.service';
import { Snippet } from './services/snippet-extraction.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileSizeValidationPipe } from './pipes/file-size-validation.pipe';
import { FileTypeValidationPipe } from './pipes/file-type-validation.pipe';

@Controller('book')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('book'))
  async upload(
    @UploadedFile(new FileTypeValidationPipe(), new FileSizeValidationPipe()) 
    file: Express.Multer.File,
  ): Promise<{ message: string; snippets: Snippet[] }> {
    const result = await this.bookService.upload(file);
    return result;
  } 
}
