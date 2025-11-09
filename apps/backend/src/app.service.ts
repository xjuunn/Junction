import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/resource/prisma/prisma.service';
import { PaginationData } from "@junction/types";
import type { User } from '@prisma/client';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) { }
  getHello(): string {
    return 'Hello World!';
  }

  async test() {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany(),
      this.prisma.user.count()
    ])
    return new PaginationData<User>(data, {
      page: 1,
      pageSize: 20,
      total
    })
  }
}
