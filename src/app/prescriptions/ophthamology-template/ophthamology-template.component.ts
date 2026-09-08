import { Component, Input, HostListener, ViewChild, ElementRef } from '@angular/core';
import { OpthPresService } from '../../services/ophthamology-prescription/opth-pres.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { MessageService } from 'primeng/api';
import { getJmrhPdfBranding } from '../../shared/pdf/jmrh-letterhead';
type DiagramType = 'eye' | 'cornea' | 'fundus' | 'vf' | 'eom' | 'gonio';
interface DiagramColorGroup {
  color: string;
  labels: string[];
}


export type EomDir =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'upLeft'
  | 'upRight'
  | 'downLeft'
  | 'downRight';
type EyeSide = 'OD' | 'OS';
interface DiagramColor {
  color: string;
  label: string;
}

interface DiagramMark {
  diagram: DiagramType;
  eye: 'OD' | 'OS';
  x: number;   // %
  y: number;   // %
  color: string;
  label: string;
  size: number;
}

/** One instillation of drops given to the patient inside the OPD. */
interface DropRecord {
  id: number;
  drugName: string;
  eye: 'OD' | 'OS' | 'OU';
  dropCount: number;
  purpose: string | null;
  remarks: string | null;
  instilledAt: string;
  instilledBy: string | null;
}

/** One measurement row of a power table — the eye keys sit in the columns. */
interface PowerRow {
  label: string;
  right: string;  // pres[] key for the right eye
  left: string;   // pres[] key for the left eye
  va?: boolean;   // V/A uses the visual-acuity option list, not SPH/CYL/AXIS
}

/**
 * The five power tables (CPG DV/ADD, AR, SR DV/ADD) share one field-naming
 * scheme — `<prefix>SphR`, `<prefix>CylL`, `<prefix>VAR` … — so every table is
 * the same four rows under a different prefix.
 */
function buildPowerRows(prefix: string): PowerRow[] {
  return [
    { label: 'SPH',  right: `${prefix}SphR`,  left: `${prefix}SphL` },
    { label: 'CYL',  right: `${prefix}CylR`,  left: `${prefix}CylL` },
    { label: 'AXIS', right: `${prefix}AxisR`, left: `${prefix}AxisL` },
    { label: 'V/A',  right: `${prefix}VAR`,   left: `${prefix}VAL`, va: true },
  ];
}

@Component({
  selector: 'app-ophthamology-template',
  templateUrl: './ophthamology-template.component.html',
  styleUrl: './ophthamology-template.component.css',
  providers: [MessageService]
})

export class OphthamologyTemplateComponent {

  @Input() appointment: any;  // entire appointment object

  /**
   * Who is looking at this form. Named `viewMode` because `mode` is already
   * taken by the diagram drawing tool (draw / erase / marker).
   * 'doctor'      — full form, can verify the optometrist's work-up (default).
   * 'optometrist' — refraction work-up only; Submit instead of Save. The
   *                 server enforces the same split, this only shapes the UI.
   */
  @Input() viewMode: 'doctor' | 'optometrist' = 'doctor';

  showPrintDialog = false;

  // ─── Work-up provenance (who recorded what, and has the doctor checked it) ─
  /** Tabs the optometrist owns — everything else is doctor-only. */
  readonly WORKUP_TABS = ['va', 'cgp', 'ar', 'sr', 'iop', 'drops'];
  submittingWorkup = false;
  verifyingWorkup = false;
  /** Field keys where the doctor's value differs from the optometrist's. */
  changedFromWorkup: string[] = [];


  tab: string = 'va';
  activeDropdown: string | null = null;
  selectedColorGroup!: DiagramColorGroup;
  selectedLabel!: string;
  doctorSignatureBase64: string | null = null;
  doctorName: string | null = null;

  /**
   * Row config for the power tables (CPG / AR / SR). The measurement is the
   * ROW and the eye is the COLUMN — matching the Visual Acuity and Examination
   * tables, which already read Right | Left across the top.
   */
  cpgDvRows  = buildPowerRows('cur');
  cpgAddRows = buildPowerRows('curAdd');
  arDvRows   = buildPowerRows('ar');      // before dilation
  arDilRows  = buildPowerRows('arDil');   // after dilation (cycloplegic)
  srDvRows   = buildPowerRows('sr');
  srAddRows  = buildPowerRows('srAdd');




  // MAIN PRESCRIPTION OBJECT
  pres: any = {
    prescriptionId: null,
    // VA
    uaVr: '',
    uaVl: '',
    glVr: '',
    glVl: '',
    nearVr: '',
    nearVl: '',

    // Current Glass Power
    curAddSphR: '',
    curAddCylR: '',
    curAddAxisR: '',
    curAddVAR: '',
    curAddSphL: '',
    curAddCylL: '',
    curAddAxisL: '',
    curAddVAL: '',

    // CPG DV values
    curSphR: '',
    curCylR: '',
    curAxisR: '',
    curVAR: '',
    curSphL: '',
    curCylL: '',
    curAxisL: '',
    curVAL: '',

    // AR — before dilation
    arSphR: '',
    arCylR: '',
    arAxisR: '',
    arVAR: '',
    arSphL: '',
    arCylL: '',
    arAxisL: '',
    arVAL: '',
    arIPD: '',

    // AR — after dilation (cycloplegic)
    arDilSphR: '',
    arDilCylR: '',
    arDilAxisR: '',
    arDilVAR: '',
    arDilSphL: '',
    arDilCylL: '',
    arDilAxisL: '',
    arDilVAL: '',
    arDilIPD: '',

    // SR
    srSphR: '',
    srCylR: '',
    srAxisR: '',
    srVAR: '',
    srSphL: '',
    srCylL: '',
    srAxisL: '',
    srVAL: '',
    srIPD: '',
    srType: '',


    srAddSphR: '',
    srAddCylR: '',
    srAddAxisR: '',
    srAddVAR: '',
    srAddSphL: '',
    srAddCylL: '',
    srAddAxisL: '',
    srAddVAL: '',

    // IOP
    iopR: '',
    iopL: '',
    includeIOP: false,

    // Pupillary
    pupilReactionR: '',
    pupilReactionL: '',
    diagnosisList: [],
  };

  // VISUAL ACUITY OPTIONS (static but extendable)
  VA_OPTIONS: string[] = [
    "6/6", "6/6P", "6/7.5P", "6/9", "6/9P", "6/12", "6/15", "6/18P", "6/24P",
    "6/30P", "6/36", "6/60", "N6", "N8", "N10"
  ];

  // POWER OPTIONS
  POWER_OPTIONS: string[] = [
    '-6.00', '-5.75', '-5.50', '-5.25', '-5.00', '-4.75', '-4.50', '-4.25', '-4.00',
    '-3.75', '-3.50', '-3.25', '-3.00', '-2.75', '-2.50', '-2.25', '-2.00', '-1.75',
    '-1.50', '-1.25', '-1.00', '-0.75', '-0.50', '-0.25', '0.00',
    '+0.25', '+0.50', '+0.75', '+1.00', '+1.25', '+1.50', '+1.75', '+2.00', '+2.25',
    '+2.50', '+2.75', '+3.00', '+3.25', '+3.50', '+3.75', '+4.00', '+4.25', '+4.50',
    '+4.75', '+5.00', '+5.25', '+5.50', '+5.75', '+6.00'
  ];

  SPH_CYL_OPTIONS: string[] = [];
  AXIS_OPTIONS: string[] = [];

  filtered: any = {};     // dropdown results
  options: any = {};      // exam options from DB

