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
    @Body() data: Omit<PrismaTypes.Prisma.FriendshipUncheckedCreateInput, 'senderId' | 'status'>
  ) {
    return this.friendshipService.create(session.user.id, data);
  }

  @Get()
  @ApiPagination()
  @ApiOperation({ summary: "好友关系列表", description: "查询好友关系列表" })
  findAll(
    @Session() session: UserSession,
    @Query() data: Omit<PrismaTypes.Prisma.FriendshipWhereInput, 'senderId'> = {},
    @Pagination() pagination: PaginationOptions
  ) {
    return this.friendshipService.findAll(session.user.id, data, pagination);
  }

  @Get(':receiverId')
  @ApiOperation({ summary: "查找某个好友关系" })
  findOne(@Session() session: UserSession, @Param('receiverId') receiverId: string) {
    return this.friendshipService.findOne(session.user.id, receiverId);
  }

  //// 禁止普通用户修改好友关系
  // @Patch(':id')
  // @ApiOperation({ summary: "修改好友关系" })
  // update(
  //   @Session() session: UserSession,
  //   @Param('id') id: string,
  //   @Body() data: Omit<PrismaTypes.Prisma.FriendshipUpdateInput, 'senderId'>
  // ) {
  //   return this.friendshipService.update(id, session.user.id, data);
  // }

  @Patch('accept/:id')
  @ApiOperation({ summary: "接受好友请求" })
  accept(
    @Session() session: UserSession,
    @Param('id') id: string,
  ) {
    return this.friendshipService.update(id, session.user.id, { status: 'ACCEPTED' });
  }

  @Patch('reject/:id')
  @ApiOperation({ summary: "拒绝好友请求" })
  reject(
    @Session() session: UserSession,
    @Param('id') id: string,
  ) {
    return this.friendshipService.update(id, session.user.id, { status: 'REJECTED' });
  }

  @Patch('block/:id')
  @ApiOperation({ summary: "拉黑好友" })
  block(
    @Session() session: UserSession,
    @Param('id') id: string,
  ) {
    return this.friendshipService.update(id, session.user.id, { status: 'BLOCKED' });
  }

  @Delete(':receiverId')
  @ApiOperation({ summary: "删除好友关系" })
  remove(@Session() session: UserSession, @Param('receiverId') receiverId: string) {
    return this.friendshipService.remove(session.user.id, receiverId);
  }
}
