import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed() {
    return await this.feedService.getFeed();
  }
}
