import { requireViewer } from '@/server/viewer';
import { personalProfile } from '@/server/profiles';
import { PersonalProfileForm } from '@/components/personal-profile-form';
import { accountContext } from '@/server/frontend';
import { redirect } from 'next/navigation';
export const metadata = { title: 'My Personal Profile' };
export default async function Personal() {
  const user = await requireViewer('/my-personal-profile');
  const account = await accountContext(user.id);
  if (!account.profiles.length) redirect('/onboarding?next=/my-personal-profile');
  return (
    <main id="main" className="container">
      <PersonalProfileForm profile={await personalProfile(user.id)} />
    </main>
  );
}
