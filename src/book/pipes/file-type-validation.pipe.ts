import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    const allowedTypes = ['application/epub+zip'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type is not allowed. Allowed types are ${allowedTypes.join(', ')}`);
    }
    return file;
  }
}