  // EXAM FIELDS (UI rendering)
  examFields = [
    { name: 'eyelids', label: 'Eyelids & Adnexa' },
    { name: 'eom', label: 'Extraocular Movements' },
    { name: 'cornea', label: 'Cornea' },
    { name: 'anteriorCh', label: 'Anterior Chamber' },
    { name: 'conjunctiva', label: 'Conjunctiva' },
    { name: 'sclera', label: 'Sclera' },
    { name: 'iris', label: 'Iris' },
    { name: 'pupil', label: 'Pupil' },
    { name: 'lens', label: 'Lens' },
    { name: 'fundus', label: 'Fundus' }
  ];

  savedCanvasImage: string = "";

  // ─── In-OPD drops (dilation / anaesthetic instilled in the clinic) ───
  // An administration record, not a prescription: every entry is one
  // instillation with its own timestamp, and the list is append-only.
  drops: DropRecord[] = [];
  dropDraft: { drugName: string; eye: 'OD' | 'OS' | 'OU'; dropCount: number; purpose: string; remarks: string } =
    this.blankDropDraft();
  dropOptions: string[] = [];
  filteredDropOptions: string[] = [];
  loggingDrop = false;
  /** Minutes after a dilating drop before the fundus exam is usually possible. */
  readonly DILATION_WAIT_MINUTES = 30;
  readonly dropPurposes = ['dilation', 'anaesthesia', 'diagnostic', 'treatment'];


  @HostListener('document:click', ['$event'])
  handleClickOutside(event: any) {
    if (!event.target.closest('.dropdown-container')) {
      this.activeDropdown = null;
    }
  }



  constructor(private api: OpthPresService, private messageService: MessageService) { }

  ngOnInit() {
    this.visibleTabs = this.isOptometrist
      ? this.ALL_TABS.filter(t => this.WORKUP_TABS.includes(t.key))
      : this.ALL_TABS;
    // Keep the opening tab inside what this role can actually see.
    if (!this.visibleTabs.some(t => t.key === this.tab)) {
      this.tab = this.visibleTabs[0]?.key ?? 'va';
    }

    this.loadExamOptions();
    this.loadDropOptions();
    this.generateAxisValues();
    this.generateSphCylValues();
    if (this.appointment?.doctor) {
      console.log("Doctor info found in appointment:", this.appointment.doctor);
      this.doctorSignatureBase64 = this.appointment.doctor.signUrl || null;
      this.doctorName = this.appointment.doctor.name || "";
    }

    console.log("Ophthalmology Template initialized.", this.appointment);
    if (this.appointment?.id) {
      this.loadExistingPrescription(this.appointment.id);
      this.loadDrops(this.appointment.id);
    }
  }
  // ─── Optometrist work-up ↔ doctor verification ──────────────────────
  get isOptometrist(): boolean { return this.viewMode === 'optometrist'; }

  /**
   * Tabs the current role may open — resolved ONCE in ngOnInit.
   *
   * Must not be a getter: *ngFor tracks by identity, so a getter returning a
   * fresh array of new objects makes Angular destroy and rebuild every tab
   * element on each change-detection pass. The node then gets replaced between
   * mousedown and mouseup and the click never fires.
   */
  visibleTabs: { key: string; label: string }[] = [];

  private readonly ALL_TABS: { key: string; label: string }[] = [
    { key: 'va', label: 'Visual Acuity' },
    { key: 'cgp', label: 'Current Power of Glass' },
    { key: 'ar', label: 'Auto Refraction' },
    { key: 'sr', label: 'Subjective Refraction' },
    { key: 'drops', label: 'Drops' },
    { key: 'iop', label: 'IOP/NCT' },
    { key: 'exam', label: 'Examination' },
    { key: 'pupil', label: 'Pupillary Reaction' },
    { key: 'diagram', label: 'Diagram' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'plan', label: 'Advice / Review' },
  ];

  /** Keeps the tab elements stable across change detection (see visibleTabs). */
  trackByTabKey(_i: number, t: { key: string }): string { return t.key; }

  get workupStatus(): string { return this.pres?.workupStatus || 'pending'; }
  get hasWorkup(): boolean { return !!this.pres?.recordedAt; }
  get isWorkupVerified(): boolean {
    return this.workupStatus === 'verified' || this.workupStatus === 'amended';
  }
  /** Optometrist loses write access the moment the doctor signs off. */
  get isWorkupLocked(): boolean { return this.isOptometrist && this.isWorkupVerified; }

  /** True when this field was changed by the doctor after the work-up. */
  isChangedFromWorkup(key: string): boolean {
    return this.changedFromWorkup.includes(key);
  }
  /** The optometrist's original value, for the "was …" hint. */
  workupValue(key: string): string {
    const snap = this.parsedWorkupSnapshot;
    const v = snap ? snap[key] : null;
    return v === null || v === undefined || v === '' ? '-' : String(v);
  }

  private get parsedWorkupSnapshot(): Record<string, unknown> | null {
    if (!this.pres?.workupSnapshot) return null;
    try {
      return typeof this.pres.workupSnapshot === 'string'
        ? JSON.parse(this.pres.workupSnapshot)
        : this.pres.workupSnapshot;
    } catch {
      return null;
    }
  }

  /** Recompute which work-up values the doctor has changed. */
  recomputeWorkupDiff(): void {
    const snap = this.parsedWorkupSnapshot;
    if (!snap) { this.changedFromWorkup = []; return; }
    const norm = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    this.changedFromWorkup = Object.keys(snap).filter(k => norm(snap[k]) !== norm(this.pres[k]));
  }

  /** Optometrist → server. Only the work-up keys travel; the server drops
   *  anything else even if it were sent. */
  submitWorkup(): void {
    if (this.submittingWorkup) return;
    if (!this.appointment?.id) {
      this.messageService.add({ severity: 'error', summary: 'Work-up', detail: 'No appointment selected' });
      return;
    }
    this.submittingWorkup = true;
    this.api.submitWorkup({ ...this.pres, appointmentId: this.appointment.id }).subscribe({
      next: (res: any) => {
        this.submittingWorkup = false;
        if (res?.success) {
          this.pres = { ...this.pres, ...res.prescription };
          this.recomputeWorkupDiff();
          this.messageService.add({
            severity: 'success', summary: 'Work-up',
            detail: 'Submitted — the doctor will verify it',
          });
        }
      },
      error: (e) => {
        this.submittingWorkup = false;
        this.messageService.add({
          severity: 'error', summary: 'Work-up',
          detail: e?.error?.error || 'Failed to submit work-up',
        });
      },
    });
  }

  /** Doctor accepts the work-up. Server decides verified vs amended by
   *  diffing the live values against the optometrist's snapshot. */
  verifyWorkup(): void {
    if (this.verifyingWorkup || !this.pres?.prescriptionId) return;
    this.verifyingWorkup = true;
    this.api.verifyWorkup(this.pres.prescriptionId).subscribe({
      next: (res: any) => {
        this.verifyingWorkup = false;
        if (res?.success) {
          this.pres = { ...this.pres, ...res.prescription };
          this.changedFromWorkup = res.changedFields || [];
          this.messageService.add({
            severity: 'success', summary: 'Work-up',
            detail: res.prescription?.workupStatus === 'amended'
              ? `Verified with ${this.changedFromWorkup.length} correction(s)`
              : 'Verified',
          });
        }
      },
      error: (e) => {
        this.verifyingWorkup = false;
        this.messageService.add({
          severity: 'error', summary: 'Work-up',
          detail: e?.error?.error || 'Failed to verify',
        });
      },
    });
  }

  // ─── In-OPD drops ───────────────────────────────────────────────────
  blankDropDraft(): { drugName: string; eye: 'OD' | 'OS' | 'OU'; dropCount: number; purpose: string; remarks: string } {
    return { drugName: '', eye: 'OU', dropCount: 1, purpose: 'dilation', remarks: '' };
  }

  /** Drug names come from the same doctor-extensible option table as the
   *  exam findings, under fieldName 'drops' — no hardcoded formulary. */
  loadDropOptions() {
    this.api.getOptions('drops').subscribe((res: any) => {
      this.dropOptions = (res.options || []).map((o: any) => o.optionLabel);
    });
  }

