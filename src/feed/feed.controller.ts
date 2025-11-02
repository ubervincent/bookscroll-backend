import { Controller, Get, Query, Param, ParseIntPipe, UseGuards} from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedResponseDto } from './dto/feed.dto';
import { LimitValidationPipe } from './pipes/limit-validation.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
@Controller('feed')
@UseGuards(AuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(
    @CurrentUser() user,
    @Query('limit', new LimitValidationPipe()) limit: number,
  ) : Promise<FeedResponseDto> {
    return await this.feedService.getFeed(user.id, limit);
  }

  @Get('book/:bookId')
  async getFeedByBookId(
    @CurrentUser() user,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Query('limit', new LimitValidationPipe()) limit: number,
  ) : Promise<FeedResponseDto> {
    return await this.feedService.getFeedByBookId(user.id, bookId, limit);
  }

  @Get('theme/:theme')
  async getFeedByTheme(
    @CurrentUser() user,
    @Param('theme') theme: string,
    @Query('limit', new LimitValidationPipe()) limit: number,
  ) : Promise<FeedResponseDto> {
    return await this.feedService.getFeedByTheme(user.id, theme, limit);
  }
}
