import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * Best-effort copy / screenshot deterrents for the web app. A browser cannot
 * truly block screenshots (phone cameras, OS tools); this raises the bar and
 * makes leaks traceable:
 *   - blocks copy/cut, right-click, text selection, Ctrl+P/S/U and devtools keys
 *     (copy/selection still work inside inputs so staff can edit their own text)
 *   - clears the clipboard and blanks the screen on PrintScreen
 *   - blurs the app whenever the window loses focus (Snipping Tool, screen
 *     recorders and window switchers capture the blurred view)
 *   - tiles a watermark with the signed-in user's name, ID and time
 */
@Injectable({ providedIn: 'root' })
export class ScreenProtectionService {
  private started = false;
  private watermarkEl: HTMLElement | null = null;
  private watermarkKey = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private doc: Document,
    private zone: NgZone,
  ) {}

  start(): void {
    if (this.started || !isPlatformBrowser(this.platformId)) return;
    this.started = true;
    const body = this.doc.body;
    body.classList.add('dm-protected');

    // Listeners run outside Angular so they never trigger change detection.
    this.zone.runOutsideAngular(() => {
      const win = this.doc.defaultView!;
      const block = (e: Event) => { if (!this.isEditable(e.target)) e.preventDefault(); };
      this.doc.addEventListener('copy', block, true);
      this.doc.addEventListener('cut', block, true);
      this.doc.addEventListener('selectstart', block, true);
      this.doc.addEventListener('dragstart', block, true);
      this.doc.addEventListener('contextmenu', (e) => e.preventDefault(), true);
      this.doc.addEventListener('keydown', (e) => this.onKeyDown(e), true);
      this.doc.addEventListener('keyup', (e) => {
        if (e.key === 'PrintScreen') this.onPrintScreen();
      }, true);

      // Focus moving into an embedded iframe (PDF/report viewer) also fires
      // window blur; the user is still on the page then, so skip it.
      win.addEventListener('blur', () => setTimeout(() => {
        if (this.doc.activeElement?.tagName !== 'IFRAME') body.classList.add('dm-privacy-blur');
      }));
      win.addEventListener('focus', () => body.classList.remove('dm-privacy-blur'));
      this.doc.addEventListener('visibilitychange', () => {
        body.classList.toggle('dm-privacy-blur', this.doc.visibilityState === 'hidden');
      });
    });
  }

  /** Shows/updates the watermark for the signed-in user; hides it when signed out. */
  refreshWatermark(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    let name = '', id = '';
    try {
      if (localStorage.getItem('token')) {
        name = localStorage.getItem('username') || '';
        id = localStorage.getItem('employeeId') || '';
      }
    } catch { /* storage blocked → no watermark */ }

    const date = new Date().toLocaleDateString('en-IN');
    const key = name ? `${name}|${id}|${date}` : '';
    if (key === this.watermarkKey) return;
    this.watermarkKey = key;

    if (!key) {
      this.watermarkEl?.remove();
      this.watermarkEl = null;
      return;
    }
    if (!this.watermarkEl) {
      this.watermarkEl = this.doc.createElement('div');
      this.watermarkEl.className = 'dm-watermark';
      this.watermarkEl.setAttribute('aria-hidden', 'true');
      this.doc.body.appendChild(this.watermarkEl);
    }
    const label = [name.split('@')[0], id && id !== 'null' ? id : '', date].filter(Boolean).join(' · ');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">` +
      `<text x="20" y="110" transform="rotate(-24 160 90)" font-family="Arial" font-size="14" fill="#1e3a6b">` +
      `${this.escapeXml(label)}</text></svg>`;
    this.watermarkEl.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const blocked =
      key === 'printscreen' ||
      key === 'f12' ||
      (mod && ['p', 's', 'u'].includes(key)) ||
      (mod && ['c', 'x', 'a'].includes(key) && !this.isEditable(e.target)) ||
      (mod && e.shiftKey && ['i', 'j', 'c', 's'].includes(key));
    if (blocked) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (key === 'printscreen') this.onPrintScreen();
  }

  private onPrintScreen(): void {
    const body = this.doc.body;
    body.classList.add('dm-privacy-blur');
    // Overwrite whatever the OS just put on the clipboard (best-effort; needs focus).
    try { this.doc.defaultView?.navigator.clipboard?.writeText('Screenshots are disabled in DocMinds.').catch(() => {}); } catch { /* unsupported */ }
    setTimeout(() => body.classList.remove('dm-privacy-blur'), 1500);
  }

  private isEditable(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el || typeof el.closest !== 'function') return false;
    return !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
  }

  private escapeXml(s: string): string {
    return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
  }
}
