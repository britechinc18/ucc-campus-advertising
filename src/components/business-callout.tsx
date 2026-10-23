import Image from 'next/image';
import Link from 'next/link';
import { Icon } from './icon';
export function BusinessCallout() {
  return (
    <article className="home-promo business-promo">
      <div className="promo-photo">
        <Image
          src="/editorial/local-business.webp"
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 1200px"
        />
      </div>
      <div className="promo-copy">
        <h2>Run a campus business?</h2>
        <p>Create a profile. Help students find you.</p>
        <Link className="btn" href="/my-business">
          Create your profile <Icon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
