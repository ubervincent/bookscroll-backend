import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { FeedModule } from './feed/feed.module';

@Module({
  imports: [BookModule, FeedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
