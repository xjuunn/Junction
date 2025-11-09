import { ApiResponse } from "@junction/types";
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : (exception as any)?.message || '未知错误';
        const result: ApiResponse<null> = {
            success: false,
            error: typeof message === 'string'
                ? message
                : (message as any).message,
            data: null,
        }
        response.status(status).json(result);
    }
}