import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import path from 'path';
import fs from 'fs';

const MAX_FILENAME_LENGTH = 50;
@Injectable()
export class FileStorageService {
    async saveBook(book: Express.Multer.File) {
        const epubsDir = path.join(process.cwd(), 'epubs');
    
        if (!book || !book.originalname) {
          throw new BadRequestException('Invalid book file');
        }
    
        if (!(await fs.promises.access(epubsDir).then(() => true).catch(() => false))) {
          await fs.promises.mkdir(epubsDir, { recursive: true });
        }
    
        const sanitisedFileName = book.originalname.replace(/[^a-zA-Z0-9.]/g, '_').substring(0, MAX_FILENAME_LENGTH);
    
        const newFilePath = path.join(epubsDir, sanitisedFileName);
        await fs.promises.writeFile(newFilePath, book.buffer);
    
        return newFilePath;
      }

  async deleteBook(filePath: string) {
    await fs.promises.unlink(filePath);
    return { message: `Book file deleted successfully` };
  }
}