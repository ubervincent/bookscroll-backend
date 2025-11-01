import { Controller, Get, Query, Param, ParseIntPipe} from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedResponseDto } from './dto/feed.dto';
import { LimitValidationPipe } from './pipes/limit-validation.pipe';
import { CursorValidationPipe } from './pipes/cursor-validation.pipe';
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(
    @Query('limit', new LimitValidationPipe()) limit: number, 
    @Query('cursor', new CursorValidationPipe()) cursor: number,
  ) : Promise<FeedResponseDto> {
    return await this.feedService.getFeed(limit, cursor);
  }

  @Get('book/:bookId')
  async getFeedByBookId(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query('limit', new LimitValidationPipe()) limit: number,
    @Query('cursor', new CursorValidationPipe()) cursor: number,
  ) : Promise<FeedResponseDto> {
    return await this.feedService.getFeedByBookIdAndLimit(bookId, limit, cursor);
  }

  @Get('theme/:theme')
  async getFeedByTheme(
    @Param('theme') theme: string,
    @Query('limit', new LimitValidationPipe()) limit: number,
    @Query('cursor', new CursorValidationPipe()) cursor: number,
  ) : Promise<FeedResponseDto> {
    return await this.feedService.getFeedByTheme(theme, limit, cursor);
  }
}
