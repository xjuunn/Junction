// src/resource/auth/global-auth.module.ts
import { Module, Global } from '@nestjs/common';
import { EmailModule } from '~/resource/email/email.module';
import { EmailService } from '~/resource/email/email.service';
import { authFactory } from '~/utils/auth';
export const BETTER_AUTH_INSTANCE = 'BETTER_AUTH_INSTANCE';

@Global()
@Module({
    imports: [EmailModule],
    providers: [
        {
            provide: BETTER_AUTH_INSTANCE,
            useFactory: (emailService: EmailService) => {
                return authFactory(emailService);
            },
            inject: [EmailService],
        },
    ],
    exports: [BETTER_AUTH_INSTANCE],
})
export class GlobalAuthModule { }