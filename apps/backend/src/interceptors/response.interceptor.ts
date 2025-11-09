import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ApiResponse, PaginationData } from '@junction/types';
import { catchError, map, Observable, throwError } from "rxjs";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T | PaginationData<T>>> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T | PaginationData<T>>> | Promise<Observable<ApiResponse<T | PaginationData<T>>>> {
        return next.handle().pipe(
            map((data: any) => {
                if (data && typeof data === 'object' && Array.isArray(data.items) && data.meta) {
                    return {
                        success: true,
                        error: null,
                        data: {
                            items: data.items,
                            meta: data.meta
                        }
                    }
                }
                return {
                    success: true,
                    error: null,
                    data: data ?? null,
                }
            })
        )
    }
}