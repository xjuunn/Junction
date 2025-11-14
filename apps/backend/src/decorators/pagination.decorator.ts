import {
    createParamDecorator,
    ExecutionContext,
    applyDecorators,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export interface PaginationOptions {
    page: number;
    limit: number;
    skip: number;
    take: number;
}

/**
 * 解析 Query 参数并生成分页配置
 */
export const Pagination = createParamDecorator(
    (
        defaultValues: Partial<PaginationOptions> = {},
        ctx: ExecutionContext,
    ): PaginationOptions => {
        const request = ctx.switchToHttp().getRequest();
        const query = request.query;

        const page =
            Math.max(1, Number(query.page)) || defaultValues.page || 1;

        const limit =
            Math.min(100, Number(query.limit)) || defaultValues.limit || 10;

        return {
            page,
            limit,
            skip: (page - 1) * limit,
            take: limit,
        };
    },
);

/**
 * 装饰器：自动添加 swagger 文档
 */
export function ApiPagination() {
    return applyDecorators(
        ApiQuery({
            name: 'page',
            required: false,
            description: '页码（从 1 开始）',
            example: 1,
        }),
        ApiQuery({
            name: 'limit',
            required: false,
            description: '每页数量（最大 100）',
            example: 10,
        }),
    );
}
