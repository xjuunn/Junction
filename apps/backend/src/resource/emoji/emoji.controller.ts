import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmojiService } from './emoji.service';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator';
import { PrismaValues } from '@junction/types';

@ApiTags('表情')
@Controller('emoji')
export class EmojiController {
  constructor(private readonly emojiService: EmojiService) {}

  @Get('categories')
  @ApiOperation({ summary: '获取表情分类' })
  listCategories(
    @Session() session: UserSession,
    @Query('status') status?: PrismaValues.EmojiCategoryStatus | 'ALL'
  ) {
    return this.emojiService.listCategories(status);
  }

  @Post('categories')
  @ApiOperation({ summary: '创建表情分类' })
  createCategory(
    @Session() session: UserSession,
    @Body() body: { name: string; description?: string; sortOrder?: number }
  ) {
    return this.emojiService.createCategory(session.user.id, body);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: '更新表情分类' })
  updateCategory(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; sortOrder?: number; status?: PrismaValues.EmojiCategoryStatus }
  ) {
    return this.emojiService.updateCategory(session.user.id, id, body);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '删除表情分类' })
  removeCategory(
    @Session() session: UserSession,
    @Param('id') id: string
  ) {
    return this.emojiService.removeCategory(session.user.id, id);
  }

  @Get()
  @ApiPagination()
  @ApiOperation({ summary: '获取表情列表' })
  listEmojis(
    @Session() session: UserSession,
    @Pagination() pagination: PaginationOptions,
    @Query('keyword') keyword?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: PrismaValues.EmojiStatus | 'ALL'
  ) {
    return this.emojiService.listEmojis(pagination, { keyword, categoryId, status });
  }

  @Post('from-message')
  @ApiOperation({ summary: '从消息创建表情' })
  createFromMessage(
    @Session() session: UserSession,
    @Body() body: { messageId: string; name: string; categoryId?: string; description?: string; keywords?: string | string[] }
  ) {
    return this.emojiService.createFromMessage(session.user.id, body);
  }

  @Post()
  @ApiOperation({ summary: '创建表情' })
  createEmoji(
    @Session() session: UserSession,
    @Body() body: { name: string; imageUrl: string; categoryId?: string; description?: string; keywords?: string | string[] }
  ) {
    return this.emojiService.createEmoji(session.user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新表情' })
  updateEmoji(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      keywords?: string;
      imageUrl?: string;
      categoryId?: string | null;
      status?: PrismaValues.EmojiStatus;
      sortOrder?: number;
      usageCount?: number;
    }
  ) {
    return this.emojiService.updateEmoji(session.user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除表情' })
  removeEmoji(
    @Session() session: UserSession,
    @Param('id') id: string
  ) {
    return this.emojiService.removeEmoji(session.user.id, id);
  }
}
