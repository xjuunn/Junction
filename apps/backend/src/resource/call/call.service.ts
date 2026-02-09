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

  async createLiveKitToken(input: { callId: string; conversationId: string; userId: string; name?: string | null }) {
    const { callId, conversationId, userId, name } = input;
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
      url,
      roomName: callId,
      identity: userId,
    };
  }
}
