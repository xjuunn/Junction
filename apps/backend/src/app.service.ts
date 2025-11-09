import { PrismaTypes } from '@junction/types';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/resource/prisma/prisma.service';
@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) { }
  getHello(): string {
    const user: PrismaTypes.User | null = null;
    return 'Hello World!';
  }
}
