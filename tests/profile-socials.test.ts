import { it, expect } from 'vitest';
import { socialProfile } from '../src/lib/socials';
it('validates Facebook profiles without accepting other hosts or credentials', () => {
  expect(socialProfile('facebook', 'https://www.facebook.com/campus.seller')?.username).toBe(
    'campus.seller',
  );
  expect(socialProfile('facebook', 'https://facebook.com.evil.test/campus.seller')).toBeNull();
  expect(socialProfile('facebook', 'https://name:secret@facebook.com/campus')).toBeNull();
  expect(socialProfile('facebook', 'javascript:alert(1)')).toBeNull();
});
