import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CallService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  async createLiveKitToken(input: {
    callId: string;
    conversationId: string;
    userId: string;
    name?: string | null;
    requestHost?: string;
  }) {
    const { callId, conversationId, userId, name, requestHost } = input;
    if (!callId || !conversationId || !userId) {
      throw new BadRequestException('参数不完整');
    }

    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId, isActive: true },
      select: { id: true }
    });
    if (!member) {
      throw new ForbiddenException('无权加入该会话');
    }

    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    const url = this.config.get<string>('LIVEKIT_URL');
    if (!apiKey || !apiSecret || !url) {
      throw new BadRequestException('LiveKit 未配置');
    }

    const publicUrl = this.resolvePublicLivekitUrl({
      livekitUrl: url,
      requestHost,
    });

    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: name || undefined,
    });
    token.addGrant({
      roomJoin: true,
      room: callId,
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token: await token.toJwt(),
      url: publicUrl,
      roomName: callId,
      identity: userId,
    };
  }

  private resolvePublicLivekitUrl(input: {
    livekitUrl: string;
    requestHost?: string;
  }) {
    const base = new URL(input.livekitUrl);
    const requestHost = this.extractHost(input.requestHost);
    if (!requestHost) {
      return input.livekitUrl;
    }

    const protocol = base.protocol.replace(':', '') || 'http';
    return `${protocol}://${requestHost}:${base.port || '7880'}`;
  }

  private extractHost(raw?: string) {
    const value = String(raw || '').trim();
    if (!value) return '';
    const first = value.split(',')[0]?.trim() || '';
    if (!first) return '';
    const withoutProtocol = first.replace(/^https?:\/\//i, '');
    return withoutProtocol.split(':')[0] || '';
  }

}
