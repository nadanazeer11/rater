import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './sign-out-button';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in');

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">rater</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main>
        <p className="text-sm text-gray-600">
          Dashboard placeholder. Onboarding lands in the next PR.
        </p>
      </main>
    </div>
  );
}
