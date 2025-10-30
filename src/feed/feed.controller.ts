import { Controller, Get, Query, Param} from '@nestjs/common';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(
    @Query('limit') limit?: number, 
  ) {
    return await this.feedService.getFeed(limit);
  }

  @Get('book/:bookId')
  async getFeedByBookId(@Param('bookId') bookId: number) {
    return await this.feedService.getFeedByBookId(bookId);
  }
}
