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

    return pdfMake;
  })());
}
