import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
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
    this.analyzeEmojiInBackground(created.id, imageUrl);
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
    this.analyzeEmojiInBackground(created.id, imageUrl);
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

    const updated = await this.prisma.emoji.update({
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
    if (data.imageUrl) {
      this.analyzeEmojiInBackground(updated.id, String(data.imageUrl));
    }
    return updated;
  }

  async removeEmoji(userId: string, id: string) {
    return this.prisma.emoji.delete({ where: { id } });
  }

  private analyzeEmojiInBackground(emojiId: string, imageUrl: string) {
    const enabled = (process.env.AI_EMOJI_ENABLED || 'true').toLowerCase() === 'true';
    if (!enabled) return;
    setTimeout(() => {
      this.analyzeEmoji(emojiId, imageUrl).catch(() => undefined);
    }, 0);
  }

  private async analyzeEmoji(emojiId: string, imageUrl: string) {
    const bytes = await this.readImageBytes(imageUrl);
    if (!bytes) return;
    const meta = await this.buildImageMeta(bytes, imageUrl);
    const maxVisionSize = Number(process.env.AI_EMOJI_MAX_BYTES || 4 * 1024 * 1024);
    const ai = bytes.length > maxVisionSize
      ? null
      : await this.callVisionModel(bytes, imageUrl).catch(() => null);
    await this.prisma.emoji.update({
      where: { id: emojiId },
      data: {
        aiSummary: ai?.summary || null,
        aiTags: ai?.tags || null,
        aiText: ai?.text || null,
        aiMeta: meta || undefined
      }
    });
  }

  private async readImageBytes(imageUrl: string) {
    const url = imageUrl?.trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) {
      const response = await fetch(url);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    }
    const normalized = url.startsWith('/') ? url.slice(1) : url;
    const fullPath = join(process.cwd(), normalized);
    return readFile(fullPath);
  }

  private async buildImageMeta(bytes: Buffer, imageUrl: string) {
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const ext = extname(imageUrl || '').replace('.', '').toLowerCase();
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml'
    };
    let width: number | null = null;
    let height: number | null = null;
    try {
      const mod: any = await import('image-size');
      const size = mod?.imageSize ? mod.imageSize(bytes) : null;
      width = size?.width ?? null;
      height = size?.height ?? null;
    } catch {
      // 忽略尺寸解析失败
    }
    return {
      size: bytes.length,
      width,
      height,
      ext: ext || null,
      mime: mimeMap[ext] || null,
      sha256
    };
  }

  private async callVisionModel(bytes: Buffer, imageUrl: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    if (!apiKey) return null;
    const baseUrl = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1';
    const model = process.env.AI_EMOJI_MODEL || process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat';
    const prompt = process.env.AI_EMOJI_PROMPT || '请识别表情包的含义，给出简短描述、关键词（逗号分隔）和可见文字。';

    const dataUrl = this.toDataUrl(bytes, imageUrl);
    const payload = {
      model,
      messages: [
        {
          role: 'system',
          content: '你是企业级视觉理解助手，需要输出结构化 JSON。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `${prompt}\n输出 JSON：{ "summary": string, "tags": string, "text": string }` },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 512
    };

    const endpoint = this.buildChatCompletionUrl(baseUrl);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = String(data?.choices?.[0]?.message?.content ?? '').trim();
    if (!content) return null;
    return this.parseVisionJson(content);
  }

  private toDataUrl(bytes: Buffer, imageUrl: string) {
    const ext = extname(imageUrl || '').replace('.', '').toLowerCase();
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml'
    };
    const mime = mimeMap[ext] || 'image/png';
    const base64 = bytes.toString('base64');
    return `data:${mime};base64,${base64}`;
  }

  private parseVisionJson(content: string) {
    const trimmed = content.trim();
    try {
      const parsed = JSON.parse(trimmed);
      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : null,
        tags: typeof parsed.tags === 'string' ? parsed.tags.trim() : null,
        text: typeof parsed.text === 'string' ? parsed.text.trim() : null
      };
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        const parsed = JSON.parse(match[0]);
        return {
          summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : null,
          tags: typeof parsed.tags === 'string' ? parsed.tags.trim() : null,
          text: typeof parsed.text === 'string' ? parsed.text.trim() : null
        };
      } catch {
        return null;
      }
    }
  }

  private buildChatCompletionUrl(baseUrl: string) {
    const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    if (normalized.endsWith('/chat/completions')) return normalized;
    if (normalized.endsWith('/v1')) return `${normalized}/chat/completions`;
    return `${normalized}/v1/chat/completions`;
  }
}
