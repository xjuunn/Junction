import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, UserSession, AllowAnonymous, OptionalAuth } from '@thallesp/nestjs-better-auth';

@ApiTags("用户")
@Controller('users')
export class UserController {

  @ApiOperation({ summary: "我的信息", description: "获取我的信息" })
  @Get('me')
  async getProfile(@Session() session: UserSession) {
    return { user: session.user };
  }

  @ApiOperation({ summary: "公开路由", description: "公开路由" })
  @Get('public')
  @AllowAnonymous()
  async getPublic() {
    return { message: 'Public route' };
  }

  @ApiOperation({ summary: "判断登录状态", description: "可选验证" })
  @Get('optional')
  @OptionalAuth()
  async getOptional(@Session() session: UserSession) {
    return { authenticated: !!session };
  }
}