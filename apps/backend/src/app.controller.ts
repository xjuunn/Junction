import { BadRequestException, Controller, Get, HttpException, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { EmailService } from './resource/email/email.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) { }

  @ApiOperation({ summary: "hello" })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: "测试" })
  @AllowAnonymous()
  @Get("test")
  test(@Query("name") name: string) {
    return this.appService.test();
  }
}
