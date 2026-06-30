import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SENDER_PROVIDERS, type SenderProvider } from '@rater/types';

const DOMAIN_RE = /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/** All fields optional — a PATCH. `null` explicitly clears a value; omitted
 *  leaves it unchanged. The Postmark token is write-only (never read back). */
export class UpdateSenderSettingsDto {
  @IsOptional()
  @IsIn(SENDER_PROVIDERS)
  senderProvider?: SenderProvider;

  @IsOptional()
  @ValidateIf((o) => o.replyToEmail !== null)
  @IsEmail()
  replyToEmail?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.fromEmailDomain !== null)
  @IsString()
  @Matches(DOMAIN_RE, { message: 'fromEmailDomain must be a bare domain like example.com' })
  fromEmailDomain?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.postmarkServerToken !== null)
  @IsString()
  @MaxLength(200)
  postmarkServerToken?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.postmarkMessageStream !== null)
  @IsString()
  @MaxLength(100)
  postmarkMessageStream?: string | null;
}
