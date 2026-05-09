import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from './auth.guard';
import type { AuthUser } from './auth-user.type';

export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user;
  },
);
