/**
 * Loads pdfmake (and its embedded fonts) on demand.
 *
 * pdfmake plus its font file is one of the largest dependencies in the app, and
 * only a handful of screens generate PDFs. Importing it statically put it in the
 * initial bundle for every user; the dynamic import keeps it in its own file,
 * fetched the first time a PDF is generated and cached afterwards.
 *
 * Usage: `const pdfMake = await loadPdfMake();` inside the method that builds
 * the document, then `pdfMake.createPdf(docDefinition).open()` as before.
 */
import { currentDownloadRef, stampBlob } from '../download-otp/download-stamp';

let pdfMakePromise: Promise<any> | undefined;

export function loadPdfMake(): Promise<any> {
  return (pdfMakePromise ??= (async () => {
    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);

    const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule;
    const pdfFonts: any = (pdfFontsModule as any).default ?? pdfFontsModule;

    // vfs_fonts has shipped the font table in different shapes across versions.
    const vfs = pdfFonts?.vfs ?? pdfFonts?.pdfMake?.vfs;
    if (vfs) pdfMake.vfs = vfs;

    // Download ID footer: open(), print() and download() all go through
    // getBlob(), so the PDF is stamped once there (download-stamp.ts).
    // getBuffer()/getBase64() — used to send PDFs to the server — are untouched.
    const createPdf = pdfMake.createPdf.bind(pdfMake);
    pdfMake.createPdf = (...args: any[]) => {
      const doc = createPdf(...args);
      const getBlob = doc.getBlob.bind(doc);
      doc.getBlob = (cb: (blob: Blob) => void, options?: any) =>
        getBlob((blob: Blob) => {
          const ref = currentDownloadRef();
          if (!ref) return cb(blob);
          stampBlob(blob, 'document.pdf', ref)
            .then((stamped) => cb(stamped ?? blob))
            .catch((error) => {
              console.error('[download-stamp] could not stamp pdfmake output', error);
              cb(blob);
            });
        }, options);
      return doc;
    };

    return pdfMake;
  })());
}
