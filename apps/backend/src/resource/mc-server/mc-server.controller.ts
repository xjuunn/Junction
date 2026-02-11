import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { McServerService } from './mc-server.service'

@ApiTags('Minecraft服务器管理')
@Controller('mc-server')
export class McServerController {
  constructor(private readonly mcServerService: McServerService) { }

  @Get('servers')
  @ApiOperation({ summary: '获取 Minecraft 服务器配置列表' })
  listServers(@Session() session: UserSession) {
    return this.mcServerService.listServers(session.user.id)
  }

  @Post('servers')
  @ApiOperation({ summary: '创建 Minecraft 服务器配置' })
  createServer(
    @Session() session: UserSession,
    @Body() body: {
      id?: string
      name: string
      protocol?: 'mc-management'
      url?: string
      token?: string
      enabled?: boolean
      tags?: string[]
    }
  ) {
    return this.mcServerService.createServer(session.user.id, body)
  }

  @Patch('servers/:id')
  @ApiOperation({ summary: '更新 Minecraft 服务器配置' })
  updateServer(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string
      protocol: 'mc-management'
      url: string
      token: string
      enabled: boolean
      tags: string[]
    }>
  ) {
    return this.mcServerService.updateServer(session.user.id, id, body)
  }

  @Delete('servers/:id')
  @ApiOperation({ summary: '删除 Minecraft 服务器配置' })
  removeServer(@Session() session: UserSession, @Param('id') id: string) {
    return this.mcServerService.removeServer(session.user.id, id)
  }

  @Post('servers/:id/reconnect')
  @ApiOperation({ summary: '重连 Minecraft 服务器管理通道' })
  reconnectServer(@Session() session: UserSession, @Param('id') id: string) {
    return this.mcServerService.reconnectServer(session.user.id, id)
  }

  @Get('servers/:id/status')
  @ApiOperation({ summary: '获取 Minecraft 服务器状态' })
  getStatus(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Query('force') force?: string
  ) {
    return this.mcServerService.getStatus(session.user.id, id, force === 'true' || force === '1')
  }

  @Get('servers/:id/players/options')
  @ApiOperation({ summary: '获取可选玩家列表（仅可选择，不允许自由输入）' })
  listSelectablePlayers(@Session() session: UserSession, @Param('id') id: string) {
    return this.mcServerService.listSelectablePlayers(session.user.id, id)
  }

  @Post('servers/:id/save')
  @ApiOperation({ summary: '触发服务器保存' })
  save(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body?: { flush?: boolean }
  ) {
    return this.mcServerService.save(session.user.id, id, !!body?.flush)
  }

  @Post('servers/:id/stop')
  @ApiOperation({ summary: '停止服务器' })
  stop(@Session() session: UserSession, @Param('id') id: string) {
    return this.mcServerService.stop(session.user.id, id)
  }

  @Post('servers/:id/system-message')
  @ApiOperation({ summary: '发送系统消息' })
  sendSystemMessage(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { message: string; players?: string[]; overlay?: boolean }
  ) {
    return this.mcServerService.sendSystemMessage(session.user.id, id, body)
  }

  @Post('servers/:id/kick')
  @ApiOperation({ summary: '踢出玩家' })
  kickPlayers(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { players: string[]; message?: string | null }
  ) {
    return this.mcServerService.kickPlayers(session.user.id, id, body)
  }

  @Get('servers/:id/allowlist')
  @ApiOperation({ summary: '获取白名单' })
  getAllowList(@Session() session: UserSession, @Param('id') id: string) {
    return this.mcServerService.getAllowList(session.user.id, id)
  }

  @Post('servers/:id/allowlist')
  @ApiOperation({ summary: '添加白名单' })
  addAllowList(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { players: string[] }
  ) {
    return this.mcServerService.addAllowList(session.user.id, id, body)
  }

  @Delete('servers/:id/allowlist')
  @ApiOperation({ summary: '删除白名单' })
  removeAllowList(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { players: string[] }
  ) {
    return this.mcServerService.removeAllowList(session.user.id, id, body)
  }

  @Get('servers/:id/operators')
  @ApiOperation({ summary: '获取 OP 列表' })
  getOperators(@Session() session: UserSession, @Param('id') id: string) {
    return this.mcServerService.getOperators(session.user.id, id)
  }

  @Post('servers/:id/operators')
  @ApiOperation({ summary: '添加 OP' })
  addOperators(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { players: string[]; permissionLevel?: number; bypassesPlayerLimit?: boolean }
  ) {
    return this.mcServerService.addOperators(session.user.id, id, body)
  }

  @Delete('servers/:id/operators')
  @ApiOperation({ summary: '删除 OP' })
  removeOperators(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { players: string[] }
  ) {
    return this.mcServerService.removeOperators(session.user.id, id, body)
  }

  @Get('servers/:id/bans')
  @ApiOperation({ summary: '获取封禁列表' })
  getBans(@Session() session: UserSession, @Param('id') id: string) {
    return this.mcServerService.getBans(session.user.id, id)
  }

  @Post('servers/:id/bans')
  @ApiOperation({ summary: '添加玩家封禁' })
  addBans(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { players: string[]; reason?: string | null; source?: string | null; expiresAt?: string | null }
  ) {
    return this.mcServerService.addBans(session.user.id, id, body)
  }

  @Delete('servers/:id/bans')
  @ApiOperation({ summary: '移除玩家封禁' })
  removeBans(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { players: string[] }
  ) {
    return this.mcServerService.removeBans(session.user.id, id, body)
  }

  @Post('servers/:id/gamerules')
  @ApiOperation({ summary: '更新游戏规则' })
  updateGameRule(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { key: string; value: string | number | boolean }
  ) {
    return this.mcServerService.updateGameRule(session.user.id, id, body)
  }

  @Post('servers/:id/settings')
  @ApiOperation({ summary: '更新服务器设置' })
  setServerSetting(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { key: string; value: string | number | boolean }
  ) {
    return this.mcServerService.setServerSetting(session.user.id, id, body)
  }

  @Post('servers/:id/rpc')
  @ApiOperation({ summary: '透传原生 RPC 调用（默认关闭）' })
  rpc(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { method: string; params?: Record<string, any> | any[] }
  ) {
    return this.mcServerService.rpc(session.user.id, id, body)
  }

  @Get('audits')
  @ApiOperation({ summary: '查看操作审计日志' })
  listAudits(
    @Session() session: UserSession,
    @Query('serverId') serverId?: string,
    @Query('limit') limit?: string
  ) {
    return this.mcServerService.listAudits(session.user.id, { serverId, limit: limit ? Number(limit) : undefined })
  }
}

