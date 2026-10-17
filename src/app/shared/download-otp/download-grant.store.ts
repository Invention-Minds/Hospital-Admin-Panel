// Download grant storage, kept DI-free so AuthInterceptor can read it without
// depending on HttpClient (which would be a circular injection).

export interface DownloadGrant { grant: string; expiresAt: string }

const STORAGE_KEY = 'downloadGrant';

// The grant belongs to whoever verified it; a different login in the same
// tab must verify again.
const currentUserId = (): string | null => {
  try { return localStorage.getItem('userid'); } catch { return null; }
};

/** The unexpired grant token for the signed-in user, or null. */
export function currentDownloadGrant(): string | null {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    const g = JSON.parse(raw) as DownloadGrant & { userId: string | null };
    if (g.userId !== currentUserId()) return null;
    // 5s margin so a grant doesn't expire mid-request.
    return new Date(g.expiresAt).getTime() - 5000 > Date.now() ? g.grant : null;
  } catch {
    return null;
  }
}

// One-time ticket for the next server file download (captcha + reason passed).
// Memory only: it is consumed by the very next blob request.
let pendingTicket: string | null = null;

export function setDownloadTicket(ticket: string): void {
  pendingTicket = ticket;
}

export function takeDownloadTicket(): string | null {
  const t = pendingTicket;
  pendingTicket = null;
  return t;
}

export function storeDownloadGrant(g: DownloadGrant): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...g, userId: currentUserId() }));
  } catch { /* storage blocked */ }
}
