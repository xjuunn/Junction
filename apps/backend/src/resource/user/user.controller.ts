import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, UserSession, OptionalAuth } from '@thallesp/nestjs-better-auth';
import { UserService } from './user.service';
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator';

@ApiTags("用户")
@Controller('user')
export class UserController {

  constructor(
    private readonly userService: UserService,
  ) { }

  @ApiOperation({ summary: "我的信息", description: "获取我的信息" })
  @Get('me')
  async getProfile(@Session() session: UserSession) {
    return { user: session.user };
  }

  // @ApiOperation({ summary: "公开路由", description: "公开路由" })
  // @Get('public')
  // @AllowAnonymous()
  // async getPublic() {
  //   return { message: 'Public route' };
  // }

  @ApiOperation({ summary: "判断登录状态", description: "可选验证" })
  @Get('isauthenticated')
  @OptionalAuth()
  async isAuthenticated(@Session() session: UserSession) {
    return { authenticated: !!session };
  }

  @ApiOperation({ summary: "搜索用户", description: "通过关键词搜索用户" })
  @ApiPagination()
  @Get("/search")
  async searchUser(@Query("keyword") keyword: string, @Pagination() pagination: PaginationOptions, @Session() session: UserSession) {
    return this.userService.search(keyword, pagination, session.user.id);
  }

  @ApiOperation({ summary: "用户详情", description: "获取用户详细信息" })
  @Get('/findOne/:id')
  async findOne(@Param('id') id: string, @Session() session: UserSession) {
    return this.userService.findOne(id, session.user.id);
  }

  @ApiOperation({ summary: "我的钱包列表", description: "获取当前用户绑定的钱包" })
  @Get('/wallets')
  async listMyWallets(@Session() session: UserSession) {
    return this.userService.listMyWallets(session.user.id);
  }

  @ApiOperation({ summary: "钱包绑定挑战", description: "生成钱包绑定签名挑战消息" })
  @Post('/wallets/nonce')
  async createWalletBindNonce(
    @Session() session: UserSession,
    @Body() body: { walletAddress: string; chainId?: number }
  ) {
    return this.userService.createWalletBindNonce(session.user.id, body);
  }

  @ApiOperation({ summary: "绑定钱包", description: "校验签名并绑定钱包到账户" })
  @Post('/wallets/bind')
  async bindWallet(
    @Session() session: UserSession,
    @Body() body: { walletAddress: string; chainId?: number; message: string; signature: string }
  ) {
    return this.userService.bindWallet(session.user.id, body);
  }

  @ApiOperation({ summary: "设为主钱包", description: "设置指定钱包为主钱包" })
  @Patch('/wallets/:walletId/primary')
  async setPrimaryWallet(@Session() session: UserSession, @Param('walletId') walletId: string) {
    return this.userService.setPrimaryWallet(session.user.id, walletId);
  }

  @ApiOperation({ summary: "解绑钱包", description: "解绑当前用户钱包" })
  @Delete('/wallets/:walletId')
  async unbindWallet(@Session() session: UserSession, @Param('walletId') walletId: string) {
    return this.userService.unbindWallet(session.user.id, walletId);
  }
}
