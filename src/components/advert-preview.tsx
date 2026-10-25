import Image from 'next/image';
import { Icon } from './icon';
import { MediaImage } from './ui';
import { priceText, parseMoney, type AdvertContent } from '@/lib/market';
import { socialLabels, socialPlatforms, socialProfile, type SocialLinks } from '@/lib/socials';

export function AdvertPreview({
  data,
  onAddPhotos,
  uploading = false,
}: {
  data: {
    title: string;
    description: string;
    price: string;
    priceMode: AdvertContent['priceMode'];
    kind: AdvertContent['kind'];
    location: string;
    phone: string;
    whatsapp: string;
    mediaIds: string[];
    socials: SocialLinks;
    displayName?: string;
    startsAt?: string;
    endsAt?: string;
    offer?: string;
    externalUrl?: string;
  };
  onAddPhotos?: () => void;
  uploading?: boolean;
}) {
  const price = parseMoney(data.price);
  return (
    <article className="composer-preview-card" aria-label="Advert preview">
      <div className="preview-brand">
        <Image src="/icons/icon-192.png?v=2" width={36} height={36} alt="MedStash" unoptimized />
        <div>
          <strong>MedStash</strong>
          <span>Sponsored</span>
        </div>
      </div>
      <div className="preview-image">
        {data.mediaIds.length ? (
          <MediaImage
            key={data.mediaIds[0]}
            id={data.mediaIds[0]}
            alt={data.title || 'Your advert photo'}
          />
        ) : (
          <button
            type="button"
            className="preview-add-photo"
            onClick={onAddPhotos}
            disabled={uploading}
          >
            <span className="preview-add-photo-icon">
              <Icon name="camera" />
              <span>+</span>
            </span>
            <strong>{uploading ? 'Uploading…' : 'Add a photo'}</strong>
            <span>Your cover photo will appear here</span>
          </button>
        )}
        {data.mediaIds.length > 1 ? (
          <span className="preview-photo-count">1 / {data.mediaIds.length}</span>
        ) : null}
      </div>
      <div className="preview-body">
        <h3>{data.title || 'Your advert title'}</h3>
        <p className="price">
          {price !== null || ['free', 'contact'].includes(data.priceMode)
            ? priceText({ priceMode: data.priceMode, pricePesewas: price })
            : 'Your price'}
        </p>
        <p className="preview-description">
          {data.description || 'Your description will appear here as you type.'}
        </p>
        <p className="preview-location">
          <Icon name="pin" />
          {data.location || 'Your campus location'}
        </p>
        {data.phone ? (
          <p className="preview-phone">
            <Icon name="phone" />
            {data.phone}
          </p>
        ) : null}
        {data.whatsapp ? (
          <p className="preview-phone">
            <Icon name="chat" />
            {data.whatsapp}
          </p>
        ) : null}
        {data.startsAt ? (
          <p className="preview-phone">
            <Icon name="calendar" />
            {data.startsAt.replace('T', ' ')} · Ghana time
          </p>
        ) : null}
        {data.endsAt ? (
          <p className="preview-phone">Until {data.endsAt.replace('T', ' ')} · Ghana time</p>
        ) : null}
        {data.offer ? <p className="preview-description">{data.offer}</p> : null}
        {data.externalUrl ? <p className="preview-description">{data.externalUrl}</p> : null}
        {socialPlatforms.some((p) => data.socials[p]) ? (
          <div className="preview-socials">
            {socialPlatforms
              .filter((p) => data.socials[p])
              .map((p) => (
                <span key={p}>
                  {socialLabels[p]} · @
                  {socialProfile(p, data.socials[p]!)?.username ?? data.socials[p]}
                </span>
              ))}
          </div>
        ) : null}
        <div className="preview-contact">
          <span>
            <Icon name={data.whatsapp ? 'chat' : 'phone'} />
            {data.whatsapp ? 'Message seller' : 'Contact seller'}
          </span>
        </div>
      </div>
    </article>
  );
}
