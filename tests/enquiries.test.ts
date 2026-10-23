import { describe, expect, it } from 'vitest';
import { enquiryMessage, businessEnquiry } from '../src/lib/enquiries';
import { contactLinks, type Content } from '../src/server/validation';
describe('contextual WhatsApp enquiries', () => {
  it('encodes product titles and a canonical link without changing the recipient', () => {
    const title = 'Books & notes — 50% off?';
    const url = 'https://example.com/adverts/123';
    const links = contactLinks(
      { title, kind: 'product', whatsapp: '+233543982307' } as Content,
      url,
    );
    const contact = new URL(links.whatsapp!);
    expect(contact.pathname).toBe('/233543982307');
    expect(contact.searchParams.get('text')).toBe(enquiryMessage('product', title, url));
    expect(contact.searchParams.get('text')).toContain('Is it still available?');
    expect(contact.searchParams.get('text')).toContain(url);
    expect(links.phone).toBeNull();
  });
  it('asks about viewing accommodation instead of collecting a product', () => {
    expect(enquiryMessage('product', 'Campus room', 'link', 'Accommodation')).toContain(
      'arrange a viewing',
    );
    expect(enquiryMessage('product', 'Campus room', 'link', 'Accommodation')).not.toContain(
      'collect',
    );
  });
  it('uses the right intent for wanted, service and campus adverts', () => {
    expect(enquiryMessage('wanted', 'Laptop', 'link')).toContain(
      'I may have what you’re looking for',
    );
    expect(enquiryMessage('service', 'Tutoring', 'link')).toContain('bookings');
    expect(enquiryMessage('event', 'Seminar', 'link')).toContain('register');
    expect(enquiryMessage('promotion', 'Offer', 'link')).toContain('offer still available');
    expect(enquiryMessage('announcement', 'Notice', 'link')).toContain('more information');
    expect(enquiryMessage('business_ad', 'Shop', 'link')).toContain('order or book');
    expect(businessEnquiry('Campus Clothing', 'link')).toContain('Campus Clothing on MedStash');
  });
});
