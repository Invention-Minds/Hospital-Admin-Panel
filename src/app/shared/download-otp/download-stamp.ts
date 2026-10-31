// Download ID stamping — prints "Download ID: <ref>" in the footer of every
// file the user takes out of the app. The ref comes from
// POST /api/download-otp/authorize (employeeId-date-time-count) and is
// remembered for a few minutes after the captcha + reason step.
//
// Instead of touching each of the ~110 export call sites, this hooks the few
// points every download passes through (installed once from AppComponent):
//   - <a download> clicks, incl. file-saver, SheetJS writeFile and pdfmake
//     download() → PDF / XLSX / CSV / PNG / JPEG stamped before saving
//   - pdfmake getBlob() (open / print / download) → see pdfmake-loader.ts
//   - window.print() on the app window, and print popups opened with
//     window.open('') + document.write → print-only footer line
//   - stored files opened by URL → openStampedFile()
// Kept DI-free like download-grant.store.ts.

const TTL_MS = 3 * 60 * 1000;
const PDF_MARK = 'DownloadID:';
const FOOTER_ID = 'dl-stamp-footer';

let active: { ref: string; until: number } | null = null;

export function setDownloadRef(ref: string | null | undefined): void {
  active = ref ? { ref, until: Date.now() + TTL_MS } : null;
}

/** The Download ID to stamp, while the last authorised download is recent. */
export function currentDownloadRef(): string | null {
  return active && active.until > Date.now() ? active.ref : null;
}

const footerText = (ref: string) => `Download ID: ${ref}`;

// ---- File stamping --------------------------------------------------------

type Kind = 'pdf' | 'xlsx' | 'csv' | 'image';

