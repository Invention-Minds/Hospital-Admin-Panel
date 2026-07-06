/**
 * Shared JMRH letterhead for browser-side (pdfMake) PDFs — the frontend
 * counterpart to the backend `_shared/pdf-letterhead.ts`.
 *
 * pdfMake can't embed an image the way pdfkit does, so we paint the JMRH
 * letterhead template (public/jmrh-letterhead.png) as a full-page `background`
 * on every page and offset the content top margin to clear the header band.
 *
 * Usage in any pdfMake report:
 *   const brand = await getJmrhPdfBranding();
 *   pdfMake.createPdf({ background: brand.background, pageMargins: brand.pageMargins,
 *                       footer: brand.footer, content: [...] }).open();
 * Drop the report's own logo/hospital-name header — the band provides it.
 */

let cachedLetterhead: string | null | undefined;

/** Browser-only: load an image URL as a base64 data-URL (Image → canvas). */
function toDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject('no document');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

export interface JmrhPdfBranding {
  /** pdfMake `background` — full-page letterhead, or null if the asset failed to load. */
  background: (currentPage: number, pageSize: { width: number; height: number }) => any;
  /** Top margin clears the letterhead's header band; bottom leaves room for the footer. */
  pageMargins: [number, number, number, number];
  /** Light footer (timestamp + page X of N) that sits above the template's footer band. */
  footer: (currentPage: number, pageCount: number) => any;
}

/**
 * Load the JMRH letterhead (cached) and return the pdfMake doc-definition
 * branding bits. Degrades gracefully — if the asset can't load, `background`
 * returns null (a plain page) so PDF generation never fails.
 */
export async function getJmrhPdfBranding(): Promise<JmrhPdfBranding> {
  if (cachedLetterhead === undefined) {
    try {
      cachedLetterhead = await toDataUrl('/jmrh-letterhead.png');
    } catch {
      cachedLetterhead = null;
    }
  }
  const letterhead = cachedLetterhead;
  const now = new Date();
  return {
    pageMargins: [40, 120, 40, 70],
    background: (_currentPage: number, pageSize: { width: number; height: number }) =>
      letterhead
        ? { image: letterhead, width: pageSize.width, height: pageSize.height }
        : null,
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `Generated: ${now.toLocaleString()}`, fontSize: 7, color: '#8a94a3' },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 7, color: '#8a94a3' },
      ],
      margin: [40, 0, 40, 30],
    }),
  };
}
