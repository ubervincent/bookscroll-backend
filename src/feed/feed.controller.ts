import { Controller, Get, Query, Param, ParseIntPipe} from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedResponseDto } from './dto/feed.dto';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(
    @Query('limit') limit?: number, 
  ) : Promise<FeedResponseDto[]> {
    return await this.feedService.getFeed(limit);
  }

  @Get('book/:bookId')
  async getFeedByBookId(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query('limit') limit?: number,
  ) : Promise<FeedResponseDto[]> {
    return await this.feedService.getFeedByBookIdAndLimit(bookId, limit);
  }

  @Get('theme/:theme')
  async getFeedByTheme(
    @Param('theme') theme: string,
    @Query('limit') limit?: number,
  ) : Promise<FeedResponseDto[]> {
    return await this.feedService.getFeedByTheme(theme, limit);
  }
}
