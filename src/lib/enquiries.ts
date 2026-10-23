import type { AdvertContent } from './market';
export function enquiryMessage(kind: AdvertContent['kind'], title: string, url: string) {
  const question: Record<AdvertContent['kind'], string> = {
    product:
      'Is it still available? Could you share more about its condition and where I can collect it?',
    wanted:
      'I may have what you’re looking for. Are you still interested? We can discuss the details.',
    service:
      'Are you taking bookings? Could you share your availability and how the service works?',
    event: 'Could you share more about attending and how to register?',
    promotion: 'Is this offer still available? Could you share how I can use it?',
    announcement: 'Could you share a little more information about this?',
    business_ad: 'Could you tell me more about what you offer and how to order or book?',
  };
  return `Hi! I saw “${title}” on MedStash${kind === 'product' ? ' and I’m interested' : ''}. ${question[kind]}\n\n${url}`;
}
export function businessEnquiry(name: string, url: string) {
  return `Hi! I found ${name} on MedStash. Could you tell me more about your products or services and how to order or book?\n\n${url}`;
}
