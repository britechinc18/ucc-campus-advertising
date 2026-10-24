import { redirect } from 'next/navigation';
import { viewer } from '@/server/viewer';
export const metadata = { title: 'Start selling' };
export default async function Sell() {
  const v = await viewer();
  if (!v.user) redirect('/sign-in?next=/onboarding%3Fnext%3D%2Fpost');
  if (!v.user.seller_active) redirect('/onboarding?next=/post');
  redirect('/my-adverts');
}
