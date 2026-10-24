export const socialPlatforms = ['tiktok', 'snapchat', 'instagram', 'x'] as const;
export const profileSocialPlatforms = ['instagram', 'tiktok', 'facebook', 'snapchat', 'x'] as const;
export type SocialPlatform = (typeof profileSocialPlatforms)[number];
export type SocialLinks = Partial<Record<SocialPlatform, string>>;
export const socialLabels: Record<SocialPlatform, string> = {
  tiktok: 'TikTok',
  snapchat: 'Snapchat',
  instagram: 'Instagram',
  x: 'X',
  facebook: 'Facebook',
};
export const socialExamples: Record<SocialPlatform, string> = {
  tiktok: 'https://www.tiktok.com/@username',
  snapchat: 'https://www.snapchat.com/add/username',
  instagram: 'https://www.instagram.com/username',
  x: 'https://x.com/username',
  facebook: 'https://www.facebook.com/username',
};
/** Only public profile URLs on the named platform; never arbitrary external links. */
export function socialProfile(platform: SocialPlatform, value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const hosts = platform === 'x' ? ['x.com', 'twitter.com'] : [`${platform}.com`];
    if (!hosts.includes(host)) return null;
    const path = url.pathname.replace(/\/$/, '');
    const prefix = platform === 'tiktok' ? '/@' : platform === 'snapchat' ? '/add/' : '/';
    if (!path.startsWith(prefix)) return null;
    const username = path.slice(prefix.length);
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(username)) return null;
    if (
      [
        'explore',
        'accounts',
        'login',
        'signup',
        'intent',
        'share',
        'home',
        'search',
        'settings',
      ].includes(username.toLowerCase())
    )
      return null;
    return {
      username,
      url: `https://${platform === 'x' ? 'x.com' : `www.${platform}.com`}${prefix}${username}`,
    };
  } catch {
    return null;
  }
}
