import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class LimitValidationPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata): number {
    const limit = Number(value);
    if (isNaN(limit)) {
      throw new BadRequestException('Limit must be a number');
    }
    if (limit <= 0) {
      throw new BadRequestException('Limit must be greater than 0');
    }
    return limit;
  }
}