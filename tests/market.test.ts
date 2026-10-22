import { describe, it, expect } from 'vitest';
import {
  parseMoney,
  priceText,
  effectiveState,
  stateLabel,
  safeReturn,
  type OwnAdvert,
} from '../src/lib/market';
describe('marketplace presentation boundaries', () => {
  it('converts cedis exactly and rejects ambiguous or out-of-range input', () => {
    expect(parseMoney('0.29')).toBe(29);
    expect(parseMoney('100')).toBe(10000);
    expect(parseMoney('999999.99')).toBe(99999999);
    for (const v of ['1.234', '1e3', '-1', 'NaN', '1,000', '1000000.01', ''])
      expect(parseMoney(v)).toBeNull();
  });
  it('keeps free, contact pricing and wanted budgets distinct', () => {
    expect(priceText({ priceMode: 'free', pricePesewas: 0 })).toBe('Free');
    expect(priceText({ priceMode: 'contact', pricePesewas: null })).toBe('Contact for price');
    expect(priceText({ priceMode: 'budget', pricePesewas: 7500 })).toBe('Budget: GH₵75');
    expect(priceText({ priceMode: 'fixed', pricePesewas: 29 })).toBe('GH₵0.29');
  });
  it('shows timestamp expiry even before maintenance and uses type-specific fulfilment labels', () => {
    expect(
      effectiveState({ state: 'published', expires_at: '2020-01-01T00:00:00Z' } as OwnAdvert),
    ).toBe('expired');
    expect(stateLabel('fulfilled', 'wanted')).toBe('Found');
    expect(stateLabel('fulfilled', 'service')).toBe('Completed');
    expect(stateLabel('fulfilled', 'product')).toBe('Sold');
  });
  it('accepts only local return paths', () => {
    expect(safeReturn('/post?edit=123')).toBe('/post?edit=123');
    for (const url of ['//attacker.invalid', 'https://attacker.invalid', '/\\attacker.invalid'])
      expect(safeReturn(url)).toBe('/my-adverts');
  });
});
