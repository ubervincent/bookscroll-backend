import { Injectable } from '@nestjs/common';

@Injectable()
export class BookService {
  upload(file: Express.Multer.File) {
    return {
      message: `Book ${file.originalname} uploaded successfully`,
    };
  }
}
