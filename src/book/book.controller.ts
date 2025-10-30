import { Controller, UseInterceptors, UploadedFile, Post, Get, Param, Delete, Query, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { BookService } from './services/book.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileSizeValidationPipe } from './pipes/file-size-validation.pipe';
import { FileTypeValidationPipe } from './pipes/file-type-validation.pipe';
import { SentencesResponseDto } from './dto/book.dto';

@Controller('book')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('book'))
  async upload(
    @UploadedFile(new FileTypeValidationPipe(), new FileSizeValidationPipe()) 
    file: Express.Multer.File,
  ): Promise<{ message: string}> {
    const result = await this.bookService.upload(file);
    return result;
  } 

  @Delete(':id')
  async delete(
    @Param('id') id: number
  ) {
    return await this.bookService.deleteById(id);
  }

  @Get(':bookId/sentences')
  async getBookSentencesById(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query('start', ParseIntPipe) startSentence: number,
    @Query('end', ParseIntPipe) endSentence: number,
  ) : Promise<SentencesResponseDto>{

    if (!startSentence || !endSentence) {
      throw new BadRequestException('Start sentence and end sentence are required');
    }

    if (startSentence < 1 || endSentence < 1) {
      throw new BadRequestException('Start sentence and end sentence must be greater than 0');
    }

    if (startSentence > endSentence) {
      throw new BadRequestException(`Start sentence must be less than end sentence: ${startSentence} > ${endSentence}`);
    }

    return await this.bookService.getBookSentencesByIndices(bookId, startSentence, endSentence);
  }
}
