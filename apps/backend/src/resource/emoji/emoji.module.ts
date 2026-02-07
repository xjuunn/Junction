import { Module } from '@nestjs/common';
import { EmojiService } from './emoji.service';
import { EmojiController } from './emoji.controller';

@Module({
  controllers: [EmojiController],
  providers: [EmojiService],
})
export class EmojiModule {}
