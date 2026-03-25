const STORAGE_KEY = "staymate-notifications";
const MAX_NOTIFICATIONS = 50;

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "booking" | "payment" | "message" | "system";
  read: boolean;
  createdAt: string;
  link?: string;
}

function getAll(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function save(notifications: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  window.dispatchEvent(new Event("staymate:notifications-changed"));
}

export function addNotification(notification: Omit<AppNotification, "id" | "read" | "createdAt">) {
  const all = getAll();
  all.unshift({
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  });
  save(all);
}

export function getNotifications(): AppNotification[] {
  return getAll();
}

export function getUnreadCount(): number {
  return getAll().filter(n => !n.read).length;
}

export function markRead(id: string) {
  const all = getAll();
  const n = all.find(x => x.id === id);
  if (n) { n.read = true; save(all); }
}

export function markAllRead() {
  const all = getAll();
  all.forEach(n => { n.read = true; });
  save(all);
}

export function clearNotifications() {
  save([]);
}
