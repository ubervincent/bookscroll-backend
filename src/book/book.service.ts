import { Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';

@Injectable()
export class BookService {
  create(createBookDto: CreateBookDto) {
    return {
      message: `Book ${createBookDto.title} by ${createBookDto.author} uploaded successfully`,
      data: createBookDto,
    };
  }
}
