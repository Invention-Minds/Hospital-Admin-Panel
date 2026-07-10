import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';
import { getJmrhPdfBranding, JmrhPdfBranding } from '../../shared/pdf/jmrh-letterhead';
import {
  AppointmentConfirmService,
  InvestigationOrderPayload,
  RadiologySafetyInfo,
} from '../../services/appointment-confirm.service';
import { InvestigationSeederService } from './investigation-seeder.service';
import { LAB_TEST_SEED } from './investigation-catalog.seed';

interface CatalogTest {
  id: number;
  description: string;
  department: string;
}

interface LabGroup {
  department: string;
  tests: CatalogTest[];
}

interface RadiologyGroup {
  modality: string;
  tests: CatalogTest[];
}

/**
 * Faithful digital replica of the paper LAB + RADIOLOGY request forms, embedded
 * in the OPD assessment. Renders the lab catalog as a grouped checkbox grid
 * (one box per department, mirroring the printed columns) and a radiology panel
 * with modality checkboxes + safety screening.
 *
 * On save it creates a REAL investigation order via createOrder(), so selected
 * tests hit the lab/radiology queues and results flow back through the existing
 * pending-orders system.
 *
 * Catalog IDs come from the live DB. If the catalog is empty the component shows
 * a one-time "Load catalog" button that seeds it from the paper-form list.
 */
@Component({
  selector: 'app-investigation-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investigation-order.component.html',
  styleUrls: ['./investigation-order.component.css'],
})
export class InvestigationOrderComponent implements OnInit, OnChanges {
  /** Patient registration number the order is filed against. */
  @Input() prn: string | null | undefined = '';
  @Input() doctorId: number | null | undefined = 0;
  @Input() doctorName: string | null | undefined = '';
  /** Order date, 'YYYY-MM-DD'. Defaults to today if omitted. */
  @Input() date = '';
  /** Hide the built-in Save/Clear bar when a parent (e.g. OPD) drives saving. */
  @Input() showActions = true;
  // Patient demographics — used only for the standalone request-form print header.
  @Input() patientName: string | null | undefined = '';
  @Input() age: string | number | null | undefined = '';
  @Input() gender: string | null | undefined = '';
  @Input() department: string | null | undefined = '';
  @Input() doctorKmc: string | null | undefined = '';

  @Output() saved = new EventEmitter<any>();
  @Output() failed = new EventEmitter<any>();

  // Canonical group order, derived from the paper form (seed) so the grid
  // matches the printed sheet regardless of DB row order.
  private readonly groupOrder: string[] = Array.from(
    new Set(LAB_TEST_SEED.map((t) => t.department)),
  );

  labGroups: LabGroup[] = [];
  radiologyTests: CatalogTest[] = [];
  radiologyGroups: RadiologyGroup[] = [];

  selectedLabIds = new Set<number>();
  selectedRadiologyIds = new Set<number>();

  labSearch = '';
  radiologySearch = '';
  remarks = '';

  // Collapsible group state — which department/modality panels are expanded.
  // Default collapsed (1000+ tests): the doctor opens only what they need.
  expandedLab = new Set<string>();
  expandedRad = new Set<string>();

  // Radiology modality buckets (derived from the test name — see deriveModality).
  private readonly radModalityOrder = [
    'X-Ray', 'CT', 'MRI', 'Ultrasound', 'Doppler', 'Mammography', 'BMD', 'PET', 'Others',
  ];

  // Radiology safety screening (paper form).
  readonly priorities = ['Emergency', 'Routine', 'In-Patient', 'Out-Patient', 'MLC', 'Health Check'];
  readonly comorbidityOptions = ['Asthma', 'Diabetes', 'HTN'];
  radiology: RadiologySafetyInfo & { otherComorbidity?: string } = {
    comorbidities: [],
  };

  loading = false;
  saving = false;
  seeding = false;
  catalogEmpty = false;

  // Read-only list of this patient's previously placed orders (most recent first).
  priorOrders: any[] = [];
  loadingPrior = false;

  constructor(
    private api: AppointmentConfirmService,
    private seeder: InvestigationSeederService,
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
    if (this.prn) this.loadPriorOrders();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // prn often arrives after init (parent loads patient async) — reload then.
    if (changes['prn'] && !changes['prn'].firstChange && this.prn) {
      this.loadPriorOrders();
    }
  }

