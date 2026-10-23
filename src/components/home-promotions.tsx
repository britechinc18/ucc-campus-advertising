import Image from 'next/image';
import Link from 'next/link';
import { Icon } from './icon';
export function HomePromotions() {
  return (
    <div className="home-promotions">
      <article className="home-promo deals-promo">
        <div className="promo-photo">
          <Image
            src="/editorial/deals-banner.webp"
            alt="Editorial illustration of headphones, earbuds and a watch on mint"
            fill
            sizes="(max-width: 767px) 100vw, 650px"
          />
        </div>
        <div className="promo-copy">
          <h2>
            Great finds under <strong>GH₵100</strong>
          </h2>
          <Link className="btn" href="/explore?max=9999">
            Shop deals <Icon name="arrow" />
          </Link>
        </div>
      </article>
      <article className="home-promo sell-promo">
        <div className="promo-photo">
          <Image
            src="/editorial/selling-banner.webp"
            alt="Editorial illustration of a backpack and phone on teal"
            fill
            sizes="(max-width: 767px) 100vw, 650px"
          />
        </div>
        <div className="promo-copy">
          <h2>Have something to sell?</h2>
          <p>Post your advert in minutes.</p>
          <Link className="btn" href="/post">
            Post advert <Icon name="arrow" />
          </Link>
        </div>
      </article>
    </div>
  );
}
