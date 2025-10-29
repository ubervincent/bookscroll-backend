import { Controller, UseInterceptors, UploadedFile, Post, Body } from '@nestjs/common';
import { BookService } from './book.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('book')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('book'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.bookService.upload(file);
  }
}
