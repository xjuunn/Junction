import { Body, Controller, Post, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { Response } from 'express'
import { AiService, AiRequestPayload } from './ai.service'

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post('generate')
  @ApiOperation({ summary: '生成 AI 文本（后端代理）' })
  async generate(@Session() session: UserSession, @Body() body: AiRequestPayload) {
    return this.aiService.generate(session.user.id, body)
  }

  @Post('stream')
  @ApiOperation({ summary: '流式生成 AI 文本（后端代理）' })
  async stream(
    @Session() session: UserSession,
    @Body() body: AiRequestPayload,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    try {
      for await (const chunk of this.aiService.stream(session.user.id, body)) {
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`)
      }
      res.write(`data: [DONE]\n\n`)
    } finally {
      res.end()
    }
  }
}
