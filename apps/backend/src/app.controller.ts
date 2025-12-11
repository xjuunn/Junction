import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) { }

  @ApiOperation({ summary: "hello" })
  @Get()
  @AllowAnonymous()
  getHello(): string {
    return this.appService.getHello();
  }
}
