import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { EnvelopeInterceptor } from './common/envelope.interceptor';
import { validationError } from './common/errors';

// Shared by main.ts and the e2e tests so both run the exact same pipeline.
export function configureApp(app: INestApplication) {
  // Security headers. CSP is off because this API serves JSON and the Swagger page needs inline scripts.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim()) });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // drop unknown fields...
      forbidNonWhitelisted: true, // ...and refuse them, so a client cannot set user_id, role, etc.
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const details: Record<string, string> = {};
        for (const e of errors) {
          const c = e.constraints ?? {};
          details[e.property] = c.whitelistValidation ? 'This field is not allowed.' : (Object.values(c)[0] ?? 'Invalid value.');
        }
        return validationError(details);
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());
}
