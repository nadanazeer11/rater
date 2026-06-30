import type { SenderProvider } from '@rater/types';

export interface SenderResolveInput {
  provider: SenderProvider;
  businessName: string;
  fromEmailDomain: string | null;
  fromEmailDomainVerified: boolean;
  replyToEmail: string | null;
  messageStream: string | null;
  /** The platform's shared "via rater" from-address (env POSTMARK_FROM_EMAIL). */
  sharedFromEmail: string;
}

export interface ResolvedSender {
  from: string;
  replyTo?: string;
  messageStream: string;
}

/** Strip anything that could break the From display-name header. */
function sanitizeDisplayName(name: string): string {
  return name.replace(/["\r\n]/g, ' ').trim().slice(0, 78) || 'Reviews';
}

/**
 * Resolves the From/Reply-To/stream for a send. Today both providers go through
 * Postmark; the difference is identity:
 *  - `shared`: the platform's verified domain with the business's name on it and
 *    a Reply-To back to the business — zero DNS for the business.
 *  - `postmark_domain`: the business's own verified domain. Falls back to the
 *    shared address if the domain isn't verified yet, so sending never breaks.
 * A future Gmail/Microsoft provider would branch here (different transport),
 * which is why this is a seam and not inlined.
 */
export function resolveSender(input: SenderResolveInput): ResolvedSender {
  const display = sanitizeDisplayName(input.businessName);
  const useOwnDomain =
    input.provider === 'postmark_domain' &&
    input.fromEmailDomainVerified &&
    !!input.fromEmailDomain;
  const address = useOwnDomain
    ? `reviews@${input.fromEmailDomain}`
    : input.sharedFromEmail;
  return {
    from: `"${display}" <${address}>`,
    replyTo: input.replyToEmail ?? undefined,
    messageStream: input.messageStream ?? 'outbound',
  };
}