function kindOf(name: string, type: string): Kind | null {
  const ext = (name.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
  if (ext === 'pdf' || type === 'application/pdf') return 'pdf';
  if (ext === 'xlsx' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx';
  if (ext === 'csv' || type === 'text/csv') return 'csv';
  if (['png', 'jpg', 'jpeg'].includes(ext) || type === 'image/png' || type === 'image/jpeg') return 'image';
  return null;
}

/** Stamped copy of the file, or null when the type isn't supported / already stamped. */
export async function stampBlob(blob: Blob, fileName: string, ref: string): Promise<Blob | null> {
  switch (kindOf(fileName, blob.type)) {
    case 'pdf': {
      const bytes = await stampPdf(await blob.arrayBuffer(), ref);
      return bytes && new Blob([bytes], { type: 'application/pdf' });
    }
    case 'xlsx':
      return new Blob([await stampXlsx(await blob.arrayBuffer(), ref)], {
        type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    case 'csv': {
      const text = await blob.text();
      if (text.includes(ref)) return null;
      const eol = text.includes('\r\n') ? '\r\n' : '\n';
      return new Blob([`${text.replace(/[\r\n]+$/, '')}${eol}${eol}"${footerText(ref)}"${eol}`], { type: blob.type || 'text/csv' });
    }
    case 'image':
      return stampImage(blob, ref);
    default:
      return null;
  }
}

async function stampPdf(data: ArrayBuffer, ref: string): Promise<Uint8Array | null> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.load(data, { ignoreEncryption: true });
  const keywords = pdf.getKeywords() || '';
  if (keywords.includes(PDF_MARK)) return null; // pdfmake output is stamped at generation
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = footerText(ref);
  const size = 7;
  const textWidth = font.widthOfTextAtSize(text, size);
  for (const page of pdf.getPages()) {
    const box = page.getMediaBox();
    page.drawText(text, { x: box.x + (box.width - textWidth) / 2, y: box.y + 6, size, font, color: rgb(0.35, 0.35, 0.35) });
  }
  pdf.setKeywords([...keywords.split(/\s+/).filter(Boolean), `${PDF_MARK}${ref}`]);
  return pdf.save();
}

async function stampXlsx(data: ArrayBuffer, ref: string): Promise<ArrayBuffer> {
  const { Workbook } = await import('exceljs');
  const wb = new Workbook();
  await wb.xlsx.load(data);
  wb.eachSheet((ws) => {
    ws.addRow([]);
    ws.addRow([footerText(ref)]).font = { italic: true, size: 9, color: { argb: 'FF555555' } };
    // Shows when the sheet is printed / in Page Layout view. Loaded workbooks
    // without page setup (e.g. SheetJS output) have headerFooter = null.
    ws.headerFooter = {
      ...(ws.headerFooter ?? {}),
      oddFooter: `&L&8${footerText(ref)}`,
      evenFooter: `&L&8${footerText(ref)}`,
    };
  });
  return (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

async function stampImage(blob: Blob, ref: string): Promise<Blob | null> {
  const url = nativeCreateObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const strip = Math.max(18, Math.round(img.naturalHeight * 0.03));
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight + strip;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = '#555555';
    ctx.font = `${Math.round(strip * 0.6)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(footerText(ref), canvas.width / 2, img.naturalHeight + strip / 2);
    const type = blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- Print stamping -------------------------------------------------------

/** Adds a print-only footer line (repeated on every printed page). Idempotent. */
export function stampPrintDocument(doc: Document, ref: string): HTMLElement | null {
  try {
    if (doc.getElementById(FOOTER_ID)) return null;
    const host = doc.body || doc.documentElement;
    if (!host) return null;
    const el = doc.createElement('div');
    el.id = FOOTER_ID;
    el.textContent = footerText(ref);
    const style = doc.createElement('style');
    style.textContent =
      `#${FOOTER_ID}{display:none}` +
      `@media print{#${FOOTER_ID}{display:block;position:fixed;left:0;right:0;bottom:0;text-align:center;` +
      `font:8px/1.4 Arial,sans-serif;color:#555;background:#fff}}`;
    el.appendChild(style);
    host.appendChild(el);
    return el;
  } catch {
    return null; // e.g. a cross-origin popup
  }
}

// ---- Hooks ----------------------------------------------------------------

// Blob behind each object URL. Callers often revoke the URL right after
// a.click(), before the async stamp runs, so the Blob is kept here.
const blobsByUrl = new Map<string, Blob>();
let nativeCreateObjectURL: (obj: Blob | MediaSource) => string = (obj) => URL.createObjectURL(obj);
let nativeClick: (this: HTMLAnchorElement) => void = function (this: HTMLAnchorElement) { this.click(); };
let nativeOpen: typeof window.open = (...args) => window.open(...args);

let installed = false;

/** Call once in the browser (not during SSR). */
export function installDownloadStamp(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const createObjectURL = URL.createObjectURL.bind(URL);
  const revokeObjectURL = URL.revokeObjectURL.bind(URL);
  nativeCreateObjectURL = createObjectURL;
  URL.createObjectURL = (obj: Blob | MediaSource): string => {
    const url = createObjectURL(obj);
    if (obj instanceof Blob) blobsByUrl.set(url, obj);
    return url;
  };
  URL.revokeObjectURL = (url: string): void => {
    revokeObjectURL(url);
    setTimeout(() => blobsByUrl.delete(url), 60_000);
  };

  // Programmatic downloads: a.click() and file-saver's a.dispatchEvent(click).
  const proto = HTMLAnchorElement.prototype;
  const click = proto.click;
  const dispatchEvent = proto.dispatchEvent;
  nativeClick = click;
  proto.click = function (this: HTMLAnchorElement) {
    if (!interceptDownload(this)) click.call(this);
  };
  proto.dispatchEvent = function (this: HTMLAnchorElement, event: Event): boolean {
    if (event.type === 'click' && interceptDownload(this)) return true;
    return dispatchEvent.call(this, event);
  };

  // Print of the app window itself.
  const print = window.print.bind(window);
  window.print = () => {
    const ref = currentDownloadRef();
    const el = ref ? stampPrintDocument(document, ref) : null;
    try {
      print();
    } finally {
      el?.remove();
    }
  };

  // Print popups: window.open('') + document.write(html) + print().
  const open = window.open.bind(window);
  nativeOpen = open;
  window.open = (url?: string | URL, target?: string, features?: string): Window | null => {
    const win = open(url, target, features);
    const ref = currentDownloadRef();
    if (win && ref && (!url || String(url) === 'about:blank')) stampPopup(win, ref);
    return win;
  };
}

function stampPopup(win: Window, ref: string): void {
  try {
    const print = win.print.bind(win);
    win.print = () => {
      stampPrintDocument(win.document, ref);
      print();
    };
    const doc = win.document;
    const close = doc.close.bind(doc);
    doc.close = () => {
      close();
      stampPrintDocument(doc, ref);
    };
  } catch {
    /* cross-origin — nothing to stamp */
  }
}

/** Returns true when the click was taken over (the stamped file is saved async). */
function interceptDownload(a: HTMLAnchorElement): boolean {
  const ref = currentDownloadRef();
  if (!ref || !a.hasAttribute('download') || a.dataset['dlStamped'] === '1') return false;
  const href = a.href;
  const fileName = a.download || href;
  const known = blobsByUrl.get(href);
  const sameOrigin = /^https?:/i.test(href) && new URL(href, location.href).origin === location.origin;
  if (!known && !href.startsWith('data:') && !sameOrigin) return false;
  if (!kindOf(fileName, known?.type ?? '') && !href.startsWith('data:image/')) return false;

  void (async () => {
    let original: Blob | null = known ?? null;
    try {
      original ??= await (await fetch(href)).blob();
      const stamped = await stampBlob(original, fileName, ref);
      saveBlob(stamped ?? original, a.download);
    } catch (error) {
      console.error('[download-stamp] could not stamp, saving the original file', error);
      if (original) saveBlob(original, a.download);
      else nativeClick.call(a);
    }
  })();
  return true;
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = nativeCreateObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.dataset['dlStamped'] = '1';
  a.style.display = 'none';
  document.body.appendChild(a);
  nativeClick.call(a);
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---- Stored files ---------------------------------------------------------

/**
 * Opens a stored file (estimation PDF, report, attachment…) in a new tab with
 * the Download ID stamped on it. Falls back to the original URL when the file
 * can't be fetched (e.g. a cross-origin bucket without CORS) or isn't a
 * stampable type.
 */
export async function openStampedFile(url: string, opts: { print?: boolean } = {}): Promise<void> {
  // Open now, while the click still counts as a user gesture (popup blockers).
  const win = nativeOpen('', '_blank');
  if (win) win.opener = null;
  const ref = currentDownloadRef();
  let target = url;
  try {
    if (ref) {
      const res = await fetch(url);
      if (res.ok) {
        const stamped = await stampBlob(await res.blob(), url, ref);
        if (stamped) target = nativeCreateObjectURL(stamped);
      }
    }
  } catch (error) {
    console.error('[download-stamp] could not stamp, opening the original file', error);
  }
  if (!win) {
    nativeOpen(target, '_blank', 'noopener');
    return;
  }
  if (opts.print) win.onload = () => win.print();
  win.location.href = target;
}
