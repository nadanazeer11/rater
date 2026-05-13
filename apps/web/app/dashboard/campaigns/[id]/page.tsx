import { notFound, redirect } from 'next/navigation';
import { fetchCampaign, fetchCampaigns, fetchMe } from '@/lib/server-api';
import { CampaignEditor } from './campaign-editor';

type Params = Promise<{ id: string }>;

export default async function CampaignDetailPage({
  params,
}: {
  params: Params;
}) {
  const me = await fetchMe();
  if (!me) redirect('/sign-in');

  const { id } = await params;
  const campaign = await fetchCampaign(id);
  if (!campaign) notFound();

  const location = me.locations.find((l) => l.id === campaign.locationId);
  if (!location) notFound();

  const campaigns = await fetchCampaigns(campaign.locationId);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <CampaignEditor
        campaign={campaign}
        locationName={location.name}
        businessName={location.business.name}
        canArchive={campaigns.length > 1}
      />
    </main>
  );
}
