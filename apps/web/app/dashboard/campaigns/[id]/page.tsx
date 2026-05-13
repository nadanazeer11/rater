import { notFound } from 'next/navigation';
import { fetchCampaign } from '@/lib/server-api';
import { CampaignEditor } from './campaign-editor';

type Params = Promise<{ id: string }>;

export default async function CampaignDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const campaign = await fetchCampaign(id);
  if (!campaign) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <CampaignEditor campaign={campaign} />
    </main>
  );
}
