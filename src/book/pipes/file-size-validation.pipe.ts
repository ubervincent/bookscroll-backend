import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('File size is too large. Maximum size is 50MB');
    }

    return file;
  }
}