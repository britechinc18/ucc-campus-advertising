export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  href: string;
  date: string;
}
export interface NotificationFeed {
  audience: 'public' | 'seller';
  items: NotificationItem[];
}
