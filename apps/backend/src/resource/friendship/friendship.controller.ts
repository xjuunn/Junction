import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { Pagination, PaginationOptions } from '~/decorators/pagination.decorator';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) { }

  @Post()
  create() {
    // return this.friendshipService.create({});
  }

  @Get()
  findAll(@Pagination() pagination: PaginationOptions) {
    return pagination;
    // return this.friendshipService.findAll();
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
