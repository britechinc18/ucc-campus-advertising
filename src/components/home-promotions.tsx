import Image from 'next/image';
import Link from 'next/link';
import { Icon } from './icon';
export function HomePromotions() {
  return (
    <div className="home-promotions">
      <article className="home-promo deals-promo">
        <Image
          src="/editorial/sound.webp"
          alt="Real over-ear headphones on a yellow background"
          fill
          sizes="(max-width: 767px) 100vw, 650px"
        />
        <div className="promo-copy">
          <h2>
            Great finds under <strong>GH₵300</strong>
          </h2>
          <Link className="btn" href="/explore?max=29999">
            Shop deals <Icon name="arrow" />
          </Link>
        </div>
      </article>
      <article className="home-promo sell-promo">
        <Image
          src="/editorial/selling.webp"
          alt="A real smartphone held beside a red backpack"
          fill
          sizes="(max-width: 767px) 100vw, 650px"
        />
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
