'use client';
import type { ManagedProfile } from '@/lib/seller-profile';
import { ProfileFieldEditor } from './profile-field-editor';
export function PersonalProfileForm({
  profile,
  assisted = false,
}: {
  profile: ManagedProfile;
  assisted?: boolean;
}) {
  return (
    <>
      {profile.state === 'pending' ? (
        <p className="inline-notice" role="status">
          Your profile changes are awaiting approval. Your approved details stay public until
          reviewed.
        </p>
      ) : null}
      <ProfileFieldEditor
        key={profile.id}
        id={profile.id}
        version={profile.version}
        initial={profile.draft ?? profile.approved ?? { name: profile.name }}
        assisted={assisted}
        href={profile.linkedCount || profile.overrideCount ? `/sellers/${profile.id}` : undefined}
      />
    </>
  );
}
