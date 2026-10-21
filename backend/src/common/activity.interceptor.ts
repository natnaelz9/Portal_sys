import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    return next.handle().pipe(
      tap((data) => {
        const method = req.method;
        if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return;
        if (!req.user?.id) return;
        if (req.path.includes('/auth/login')) return;
        const entityId = data && typeof data === 'object' && 'id' in data ? String((data as { id: string }).id) : undefined;
        this.prisma.activityLog
          .create({
            data: {
              userId: req.user.id,
              action: method,
              entity: req.path.replace(/^\/api\/?/, ''),
              entityId,
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}
