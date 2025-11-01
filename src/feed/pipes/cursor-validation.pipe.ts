import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class CursorValidationPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata): number {
    const cursor = Number(value);
    
    if (isNaN(cursor)) {
      throw new BadRequestException('Cursor must be a number');
    }
    
    if (cursor < 0) {
      throw new BadRequestException('Cursor must be greater than 0');
    }
    return cursor;
  }
}