import { redirect } from 'next/navigation';
import { fetchMe } from '@/lib/server-api';
import { OnboardingWizard } from './onboarding-wizard';

export default async function OnboardingPage() {
  const me = await fetchMe();
  if (!me) redirect('/sign-in');
  if (me.onboarded) redirect('/dashboard');

  return <OnboardingWizard />;
}
