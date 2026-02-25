import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResearchModule } from './research/polymarket-activity.module';

@Module({
  imports: [ResearchModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
