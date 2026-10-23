'use client';
import Link from 'next/link';
import type { ProfileDefaults } from '@/lib/seller-profile';
import { initials } from '@/lib/market';
import { MediaImage } from './ui';
import { Icon } from './icon';
import { SocialProfiles } from './social-profiles';

export function ProfileOverview({
  data,
  image,
  business,
  href,
  onEdit,
}: {
  data: ProfileDefaults & { description?: string };
  image?: string;
  business?: boolean;
  href: string;
  onEdit: () => void;
}) {
  const name = data.name || (business ? 'Your business' : 'Your profile');
  return (
    <section className="profile-overview">
      <div className="profile-cover" />
      <div className="profile-overview-body">
        <div className="profile-identity-row">
          <div className="profile-portrait">
            {image ? <MediaImage id={image} alt={name} /> : <span>{initials(name)}</span>}
          </div>
          <button className="btn secondary" onClick={onEdit}>
            Edit profile
          </button>
        </div>
        <p className="eyebrow">{business ? 'BUSINESS PROFILE' : 'PERSONAL PROFILE'}</p>
        <h1>{name}</h1>
        {data.location ? (
          <p className="profile-location">
            <Icon name="pin" />
            {data.location}
          </p>
        ) : null}
        <p className="profile-bio">
          {data.bio ||
            data.description ||
            (business
              ? 'Add a description to introduce your business.'
              : 'Add a short bio to introduce yourself.')}
        </p>
        <div className="profile-contact-summary">
          <h2>Contact</h2>
          <dl>
            <div>
              <dt>WhatsApp</dt>
              <dd>{data.whatsapp || 'Add your WhatsApp number'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{data.phone || 'Add your phone number'}</dd>
            </div>
          </dl>
          <SocialProfiles socials={data.socials} />
        </div>
        <div className="profile-overview-links">
          <Link className="text-link" href={href}>
            View public profile →
          </Link>
          <Link className="text-link" href="/my-adverts">
            Manage adverts →
          </Link>
        </div>
      </div>
    </section>
  );
}
