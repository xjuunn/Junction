import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator'
import { AdminService } from './admin.service'
import { PrismaValues } from '@junction/types'

@ApiTags('管理员')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('users')
  @ApiPagination()
  @ApiOperation({ summary: '管理员获取用户列表' })
  listUsers(
    @Session() session: UserSession,
    @Pagination() pagination: PaginationOptions,
    @Query('keyword') keyword?: string,
    @Query('accountType') accountType?: PrismaValues.UserAccountType
  ) {
    return this.adminService.listUsers(session.user.id, pagination, { keyword, accountType })
  }

  @Patch('users/:id')
  @ApiOperation({ summary: '管理员更新用户' })
  updateUser(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { role?: string; accountType?: PrismaValues.UserAccountType; banned?: boolean; banReason?: string | null }
  ) {
    return this.adminService.updateUser(session.user.id, id, body)
  }

  @Get('status')
  @ApiOperation({ summary: '管理员查看服务器状态' })
  getStatus(@Session() session: UserSession) {
    return this.adminService.getStatus(session.user.id)
  }

  @Get('database/stats')
  @ApiOperation({ summary: '管理员查看数据库统计' })
  getDatabaseStats(@Session() session: UserSession) {
    return this.adminService.getDatabaseStats(session.user.id)
  }
}
