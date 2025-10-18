import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/res/prisma/prisma.service';
import { PrismaTypes } from '@junction/types';
@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) { }
  getHello(): string {
    return 'Hello World!';
  }

  test() {
    let a: PrismaTypes.User;
    return this.prisma.test.create({
      data: {
        name: "test"
      }
    });
  }
}
