import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

const CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong on our side. Please try again.';
    let details: Record<string, string> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = CODES[status] ?? 'ERROR';
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else {
        const b = body as Record<string, any>;
        code = b.code ?? code;
        details = b.details;
        message = Array.isArray(b.message) ? b.message.join(' ') : (b.message ?? message);
      }
    } else if ((exception as any)?.type === 'entity.parse.failed') {
      status = HttpStatus.BAD_REQUEST;
      code = 'BAD_REQUEST';
      message = 'The request body is not valid JSON.';
    } else {
      // Never leak internals (SQL, stack traces) to the client; log them instead.
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
  }
}
