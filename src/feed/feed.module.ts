import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { FeedRepository } from './repositories/feed.repository';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
  imports: [DatabaseModule],
})
export class FeedModule {}