  loadDrops(appointmentId: number) {
    this.api.getDrops(appointmentId).subscribe((res: any) => {
      this.drops = res.records || [];
    });
  }

  filterDrops() {
    const term = (this.dropDraft.drugName || '').toLowerCase();
    this.filteredDropOptions = this.dropOptions.filter(o => o.toLowerCase().includes(term));
  }

  selectDrop(name: string) {
    this.dropDraft.drugName = name;
    this.filteredDropOptions = [];
    this.activeDropdown = null;
  }

  /** Adds an unseen drug to the shared 'drops' pick-list for next time. */
  addNewDropOption() {
    const name = (this.dropDraft.drugName || '').trim();
    if (!name || this.dropOptions.includes(name)) return;
    this.api.addOption('drops', name).subscribe(() => {
      this.dropOptions.push(name);
      this.filteredDropOptions = [];
    });
  }

  /** Records one instillation. The server stamps the time and the user —
   *  never the browser clock, so the timing evidence can be trusted. */
  instillDrop() {
    if (this.loggingDrop) return;
    const name = (this.dropDraft.drugName || '').trim();
    if (!name) {
      this.messageService.add({ severity: 'warn', summary: 'Drops', detail: 'Pick or type the drug name' });
      return;
    }
    if (!this.appointment?.prnNumber) {
      this.messageService.add({ severity: 'error', summary: 'Drops', detail: 'No PRN on this appointment' });
      return;
    }

    this.loggingDrop = true;
    this.api.logDrop({
      prn: this.appointment.prnNumber,
      appointmentId: this.appointment?.id ?? null,
      prescriptionId: this.pres.prescriptionId ?? null,
      drugName: name,
      eye: this.dropDraft.eye,
      dropCount: this.dropDraft.dropCount,
      purpose: this.dropDraft.purpose || null,
      remarks: this.dropDraft.remarks?.trim() || null,
    }).subscribe({
      next: (res: any) => {
        this.loggingDrop = false;
        if (res?.success && res.record) {
          this.drops = [...this.drops, res.record];
          this.dropDraft = this.blankDropDraft();
          this.messageService.add({ severity: 'success', summary: 'Drops', detail: 'Instillation recorded' });
        }
      },
      error: (e) => {
        this.loggingDrop = false;
        this.messageService.add({
          severity: 'error', summary: 'Drops',
          detail: e?.error?.error || 'Failed to record instillation',
        });
      },
    });
  }

  /** Whole minutes since an instillation — drives the elapsed column. */
  minutesSince(iso: string): number {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return 0;
    return Math.max(0, Math.floor((Date.now() - then) / 60000));
  }

  /** Earliest dilating drop of this visit — the wait is measured from it. */
  private get firstDilationDrop(): DropRecord | null {
    return this.drops.find(d => d.purpose === 'dilation') ?? null;
  }

  /** Clock time the patient is expected to be dilated enough to examine. */
  get dilationReadyAt(): Date | null {
    const first = this.firstDilationDrop;
    if (!first) return null;
    const t = new Date(first.instilledAt).getTime();
    if (Number.isNaN(t)) return null;
    return new Date(t + this.DILATION_WAIT_MINUTES * 60000);
  }

  get isDilationReady(): boolean {
    const ready = this.dilationReadyAt;
    return !!ready && Date.now() >= ready.getTime();
  }

  loadExistingPrescription(appointmentId: number) {
    this.api.getPrescriptionByAppointment(appointmentId).subscribe((res: any) => {
      if (res.success && res.prescription) {

        console.log("Loaded Existing Prescription:", res.prescription);

        this.pres = {
          ...this.pres,       // keep defaults
          ...res.prescription // overwrite with stored data
        };

        // FIX diagnosisList (string → array)
        try {
          if (typeof this.pres.diagnosisList === 'string') {
            this.pres.diagnosisList = JSON.parse(this.pres.diagnosisList || "[]");
          }
        } catch {
          this.pres.diagnosisList = [];
        }

        // Mark any work-up value the doctor has since changed.
        this.recomputeWorkupDiff();


        this.vf = {
          OD: { tl: false, tr: false, bl: false, br: false },
          OS: { tl: false, tr: false, bl: false, br: false },
          ...(JSON.parse(res.prescription.vfData || "{}"))
        };
        
        this.eom = {
          OD: {
            up: 0, down: 0, left: 0, right: 0,
            upLeft: 0, upRight: 0, downLeft: 0, downRight: 0
          },
          OS: {
            up: 0, down: 0, left: 0, right: 0,
            upLeft: 0, upRight: 0, downLeft: 0, downRight: 0
          },
          ...(JSON.parse(res.prescription.eomData || "{}"))
        };
        
        this.gonio = {
          OD: { sup: 'SL', inf: 'SL', nas: 'SL', temp: 'SL' },
          OS: { sup: 'SL', inf: 'SL', nas: 'SL', temp: 'SL' },
          ...(JSON.parse(res.prescription.gonioData || "{}"))
        };
        

        this.marks = res.prescription.diagramMarks || [];


        // Store prescriptionId for update
        this.pres.prescriptionId = res.prescription.prescriptionId;
        // 🔥 Load saved drawing back onto canvas
        setTimeout(() => {
          if (res.prescription.diagramImage) {
            // this.loadCanvasImage(res.prescription.diagramImage);
          }
        }, 300);


      } else {
        console.log("No existing prescription → creating new");
        this.pres.prescriptionId = null;
      }
    });
  }
  loadCanvasImage(base64: string) {
    if (!this.drawCtx) {
      console.warn("Canvas not ready yet, delaying image load...");
      setTimeout(() => this.loadCanvasImage(base64), 200);
      return;
    }

    const img = new Image();
    img.onload = () => {
      this.drawCtx.drawImage(img, 0, 0);
    };
    img.src = base64;
  }



  // generateSphCylValues() {
  //   const vals: string[] = [];
  //   for (let i = -19; i <= 19; i += 0.25) {
  //     vals.push(i.toFixed(2));
  //   }
  //   this.SPH_CYL_OPTIONS = vals;
  // }

  generateSphCylValues() {
    const vals: string[] = [];
    for (let i = -19; i <= 19; i += 0.25) {
      const formatted =
        i === 0 ? "0.00" : (i > 0 ? `+${i.toFixed(2)}` : i.toFixed(2));
      vals.push(formatted);
    }
    this.SPH_CYL_OPTIONS = vals;
  }



  // ========================== AXIS VALUES ================================
  generateAxisValues() {
    this.AXIS_OPTIONS = Array.from({ length: 10 }, (_, i) => (i * 10).toString());
  }






  // ------------------------ LOAD OPTIONS FROM DB ------------------------
  loadExamOptions() {
    this.examFields.forEach(f => {
      this.api.getOptions(f.name).subscribe((res: any) => {

        // FIX: res.options is the array
        this.options[f.name] = (res.options || []).map((o: any) => o.optionLabel);

        console.log(`Loaded options for ${f.name}:`, this.options[f.name]);
      });
    });
  }


  // ------------------------ VISUAL ACUITY SEARCH ------------------------
  filterVA(field: string) {
    const term = (this.pres[field] || "").toLowerCase();
    this.filtered[field] = this.VA_OPTIONS.filter(v =>
      v.toLowerCase().includes(term)
    );
  }

  selectVA(field: string, val: string) {
    this.pres[field] = val;
    this.filtered[field] = [];
    this.activeDropdown = null;
  }

  addNewVA(field: string) {
    const v = this.pres[field];
    if (v && !this.VA_OPTIONS.includes(v)) this.VA_OPTIONS.push(v);
    this.filtered[field] = [];
    this.activeDropdown = null;
  }

