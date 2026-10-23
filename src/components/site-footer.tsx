import Link from 'next/link';
import { Wordmark } from './shell';

function publicUrl(value: string | undefined, hosts: string[]) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hosts.includes(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
export function SiteFooter() {
  const email = process.env.MEDSTASH_CONTACT_EMAIL;
  const phone = process.env.MEDSTASH_CONTACT_PHONE;
  const socials = [
    [
      'Instagram',
      publicUrl(process.env.MEDSTASH_INSTAGRAM_URL, ['instagram.com', 'www.instagram.com']),
    ],
    ['TikTok', publicUrl(process.env.MEDSTASH_TIKTOK_URL, ['tiktok.com', 'www.tiktok.com'])],
    ['X', publicUrl(process.env.MEDSTASH_X_URL, ['x.com', 'www.x.com'])],
  ].filter((item): item is [string, string] => !!item[1]);
  return (
    <footer className="container footer site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Wordmark showLogo />
          <p>Your campus marketplace.</p>
          <p className="footer-assurances">
            Reviewed before publishing.
            <br />
            Connect directly with advertisers.
          </p>
        </div>
        <nav aria-label="Footer discover">
          <h2>Discover</h2>
          <Link href="/explore">Market</Link>
          <Link href="/businesses">Local businesses</Link>
          <Link href="/campus-360">Campus 360</Link>
          <Link href="/post">Post an advert</Link>
        </nav>
        <nav aria-label="Footer help">
          <h2>Help & information</h2>
          <Link href="/faq">FAQ</Link>
          <Link href="/help">Safe trading</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/help#report">Contact & reports</Link>
          {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? (
            <a href={`mailto:${email}`}>{email}</a>
          ) : null}
          {phone && /^\+[1-9]\d{7,14}$/.test(phone) ? <a href={`tel:${phone}`}>{phone}</a> : null}
        </nav>
        {socials.length ? (
          <nav aria-label="MedStash social media">
            <h2>Follow MedStash</h2>
            {socials.map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getUTCFullYear()} MedStash</span>
        <a href="/editorial/credits.txt">Photo credits</a>
      </div>
    </footer>
  );
}
