import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { CallService } from './call.service';
import { authFactory } from '~/utils/auth';

@ApiTags('通话')
@Controller('call')
export class CallController {
  constructor(
    private readonly callService: CallService,
  ) { }

  @ApiOperation({ summary: '获取 LiveKit Token', description: '生成房间访问凭证' })
  @Post('livekit/token')
  async getLiveKitToken(
    @Body() body: { callId: string; conversationId: string },
    @Session() session: UserSession,
  ) {
    return this.callService.createLiveKitToken({
      callId: body.callId,
      conversationId: body.conversationId,
      userId: session.user.id,
      name: session.user.name ?? undefined,
    });
  }
}
