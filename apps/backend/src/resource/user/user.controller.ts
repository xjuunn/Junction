import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, UserSession, AllowAnonymous, OptionalAuth, AuthService } from '@thallesp/nestjs-better-auth';
import { authFactory } from '~/utils/auth';

@ApiTags("用户")
@Controller('user')
export class UserController {

  constructor(
    private readonly authService: AuthService<ReturnType<typeof authFactory>>
  ) { }

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

  @ApiOperation({ summary: "登录", description: "用户API测试的登录" })
  @Post("sign-in")
  @AllowAnonymous()
  async signIn(@Body() body: SignInBody) {
    console.log(body);
    return this.authService.api.signInEmail({
      body: {
        email: body.email,
        password: body.password
      }
    })
  }
}

export interface SignInBody {
  email: string;
  password: string;
}