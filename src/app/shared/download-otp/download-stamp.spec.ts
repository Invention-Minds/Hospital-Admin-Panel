import { PDFDocument } from 'pdf-lib';
import { Workbook } from 'exceljs';
import { installDownloadStamp, setDownloadRef, stampBlob, stampPrintDocument } from './download-stamp';

const REF = 'EMP1023-20261031-143205-0057';

describe('download-stamp', () => {
  afterEach(() => setDownloadRef(null));

  it('stamps every page of a PDF and does not stamp it twice', async () => {
    const src = await PDFDocument.create();
    src.addPage();
    src.addPage();
    const blob = new Blob([await src.save()], { type: 'application/pdf' });

    const stamped = await stampBlob(blob, 'report.pdf', REF);
    expect(stamped).not.toBeNull();
    const out = await PDFDocument.load(await stamped!.arrayBuffer());
    expect(out.getPageCount()).toBe(2);
    expect(out.getKeywords()).toContain(`DownloadID:${REF}`);
    expect(await stampBlob(stamped!, 'report.pdf', REF)).toBeNull();
  });

  it('adds a footer row and print footer to each Excel sheet', async () => {
    const wb = new Workbook();
    wb.addWorksheet('A').addRow(['Name', 'Age']);
    wb.addWorksheet('B').addRow(['x']);
    const blob = new Blob([(await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer]);

    const stamped = await stampBlob(blob, 'Report.xlsx', REF);
    const back = new Workbook();
    await back.xlsx.load(await stamped!.arrayBuffer());
    back.eachSheet((ws) => {
      expect(String(ws.getRow(ws.rowCount).getCell(1).value)).toBe(`Download ID: ${REF}`);
      expect(ws.headerFooter.oddFooter).toContain(REF);
    });
  });

  it('appends the Download ID as the last CSV line', async () => {
    const stamped = await stampBlob(new Blob(['a,b\r\n1,2\r\n'], { type: 'text/csv' }), 'x.csv', REF);
    expect(await stamped!.text()).toBe(`a,b\r\n1,2\r\n\r\n"Download ID: ${REF}"\r\n`);
  });

  it('adds a strip under PNG images', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const png = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'));
    const stamped = await stampBlob(png, 'chart.png', REF);
    const bmp = await createImageBitmap(stamped!);
    expect(bmp.width).toBe(200);
    expect(bmp.height).toBeGreaterThan(100);
  });

  it('adds one print-only footer to a document', () => {
    const doc = document.implementation.createHTMLDocument('p');
    expect(stampPrintDocument(doc, REF)).not.toBeNull();
    expect(stampPrintDocument(doc, REF)).toBeNull();
    expect(doc.getElementById('dl-stamp-footer')!.textContent).toContain(REF);
  });

  it('saves a stamped copy when an export clicks a download link, even if the URL is revoked at once', async () => {
    installDownloadStamp();
    setDownloadRef(REF);
    // The hook saves through a hidden, already-stamped anchor; catch it.
    const savedHrefs: string[] = [];
    const observer = new MutationObserver((records) =>
      records.forEach((r) => r.addedNodes.forEach((n) => {
        if (n instanceof HTMLAnchorElement && n.dataset['dlStamped'] === '1') savedHrefs.push(n.href);
      })));
    observer.observe(document.body, { childList: true });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['a,b\n1,2\n'], { type: 'text/csv' }));
    a.download = 'list.csv';
    a.click();
    URL.revokeObjectURL(a.href); // what most export call sites do

    await new Promise((r) => setTimeout(r, 300));
    observer.disconnect();
    expect(savedHrefs.length).toBe(1);
    expect(await (await fetch(savedHrefs[0])).text()).toBe(`a,b\n1,2\n\n"Download ID: ${REF}"\n`);
  });

  it('leaves downloads alone when no download was authorised', () => {
    installDownloadStamp();
    setDownloadRef(null);
    const a = document.createElement('a');
    a.href = 'data:text/csv,a';
    a.download = 'x.csv';
    const evt = new MouseEvent('click', { cancelable: true });
    a.addEventListener('click', (e) => e.preventDefault());
    expect(a.dispatchEvent(evt)).toBeFalse(); // native path ran (our listener cancelled it)
  });
});
