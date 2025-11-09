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
}
