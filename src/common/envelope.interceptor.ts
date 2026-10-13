import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';

// Wraps every successful result: { success: true, data, meta? }.
// Arrays are lists, so they also get meta.total. A handler that returns nothing (204) is left empty.
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((result) => {
        if (result === undefined) return result;
        return Array.isArray(result)
          ? { success: true, data: result, meta: { total: result.length } }
          : { success: true, data: result };
      }),
    );
  }
}
