import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { ApiPagination, Pagination, PaginationOptions } from '~/decorators/pagination.decorator';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { PrismaTypes } from '@junction/types';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags("好友关系")
@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) { }

  @Post()
  @ApiOperation({ summary: "创建好友关系" })
  create(
    @Session() session: UserSession,
    @Body() data: PrismaTypes.Prisma.FriendshipUncheckedCreateInput
  ) {
    return this.friendshipService.create(session.user.id, data);
  }

  @Get()
  @ApiPagination()
  @ApiOperation({ summary: "好友关系列表", description: "查询好友关系列表" })
  findAll(
    @Session() session: UserSession,
    @Query() data: PrismaTypes.Prisma.FriendshipWhereInput = {},
    @Pagination() pagination: PaginationOptions
  ) {
    return this.friendshipService.findAll(session.user.id, data, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: "查找某个好友关系" })
  findOne(@Session() session: UserSession, @Param('id') id: string) {
    return this.friendshipService.findOne(session.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "修改好友关系" })
  update(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() data: PrismaTypes.Prisma.FriendshipUpdateInput
  ) {
    return this.friendshipService.update(id, session.user.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: "删除好友关系" })
  remove(@Param('id') id: string, @Session() session: UserSession) {
    return this.friendshipService.remove(id, session.user.id);
  }
}
