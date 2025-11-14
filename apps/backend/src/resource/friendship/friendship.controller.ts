import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { Pagination, PaginationOptions } from '~/decorators/pagination.decorator';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import { PrismaTypes } from '@junction/types';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) { }

  @Post()
  create() {
    // return this.friendshipService.create({});
  }

  @Get()
  findAll(
    @Session() session: UserSession,
    @Query() data: PrismaTypes.Prisma.FriendshipWhereInput = {},
    @Pagination() pagination: PaginationOptions
  ) {
    return this.friendshipService.findAll(session.user.id, data, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // return this.friendshipService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string) {
    // return this.friendshipService.update(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // return this.friendshipService.remove(+id);
  }
}
