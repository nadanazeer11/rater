import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { AuthUser } from './auth-user.type';

export type AuthedRequest = Request & { user: AuthUser };

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private supabaseUrl: string | null = null;

  private getJwksAndIssuer(): {
    jwks: ReturnType<typeof createRemoteJWKSet>;
    issuer: string;
  } {
    if (!this.jwks || !this.supabaseUrl) {
      const url =
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url) {
        throw new Error(
          'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is not set; cannot verify JWTs',
        );
      }
      this.supabaseUrl = url;
      this.jwks = createRemoteJWKSet(
        new URL(`${url}/auth/v1/.well-known/jwks.json`),
      );
    }
    return { jwks: this.jwks, issuer: `${this.supabaseUrl}/auth/v1` };
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();

    let payload: JWTPayload;
    try {
      const { jwks, issuer } = this.getJwksAndIssuer();
      const verified = await jwtVerify(token, jwks, {
        issuer,
        audience: 'authenticated',
      });
      payload = verified.payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const sub = payload.sub;
    const email = (payload as JWTPayload & { email?: string }).email;
    if (!sub || !email) {
      throw new UnauthorizedException('Token missing sub or email claim');
    }

    req.user = { id: sub, email };
    return true;
  }
}
