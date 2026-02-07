import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationData, PrismaTypes, PrismaValues } from '@junction/types';
import { PaginationOptions } from '~/decorators/pagination.decorator';

@Injectable()
export class EmojiService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeKeywords(input?: string | string[]) {
    if (!input) return null;
    if (Array.isArray(input)) {
      const merged = input.map(item => String(item).trim()).filter(Boolean).join(',');
      return merged || null;
    }
    const trimmed = String(input).trim();
    return trimmed || null;
  }

  private extractImageUrl(payload: unknown) {
    if (!payload || typeof payload !== 'object') return null;
    const imageUrl = (payload as any).imageUrl || (payload as any).src;
    if (!imageUrl) return null;
    return String(imageUrl);
  }

  async listCategories(status?: PrismaValues.EmojiCategoryStatus | 'ALL') {
    const where: PrismaTypes.Prisma.EmojiCategoryWhereInput = status && status !== 'ALL'
      ? { status }
      : {};
    return this.prisma.emojiCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async listEmojis(
    userId: string,
    pagination: PaginationOptions,
    query: { keyword?: string; categoryId?: string; status?: PrismaValues.EmojiStatus | 'ALL' }
  ) {
    const keyword = query.keyword?.trim();
    const categoryId = query.categoryId?.trim();
    const status = query.status && query.status !== 'ALL' ? query.status : undefined;

    const prefList = await this.prisma.emojiUserPreference.findMany({
      where: { userId, hidden: false },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { emojiId: true, sortOrder: true }
    });
    if (!prefList.length) {
      return new PaginationData([], { total: 0, limit: pagination.limit, page: pagination.page });
    }

    const prefOrder = new Map(prefList.map((item, index) => [item.emojiId, index]));
    const where: PrismaTypes.Prisma.EmojiWhereInput = {
      id: { in: prefList.map(item => item.emojiId) },
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(keyword
        ? {
          OR: [
            { name: { contains: keyword } },
            { description: { contains: keyword } },
            { keywords: { contains: keyword } }
          ]
        }
        : {})
    };

    const matched = await this.prisma.emoji.findMany({ where });
    const orderedIds = prefList
      .map(item => item.emojiId)
      .filter(id => matched.some(m => m.id === id));
    const total = orderedIds.length;

    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const pageIds = orderedIds.slice(start, end);
    if (!pageIds.length) {
      return new PaginationData([], { total, limit: pagination.limit, page: pagination.page });
    }
    const pageItems = await this.prisma.emoji.findMany({
      where: { id: { in: pageIds } }
    });
    const sorted = pageItems.slice().sort((a, b) => {
      return (prefOrder.get(a.id) ?? 0) - (prefOrder.get(b.id) ?? 0);
    });

    return new PaginationData(sorted, { total, limit: pagination.limit, page: pagination.page });
  }

  async createCategory(userId: string, data: { name: string; description?: string; sortOrder?: number }) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('分类名称不能为空');

    return this.prisma.emojiCategory.create({
      data: {
        name,
        description: data.description?.trim() || null,
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0
      }
    });
  }

  async updateCategory(userId: string, id: string, data: Partial<PrismaTypes.Prisma.EmojiCategoryUpdateInput>) {
    const exists = await this.prisma.emojiCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('分类不存在');

    return this.prisma.emojiCategory.update({
      where: { id },
      data: {
        ...(data.name ? { name: String(data.name).trim() } : {}),
        ...(data.description !== undefined ? { description: data.description ? String(data.description).trim() : null } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: Number(data.sortOrder) || 0 } : {}),
        ...(data.status ? { status: data.status as PrismaValues.EmojiCategoryStatus } : {})
      }
    });
  }

  async removeCategory(userId: string, id: string) {
    return this.prisma.emojiCategory.delete({ where: { id } });
  }

  async createEmoji(
    userId: string,
    data: { name: string; imageUrl: string; categoryId?: string; description?: string; keywords?: string | string[] }
  ) {
    const name = data.name?.trim();
    const imageUrl = data.imageUrl?.trim();
    if (!name) throw new BadRequestException('表情名称不能为空');
    if (!imageUrl) throw new BadRequestException('图片地址不能为空');

    const created = await this.prisma.emoji.create({
      data: {
        name,
        imageUrl,
        categoryId: data.categoryId?.trim() || null,
        description: data.description?.trim() || null,
        keywords: this.normalizeKeywords(data.keywords),
        createdById: userId
      }
    });
    await this.bumpEmojiToTop(userId, created.id);
    return created;
  }

  async createFromMessage(
    userId: string,
    data: { messageId: string; name: string; categoryId?: string; description?: string; keywords?: string | string[] }
  ) {
    const messageId = data.messageId?.trim();
    if (!messageId) throw new BadRequestException('消息 ID 不能为空');
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('表情名称不能为空');

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true, payload: true }
    });
    if (!message) throw new NotFoundException('消息不存在');

    const isMember = await this.prisma.conversationMember.findFirst({
      where: { conversationId: message.conversationId, userId }
    });
    if (!isMember) throw new ForbiddenException('无权使用该消息');

    const imageUrl = this.extractImageUrl(message.payload);
    if (!imageUrl) throw new BadRequestException('消息不包含可用图片');

    const existing = await this.prisma.emoji.findFirst({
      where: { imageUrl }
    });
    if (existing) {
      if (existing.status === PrismaValues.EmojiStatus.DISABLED) {
        throw new BadRequestException('表情已被停用');
      }
      await this.bumpEmojiToTop(userId, existing.id);
      return existing;
    }

    const created = await this.prisma.emoji.create({
      data: {
        name,
        imageUrl,
        categoryId: data.categoryId?.trim() || null,
        description: data.description?.trim() || null,
        keywords: this.normalizeKeywords(data.keywords),
        createdById: userId,
        sourceMessageId: messageId
      }
    });
    await this.bumpEmojiToTop(userId, created.id);
    return created;
  }

  async bumpEmojiToTop(userId: string, id: string) {
    const max = await this.prisma.emojiUserPreference.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });
    const nextOrder = (max?.sortOrder ?? 0) + 1;
    return this.prisma.emojiUserPreference.upsert({
      where: { userId_emojiId: { userId, emojiId: id } },
      create: { userId, emojiId: id, sortOrder: nextOrder, hidden: false },
      update: { sortOrder: nextOrder, hidden: false }
    });
  }

  async hideEmojiForUser(userId: string, id: string) {
    return this.prisma.emojiUserPreference.upsert({
      where: { userId_emojiId: { userId, emojiId: id } },
      create: { userId, emojiId: id, hidden: true, sortOrder: 0 },
      update: { hidden: true }
    });
  }

  async updateEmojiOrderForUser(userId: string, id: string, sortOrder: number) {
    return this.prisma.emojiUserPreference.upsert({
      where: { userId_emojiId: { userId, emojiId: id } },
      create: { userId, emojiId: id, sortOrder, hidden: false },
      update: { sortOrder, hidden: false }
    });
  }

  async updateEmoji(userId: string, id: string, data: Partial<PrismaTypes.Prisma.EmojiUncheckedUpdateInput>) {
    const exists = await this.prisma.emoji.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('表情不存在');

    return this.prisma.emoji.update({
      where: { id },
      data: {
        ...(data.name ? { name: String(data.name).trim() } : {}),
        ...(data.description !== undefined ? { description: data.description ? String(data.description).trim() : null } : {}),
        ...(data.keywords !== undefined ? { keywords: this.normalizeKeywords(data.keywords as any) } : {}),
        ...(data.imageUrl ? { imageUrl: String(data.imageUrl).trim() } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId ? String(data.categoryId).trim() : null } : {}),
        ...(data.status ? { status: data.status as PrismaValues.EmojiStatus } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: Number(data.sortOrder) || 0 } : {}),
        ...(data.usageCount !== undefined ? { usageCount: Number(data.usageCount) || 0 } : {})
      }
    });
  }

  async removeEmoji(userId: string, id: string) {
    return this.prisma.emoji.delete({ where: { id } });
  }
}