  // ========================== SPH / CYL / AXIS AUTOCOMPLETE ==============
  filterPower(field: string) {
    const val = (this.pres[field] + '').toLowerCase();

    if (field.toLowerCase().includes('axis')) {
      this.filtered[field] = this.AXIS_OPTIONS.filter((a) =>
        (a + '').includes(val)
      );
      return;
    }

    this.filtered[field] = this.SPH_CYL_OPTIONS.filter((v) =>
      v.toLowerCase().includes(val)
    );
  }

  selectPower(field: string, val: string | number) {
    this.pres[field] = val;
    this.filtered[field] = [];
    this.activeDropdown = null;
  }
  // ------------------------ EXAM SEARCH ------------------------
  filterExam(field: string) {
    const name = field.replace('R', '').replace('L', '');
    const list = this.options[name] || [];
    const term = (this.pres[field] || "").toLowerCase();

    this.filtered[field] = list.filter((v: any) =>
      v.toLowerCase().includes(term)
    );
  }

  selectExam(field: string, val: string) {
    this.pres[field] = val;
    this.filtered[field] = [];
    this.activeDropdown = null;
  }

  addExamOption(baseField: string, label: string) {
    if (!label) return;

    this.api.addOption(baseField, label).subscribe(() => {
      this.options[baseField].push(label);
      alert("Option saved!");
    });
  }

  // ------------------------ SAVE PRESCRIPTION ------------------------
  save() {
    // const drawingBase64 = this.drawCanvas.nativeElement.toDataURL("image/png");

    console.log("Preparing to save Ophthalmology Prescription...", this.appointment, this.pres);
    const payload = {
      ...this.pres,
      prn: this.appointment?.prnNumber,
      patientName: this.appointment?.patientName,
      patientAge: this.appointment?.age,
      patientGender: this.appointment?.gender,
      doctorId: this.appointment?.doctorId,
      appointmentId: this.appointment?.id,
      diagramImage: this.savedCanvasImage,
      diagnosisList: JSON.stringify(this.pres.diagnosisList),
      vfData: this.vf,
      eomData: this.eom,
      gonioData: this.gonio,
      diagramMarks: this.marks,

    };
    // payload.diagramMarkers = JSON.stringify(this.markers);


    console.log("Saving Ophthalmology Prescription:", payload);
    this.api.savePrescription(payload).subscribe((res: any) => {
      if (res.prescription?.prescriptionId) {
        this.pres.prescriptionId = res.prescription.prescriptionId;
      }
      if (res.prescription.diagramImage) {
        this.savedCanvasImage = res.prescription.diagramImage;
      }



      alert("Ophthalmology prescription saved!");
      this.printPrescriptionPDF(payload);
    });
  }
  openDropdown(field: string) {
    this.activeDropdown = field;
    // Show all options on click BEFORE typing
    if (field.toLowerCase().includes('axis')) {
      this.filtered[field] = this.AXIS_OPTIONS;
      return;
    }

    console.log('Opening dropdown for field:', field);
    console.log('Current value:', this.pres[field]);

    if (this.VA_OPTIONS.includes(this.pres[field]) || field.toLowerCase().match(/va|vr|vl/)) {
      this.filtered[field] = this.VA_OPTIONS;
      return;
    }

    console.log('Not a VA field, checking SPH/CYL...', this.SPH_CYL_OPTIONS);

    // For exam fields
    const base = field.replace('R', '').replace('L', '');
    console.log(base, this.options[base], this.options);
    if (this.options[base]) {
      this.filtered[field] = this.options[base];
      console.log('Exam field detected:', this.filtered);
      this.activeDropdown = field;
      console.log('Active dropdown set to:', this.activeDropdown);
      return;
    }

    if (this.SPH_CYL_OPTIONS && field.toLowerCase().match(/sph|cyl/)) {
      this.filtered[field] = this.SPH_CYL_OPTIONS;
      console.log('Exam field detected:', this.filtered);
      return;
    }


  }

  async renderDiagramToImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

      const img = new Image();
      img.src = this.ophthaDiagram;

      img.onload = () => {
        // Set canvas size equal to image size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the base diagram
        ctx.drawImage(img, 0, 0);

        // Draw each marker
        // this.markers.forEach(m => {
        //   const x = (m.x / 100) * canvas.width;
        //   const y = (m.y / 100) * canvas.height;

        //   // Draw marker circle
        //   ctx.beginPath();
        //   ctx.arc(x, y, 6, 0, 2 * Math.PI);
        //   ctx.fillStyle = m.color || "red";
        //   ctx.fill();
        //   ctx.strokeStyle = "white";
        //   ctx.lineWidth = 2;
        //   ctx.stroke();

        //   // Draw label if any
        //   if (m.label) {
        //     ctx.font = "16px Arial";
        //     ctx.fillStyle = m.color || "red";
        //     ctx.fillText(m.label, x + 10, y + 10);
        //   }
        // });

        // Convert canvas → Base64
        const base64 = canvas.toDataURL("image/png");
        resolve(base64);
      };

