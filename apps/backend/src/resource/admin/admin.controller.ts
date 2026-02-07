import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator'
import { AdminService } from './admin.service'
import { AdminTableName, PrismaValues } from '@junction/types'

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
  @ApiOperation({ summary: '管理员更新用户信息' })
  updateUser(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() body: { role?: string; accountType?: PrismaValues.UserAccountType; banned?: boolean; banReason?: string | null }
  ) {
    return this.adminService.updateUser(session.user.id, id, body)
  }

  @Get('status')
  @ApiOperation({ summary: '管理员查看服务状态' })
  getStatus(@Session() session: UserSession) {
    return this.adminService.getStatus(session.user.id)
  }

  @Get('database/stats')
  @ApiOperation({ summary: '管理员查看数据库统计' })
  getDatabaseStats(@Session() session: UserSession) {
    return this.adminService.getDatabaseStats(session.user.id)
  }

  @Get('database/tables')
  @ApiOperation({ summary: '管理员获取数据库表定义' })
  getDatabaseTables(@Session() session: UserSession) {
    return this.adminService.getDatabaseTables(session.user.id)
  }

  @Get('database/lookup/:table')
  @ApiOperation({ summary: '管理员数据库外键查询' })
  lookupDatabaseTable(
    @Session() session: UserSession,
    @Param('table') table: AdminTableName,
    @Query('keyword') keyword?: string,
    @Query('limit') limit?: string
  ) {
    return this.adminService.lookupDatabaseTable(session.user.id, table, keyword, limit ? Number(limit) : 20)
  }

  @Get('database/:table')
  @ApiPagination()
  @ApiOperation({ summary: '管理员获取数据表列表' })
  listDatabaseTable(
    @Session() session: UserSession,
    @Param('table') table: AdminTableName,
    @Pagination() pagination: PaginationOptions,
    @Query('keyword') keyword?: string
  ) {
    return this.adminService.listDatabaseTable(session.user.id, table, pagination, keyword)
  }

  @Get('database/:table/:id')
  @ApiOperation({ summary: '管理员获取数据表记录' })
  getDatabaseRow(
    @Session() session: UserSession,
    @Param('table') table: AdminTableName,
    @Param('id') id: string
  ) {
    return this.adminService.getDatabaseRow(session.user.id, table, id)
  }

  @Post('database/:table')
  @ApiOperation({ summary: '管理员新增数据表记录' })
  createDatabaseRow(
    @Session() session: UserSession,
    @Param('table') table: AdminTableName,
    @Body() body: Record<string, any>
  ) {
    return this.adminService.createDatabaseRow(session.user.id, table, body)
  }

  @Patch('database/:table/:id')
  @ApiOperation({ summary: '管理员更新数据表记录' })
  updateDatabaseRow(
    @Session() session: UserSession,
    @Param('table') table: AdminTableName,
    @Param('id') id: string,
    @Body() body: Record<string, any>
  ) {
    return this.adminService.updateDatabaseRow(session.user.id, table, id, body)
  }

  @Delete('database/:table/:id')
  @ApiOperation({ summary: '管理员删除数据表记录' })
  deleteDatabaseRow(
    @Session() session: UserSession,
    @Param('table') table: AdminTableName,
    @Param('id') id: string
  ) {
    return this.adminService.deleteDatabaseRow(session.user.id, table, id)
  }
}
