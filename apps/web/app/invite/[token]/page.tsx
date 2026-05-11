import { AuthShell } from '@/components/auth-shell';
import { EmptyState } from '@/components/empty-state';
import { createClient } from '@/lib/supabase/server';
import { fetchInvitation } from '@/lib/server-api';
import { InviteAcceptCard } from './invite-accept-card';

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const [invitation, supabase] = await Promise.all([
    fetchInvitation(token),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell>
      {invitation ? (
        <InviteAcceptCard
          token={token}
          invitation={invitation}
          currentUserEmail={user?.email ?? null}
        />
      ) : (
        <EmptyState
          title="Invitation not found"
          description="The link may be invalid, or the invitation may have been revoked. Ask whoever invited you for a fresh one."
        />
      )}
    </AuthShell>
  );
}
