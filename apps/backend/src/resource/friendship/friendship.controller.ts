import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
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
    if (data.receiverId === session.user.id) throw new BadRequestException("不能添加自己为好友");
    return this.friendshipService.create(session.user.id, data);
  }

  @Get()
  @ApiPagination()
  @ApiOperation({ summary: "好友关系列表" })
  findAll(
    @Session() session: UserSession,
    @Query() data: Omit<PrismaTypes.Prisma.FriendshipWhereInput, 'senderId'> = {},
    @Pagination() pagination: PaginationOptions
  ) {
    return this.friendshipService.findAll(session.user.id, data, pagination);
  }

  @Get(':friendId')
  @ApiOperation({ summary: "查找某个好友关系" })
  findOne(@Session() session: UserSession, @Param('friendId') friendId: string) {
    return this.friendshipService.findOne(session.user.id, friendId);
  }

  @Get('blocked/list')
  @ApiPagination()
  @ApiOperation({ summary: "拉黑的好友列表" })
  findBlocked(
    @Session() session: UserSession,
    @Pagination() pagination: PaginationOptions
  ) {
    return this.friendshipService.findBlocked(session.user.id, pagination);
  }

  @Patch('accept/:friendId')
  @ApiOperation({ summary: "接受好友请求" })
  accept(@Session() session: UserSession, @Param('friendId') friendId: string) {
    return this.friendshipService.accept(session.user.id, friendId);
  }

  @Patch('reject/:friendId')
  @ApiOperation({ summary: "拒绝好友请求" })
  reject(@Session() session: UserSession, @Param('friendId') friendId: string) {
    return this.friendshipService.update(session.user.id, friendId, { status: 'REJECTED' });
  }

  @Patch('block/:friendId')
  @ApiOperation({ summary: '拉黑好友' })
  block(@Session() session: UserSession, @Param('friendId') friendId: string) {
    return this.friendshipService.update(session.user.id, friendId, { status: 'BLOCKED', isBlocked: true });
  }

  @Patch('unblock/:friendId')
  @ApiOperation({ summary: '解除拉黑' })
  unblock(@Session() session: UserSession, @Param('friendId') friendId: string) {
    return this.friendshipService.update(session.user.id, friendId, { status: 'ACCEPTED', isBlocked: false });
  }

  @Patch(':friendId')
  @ApiOperation({ summary: '更新好友信息（备注等）' })
  update(
    @Session() session: UserSession,
    @Param('friendId') friendId: string,
    @Body() data: { remark?: string }
  ) {
    const updateData: PrismaTypes.Prisma.FriendshipUpdateInput = {};
    if (data.remark !== undefined) {
      updateData.note = data.remark;
    }
    return this.friendshipService.update(session.user.id, friendId, updateData);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: "删除好友关系" })
  remove(@Session() session: UserSession, @Param('friendId') friendId: string) {
    return this.friendshipService.remove(session.user.id, friendId);
  }
}