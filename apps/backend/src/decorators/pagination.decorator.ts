import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PaginationOptions {
    page: number;
    limit: number;
    skip: number;
    take: number;
}

/**
 * 自动从 query 中提取分页参数
 * @example
 * GET /users?page=2&limit=20
 * @returns { page: 2, limit: 20, skip: 20, take: 20 }
 */
export const Pagination = createParamDecorator(
    (defaultValues: Partial<PaginationOptions> = {}, ctx: ExecutionContext): PaginationOptions => {
        const request = ctx.switchToHttp().getRequest();
        const query = request.query;

        const page = Math.max(1, parseInt(query.page) || defaultValues.page || 1);
        const limit = Math.min(100, parseInt(query.limit) || defaultValues.limit || 10);

        return {
            page,
            limit,
            skip: (page - 1) * limit,
            take: limit,
        };
    },
);