  loadPriorOrders(): void {
    if (!this.prn) {
      this.priorOrders = [];
      return;
    }
    this.loadingPrior = true;
    this.api.getInvestigationOrdersByPrn(String(this.prn)).subscribe({
      next: (orders) => {
        this.priorOrders = orders ?? [];
        this.loadingPrior = false;
      },
      error: () => {
        this.priorOrders = [];
        this.loadingPrior = false;
      },
    });
  }

  loadCatalog(): void {
    this.loading = true;
    this.api.getLabTests().subscribe({
      next: (labs) => {
        this.labGroups = this.groupLabs(labs ?? []);
        this.api.getRadiologyTests().subscribe({
          next: (rads) => {
            this.radiologyTests = (rads ?? []) as CatalogTest[];
            this.radiologyGroups = this.groupRadiology(this.radiologyTests);
            this.catalogEmpty =
              this.labGroups.length === 0 && this.radiologyTests.length === 0;
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          },
        });
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private groupLabs(labs: CatalogTest[]): LabGroup[] {
    const byDept = new Map<string, CatalogTest[]>();
    for (const t of labs) {
      const dept = t.department || 'OTHERS';
      if (!byDept.has(dept)) byDept.set(dept, []);
      byDept.get(dept)!.push(t);
    }
    // Order groups by the paper-form sequence; any unknown groups go last.
    const ordered: LabGroup[] = [];
    for (const dept of this.groupOrder) {
      if (byDept.has(dept)) {
        ordered.push({ department: dept, tests: byDept.get(dept)! });
        byDept.delete(dept);
      }
    }
    for (const [dept, tests] of byDept) {
      ordered.push({ department: dept, tests });
    }
    return ordered;
  }

  /** Lab groups filtered by the search box (a group is hidden when no test matches). */
  get visibleLabGroups(): LabGroup[] {
    const q = this.labSearch.trim().toLowerCase();
    if (!q) return this.labGroups;
    return this.labGroups
      .map((g) => ({
        department: g.department,
        tests: g.tests.filter((t) => t.description.toLowerCase().includes(q)),
      }))
      .filter((g) => g.tests.length > 0);
  }

  // ─── Radiology grouping (derived modality) ──────────────────────────────
  /** Classify a radiology study into a modality bucket from keywords in its name.
   *  Order matters — the most specific patterns are tested first; anything
   *  unmatched falls into 'Others'. Tweak the patterns if studies are mis-binned. */
  private deriveModality(description: string): string {
    const d = (description || '').toUpperCase();
    if (/\bMRI\b|MAGNETIC RESONANCE/.test(d)) return 'MRI';
    if (/DOPPLER/.test(d)) return 'Doppler';
    if (/\bCT\b|CECT|NCCT|HRCT|CONTRAST CT|COMPUTED TOMOGRAPH/.test(d)) return 'CT';
    if (/MAMMO/.test(d)) return 'Mammography';
    if (/\bBMD\b|DEXA|BONE DENSIT/.test(d)) return 'BMD';
    if (/\bPET\b/.test(d)) return 'PET';
    if (/\bUSG\b|ULTRA\s?SOUND|SONO|\bU\.?S\.?G\b|SCAN\b|ABDOMEN|PELVI|OBST|ANOMALY|NT SCAN|TVS\b/.test(d)) return 'Ultrasound';
    if (/X-?\s?RAY|\bXRAY\b|\bIVP\b|\bKUB\b|BARIUM|\bPNS\b|\bHSG\b|SKIAGRAM/.test(d)) return 'X-Ray';
    return 'Others';
  }

  private groupRadiology(tests: CatalogTest[]): RadiologyGroup[] {
    const byMod = new Map<string, CatalogTest[]>();
    for (const t of tests) {
      const mod = this.deriveModality(t.description);
      if (!byMod.has(mod)) byMod.set(mod, []);
      byMod.get(mod)!.push(t);
    }
    const ordered: RadiologyGroup[] = [];
    for (const mod of this.radModalityOrder) {
      if (byMod.has(mod)) {
        ordered.push({ modality: mod, tests: byMod.get(mod)! });
        byMod.delete(mod);
      }
    }
    for (const [mod, list] of byMod) ordered.push({ modality: mod, tests: list });
    return ordered;
  }

  /** Radiology groups filtered by the radiology search box. */
  get visibleRadiologyGroups(): RadiologyGroup[] {
    const q = this.radiologySearch.trim().toLowerCase();
    if (!q) return this.radiologyGroups;
    return this.radiologyGroups
      .map((g) => ({ modality: g.modality, tests: g.tests.filter((t) => t.description.toLowerCase().includes(q)) }))
      .filter((g) => g.tests.length > 0);
  }

  // ─── Collapse / expand + per-group selection counts ─────────────────────
  toggleLabGroup(dept: string): void {
    this.expandedLab.has(dept) ? this.expandedLab.delete(dept) : this.expandedLab.add(dept);
  }
  toggleRadGroup(mod: string): void {
    this.expandedRad.has(mod) ? this.expandedRad.delete(mod) : this.expandedRad.add(mod);
  }
  /** A group is shown open when the user expanded it, or a search is filtering. */
  isLabExpanded(dept: string): boolean {
    return this.expandedLab.has(dept) || this.labSearch.trim().length > 0;
  }
  isRadExpanded(mod: string): boolean {
    return this.expandedRad.has(mod) || this.radiologySearch.trim().length > 0;
  }
  labSelectedInGroup(group: LabGroup): number {
    return group.tests.reduce((n, t) => n + (this.selectedLabIds.has(t.id) ? 1 : 0), 0);
  }
  radSelectedInGroup(group: RadiologyGroup): number {
    return group.tests.reduce((n, t) => n + (this.selectedRadiologyIds.has(t.id) ? 1 : 0), 0);
  }

  toggleLab(id: number): void {
    this.selectedLabIds.has(id)
      ? this.selectedLabIds.delete(id)
      : this.selectedLabIds.add(id);
  }

  toggleRadiology(id: number): void {
    this.selectedRadiologyIds.has(id)
      ? this.selectedRadiologyIds.delete(id)
      : this.selectedRadiologyIds.add(id);
  }

  toggleComorbidity(value: string): void {
    const list = this.radiology.comorbidities ?? (this.radiology.comorbidities = []);
    const i = list.indexOf(value);
    i > -1 ? list.splice(i, 1) : list.push(value);
  }

  get selectedLabCount(): number {
    return this.selectedLabIds.size;
  }
  get selectedRadiologyCount(): number {
    return this.selectedRadiologyIds.size;
  }
  get hasRadiology(): boolean {
    return this.selectedRadiologyIds.size > 0;
  }
  get isEmpty(): boolean {
    return this.selectedLabIds.size === 0 && this.selectedRadiologyIds.size === 0;
  }

  /** Names of currently-selected tests, for the summary strip. */
  get selectedLabNames(): string[] {
    const out: string[] = [];
    for (const g of this.labGroups) {
      for (const t of g.tests) if (this.selectedLabIds.has(t.id)) out.push(t.description);
    }
    return out;
  }
  get selectedRadiologyNames(): string[] {
    return this.radiologyTests
      .filter((t) => this.selectedRadiologyIds.has(t.id))
      .map((t) => t.description);
  }

  orderLabNames(o: any): string {
    return (o?.labTests ?? []).map((t: any) => t.description).join(', ');
  }
  orderRadiologyNames(o: any): string {
    return (o?.radiologyTests ?? []).map((t: any) => t.description).join(', ');
  }

  /** Selected lab tests grouped by department, for the OPD print table. */
  get selectedLabByDepartment(): { department: string; tests: string[] }[] {
    const out: { department: string; tests: string[] }[] = [];
    for (const g of this.labGroups) {
      const tests = g.tests
        .filter((t) => this.selectedLabIds.has(t.id))
        .map((t) => t.description);
      if (tests.length) out.push({ department: g.department, tests });
    }
    return out;
  }

  clearSelection(): void {
    this.selectedLabIds.clear();
    this.selectedRadiologyIds.clear();
    this.remarks = '';
    this.radiology = { comorbidities: [] };
  }

  /**
   * Single source of truth for printing — merges the live (unsaved) selection
   * with this patient's saved prior orders, so the request prints correctly
   * both before saving and after reopening the assessment.
   */
  getPrintableInvestigations(): {
    labByDept: { department: string; tests: string[] }[];
    radiologyNames: string[];
    remarks: string;
    radiology: any;
  } {
    const deptMap = new Map<string, Set<string>>();
    const addLab = (dept: string, desc: string) => {
      const d = dept || 'OTHERS';
      if (!deptMap.has(d)) deptMap.set(d, new Set());
      deptMap.get(d)!.add(desc);
    };
    for (const g of this.selectedLabByDepartment) for (const t of g.tests) addLab(g.department, t);
    for (const o of this.priorOrders) for (const t of o?.labTests ?? []) addLab(t.department, t.description);

    const labByDept: { department: string; tests: string[] }[] = [];
    for (const dept of this.groupOrder) {
      if (deptMap.has(dept)) {
        labByDept.push({ department: dept, tests: [...deptMap.get(dept)!] });
        deptMap.delete(dept);
      }
    }
    for (const [dept, set] of deptMap) labByDept.push({ department: dept, tests: [...set] });

    const radSet = new Set<string>(this.selectedRadiologyNames);
    for (const o of this.priorOrders) for (const t of o?.radiologyTests ?? []) radSet.add(t.description);

    const remarks =
      this.remarks?.trim() || this.priorOrders.find((o) => o?.remarks)?.remarks || '';

    return {
      labByDept,
      radiologyNames: [...radSet],
      remarks,
      radiology: this.hasRadiology ? this.radiology : null,
    };
  }

  get hasPrintableInvestigations(): boolean {
    const inv = this.getPrintableInvestigations();
    return inv.labByDept.length > 0 || inv.radiologyNames.length > 0;
  }

  /** Standalone PDF resembling the paper LAB / RADIOLOGY REQUEST FORM. */
  printRequestForm(): void {
    const inv = this.getPrintableInvestigations();
    if (!inv.labByDept.length && !inv.radiologyNames.length) return;
    // Branded JMRH letterhead background (shared helper), then build.
    getJmrhPdfBranding().then((brand) => this.openRequestPdf(inv, brand));
  }

  private openRequestPdf(inv: ReturnType<InvestigationOrderComponent['getPrintableInvestigations']>, brand: JmrhPdfBranding): void {
    const now = new Date();
    const accent = '#1b6cb5';
    const headerFill = '#eef3fa';
    const border = '#d6dce5';

    // Shared table layout: shaded header row, light grid, comfortable padding.
    const gridLayout: any = {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? headerFill : null),
      hLineColor: () => border,
      vLineColor: () => border,
      hLineWidth: () => 0.7,
      vLineWidth: () => 0.7,
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 6,
      paddingRight: () => 6,
    };
    const band = (title: string): any => ({
      table: { widths: ['*'], body: [[{ text: title, bold: true, color: '#ffffff', fillColor: accent, margin: [8, 4, 8, 4] }]] },
      layout: 'noBorders',
      margin: [0, 6, 0, 6],
    });

    // Header band comes from the letterhead background; start with the title.
    const content: any[] = [];
    content.push(
      { text: 'INVESTIGATION REQUEST FORM', style: 'docTitle', alignment: 'center', margin: [0, 0, 0, 12] },
      // Patient info box
      {
        table: {
          widths: ['auto', '*', 'auto', '*'],
          body: [
            [{ text: 'Patient', style: 'lbl' }, { text: this.patientName || '-' }, { text: 'UHID', style: 'lbl' }, { text: String(this.prn || '-') }],
            [{ text: 'Age / Sex', style: 'lbl' }, { text: `${this.age || '-'} / ${this.gender || '-'}` }, { text: 'Date', style: 'lbl' }, { text: this.date || now.toLocaleDateString() }],
            [{ text: 'Doctor', style: 'lbl' }, { text: this.doctorName || '-' }, { text: 'Department', style: 'lbl' }, { text: this.department || '-' }],
          ],
        },
        layout: { ...gridLayout, fillColor: (_r: number, _n: any, colIndex: number) => (colIndex === 0 || colIndex === 2 ? headerFill : null) },
        margin: [0, 0, 0, 6],
      },
    );

    if (inv.labByDept.length) {
      content.push(band('LABORATORY'));
      content.push({
        table: {
          headerRows: 1,
          widths: ['28%', '*'],
          body: [
            [{ text: 'Category', bold: true }, { text: 'Tests Requested', bold: true }],
            ...inv.labByDept.map((g) => [{ text: g.department, bold: true, color: '#44546a' }, { text: g.tests.join(', ') }]),
          ],
        },
        layout: gridLayout,
        margin: [0, 0, 0, 6],
      });
    }

    if (inv.radiologyNames.length) {
      content.push(band('RADIOLOGY'));
      content.push({ text: inv.radiologyNames.join(',  '), margin: [0, 0, 0, 6], bold: true });
      const r = inv.radiology;
      if (r) {
        const rows: any[] = [];
        const add = (k: string, v: any) => rows.push([{ text: k, style: 'lbl' }, { text: String(v) }]);
        if (r.priority) add('Priority', r.priority);
        if (r.clinicalDetails) add('Clinical details', r.clinicalDetails);
        if (r.serumCreatinine) add('S. Creatinine', `${r.serumCreatinine}${r.creatinineDoneOn ? ` (done ${r.creatinineDoneOn})` : ''}`);
        if (r.weightKg) add('Weight', `${r.weightKg} kg`);
        if (r.pregnancy) add('Pregnancy', `Yes${r.lmp ? `, LMP ${r.lmp}` : ''}`);
        if (r.allergyHistory) add('Allergic history', r.allergyHistory);
        const comorbid = [...(r.comorbidities || [])];
        if (r.otherComorbidity) comorbid.push(r.otherComorbidity);
        if (comorbid.length) add('History', comorbid.join(', '));
        if (r.consentGiven) add('Consent', 'Obtained');
        if (rows.length) {
          content.push({
            table: { widths: ['auto', '*'], body: rows },
            layout: { ...gridLayout, fillColor: (_r: number, _n: any, colIndex: number) => (colIndex === 0 ? headerFill : null) },
            margin: [0, 0, 0, 6],
          });
        }
      }
    }

    if (inv.remarks) {
      content.push(band('REMARKS'));
      content.push({ text: inv.remarks, margin: [0, 0, 0, 6] });
    }

    content.push({
      columns: [
        { stack: [{ text: '________________________', margin: [0, 30, 0, 0] }, { text: 'Signature of Doctor', style: 'lbl' }] },
        { stack: [{ text: `Name: ${this.doctorName || '-'}`, alignment: 'right', margin: [0, 30, 0, 0] }, { text: `KMC No: ${this.doctorKmc || '-'}`, alignment: 'right' }] },
      ],
      margin: [0, 10, 0, 0],
    });

    pdfMake
      .createPdf({
        pageSize: 'A4',
        pageMargins: brand.pageMargins,
        background: brand.background,
        footer: brand.footer,
        defaultStyle: { fontSize: 10, color: '#2b3440' },
        content,
        styles: {
          docTitle: { fontSize: 13, bold: true, color: accent },
          lbl: { bold: true, color: '#44546a', fontSize: 9 },
        },
      })
      .open();
  }

  /** Browser-only: load an image URL as a base64 data-URL for pdfMake. */
  private getBase64ImageFromURL(url: string): Promise<string> {
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

  /** Build the payload the parent can also persist before saving the order. */
  buildPayload(): InvestigationOrderPayload | null {
    if (this.isEmpty || !this.prn || !this.doctorId) return null;
    const payload: InvestigationOrderPayload = {
      prn: String(this.prn),
      doctorId: this.doctorId,
      doctorName: this.doctorName ?? '',
      remarks: this.remarks?.trim() || undefined,
      date: this.date || undefined,
      labTests: Array.from(this.selectedLabIds),
      radiologyTests: Array.from(this.selectedRadiologyIds),
      packages: [],
    };
    if (this.hasRadiology) {
      const { otherComorbidity, ...rad } = this.radiology;
      const comorbidities = [...(rad.comorbidities ?? [])];
      if (otherComorbidity?.trim()) comorbidities.push(otherComorbidity.trim());
      payload.radiology = { ...rad, comorbidities };
    }
    return payload;
  }

  saveOrder(): void {
    const payload = this.buildPayload();
    if (!payload) return;
    this.saving = true;
    this.api.createOrder(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.saved.emit(res);
        this.clearSelection();
        this.loadPriorOrders();
      },
      error: (err) => {
        this.saving = false;
        this.failed.emit(err);
      },
    });
  }

  /** One-time bootstrap: populate the DB catalog from the paper-form seed. */
  seedCatalog(): void {
    this.seeding = true;
    this.seeder.seedLabTests().subscribe({
      next: () => {
        this.seeder.seedRadiologyTests().subscribe({
          next: () => {
            this.seeding = false;
            this.loadCatalog();
          },
          error: () => {
            this.seeding = false;
          },
        });
      },
      error: () => {
        this.seeding = false;
      },
    });
  }
}
