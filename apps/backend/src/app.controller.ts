import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { EmailService } from './res/email/email.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly emailService: EmailService
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @AllowAnonymous()
  @Get("test")
  testEmail(@Query("name") name: string) {

    return name;
  }
}