      img.onerror = reject;
    });
  }


  savedDiagramBase64: string = "";
  // async printPrescriptionPDF(data: any) {

  //   console.log("Generating PDF for Ophthalmology Prescription...", data);

  //   const get = (v: any) => (v && v !== "" ? v : "-");

  //   const logoUrl = "/sapiens-clinic-logo.png";
  //   const logoBase64 = await this.getBase64ImageFromURL(logoUrl);
  //   console.log("Logo Base64 fetched for PDF.");
  //   // const mergedImage = await this.mergeBaseAndDrawing();
  //   console.log("Merged diagram image prepared for PDF.");

  //   let diagList: any[] = [];

  //   console.log("Raw diagnosisList data:", data.diagnosisList, logoBase64);

  //   try {
  //     if (Array.isArray(data.diagnosisList)) {
  //       diagList = data.diagnosisList;
  //     } else if (typeof data.diagnosisList === "string") {
  //       diagList = JSON.parse(data.diagnosisList);
  //     }
  //   } catch {
  //     diagList = [];
  //   }

  //   console.log("Generating PDF with diagnosis list:", diagList);
  //   this.savedDiagramBase64 = await this.renderDiagramToImage();

  //   const now = new Date();

  //   const docDefinition: any = {
  //     pageSize: "A4",
  //     pageMargins: [25, 30, 25, 30],

  //     footer: (currentPage: number, pageCount: number) => ({
  //       columns: [
  //         { text: `Printed: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, fontSize: 9 },
  //         { text: `Page ${currentPage} of ${pageCount}`, alignment: "right", fontSize: 9 }
  //       ],
  //       margin: [25, 8]
  //     }),

  //     content: [

  //       // HEADER
  //       { image: logoBase64, width: 90, alignment: "center" },
  //       // { text: "SAPIENS CLINIC", style: "header", alignment: "center" },
  //       { text: "OPHTHALMOLOGY PRESCRIPTION", style: "subheader", alignment: "center", margin: [0, 2, 0, 12] },

  //       // PATIENT INFO
  //       {
  //         table: {
  //           widths: ["*", "*"],
  //           body: [
  //             [`Patient: ${get(data.patientName)}`, `PRN: ${get(data.prn)}`],
  //             [`Age/Gender: ${get(data.patientAge)} / ${get(data.patientGender)}`, `Date: ${now.toLocaleDateString()}`]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 15]
  //       },

  //       // ========================= VISUAL ACUITY =========================
  //       { text: "Visual Acuity", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*", "*"],
  //           body: [
  //             ["Type", "Right", "Left"],
  //             ["Unaided", get(data.uaVr), get(data.uaVl)],
  //             ["With Glasses", get(data.glVr), get(data.glVl)],
  //             ["Near", get(data.nearVr), get(data.nearVl)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 15]
  //       },

  //       // ========================= CURRENT GLASS POWER =========================
  //       { text: "Current Power of Glass (Distance Vision)", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*", "*", "*", "*"],
  //           body: [
  //             ["Eye", "Sph", "Cyl", "Axis", "V/A"],
  //             ["Right", get(data.curSphR), get(data.curCylR), get(data.curAxisR), get(data.curVAR)],
  //             ["Left", get(data.curSphL), get(data.curCylL), get(data.curAxisL), get(data.curVAL)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 10]
  //       },

  //       // ADD power
  //       { text: "ADD Power", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*", "*", "*", "*"],
  //           body: [
  //             ["Eye", "ADD Sph", "ADD Cyl", "Axis", "V/A"],
  //             ["Right", get(data.curAddSphR), get(data.curAddCylR), get(data.curAddAxisR), get(data.curAddVAR)],
  //             ["Left", get(data.curAddSphL), get(data.curAddCylL), get(data.curAddAxisL), get(data.curAddVAL)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 10]
  //       },

  //       { text: `IPD: ${get(data.curIPD)}`, margin: [0, 0, 0, 15] },

  //       // ========================= AUTO REFRACTION =========================
  //       { text: "Auto Refraction (AR)", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*", "*", "*", "*"],
  //           body: [
  //             ["Eye", "Sph", "Cyl", "Axis", "V/A"],
  //             ["Right", get(data.arSphR), get(data.arCylR), get(data.arAxisR), get(data.arVAR)],
  //             ["Left", get(data.arSphL), get(data.arCylL), get(data.arAxisL), get(data.arVAL)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 10]
  //       },


  //       { text: `AR IPD: ${get(data.arIPD)}`, margin: [0, 0, 0, 15] },

  //       // ========================= SUBJECTIVE REFRACTION =========================
  //       { text: "Subjective Refraction (SR)", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*", "*", "*", "*"],
  //           body: [
  //             ["Eye", "Sph", "Cyl", "Axis", "V/A"],
  //             ["Right", get(data.srSphR), get(data.srCylR), get(data.srAxisR), get(data.srVAR)],
  //             ["Left", get(data.srSphL), get(data.srCylL), get(data.srAxisL), get(data.srVAL)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 10]
  //       },
  //       // ADD power
  //       { text: "ADD Power", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*", "*", "*", "*"],
  //           body: [
  //             ["Eye", "ADD Sph", "ADD Cyl", "Axis", "V/A"],
  //             ["Right", get(data.srAddSphR), get(data.srAddCylR), get(data.srAddAxisR), get(data.srAddVAR)],
  //             ["Left", get(data.srAddSphL), get(data.srAddCylL), get(data.srAddAxisL), get(data.srAddVAL)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 10]
  //       },
  //       { text: `SR IPD: ${get(data.srIPD)}   |   SR Type: ${get(data.srType)}`, margin: [0, 0, 0, 15] },

  //       // ========================= IOP =========================
  //       { text: "IOP / NCT", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*"],
  //           body: [
  //             ["Right", get(data.iopR)],
  //             ["Left", get(data.iopL)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 15]
  //       },

  //       // ========================= EXAMINATION =========================
  //       { text: "Eye Examination", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*", "*"],
  //           body: [
  //             ["Field", "Right", "Left"],
  //             ["Eyelids & Adnexa", get(data.eyelidsR), get(data.eyelidsL)],
  //             ["EOM", get(data.eomR), get(data.eomL)],
  //             ["Cornea", get(data.corneaR), get(data.corneaL)],
  //             ["Anterior Chamber", get(data.anteriorChR), get(data.anteriorChL)],
  //             ["Conjunctiva", get(data.conjunctivaR), get(data.conjunctivaL)],
  //             ["Sclera", get(data.scleraR), get(data.scleraL)],
  //             ["Iris", get(data.irisR), get(data.irisL)],
  //             ["Pupil", get(data.pupilR), get(data.pupilL)],
  //             ["Lens", get(data.lensR), get(data.lensL)],
  //             ["Fundus", get(data.fundusR), get(data.fundusL)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 15]
  //       },

  //       // ========================= PUPILLARY =========================
  //       { text: "Pupillary Reaction", style: "sectionHeader" },
  //       {
  //         table: {
  //           widths: ["*", "*"],
  //           body: [
  //             ["Right", get(data.pupilReactionR)],
  //             ["Left", get(data.pupilReactionL)]
  //           ]
  //         },
  //         layout: "lightHorizontalLines",
  //         margin: [0, 0, 0, 15]
  //       },

  //       // DIAGNOSIS
  //       {
  //         text: "Diagnosis",
  //         style: "sectionHeader"
  //       },
  //       {
  //         ul: diagList.map((d: any) => `${d.code} - ${d.label}`)
  //       },
  //       { text: "", margin: [0, 0, 0, 10] },

  //       // ADVICE
  //       { text: "Advice", style: "sectionHeader" },
  //       { text: data.advice || "-" },

  //       // REVIEW
  //       { text: "Review After", style: "sectionHeader" },
  //       { text: data.reviewAfter || "-" },

  //       // DIAGRAM IMAGE
  //       // { text: "Findings Diagram", style: "sectionHeader", margin: [0, 10, 0, 5] },
  //       // { 
  //       //   image: mergedImage, 
  //       //   width: 300,
  //       //   margin: [0, 10, 0, 10]
  //       // },



  //       // FOOTER
  //       { text: "Thank you for visiting Sapiens Clinic.", alignment: "center", italics: true }
  //     ],

  //     styles: {
  //       header: { fontSize: 16, bold: true },
  //       subheader: { fontSize: 13, bold: true, margin: [0, 5, 0, 10] },
  //       sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] }
  //     }
  //   };

  //   pdfMake.createPdf(docDefinition).open();
  // }
  /**
   * Standalone ophthalmology prescription — wraps the eye sections in the
   * hospital letterhead and opens them. The sections themselves come from
   * `buildEyePdfContent`, which the OPD assessment print reuses so both PDFs
   * render the eye record identically.
   */
  async printPrescriptionPDF(data: any) {
    const brand = await getJmrhPdfBranding();
    const content = this.buildEyePdfContent(data, true);

    const docDefinition: any = {
      pageSize: "A4",
      background: brand.background,
      pageMargins: brand.pageMargins,
      footer: brand.footer,
      content,
      styles: {
        subheader: { fontSize: 13, bold: true },
        sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] }
      }
    };

    pdfMake.createPdf(docDefinition).open();
  }

  /**
   * Eye-record pdfMake blocks, honouring the "select sections to print"
   * checkboxes. Called twice:
   *   • by the standalone eye prescription (withHeader = true — its own title
   *     + patient strip), and
   *   • by the OPD assessment print, which already carries the patient header
   *     (withHeader = false) and just appends the eye record to the note.
   */
  buildEyePdfContent(data: any, withHeader: boolean): any[] {
    const get = (v: any) => (v && v !== "" ? v : "-");

    const now = new Date();

    /* ================= PARSE DIAGNOSIS ================= */
    let diagList: any[] = [];
    try {
      if (Array.isArray(data.diagnosisList)) {
        diagList = data.diagnosisList;
      } else if (typeof data.diagnosisList === "string") {
        diagList = JSON.parse(data.diagnosisList || "[]");
      }
    } catch {
      diagList = [];
    }

    /* ================= BUILD CONTENT DYNAMICALLY ================= */
    const content: any[] = [];

    /* ---------- HEADER ----------
       Only on the standalone print. Inside the OPD note the patient strip is
       already at the top of the document, so we just title the section. */
    if (withHeader) {
      // Hospital identity comes from the letterhead background — title only here.
      content.push(
        { text: "OPHTHALMOLOGY PRESCRIPTION", style: "subheader", alignment: "center", margin: [0, 2, 0, 12] }
      );

      content.push({
        table: {
          widths: ["*", "*"],
          body: [
            [`Patient: ${get(data.patientName)}`, `PRN: ${get(data.prn)}`],
            [`Age/Gender: ${get(data.patientAge)} / ${get(data.patientGender)}`, `Date: ${now.toLocaleDateString()}`]
          ]
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 15]
      });
    } else {
      content.push({ text: "Ophthalmology", style: "sectionHeader" });
    }

    /* ================= WORK-UP GATE =================
       An optometrist's refraction is provisional until the doctor verifies
       it. Unverified measurements are withheld from the printed prescription
       so a mis-entry can never leave the building as the doctor's word. */
    const workupOnPrint = !this.hasWorkup || this.isWorkupVerified;
    if (!workupOnPrint) {
      content.push({
        text: 'Refraction work-up pending doctor verification — measurements withheld from this printout.',
        italics: true,
        color: '#7a5300',
        margin: [0, 0, 0, 12],
      });
    }

    /* ================= VISUAL ACUITY ================= */
    if (this.printSections.va && workupOnPrint) {
      content.push(
        { text: "Visual Acuity", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*", "*"],
            body: [
              ["Type", "Right", "Left"],
              ["Unaided", get(data.uaVr), get(data.uaVl)],
              ["With Glasses", get(data.glVr), get(data.glVl)],
              ["Near", get(data.nearVr), get(data.nearVl)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 15]
        }
      );
    }

    /* ================= CURRENT POWER OF GLASS ================= */
    if (this.printSections.cgp && workupOnPrint) {
      content.push(
        { text: "Current Power of Glass (Distance Vision)", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*", "*", "*", "*"],
            body: [
              ["Eye", "Sph", "Cyl", "Axis", "V/A"],
              ["Right", get(data.curSphR), get(data.curCylR), get(data.curAxisR), get(data.curVAR)],
              ["Left", get(data.curSphL), get(data.curCylL), get(data.curAxisL), get(data.curVAL)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 10]
        },
        { text: "ADD Power", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*", "*", "*", "*"],
            body: [
              ["Eye", "ADD Sph", "ADD Cyl", "Axis", "V/A"],
              ["Right", get(data.curAddSphR), get(data.curAddCylR), get(data.curAddAxisR), get(data.curAddVAR)],
              ["Left", get(data.curAddSphL), get(data.curAddCylL), get(data.curAddAxisL), get(data.curAddVAL)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 10]
        },
        { text: `IPD: ${get(data.curIPD)}`, margin: [0, 0, 0, 15] }
      );
    }

    /* ================= AUTO REFRACTION ================= */
    if (this.printSections.ar && workupOnPrint) {
      content.push(
        { text: "Auto Refraction (AR) — Before Dilation", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*", "*", "*", "*"],
            body: [
              ["Eye", "Sph", "Cyl", "Axis", "V/A"],
              ["Right", get(data.arSphR), get(data.arCylR), get(data.arAxisR), get(data.arVAR)],
              ["Left", get(data.arSphL), get(data.arCylL), get(data.arAxisL), get(data.arVAL)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 10]
        },
        { text: `AR IPD: ${get(data.arIPD)}`, margin: [0, 0, 0, 15] }
      );

      // Only print the dilated reading when one was actually taken.
      const hasDilatedAr = [
        data.arDilSphR, data.arDilCylR, data.arDilAxisR, data.arDilVAR,
        data.arDilSphL, data.arDilCylL, data.arDilAxisL, data.arDilVAL, data.arDilIPD,
      ].some((v) => v !== null && v !== undefined && v !== '');

      if (hasDilatedAr) {
        content.push(
          { text: "Auto Refraction (AR) — After Dilation", style: "sectionHeader" },
          {
            table: {
              widths: ["*", "*", "*", "*", "*"],
              body: [
                ["Eye", "Sph", "Cyl", "Axis", "V/A"],
                ["Right", get(data.arDilSphR), get(data.arDilCylR), get(data.arDilAxisR), get(data.arDilVAR)],
                ["Left", get(data.arDilSphL), get(data.arDilCylL), get(data.arDilAxisL), get(data.arDilVAL)]
              ]
            },
            layout: "lightHorizontalLines",
            margin: [0, 0, 0, 10]
          },
          { text: `AR IPD: ${get(data.arDilIPD)}`, margin: [0, 0, 0, 15] }
        );
      }
    }

    /* ================= SUBJECTIVE REFRACTION ================= */
    if (this.printSections.sr && workupOnPrint) {
      content.push(
        { text: "Subjective Refraction (SR)", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*", "*", "*", "*"],
            body: [
              ["Eye", "Sph", "Cyl", "Axis", "V/A"],
              ["Right", get(data.srSphR), get(data.srCylR), get(data.srAxisR), get(data.srVAR)],
              ["Left", get(data.srSphL), get(data.srCylL), get(data.srAxisL), get(data.srVAL)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 10]
        },
        { text: "ADD Power", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*", "*", "*", "*"],
            body: [
              ["Eye", "ADD Sph", "ADD Cyl", "Axis", "V/A"],
              ["Right", get(data.srAddSphR), get(data.srAddCylR), get(data.srAddAxisR), get(data.srAddVAR)],
              ["Left", get(data.srAddSphL), get(data.srAddCylL), get(data.srAddAxisL), get(data.srAddVAL)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 10]
        },
        { text: `SR IPD: ${get(data.srIPD)} | SR Type: ${get(data.srType)}`, margin: [0, 0, 0, 15] }
      );
    }

    /* ================= IOP ================= */
    if (this.printSections.iop && workupOnPrint) {
      content.push(
        { text: "IOP / NCT", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*"],
            body: [
              ["Right", get(data.iopR)],
              ["Left", get(data.iopL)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 15]
        }
      );
    }

    /* ================= DROPS INSTILLED IN OPD ================= */
    if (this.printSections.drops && this.drops.length) {
      content.push(
        { text: "Drops Instilled in OPD", style: "sectionHeader" },
        {
          table: {
            widths: ["auto", "*", "auto", "auto", "auto", "*"],
            body: [
              ["Time", "Drug", "Eye", "Drops", "Purpose", "Given by"],
              ...this.drops.map((d) => [
                new Date(d.instilledAt).toLocaleTimeString(),
                d.drugName,
                d.eye,
                String(d.dropCount),
                d.purpose || "-",
                d.instilledBy || "-",
              ]),
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 15],
        }
      );
    }

    /* ================= EXAMINATION ================= */
    if (this.printSections.exam) {
      content.push(
        { text: "Eye Examination", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*", "*"],
            body: [
              ["Field", "Right", "Left"],
              ["Eyelids & Adnexa", get(data.eyelidsR), get(data.eyelidsL)],
              ["EOM", get(data.eomR), get(data.eomL)],
              ["Cornea", get(data.corneaR), get(data.corneaL)],
              ["Anterior Chamber", get(data.anteriorChR), get(data.anteriorChL)],
              ["Conjunctiva", get(data.conjunctivaR), get(data.conjunctivaL)],
              ["Sclera", get(data.scleraR), get(data.scleraL)],
              ["Iris", get(data.irisR), get(data.irisL)],
              ["Pupil", get(data.pupilR), get(data.pupilL)],
              ["Lens", get(data.lensR), get(data.lensL)],
              ["Fundus", get(data.fundusR), get(data.fundusL)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 15]
        }
      );
    }

    /* ================= PUPILLARY ================= */
    if (this.printSections.pupil) {
      content.push(
        { text: "Pupillary Reaction", style: "sectionHeader" },
        {
          table: {
            widths: ["*", "*"],
            body: [
              ["Right", get(data.pupilReactionR)],
              ["Left", get(data.pupilReactionL)]
            ]
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 15]
        }
      );
    }

    /* ================= DIAGNOSIS ================= */
    if (this.printSections.diagnosis && diagList.length) {
      content.push(
        { text: "Diagnosis", style: "sectionHeader" },
        { ul: diagList.map((d: any) => `${d.code} - ${d.label}`), margin: [0, 0, 0, 10] }
      );
    }

    /* ================= PLAN ================= */
    if (this.printSections.plan) {
      content.push(
        { text: "Advice", style: "sectionHeader" },
        { text: get(data.advice), margin: [0, 0, 0, 8] },
        { text: "Review After", style: "sectionHeader" },
        { text: get(data.reviewAfter), margin: [0, 0, 0, 10] }
      );
    }

    /* ================= DOCTOR SIGNATURE ================= */
    if (data.doctor?.signBase64) {
      content.push({
        margin: [0, 30, 0, 0],
        columns: [
          { text: "" },
          {
            width: 200,
            stack: [
              {
                image: data.doctor.signBase64,
                width: 120,
                alignment: "right"
              },
              {
                text: data.doctor.name || "",
                alignment: "right",
                bold: true,
                margin: [0, 5, 0, 0]
              },
              {
                text: "Consultant Ophthalmologist",
                alignment: "right",
                fontSize: 10
              }
            ]
          }
        ]
      });
    }


    return content;
  }

  /**
   * The eye record as it should appear inside the OPD note — current form
   * values, no header. Returns [] for non-ophthalmology use so the caller can
   * spread it unconditionally.
   */
  buildEyeSectionsForOpdNote(): any[] {
    try {
      return this.buildEyePdfContent(this.pres, false);
    } catch (e) {
      console.error('[ophthalmology] building eye PDF sections failed:', e);
      return [];
    }
  }

  async getBase64ImageFromURL(url: string): Promise<string> {
    console.log("Fetching image from URL for PDF:", url);
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  print() {
    if (!this.pres?.prescriptionId) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Print', detail: 'Please save the prescription before printing.' });
      return;
    }

    const payload = {
      ...this.pres,
      prn: this.appointment?.prnNumber,
      patientName: this.appointment?.patientName,
      patientAge: this.appointment?.age,
      patientGender: this.appointment?.gender,
      doctorId: this.appointment?.doctorId,
      appointmentId: this.appointment?.id,
      doctor: {
        name: this.doctorName,
        signBase64: this.doctorSignatureBase64
      }
    };


    this.printPrescriptionPDF(payload);
  }
  ophthaDiagram = '/optha-diagram.png';

  @ViewChild('drawCanvas', { static: false }) drawCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('markerCanvas', { static: false }) markerCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('diagramImg', { static: false }) diagramImg!: ElementRef<HTMLImageElement>;


  drawCtx!: CanvasRenderingContext2D;
  markerCtx!: CanvasRenderingContext2D;

  mode: 'draw' | 'erase' | 'marker' = 'draw';
  currentMarker: string | null = null;

  isDrawing = false;
  lastX = 0;
  lastY = 0;
  penColor = '#000000';   // ALWAYS black
  penSize = 3;

  eraserSize = 18;


  // ngAfterViewInit() {
  //   setTimeout(() => {
  //     this.drawCtx = this.drawCanvas?.nativeElement.getContext('2d')!;
  //     this.markerCtx = this.markerCanvas?.nativeElement.getContext('2d')!;

  //     if (!this.drawCtx || !this.markerCtx) {
  //       console.error("Canvas context could NOT be initialized!");
  //     }

  //     this.resizeCanvas();
  //   });
  // }
  onImageLoaded() {
    const img = this.diagramImg.nativeElement;
    const W = img.clientWidth;
    const H = img.clientHeight;

    const canvas = this.drawCanvas.nativeElement;
    canvas.width = W;
    canvas.height = H;

    this.drawCtx = canvas.getContext("2d")!;
    this.drawCtx.lineCap = "round";

    // restore drawing
    if (this.savedCanvasImage) {
      const s = new Image();
      s.onload = () => this.drawCtx.drawImage(s, 0, 0, W, H);
      s.src = this.savedCanvasImage;
    }
  }




  // Resize canvas to match the image EXACTLY
  resizeCanvas() {
    const img = this.diagramImg.nativeElement;
    const W = img.clientWidth;
    const H = img.clientHeight;

    // Apply to canvases
    [this.drawCanvas.nativeElement, this.markerCanvas.nativeElement].forEach(c => {
      c.width = W;
      c.height = H;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    });
  }

  // ---------------- DRAWING ------------------

  setMode(mode: string) {
    this.mode = mode as any;
    this.currentMarker = null;
  }

  startDraw(event: MouseEvent) {
    console.log("startDraw event:", event);
    console.log("Current mode:", this.mode);
    if (this.mode !== 'draw' && this.mode !== 'erase') return;

    console.log("Starting draw/erase:", this.mode);

    const rect = this.drawCanvas.nativeElement.getBoundingClientRect();
    this.isDrawing = true;

    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
  }

  moveDraw(event: MouseEvent) {
    if (!this.isDrawing) return;

    const rect = this.drawCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.drawCtx.lineCap = 'round';

    if (this.mode === 'draw') {
      this.drawCtx.strokeStyle = '#FF0000';  // ALWAYS BLACK
      this.drawCtx.lineWidth = 3;
    }

    if (this.mode === 'erase') {
      this.drawCtx.strokeStyle = '#ffffff';  // ERASE
      this.drawCtx.lineWidth = 20;
    }

    this.drawCtx.beginPath();
    this.drawCtx.moveTo(this.lastX, this.lastY);
    this.drawCtx.lineTo(x, y);
    this.drawCtx.stroke();

    this.lastX = x;
    this.lastY = y;

    console.log("Drawing at:", x, y);
    console.log("Canvas size:", this.drawCanvas.nativeElement.width, this.drawCanvas.nativeElement.height);

  }



  stopDraw() {
    this.isDrawing = false;
    // Save canvas state as Base64
    this.savedCanvasImage = this.drawCanvas.nativeElement.toDataURL("image/png");
  }

  // ---------------- MARKERS ------------------

  setMarker(type: string) {
    this.currentMarker = type;
    this.mode = 'marker';
  }

  placeMarker(event: MouseEvent) {
    if (!this.markerCtx) {
      console.error("markerCtx not initialized!");
      return;
    }

    if (this.mode !== 'marker' || !this.currentMarker) return;

    const rect = this.markerCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.markerCtx.font = "28px Arial";
    this.markerCtx.textAlign = "center";
    this.markerCtx.textBaseline = "middle";

    const symbols: any = {
      dot: "•",
      x: "✕",
      circle: "⭕",
      star: "★"
    };

    this.markerCtx.fillText(symbols[this.currentMarker], x, y);
  }


  // ---------------- CLEAR ------------------

  clearAll() {
    this.drawCtx.clearRect(
      0, 0,
      this.drawCanvas.nativeElement.width,
      this.drawCanvas.nativeElement.height
    );

    this.markerCtx.clearRect(
      0, 0,
      this.markerCanvas.nativeElement.width,
      this.markerCanvas.nativeElement.height
    );
  }


  diagnosisSearch = "";
  diagFiltered: any[] = [];

  ICD10 = [
    { code: "H52.1", label: "Myopia" },
    { code: "H52.2", label: "Astigmatism" },
    { code: "H25.1", label: "Nuclear Cataract" },
    { code: "H40.1", label: "Primary Open-Angle Glaucoma" },
    { code: "H35.0", label: "Diabetic Retinopathy" }
  ];


  searchDiagnosis() {
    const t = this.diagnosisSearch.toLowerCase();
    this.diagFiltered = this.ICD10.filter(d =>
      d.label.toLowerCase().includes(t) || d.code.includes(t)
    );
  }

  addDiagnosis(d: any) {
    if (!this.pres.diagnosisList.find((x: any) => x.code === d.code)) {
      this.pres.diagnosisList.push(d);
    }
    this.diagFiltered = [];
    this.diagnosisSearch = "";
  }

  removeDiagnosis(d: any) {
    this.pres.diagnosisList = this.pres.diagnosisList.filter((x: any) => x.code !== d.code);
  }

  async mergeBaseAndDrawing(): Promise<string> {
    return new Promise((resolve) => {
      const base = new Image();
      const drawing = new Image();

      base.src = "/optha-diagram.png";              // base diagram
      drawing.src = this.savedCanvasImage ||
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4BwQACfsD/QY7xL0AAAAASUVORK5CYII=";
      console.log("Merging base diagram and drawing:", base.src, drawing.src);

      base.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        canvas.width = base.width;
        canvas.height = base.height;

        // Draw base background
        ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

        // Draw user's drawing ON TOP
        drawing.onload = () => {
          ctx.drawImage(drawing, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };
      };
    });
  }
  printSections = {
    va: true,
    cgp: true,
    ar: true,
    sr: true,
    iop: true,
    drops: true,
    exam: true,
    pupil: true,
    diagram: true,
    diagnosis: true,
    plan: true,
  };

  selectedDiagram: DiagramType = 'eye';
  selectedEye: 'OD' | 'OS' = 'OD';
  brushSize = 6;

  selectedColor!: DiagramColor;
  eyes: EyeSide[] = ['OD', 'OS'];



  marks: DiagramMark[] = [];

  diagrams: { key: DiagramType; label: string }[] = [
    { key: 'eye', label: 'Eye' },
    { key: 'cornea', label: 'Cornea' },
    { key: 'fundus', label: 'Fundus' },
    { key: 'vf', label: 'Visual Field' },
    { key: 'eom', label: 'EOM' },
    { key: 'gonio', label: 'Gonioscopy' }
  ];

  /* ---------------- COLORS ---------------- */

  // colorMap: Record<DiagramType, DiagramColor[]> = {
  //   eye: [
  //     { color: '#ff0000', label: 'Hemorrhage' },
  //     { color: '#000000', label: 'Retinal tear' },
  //     { color: '#2ecc71', label: 'Attached retina' }
  //   ],
  //   cornea: [
  //     { color: '#3498db', label: 'Edema' },
  //     { color: '#e67e22', label: 'Opacity' }
  //   ],
  //   fundus: [
  //     { color: '#ff0000', label: 'Hemorrhage' },
  //     { color: '#f4d03f', label: 'Exudates' },
  //     { color: '#2ecc71', label: 'Attached retina' },
  //     { color: '#1f3c88', label: 'Neovascularization' }
  //   ],
  //   vf: [],
  //   eom: [],
  //   gonio: []
  // };
  colorGroups: DiagramColorGroup[] = [
    {
      color: '#ff0000',
      labels: [
        'Attached retina',
        'Hemorrhage (preretinal, retinal or subretinal)',
        'Retinal tear',
        'Microaneurysm',
        'Preretinal neovascularization',

      ]
    },
    {
      color: '#000000',
      labels: [
        'Pigment clumping',
        'Scar',
        'RPE changes',
        'Retinal pigmentation'
      ]
    },
    {
      color: '#6e9b4c',
      labels: [
        'Preretinal fibrosis or membranes',
        'Media opacity',
        'Vitreous detachment (Weiss ring)'
      ]
    },
    {
      color: '#8c6b33',
      labels: [
        'Melanocytic lesions',
        'Uveal tissue',
        'Malignant choroidal melanomas',
        'Edge of buckle beneath detahced retina',
        'Choroidal detachment'
      ]
    },
    {
      color: '#4523f5',
      labels: [
        'Sub-retinal fluid',
        'Retinal vessels',
        'Detached retina',
        'Edema',
      ]
    },
    {
      color: '#edd458',
      labels: [
        'Exudate',
        'Inflamation',
        'Cotton wool spots',
        'Drusen',
        'Subretinal fibrosis',
        'Atrophic areas (paving stone degen.)',
        'White deposits (Stargardt\s Dis.)',
        'Amelanotic mass lesions',
      ]
    }
  ];

  /* ---------------- GONIOSCOPY ---------------- */

  gonioOptions = ['SL', 'TM', 'CB', 'SS'];

  gonio: Record<EyeSide, {
    sup: string;
    inf: string;
    nas: string;
    temp: string;
  }> = {
      OD: { sup: 'SL', inf: 'SL', nas: 'SL', temp: 'SL' },
      OS: { sup: 'SL', inf: 'SL', nas: 'SL', temp: 'SL' }
    };


  /* ---------------- DRAWING ---------------- */
  placeMark(event: MouseEvent, eye: EyeSide) {
    if (!this.selectedColorGroup || !this.selectedLabel) return;

    const svg = event.currentTarget as SVGSVGElement;

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    const cursor = pt.matrixTransform(svg.getScreenCTM()!.inverse());

    this.marks.push({
      diagram: this.selectedDiagram,
      eye,
      x: cursor.x,
      y: cursor.y,
      color: this.selectedColorGroup.color,
      label: this.selectedLabel,
      size: this.brushSize
    });
    console.log("Placed mark:", this.marks[this.marks.length - 1]);
  }
  selectColorGroup(cg: DiagramColorGroup) {
    this.selectedColorGroup = cg;
    this.selectedLabel = cg.labels[0]; // default label
  }





  marksFor(eye: EyeSide) {
    return this.marks.filter(
      m => m.diagram === this.selectedDiagram && m.eye === eye
    );
  }


  undo() {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      if (this.marks[i].diagram === this.selectedDiagram) {
        this.marks.splice(i, 1);
        break;
      }
    }
  }

  reset() {
    this.marks = this.marks.filter(m => m.diagram !== this.selectedDiagram);
  }


  eom = {
    OD: {
      up: 0, down: 0, left: 0, right: 0,
      upLeft: 0, upRight: 0, downLeft: 0, downRight: 0
    },
    OS: {
      up: 0, down: 0, left: 0, right: 0,
      upLeft: 0, upRight: 0, downLeft: 0, downRight: 0
    }
  };

  incrementEom(eye: EyeSide, dir: EomDir, delta: number) {
    this.eom[eye][dir] += delta;
  }
  vf = {
    OD: { tl: false, tr: false, bl: false, br: false },
    OS: { tl: false, tr: false, bl: false, br: false }
  };

  onVfClick(event: MouseEvent, eye: 'OD' | 'OS') {
    const svg = event.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const cx = rect.width / 2;
    const cy = rect.height / 2;

    if (x < cx && y < cy) this.vf[eye].tl = !this.vf[eye].tl;
    else if (x >= cx && y < cy) this.vf[eye].tr = !this.vf[eye].tr;
    else if (x >= cx && y >= cy) this.vf[eye].br = !this.vf[eye].br;
    else if (x < cx && y >= cy) this.vf[eye].bl = !this.vf[eye].bl;
  }
  openPrintDialog() {
    if (!this.pres?.prescriptionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Print',
        detail: 'Please save the prescription before printing.'
      });
      return;
    }
  
    this.showPrintDialog = true;
  }
  closePrintDialog() {
    this.showPrintDialog = false;
  }
  hasAnyPrintSectionSelected(): boolean {
    return Object.values(this.printSections).some(v => v === true);
  }
  confirmPrint() {
    if (!this.hasAnyPrintSectionSelected()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nothing Selected',
        detail: 'Please select at least one section to print.'
      });
      return;
    }
  
    const payload = {
      ...this.pres,
      prn: this.appointment?.prnNumber,
      patientName: this.appointment?.patientName,
      patientAge: this.appointment?.age,
      patientGender: this.appointment?.gender,
      doctorId: this.appointment?.doctorId,
      appointmentId: this.appointment?.id,
      doctor: {
        name: this.doctorName,
        signBase64: this.doctorSignatureBase64
      }
    };
  
    this.showPrintDialog = false;
    this.printPrescriptionPDF(payload);
  }
      
  
}
