import { Logo } from '@/components/logo';
import { EmptyState } from '@/components/empty-state';
import { fetchReviewRequestByToken } from '@/lib/server-api';
import { RateForm } from './rate-form';
import { GoogleReviewLink } from './google-review-link';

type PageProps = { params: Promise<{ token: string }> };

export default async function RatePage({ params }: PageProps) {
  const { token } = await params;
  const req = await fetchReviewRequestByToken(token);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-[420px]">
        <Logo className="mb-10 text-lg text-ink" />
        {!req ? (
          <EmptyState
            title="This review link isn't valid"
            description="It may have expired, or the link is incomplete. Check with the business that sent it to you."
          />
        ) : req.alreadyRated ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                Thanks{req.rating ? ` — you rated this ${req.rating}★` : ''}
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                You&apos;ve already left a rating for {req.locationName}.
                {req.googleReviewUrl ? ' Want to make it public?' : ' Nothing else to do.'}
              </p>
            </div>
            {req.googleReviewUrl && (
              <GoogleReviewLink url={req.googleReviewUrl} token={token} />
            )}
          </div>
        ) : (
          <RateForm token={token} businessName={req.businessName} locationName={req.locationName} />
        )}
      </div>
    </div>
  );
}
