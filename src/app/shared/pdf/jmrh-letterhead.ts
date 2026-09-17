/**
 * Shared JMRH letterhead for browser-side (pdfMake) PDFs — the frontend
 * counterpart to the backend `_shared/pdf-letterhead.ts`.
 *
 * pdfMake can't embed an image the way pdfkit does, so we paint the JMRH
 * letterhead (public/jmrh-visit-summary-letterhead.jpg — A4 at 300dpi, header
 * band on top, address/contact band at the bottom) as a full-page `background`
 * on every page and offset the content margins to clear both bands.
 *
 * Usage in any pdfMake report:
 *   const brand = await getJmrhPdfBranding();
 *   pdfMake.createPdf({ background: brand.background, images: brand.images,
 *                       pageMargins: brand.pageMargins, footer: brand.footer,
 *                       content: [...] }).open();
 * `images` is required whenever `background` is used — the background refers
 * to the letterhead by name. Drop the report's own logo/hospital-name header;
 * the band provides it.
 */

const LETTERHEAD_URL = '/jmrh-visit-summary-letterhead.jpg';
const LETTERHEAD_IMAGE = 'jmrhLetterhead';

/**
 * Style name marking the letterhead footer's pdfMake nodes (see `footer`).
 * Deliberately not defined in any styles dictionary — pdfMake ignores unknown
 * style names, and `style` is one of the few keys it passes to pageBreakBefore.
 */
export const PAGE_FOOTER_STYLE = 'jmrhPageFooter';

let cachedLetterhead: string | null | undefined;

/**
 * Browser-only: load an asset as a data-URL with its original bytes. No canvas
 * round-trip, so the JPEG stays a JPEG — a canvas would re-encode a 300dpi A4
 * page as a multi-MB PNG, bloating every PDF.
 */
async function toDataUrlKeepingBytes(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`letterhead ${url}: HTTP ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface JmrhPdfBranding {
  /** pdfMake `background` — full-page letterhead, or null if the asset failed to load. */
  background: (currentPage: number, pageSize: { width: number; height: number }) => any;
  /** pdfMake `images` dictionary holding the letterhead `background` refers to. */
  images: Record<string, string>;
  /** Top margin clears the letterhead's header band; bottom leaves room for the footer. */
  pageMargins: [number, number, number, number];
  /** Light footer (timestamp + page X of N) that sits above the letterhead's footer band. */
  footer: (currentPage: number, pageCount: number) => any;
}

/**
 * Load the JMRH letterhead (cached) and return the pdfMake doc-definition
 * branding bits. Degrades gracefully — if the asset can't load, `background`
 * returns null (a plain page) so PDF generation never fails.
 *
 * Margins are measured from the artwork: the header band ends at ~82pt and the
 * footer band starts at ~804pt of the 842pt page, so content runs 100pt → 772pt
 * and the timestamp/page line sits just above the footer band.
 */
export async function getJmrhPdfBranding(): Promise<JmrhPdfBranding> {
  if (cachedLetterhead === undefined) {
    try {
      cachedLetterhead = await toDataUrlKeepingBytes(LETTERHEAD_URL);
    } catch {
      cachedLetterhead = null;
    }
  }
  const letterhead = cachedLetterhead;
  const now = new Date();
  return {
    pageMargins: [40, 100, 40, 70],
    // Referenced by name so a multi-page PDF embeds the page image once
    // (~120KB) instead of once per page.
    images: letterhead ? { [LETTERHEAD_IMAGE]: letterhead } : {},
    background: (_currentPage: number, pageSize: { width: number; height: number }) =>
      letterhead
        ? { image: LETTERHEAD_IMAGE, width: pageSize.width, height: pageSize.height }
        : null,
    // Tagged PAGE_FOOTER_STYLE: pdfMake lists footer nodes among a page's
    // content in `pageBreakBefore`, so page-break rules must skip them.
    footer: (currentPage: number, pageCount: number) => ({
      style: PAGE_FOOTER_STYLE,
      columns: [
        { style: PAGE_FOOTER_STYLE, text: `Generated: ${now.toLocaleString()}`, fontSize: 7, color: '#8a94a3' },
        { style: PAGE_FOOTER_STYLE, text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 7, color: '#8a94a3' },
      ],
      margin: [40, 10, 40, 0],
    }),
  };
}
