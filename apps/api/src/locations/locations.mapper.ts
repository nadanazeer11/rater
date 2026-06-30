import type { Location } from '@rater/db';
import { LocationResponseDto, SenderSettingsDto } from './dto/location.response';

export function toLocationResponse(loc: Location): LocationResponseDto {
  return {
    id: loc.id,
    name: loc.name,
    googlePlaceId: loc.googlePlaceId,
    googleReviewUrl: loc.googleReviewUrl,
    googleRating: loc.googleRating,
    googleReviewsCount: loc.googleReviewsCount,
    googleAddress: loc.googleAddress,
    baselineScrapedAt: loc.baselineScrapedAt,
    createdAt: loc.createdAt,
  };
}

type SenderSettingsRow = Pick<
  Location,
  | 'senderProvider'
  | 'replyToEmail'
  | 'fromEmailDomain'
  | 'fromEmailDomainVerified'
  | 'postmarkMessageStream'
  | 'postmarkServerToken'
>;

export function toSenderSettings(
  row: SenderSettingsRow,
  sharedFromEmail: string,
): SenderSettingsDto {
  return {
    senderProvider: row.senderProvider,
    replyToEmail: row.replyToEmail,
    fromEmailDomain: row.fromEmailDomain,
    fromEmailDomainVerified: row.fromEmailDomainVerified,
    postmarkMessageStream: row.postmarkMessageStream,
    // Never leak the token — just whether one is configured.
    postmarkConfigured: !!row.postmarkServerToken?.trim(),
    sharedFromEmail,
  };
}
