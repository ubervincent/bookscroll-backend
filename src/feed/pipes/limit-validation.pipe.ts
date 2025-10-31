import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class LimitValidationPipe implements PipeTransform {
  transform(value: number): number {
    if (value <= 0) {
      throw new BadRequestException('Limit must be greater than 0');
    }
    return value;
  }
}