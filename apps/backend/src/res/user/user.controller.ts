import { Controller, Get } from '@nestjs/common';
import { Session, UserSession, AllowAnonymous, OptionalAuth } from '@thallesp/nestjs-better-auth';

@Controller('users')
export class UserController {
  @Get('me')
  async getProfile(@Session() session: UserSession) {
    return { user: session.user };
  }

  @Get('public')
  @AllowAnonymous()
  async getPublic() {
    return { message: 'Public route' };
  }

  @Get('optional')
  @OptionalAuth()
  async getOptional(@Session() session: UserSession) {
    return { authenticated: !!session };
  }
}