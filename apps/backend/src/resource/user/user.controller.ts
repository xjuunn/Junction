import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, UserSession, AllowAnonymous, OptionalAuth, AuthService } from '@thallesp/nestjs-better-auth';
import { authFactory } from '~/utils/auth';
import { UserService } from './user.service';
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator';

@ApiTags("用户")
@Controller('user')
export class UserController {

  constructor(
    private readonly authService: AuthService<ReturnType<typeof authFactory>>,
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
  async searchUser(@Query("keyword") keyword: string, @Pagination() pagination: PaginationOptions) {
    return this.userService.search(keyword, pagination);
  }

  @ApiOperation({ summary: "用户详情", description: "获取用户详细信息" })
  @Get('/findOne/:id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

}
