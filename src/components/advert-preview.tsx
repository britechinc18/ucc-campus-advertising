import Image from 'next/image';
import { Icon } from './icon';
import { MediaImage } from './ui';
import { priceText, parseMoney, type AdvertContent } from '@/lib/market';
import { kindName } from '@/lib/campus';
import { socialLabels, socialPlatforms, type SocialLinks } from '@/lib/socials';

export function AdvertPreview({
  data,
  seller,
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
  };
  seller: string;
}) {
  const price = parseMoney(data.price);
  return (
    <article className="composer-preview-card" aria-label="Advert preview">
      <header className="preview-brand">
        <Image src="/icons/icon-192.png?v=2" width={36} height={36} alt="MedStash" unoptimized />
        <div>
          <strong>{data.displayName || seller || 'Your seller name'}</strong>
          <span>MedStash · {kindName(data.kind)}</span>
        </div>
      </header>
      <div className="preview-image">
        <MediaImage
          key={data.mediaIds[0] ?? 'empty'}
          id={data.mediaIds[0]}
          alt={data.title || 'Your advert photo'}
        />
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
        {socialPlatforms.some((p) => data.socials[p]) ? (
          <div className="preview-socials">
            {socialPlatforms
              .filter((p) => data.socials[p])
              .map((p) => (
                <span key={p}>{socialLabels[p]}</span>
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
