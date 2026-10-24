'use client';
import Link from 'next/link';
import type { ProfileDefaults } from '@/lib/seller-profile';
import { initials } from '@/lib/market';
import { profileSocialPlatforms, socialLabels, socialProfile } from '@/lib/socials';
import { MediaImage } from './ui';
import { SocialIcon } from './social-profiles';
import { Icon } from './icon';

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
  onEdit: (field?: string) => void;
}) {
  const name = data.name || 'Add your name';
  const bio = data.bio || data.description;
  return (
    <section
      className="profile-overview profile-dashboard"
      aria-label={business ? 'Business profile' : 'Personal profile'}
    >
      <div className="profile-left-column">
        <section className="profile-section profile-identity-card">
          <div className="profile-portrait">
            {image ? <MediaImage id={image} alt={name} /> : <span>{initials(name)}</span>}
          </div>
          <h2>{name}</h2>
          <span className="profile-kind">{business ? 'Business seller' : 'Personal seller'}</span>
          <p>{bio ? 'Your public seller profile' : 'Add a short introduction about yourself.'}</p>
          <button className="btn" onClick={() => onEdit('name')}>
            Edit profile
          </button>
        </section>
        <section className="profile-section profile-about">
          <h2>{business ? 'About your business' : 'About you'}</h2>
          <p className="profile-bio">
            {bio ||
              (business
                ? 'Tell buyers about your business and what you offer.'
                : 'Tell buyers a little about yourself and what you sell.')}
          </p>
          <button className="text-link" onClick={() => onEdit(business ? 'description' : 'bio')}>
            {bio ? 'Edit introduction' : 'Add introduction'} →
          </button>
        </section>
      </div>
      <div className="profile-right-column">
        <section className="profile-section">
          <h2>Contact information</h2>
          <p className="profile-section-note">Used to fill in your advert contact details.</p>
          {(
            [
              { label: 'WhatsApp', field: 'whatsapp', value: data.whatsapp, icon: 'chat' },
              { label: 'Phone number', field: 'phone', value: data.phone, icon: 'phone' },
              { label: 'Location', field: 'location', value: data.location, icon: 'pin' },
            ] as const
          ).map((row) => (
            <div className="profile-detail-row" key={row.label}>
              <span className="profile-row-icon">
                <Icon name={row.icon} />
              </span>
              <div>
                <h3>{row.label}</h3>
                <p>{row.value || 'Not added'}</p>
              </div>
              <button
                className="profile-row-action"
                aria-label={`${row.value ? 'Edit' : 'Add'} ${row.label}`}
                onClick={() => onEdit(row.field)}
              >
                {row.value ? 'Edit' : 'Add'}
              </button>
            </div>
          ))}
        </section>
        <section className="profile-section">
          <h2>
            Social media <span>(optional)</span>
          </h2>
          {profileSocialPlatforms.map((platform) => {
            const value = data.socials?.[platform];
            const social = value ? socialProfile(platform, value) : null;
            return (
              <div className="profile-detail-row" key={platform}>
                <span className="profile-row-icon profile-social-letter" aria-hidden="true">
                  <SocialIcon platform={platform} />
                </span>
                <div>
                  <h3>{socialLabels[platform]}</h3>
                  <p>
                    {social ? (
                      <a href={social.url} target="_blank" rel="noopener noreferrer">
                        @{social.username}
                      </a>
                    ) : (
                      'Not added'
                    )}
                  </p>
                </div>
                <button
                  className="profile-row-action"
                  aria-label={`${social ? 'Edit' : 'Add'} ${socialLabels[platform]}`}
                  onClick={() => onEdit(`social.${platform}`)}
                >
                  {social ? 'Edit' : 'Add'}
                </button>
              </div>
            );
          })}
        </section>
        <section className="profile-section profile-visibility-summary">
          <div>
            <h2>Public visibility</h2>
            <p>Choose which socials and {business ? 'logo' : 'photo'} buyers see.</p>
          </div>
          <button className="profile-row-action" onClick={() => onEdit('visible.instagram')}>
            Manage
          </button>
        </section>
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
