import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HandWrittenComponent } from '../hand-written/hand-written.component';
import { OpdAssessmentsService } from '../../services/opd-assessment/opd-assessments.service';
import { MessageService } from 'primeng/api';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { InvestigationOrderComponent } from '../investigation-order/investigation-order.component';
import { getJmrhPdfBranding } from '../../shared/pdf/jmrh-letterhead';
import { PrescriptionCaptureComponent } from '../../shared/ui/prescription-capture/prescription-capture.component';
import { VoiceOpdService } from '../../services/voice-opd/voice-opd.service';
import {
  AdmitContext,
  AdmittedEvent,
} from '../../shared/ui/admit-to-ipd-modal/admit-to-ipd-modal.component';
import {
  FieldDef,
  NoteTemplate,
  NoteTemplateService,
} from '../../services/note-template.service';

@Component({
  selector: 'app-opd-assessment',
  templateUrl: './opd-assessment.component.html',
  styleUrl: './opd-assessment.component.css',
  providers: [MessageService]
})
export class OpdAssessmentComponent {
  @ViewChild('historyComp') historyComp!: HandWrittenComponent;
  @ViewChild('examinationComp') examinationComp!: HandWrittenComponent;
  @ViewChild('investigationComp') investigationComp!: HandWrittenComponent;
  @ViewChild('treatmentPlanComp') treatmentPlanComp!: HandWrittenComponent;


  private sectionRefs: { [key: string]: HandWrittenComponent } = {};


  ngAfterViewInit() {
    this.sectionRefs = {
      history: this.historyComp,
      examination: this.examinationComp,
      investigation: this.investigationComp,
      treatmentPlan: this.treatmentPlanComp
    };
    console.log('✅ sectionRefs ready:', this.sectionRefs);
  }


  @Input() appointmentId: number | undefined | null = null;
  // Doctor placing investigation orders from this assessment (passed by parent).
  @Input() doctorId: number | undefined | null = null;
  @Output() close = new EventEmitter<void>(); // 🔴 Notify parent to close
  @Output() saved = new EventEmitter<any>();  // 🔴 Emit saved/updated record

  // Embedded lab/radiology order grid; orders are dispatched on note save.
  @ViewChild('investigationOrderComp') investigationOrderComp?: InvestigationOrderComponent;
  // Embedded prescription capture; read for the complete-assessment PDF.
  @ViewChild('prescriptionComp') prescriptionComp?: PrescriptionCaptureComponent;
  formData: any = {
    // Patient Info
    patientName: '',
    age: '',
    gender: '',
    uhid: '',
    consultant: '',
    department: '',
    date: '',
    assessmentTime: '',
    height: '',
    weight: '',

    // Vitals
    hr: '',
    rr: '',
    pulse: '',
    bp: '',
    temp: '',
    spo2: '',

    // Nutrition
    dietType: '',
    enteralFeed: '',
    npo: false,
    allergies: '',

    // Pain Score
    painScore: '',

    // Screening
    otherScreening: false,
    counsellingImplants: false,

    // Handwritten
    history: '',
    examination: '',
    investigation: '',
    treatmentPlan: '',

    // Staff
    staffName: '',
    staffEmpId: '',

    // Doctor
    doctorName: '',
    kmcNo: '',
    doctorSign: ''
  };
  mediaRecorder!: MediaRecorder;
  audioChunks: Blob[] = [];
  isRecording = false;

  isSubmitting = false;
  isEditMode = false;

  // Sprint 3f — Admit-to-IPD wiring.
  admitModalVisible = false;
  admitContext: AdmitContext | null = null;

  // Phase 3 (WF-2) — Refer-for-Admission wiring.
  referModalVisible = false;
  referSubmitting = false;
  referErrorMessage = '';
  referSuccessMessage = '';
  referForm = {
    diagnosis: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency',
    preferredBedType: 'general',
    admissionType: 'elective',
  };

  // ─── Note-template integration ──────────────────────────────────────
  // Same pattern as the discharge component: load active templates for the
  // patient's department, let the doctor pick one, render its fields[] via
  // the dynamic renderer, persist via templatedValueMap on save.
  availableTemplates: NoteTemplate[] = [];
  selectedTemplateId = '';
  templateValues: Record<string, unknown> = {};
  activeTemplateFields: FieldDef[] = [];

  // Phase 9.21 — AI auto-fill from dictation.
  aiDictation = '';
  aiDrafting = false;
  aiError = '';
  voiceProcessing = false;

  /** Name of the currently-selected template (for the voice hint). */
  get selectedTemplateName(): string {
    return this.availableTemplates.find((t) => t.id === this.selectedTemplateId)?.name ?? '';
  }
  loadingTemplates = false;

  constructor(
    private opdService: OpdAssessmentsService,
    private messageService: MessageService,
    private appointmentService: AppointmentConfirmService,
    private voiceOPDService: VoiceOpdService,
    private noteTemplateService: NoteTemplateService,
  ) { }

  /** Admit button enables only after the assessment has been persisted (has an id). */
  get admitEligible(): boolean {
    console.log(this.isEditMode, this.formData?.id, this.appointmentId);
    return !!(this.isEditMode && this.formData?.id && this.appointmentId);
  }

  ngOnInit(): void {
    // if (this.appointmentId) {
    //   this.isEditMode = true;
    //   this.loadAssessment(this.appointmentId);
    //   // fetch appointment details
    //   this.loadAppointmentDetails(this.appointmentId);
    // } else {
    //   this.resetForm();
    // }
  //     if (this.appointmentId) {
  //   this.loadAssessment(this.appointmentId);
  // } else {
  //   this.resetForm();
  //   if (this.appointmentId) {
  //     this.loadAppointmentDetails(this.appointmentId);
  //   }
  // }
    if (this.appointmentId) {
    this.loadAssessment(this.appointmentId);
  } else {
    this.resetForm();
  }

  }
  resetForm() {
    this.formData = {
      patientName: '',
      age: '',
      gender: '',
      uhid: '',
      phone: '',
      consultant: '',
      department: '',
      date: '',
      assessmentTime: '',
      hr: '',
      rr: '',
      pulse: '',
      bp: '',
      temp: '',
      spo2: '',
      dietType: '',
      enteralFeed: '',
      npo: false,
      allergies: '',
      painScore: '',
      otherScreening: false,
      counsellingImplants: false,
      history: '',
      examination: '',
      diagnosis: '',
      investigation: '',
      treatmentPlan: '',
      staffName: '',
      staffEmpId: '',
      doctorName: '',
      kmcNo: '',
      doctorSign: ''
    };
  }
  onHandWrittenSaved(value: string, current: string) {
    console.log('Saved handwriting for:', current);
    this.formData[current] = value;

    // 🟢 Re-enable all handwriting sections after save
    this.setActivePad(''); // empty disables none (enables all)

    const order = ['history', 'examination', 'investigation', 'treatmentPlan'];
    const nextIndex = order.indexOf(current) + 1;

    if (nextIndex < order.length) {
      const nextKey = order[nextIndex];
      console.log('Focusing on next section:', nextKey);

      const nextComponent = this.sectionRefs[nextKey];
      const nextCanvas = nextComponent?.canvasRef?.nativeElement;

      console.log('Canvas to focus:', nextCanvas);

      if (nextCanvas) {
        nextCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nextCanvas.classList.add('highlight-section');
        setTimeout(() => nextCanvas.classList.remove('highlight-section'), 1000);
        setTimeout(() => nextCanvas.focus(), 600); // optional
      }
    }
  }





  // loadAssessment(appointmentId: number) {
  //   this.opdService.getAssessmentByAppointmentId(appointmentId).subscribe({
  //     next: (data) => {
  //       if (data) {

  //         this.formData = {
  //           // Patient Info
  //           patientName: data.name || '',
  //           age: data.age || '',
  //           gender: data.gender || '',
  //           uhid: data.uhId || '',
  //           consultant: data.consultant || '',
  //           department: data.department || '',
  //           date: data.date || '',
  //           assessmentTime: data.assessmentTime || '',
  //           height: data.height || '',
  //           weight: data.weight || '',

  //           // Vitals
  //           hr: data.hr || '',
  //           rr: data.rr || '',
  //           pulse: data.pulse || '',
  //           bp: data.bp || '',
  //           temp: data.temp || '',
  //           spo2: data.spo2 || '',

  //           // Nutrition
  //           dietType: data.oralDiet || '',
  //           enteralFeed: data.enteralFeed || '',
  //           npo: data.npo || false,
  //           allergies: data.allergies || '',

  //           // Pain Score
  //           painScore: data.painScore || '',

  //           // Screening
  //           otherScreening: data.screeningReq || false,
  //           counsellingImplants: data.implantCounsel || false,

  //           // Handwritten
  //           history: data.history || '',
  //           examination: data.examination || '',
  //           investigation: data.investigation || '',
  //           treatmentPlan: data.treatmentPlan || '',

  //           // Staff
  //           staffName: data.staffName || '',
  //           staffEmpId: data.staffEmpId || '',

  //           // Doctor
  //           doctorName: data.doctorName || '',
  //           kmcNo: data.kmcNo || '',
  //         };

  //         this.isEditMode = true;
  //       }
  //     },
  //     error: (err) => {
  //       console.error('Error loading OPD assessment', err);
  //     }
  //   });
  // }
loadAssessment(appointmentId: number) {
  this.opdService.getAssessmentByAppointmentId(appointmentId).subscribe({
    next: (data) => {
      if (data) {
        // ✅ Assessment exists → edit mode
        this.isEditMode = true;

        this.formData = {
          id: data.id, // capture id for updates
          patientName: data.name || '',
          age: data.age || '',
          gender: data.gender || '',
          uhid: data.uhId || '',
          consultant: data.consultant || '',
          department: data.department || '',
          date: data.date || '',
          assessmentTime: this.convertTo24Hour(data.assessmentTime) || '',
          height: data.height || '',
          weight: data.weight || '',

          hr: data.hr || '',
          rr: data.rr || '',
          pulse: data.pulse || '',
          bp: data.bp || '',
          temp: data.temp || '',
          spo2: data.spo2 || '',

          dietType: data.oralDiet || '',
          enteralFeed: data.enteralFeed || '',
          npo: data.npo || false,
          allergies: data.allergies || '',

          painScore: data.painScore || '',
          otherScreening: data.screeningReq || false,
          counsellingImplants: data.implantCounsel || false,

          history: data.history || '',
          examination: data.examination || '',
          diagnosis: data.diagnosis || '',
          investigation: data.investigation || '',
          treatmentPlan: data.treatmentPlan || '',

          staffName: data.staffName || '',
          staffEmpId: data.staffEmpId || '',

          doctorName: data.doctorName || '',
          kmcNo: data.kmcNo || '',
        };

        // Adopt any templated path saved on this assessment so the picker
        // pre-selects + the renderer pre-fills.
        this.adoptTemplatedFromAssessment(data);

        // Load active templates for this department for the picker dropdown.
        if (data.department) this.loadTemplatesFor(data.department);

        console.log(this.formData)

      } else {
        // ❗ No assessment exists → new mode
        this.isEditMode = false;
        this.resetForm();
        this.loadAppointmentDetails(appointmentId);
      }
    },
    error: (err) => {
      console.error('Error loading OPD assessment', err);

      // fallback → load appointment
      this.resetForm();
      this.loadAppointmentDetails(appointmentId);
    }
  });
}

  // ─── Template integration helpers ──────────────────────────────────
  private loadTemplatesFor(department: string): void {
    if (!department) return;
    this.loadingTemplates = true;
    this.noteTemplateService
      .getForDoctor(department, 'opd-handwritten')
      .subscribe({
        next: (rows) => {
          this.availableTemplates = rows ?? [];
          this.loadingTemplates = false;
          // Auto-pick default if doctor hasn't already selected (or had a saved choice).
          if (!this.selectedTemplateId && this.availableTemplates.length > 0) {
            const def = this.availableTemplates.find((t) => t.isDefault);
            if (def) this.applyTemplateSelection(def.id);
          }
        },
        error: () => { this.loadingTemplates = false; },
      });
  }

  /** Pull templatedValues snapshot from a loaded assessment, if present. */
  private adoptTemplatedFromAssessment(data: { noteTemplateId?: string; templatedValues?: string }): void {
    if (data?.noteTemplateId) this.selectedTemplateId = data.noteTemplateId;
    if (typeof data?.templatedValues === 'string' && data.templatedValues.length > 0) {
      try {
        const parsed = JSON.parse(data.templatedValues) as { _schema?: FieldDef[]; _values?: Record<string, unknown> };
        if (parsed?._values) this.templateValues = parsed._values;
        if (Array.isArray(parsed?._schema) && parsed._schema.length > 0) {
          this.activeTemplateFields = parsed._schema;
        }
      } catch { /* fall through */ }
    }
  }

  /** Picker change handler. */
  onTemplateSelected(templateId: string): void {
    this.applyTemplateSelection(templateId);
  }

  private applyTemplateSelection(templateId: string): void {
    this.selectedTemplateId = templateId;
    if (!templateId) { this.activeTemplateFields = []; return; }
    const tpl = this.availableTemplates.find((t) => t.id === templateId);
    if (tpl) {
      this.activeTemplateFields = tpl.fields ?? [];
      const seeded: Record<string, unknown> = { ...this.templateValues };
      for (const f of this.activeTemplateFields) {
        if (!(f.key in seeded)) {
          seeded[f.key] = f.type === 'multiselect' ? [] : f.type === 'checkbox' ? false : '';
        }
      }
      this.templateValues = seeded;
    }
  }

  onTemplateValuesChange(values: Record<string, unknown>): void {
    this.templateValues = values;
  }

  get isTemplated(): boolean {
    return !!this.selectedTemplateId && this.activeTemplateFields.length > 0;
  }

  /**
   * Phase 9.21 — send the doctor's dictation to OpenAI, which structures it
   * into the selected template's fields. The result only PRE-FILLS the form;
   * the doctor reviews/edits before saving (never auto-saved).
   */
  autoFillFromAi(): void {
    this.aiError = '';
    if (!this.selectedTemplateId) { this.aiError = 'Pick a template first.'; return; }
    if (!this.aiDictation.trim()) { this.aiError = 'Enter or dictate some notes to structure.'; return; }
    this.aiDrafting = true;
    this.opdService.aiDraft({
      noteTemplateId: this.selectedTemplateId,
      dictation: this.aiDictation.trim(),
      header: {
        name: this.formData.patientName ?? null,
        age: this.formData.age ?? null,
        gender: this.formData.gender ?? null,
        vitals: [
          this.formData.bp ? 'BP ' + this.formData.bp : '',
          this.formData.pulse ? 'P ' + this.formData.pulse : '',
          this.formData.spo2 ? 'SpO2 ' + this.formData.spo2 : '',
          this.formData.temp ? 'T ' + this.formData.temp : '',
        ].filter(Boolean).join(', ') || null,
      },
    }).subscribe({
      next: (r) => {
        this.aiDrafting = false;
        // Merge AI values over the current ones (only known keys come back).
        this.templateValues = { ...this.templateValues, ...(r.templatedValueMap ?? {}) };
        this.messageService.add({ severity: 'success', summary: 'AI draft ready', detail: 'Review and edit before saving.', life: 4000 });
      },
      error: (e) => {
        this.aiDrafting = false;
        this.aiError = e?.error?.error || 'AI draft failed';
      },
    });
  }

  /**
   * Build pdfMake content blocks for the templated fields. Hand-written
   * canvas fields are rendered as images (base64 data URLs); other types
   * become labelled key/value lines, grouped by `group` if present.
   */
  buildTemplatedPdfContent(): unknown[] {
    if (!this.isTemplated) return [];
    const content: unknown[] = [{ text: 'Department-specific fields:', style: 'sectionHeader' }];

    // Sort + group exactly like the renderer does.
    const indexed = this.activeTemplateFields.map((f, idx) => ({ ...f, _idx: idx }));
    indexed.sort((a, b) => {
      const ga = a.group ?? '';
      const gb = b.group ?? '';
      if (ga !== gb) return ga.localeCompare(gb);
      const oa = a.order ?? 0;
      const ob = b.order ?? 0;
      if (oa !== ob) return oa - ob;
      return (a as { _idx: number })._idx - (b as { _idx: number })._idx;
    });

    let currentGroup = '';
    for (const f of indexed) {
      const g = f.group ?? '';
      if (g && g !== currentGroup) {
        content.push({ text: g, style: 'subheader', margin: [0, 8, 0, 4] });
        currentGroup = g;
      }
      const raw = this.templateValues[f.key];
      if (f.type === 'handwritten' && typeof raw === 'string' && raw.startsWith('data:image')) {
        content.push({ text: `${f.label}:`, bold: true, margin: [0, 4, 0, 2] });
        content.push({ image: raw, width: 380, margin: [0, 0, 0, 10] });
      } else {
        const formatted = this.formatTemplatedFieldForPrint(f.type, raw);
        content.push({ text: `${f.label}: ${formatted}`, margin: [0, 0, 0, 4] });
      }
    }
    content.push({ text: '', margin: [0, 0, 0, 10] }); // trailing spacer
    return content;
  }

  private formatTemplatedFieldForPrint(type: string, raw: unknown): string {
    if (raw === null || raw === undefined || raw === '') return '—';
    switch (type) {
      case 'multiselect':
        return Array.isArray(raw) ? (raw as string[]).join(', ') : String(raw);
      case 'checkbox':
        return raw ? 'Yes' : 'No';
      case 'date':
        try { return new Date(String(raw)).toLocaleDateString(); }
        catch { return String(raw); }
      case 'datetime':
        try { return new Date(String(raw)).toLocaleString(); }
        catch { return String(raw); }
      default:
        return String(raw);
    }
  }


  submitForm() {
    this.isSubmitting = true;
    this.formData.age = this.formData.age.toString()
    this.formData.appointmentId = this.appointmentId;
    // Templated path — bake the picker selection + value map into the payload.
    // Backend snapshots the field defs into templatedValues at save-time.
    if (this.selectedTemplateId) {
      this.formData.noteTemplateId = this.selectedTemplateId;
      this.formData.templatedValueMap = this.templateValues;
    }
    if (this.isEditMode && this.formData.id) {
      this.opdService.updateAssessment(this.formData.id, this.formData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Assessment updated successfully' });
          this.saved.emit(res);  // 🟢 Emit updated data
          this.dispatchInvestigationOrder(() => this.close.emit()); // place lab/radiology order, then close
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update assessment' });
        }
      });
    } else {
      this.opdService.saveAssessment(this.formData).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          // Sprint 3f — capture id so the Admit-to-IPD button can enable without a reload.
          const createdId = res?.id ?? res?.data?.id;
          if (createdId != null) {
            this.formData.id = createdId;
            this.isEditMode = true;
          }
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Assessment saved successfully' });
          this.saved.emit(res);  // 🟢 Emit new record
          this.dispatchInvestigationOrder(() => this.close.emit()); // place lab/radiology order, then close
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save assessment' });
        }
      });
    }
  }

  /**
   * Dispatch the embedded lab/radiology selections as a real investigation
   * order, then run `done`. No selection → just runs `done`. An order failure
   * is surfaced but never blocks closing the note (the assessment is already
   * persisted at this point).
   */
  private dispatchInvestigationOrder(done: () => void): void {
    const payload = this.investigationOrderComp?.buildPayload();
    if (!payload) {
      done();
      return;
    }
    this.appointmentService.createOrder(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Investigation', detail: 'Investigation order placed' });
        done();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Investigation', detail: 'Note saved, but the investigation order failed' });
        done();
      },
    });
  }

  /**
   * pdfMake nodes for the lab/radiology tests selected in the embedded grid —
   * labs as a category→tests table, radiology with its safety-screening line.
   * Returns [] when nothing is selected (or the grid isn't mounted).
   */
  /**
   * Render a note field for the PDF. Handwritten canvas values are base64
   * data-URLs → image; anything else (typed text) → plain text. Avoids pdfMake
   * treating typed text as an image filename and throwing "Invalid image".
   */
  private renderNoteField(value: any): any {
    if (value === null || value === undefined || value === '') {
      return { text: '-', margin: [0, 5, 0, 15] };
    }
    if (typeof value === 'string' && value.startsWith('data:image')) {
      return { image: value, width: 400, margin: [0, 5, 0, 15] };
    }
    return { text: String(value), margin: [0, 5, 0, 15] };
  }

  /** Shared pdfMake table layout: shaded header row, light grid, padding. */
  private get pdfGridLayout(): any {
    return {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? '#eef3fa' : null),
      hLineColor: () => '#d6dce5',
      vLineColor: () => '#d6dce5',
      hLineWidth: () => 0.7,
      vLineWidth: () => 0.7,
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 6,
      paddingRight: () => 6,
    };
  }

  private buildInvestigationOrdersPdf(): any[] {
    const comp = this.investigationOrderComp;
    if (!comp) return [];
    // Unified source: live selection merged with saved prior orders, so the
    // section prints whether or not the order was already saved this session.
    const inv = comp.getPrintableInvestigations();
    const labGroups = inv.labByDept;
    const radNames = inv.radiologyNames;
    if (!labGroups.length && !radNames.length) return [];

    const content: any[] = [{ text: 'Investigation Orders:', style: 'sectionHeader' }];

    if (labGroups.length) {
      content.push({
        table: {
          widths: ['auto', '*'],
          body: [
            [{ text: 'Category', bold: true }, { text: 'Tests', bold: true }],
            ...labGroups.map((g) => [{ text: g.department, bold: true, color: '#44546a' }, { text: g.tests.join(', ') }]),
          ],
        },
        layout: this.pdfGridLayout,
        margin: [0, 5, 0, 12],
      });
    }

    if (radNames.length) {
      content.push({ text: `Radiology: ${radNames.join(', ')}`, margin: [0, 0, 0, 6] });
      const r: any = inv.radiology || {};
      const safety: string[] = [];
      if (r.priority) safety.push(`Priority: ${r.priority}`);
      if (r.clinicalDetails) safety.push(`Clinical details: ${r.clinicalDetails}`);
      if (r.serumCreatinine) {
        safety.push(`S. Creatinine: ${r.serumCreatinine}${r.creatinineDoneOn ? ` (done ${r.creatinineDoneOn})` : ''}`);
      }
      if (r.weightKg) safety.push(`Weight: ${r.weightKg} kg`);
      if (r.pregnancy) safety.push(`Pregnancy: Yes${r.lmp ? `, LMP ${r.lmp}` : ''}`);
      if (r.allergyHistory) safety.push(`Allergy: ${r.allergyHistory}`);
      const comorbid = [...(r.comorbidities || [])];
      if (r.otherComorbidity) comorbid.push(r.otherComorbidity);
      if (comorbid.length) safety.push(`History: ${comorbid.join(', ')}`);
      if (r.consentGiven) safety.push('Consent obtained');
      if (safety.length) content.push({ text: safety.join('   •   '), fontSize: 9, margin: [0, 0, 0, 12] });
    }

    if (inv.remarks?.trim()) {
      content.push({ text: `Remarks: ${inv.remarks.trim()}`, margin: [0, 0, 0, 12] });
    }

    return content;
  }

  /**
   * pdfMake nodes for the on-screen prescription (drug rows). Returns [] when
   * the prescription grid isn't mounted or has no filled rows.
   */
  private buildPrescriptionPdf(rx: { prescribedDate: string; tablets: any[] } | null): any[] {
    if (!rx || !rx.tablets.length) return [];

    return [
      { text: 'Prescription:', style: 'sectionHeader' },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', '*'],
          body: [
            [
              { text: 'Drug', bold: true },
              { text: 'Frequency', bold: true },
              { text: 'Duration', bold: true },
              { text: 'Qty', bold: true },
              { text: 'Instructions', bold: true },
            ],
            ...rx.tablets.map((t: any) => [
              { text: [t.brandName, t.genericName].filter(Boolean).join(' / ') || '-' },
              { text: t.frequency || '-' },
              { text: t.duration || '-' },
              { text: t.quantity || '-' },
              { text: t.instructions || '-' },
            ]),
          ],
        },
        layout: this.pdfGridLayout,
        margin: [0, 5, 0, 15],
      },
    ];
  }

  // Sprint 3f — Admit-to-IPD handlers.
  openAdmitToIpd(): void {
    if (!this.admitEligible) return;
    this.admitContext = {
      sourceId: this.appointmentId as number,
      prn: this.formData?.uhid ?? null,
      patientName: this.formData?.patientName ?? null,
      referringDoctor: this.formData?.doctorName || this.formData?.consultant || null,
      summary: [this.formData?.treatmentPlan, this.formData?.investigation]
        .filter((s: string | undefined) => !!s)
        .join('\n\n') || null,
      suggestedAdmissionType: 'elective',
    };
    this.admitModalVisible = true;
  }

  onAdmittedToIpd(_event: AdmittedEvent): void {
    this.admitModalVisible = false;
    // Parent (TodayConsultations) receives the underlying `close` event via
    // the existing saved→close emission pattern when appropriate. Here we
    // simply close the admit modal; the OPD modal's own lifecycle continues.
  }

  // Phase 3 (WF-2) — Refer for Admission handlers.
  openReferModal(): void {
    if (!this.admitEligible) return;
    this.referErrorMessage = '';
    this.referSuccessMessage = '';
    // Seed diagnosis from treatment plan if it's plain text (not a data URL).
    const tp: string = this.formData?.treatmentPlan || '';
    this.referForm = {
      diagnosis: tp && !tp.startsWith('data:') ? tp.split('\n')[0].slice(0, 200) : '',
      urgency: 'routine',
      preferredBedType: 'general',
      admissionType: 'elective',
    };
    this.referModalVisible = true;
  }

  closeReferModal(): void {
    this.referModalVisible = false;
  }

  submitReferForAdmission(): void {
    if (!this.appointmentId) {
      this.referErrorMessage = 'Missing appointment id.';
      return;
    }
    if (!this.referForm.diagnosis || this.referForm.diagnosis.trim().length < 3) {
      this.referErrorMessage = 'Diagnosis is required (min 3 chars).';
      return;
    }
    const doctorName = this.formData?.doctorName || this.formData?.consultant;
    if (!doctorName || doctorName.trim().length < 2) {
      this.referErrorMessage = 'Admitting doctor name is required (set Doctor Name above).';
      return;
    }
    this.referSubmitting = true;
    this.referErrorMessage = '';
    this.opdService
      .referForAdmission({
        appointmentId: this.appointmentId as number,
        diagnosis: this.referForm.diagnosis.trim(),
        urgency: this.referForm.urgency,
        preferredBedType: this.referForm.preferredBedType,
        admittingDoctorName: doctorName.trim(),
        admissionType: this.referForm.admissionType,
      })
      .subscribe({
        next: (res) => {
          this.referSubmitting = false;
          const admissionNo = res?.data?.admission?.admissionNo || '';
          this.referSuccessMessage = `Bed request raised${admissionNo ? ' for ' + admissionNo : ''}. Nursing station will accept and notify.`;
          this.messageService.add({
            severity: 'success',
            summary: 'Referred for admission',
            detail: this.referSuccessMessage,
            life: 5000,
          });
          setTimeout(() => {
            this.referModalVisible = false;
          }, 1500);
        },
        error: (err) => {
          this.referSubmitting = false;
          this.referErrorMessage =
            err?.error?.error || err?.error?.message || 'Failed to refer for admission.';
        },
      });
  }
  async printAssessment() {
    const d = this.formData;
    const now = new Date();
    const logoUrl = "/rash-logo.png";
    d.doctorSign = '';
    if (d.doctorSign && d.doctorSign.startsWith('http')) {
      d.doctorSign = await this.getBase64ImageFromURL(d.doctorSign);
    }

    // Prescription for the PDF — on-screen rows, else the latest saved Rx.
    const rxPrint = this.prescriptionComp
      ? await this.prescriptionComp.getPrescriptionForPrintAsync()
      : null;

    // JMRH letterhead background (shared helper) — provides the hospital header
    // band + footer; content starts below it via brand.pageMargins.
    const brand = await getJmrhPdfBranding();

    this.getBase64ImageFromURL(logoUrl).then((logoBase64) => {
      const docDefinition: any = {
        pageSize: "A4",
        pageMargins: brand.pageMargins,
        background: brand.background,
        footer: brand.footer,
        content: [
          // Hospital header is supplied by the letterhead background.
          { text: "OPD INITIAL ASSESSMENT", style: "subheader", alignment: "center", margin: [0, 0, 0, 20] },

          // Patient Info
          {
            table: {
              widths: ["*", "*", "*"],
              body: [
                [
                  { text: `Name: ${d.patientName || "-"}` },
                  { text: `Age/Sex: ${d.age || "-"} / ${d.gender || "-"}` },
                  { text: `UHID: ${d.uhid || "-"}` }
                ],
                [
                  { text: `Ht: ${d.height || "-"}` },
                  { text: `Wt: ${d.weight || "-"}` },
                  { text: `Date: ${d.date || "-"}` }
                ],
                [
                  { text: `Consultant: ${d.consultant || "-"}` },
                  { text: `Department: ${d.department || "-"}` },
                  { text: `Assessment Time: ${d.assessmentTime || "-"}` }
                ]
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // Vitals
          { text: "Vitals:", style: "sectionHeader" },
          {
            columns: [
              { text: `HR: ${d.hr || "-"}` },
              { text: `RR: ${d.rr || "-"}` },
              { text: `Pulse: ${d.pulse || "-"}` },
              { text: `BP: ${d.bp || "-"}` },
              { text: `Temp: ${d.temp || "-"}` },
              { text: `SPO2: ${d.spo2 || "-"}` }
            ],
            margin: [0, 0, 0, 20]
          },

          // Nutrition
          { text: "Nutritional Assessment:", style: "sectionHeader" },
          {
            table: {
              widths: ["*", "*", "*", "*"],
              body: [
                [
                  { text: `Oral: ${d.dietType || "-"}` },
                  { text: `Enteral: ${d.enteralFeed || "-"}` },
                  { text: `NPO: ${d.npo ? "Yes" : "No"}` },
                  { text: `Allergies: ${d.allergies || "None"}` }
                ]
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // Pain Score (Legend with selection)
          { text: "Pain Score:", style: "sectionHeader" },
          {
            table: {
              widths: ["auto", "*"],
              body: [
                ["0", d.painScore === "0" ? "No hurt - Selected" : "No hurt"],
                ["1-3", d.painScore === "1-3" ? "Mild - Selected" : "Mild"],
                ["4-7", d.painScore === "4-7" ? "Moderate - Selected" : "Moderate"],
                ["8-10", d.painScore === "8-10" ? "Severe - Selected" : "Severe"]
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // Screening
          { text: "Screening:", style: "sectionHeader" },
          {
            table: {
              widths: ["*", "*"],
              body: [
                [
                  { text: `Requirement for any other screening: ${d.otherScreening ? "Yes" : "No"}` },
                  { text: `Counselling on implants: ${d.counsellingImplants ? "Yes" : "No"}` }
                ]
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // Department-specific templated fields (option C). When a template
          // is in use we render its snapshot here, alongside the hand-written
          // sections below — both can co-exist because the template can
          // itself include hand-written canvas fields.
          ...(this.isTemplated
            ? this.buildTemplatedPdfContent()
            : []),

          // Handwritten/typed sections — render as image only when the value is
          // a canvas data-URL; otherwise as plain text (fixes pdfMake throwing
          // "Invalid image" on typed-in textarea content).
          { text: "History:", style: "sectionHeader" },
          this.renderNoteField(d.history),

          { text: "Examination:", style: "sectionHeader" },
          this.renderNoteField(d.examination),

          { text: "Diagnosis:", style: "sectionHeader" },
          this.renderNoteField(d.diagnosis),

          { text: "Investigation:", style: "sectionHeader" },
          this.renderNoteField(d.investigation),

          // Structured lab/radiology orders selected in the grid (Phase 4).
          ...this.buildInvestigationOrdersPdf(),

          { text: "Treatment Plan:", style: "sectionHeader" },
          this.renderNoteField(d.treatmentPlan),

          // Prescription (drug rows — on-screen or latest saved).
          ...this.buildPrescriptionPdf(rxPrint),

          // Staff
          { text: "Staff:", style: "sectionHeader" },
          { text: `Name: ${d.staffName || "-"}, Emp ID: ${d.staffEmpId || "-"}`, margin: [0, 0, 0, 20] },

          // Doctor
          { text: "Doctor:", style: "sectionHeader" },
          { text: `Name: ${d.doctorName || "-"}, KMC No: ${d.kmcNo || "-"}` },
          d.doctorSign ? { image: d.doctorSign, width: 200, margin: [0, 10, 0, 0] } : {}
          // ✅ Doctor Signature Section

        ],
        styles: {
          header: { fontSize: 16, bold: true },
          subheader: { fontSize: 14, bold: true },
          sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] }
        }
      };

      pdfMake.createPdf(docDefinition).open();
    });
  }
  // printAssessment() {
  //   const d = this.formData;
  //   const now = new Date();
  //   const logoUrl = "/rash-logo.png";

  //   // ✅ Prepare promises for both images
  //   const logoPromise = this.getBase64ImageFromURL(logoUrl);
  //   const doctorSignPromise = d.doctorSign
  //     ? this.getBase64ImageFromURL(d.doctorSign)
  //     : Promise.resolve(null);

  //   // ✅ Wait for both images
  //   Promise.all([logoPromise, doctorSignPromise])
  //     .then(([logoBase64, doctorSignBase64]) => {
  //       const docDefinition: any = {
  //         pageSize: "A4",
  //         pageMargins: [40, 40, 40, 40],
  //         footer: function (currentPage: number, pageCount: number) {
  //           return {
  //             columns: [
  //               {
  //                 text: `Jayadev Memorial Rashtrrothana Hospital & Research Centre \nPrinted: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
  //                 alignment: "left",
  //                 fontSize: 9,
  //               },
  //               {
  //                 text: `Page ${currentPage} of ${pageCount}`,
  //                 alignment: "right",
  //                 fontSize: 9,
  //               },
  //             ],
  //             margin: [40, 0],
  //           };
  //         },
  //         content: [
  //           // ✅ Logo + Header
  //           { image: logoBase64, width: 130, alignment: "center" },
  //           {
  //             text: "Jayadev Memorial Rashtrrothana Hospital & Research Centre",
  //             style: "header",
  //             alignment: "center",
  //             margin: [0, 30, 0, 0],
  //           },
  //           {
  //             text: "OPD INITIAL ASSESSMENT",
  //             style: "subheader",
  //             alignment: "center",
  //             margin: [0, 10, 0, 20],
  //           },

  //           // ✅ Patient Info
  //           {
  //             table: {
  //               widths: ["*", "*", "*"],
  //               body: [
  //                 [
  //                   { text: `Name: ${d.patientName || "-"}` },
  //                   { text: `Age/Sex: ${d.age || "-"} / ${d.gender || "-"}` },
  //                   { text: `UHID: ${d.uhid || "-"}` },
  //                 ],
  //                 [
  //                   { text: `Ht: ${d.height || "-"}` },
  //                   { text: `Wt: ${d.weight || "-"}` },
  //                   { text: `Date: ${d.date || "-"}` },
  //                 ],
  //                 [
  //                   { text: `Consultant: ${d.consultant || "-"}` },
  //                   { text: `Department: ${d.department || "-"}` },
  //                   { text: `Assessment Time: ${d.assessmentTime || "-"}` },
  //                 ],
  //               ],
  //             },
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Vitals
  //           { text: "Vitals:", style: "sectionHeader" },
  //           {
  //             columns: [
  //               { text: `HR: ${d.hr || "-"}` },
  //               { text: `RR: ${d.rr || "-"}` },
  //               { text: `Pulse: ${d.pulse || "-"}` },
  //               { text: `BP: ${d.bp || "-"}` },
  //               { text: `Temp: ${d.temp || "-"}` },
  //               { text: `SPO2: ${d.spo2 || "-"}` },
  //             ],
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Nutrition
  //           { text: "Nutritional Assessment:", style: "sectionHeader" },
  //           {
  //             table: {
  //               widths: ["*", "*", "*", "*"],
  //               body: [
  //                 [
  //                   { text: `Oral: ${d.dietType || "-"}` },
  //                   { text: `Enteral: ${d.enteralFeed || "-"}` },
  //                   { text: `NPO: ${d.npo ? "Yes" : "No"}` },
  //                   { text: `Allergies: ${d.allergies || "None"}` },
  //                 ],
  //               ],
  //             },
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Pain Score
  //           { text: "Pain Score:", style: "sectionHeader" },
  //           {
  //             table: {
  //               widths: ["auto", "*"],
  //               body: [
  //                 ["0", d.painScore === "0" ? "No hurt - Selected" : "No hurt"],
  //                 ["1-3", d.painScore === "1-3" ? "Mild - Selected" : "Mild"],
  //                 ["4-7", d.painScore === "4-7" ? "Moderate - Selected" : "Moderate"],
  //                 ["8-10", d.painScore === "8-10" ? "Severe - Selected" : "Severe"],
  //               ],
  //             },
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Screening
  //           { text: "Screening:", style: "sectionHeader" },
  //           {
  //             table: {
  //               widths: ["*", "*"],
  //               body: [
  //                 [
  //                   { text: `Requirement for any other screening: ${d.otherScreening ? "Yes" : "No"}` },
  //                   { text: `Counselling on implants: ${d.counsellingImplants ? "Yes" : "No"}` },
  //                 ],
  //               ],
  //             },
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Handwritten sections
  //           { text: "History:", style: "sectionHeader" },
  //           d.history ? { image: d.history, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

  //           { text: "Examination:", style: "sectionHeader" },
  //           d.examination ? { image: d.examination, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

  //           { text: "Investigation:", style: "sectionHeader" },
  //           d.investigation ? { image: d.investigation, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

  //           { text: "Treatment Plan:", style: "sectionHeader" },
  //           d.treatmentPlan ? { image: d.treatmentPlan, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

  //           // ✅ Staff
  //           { text: "Staff:", style: "sectionHeader" },
  //           {
  //             text: `Name: ${d.staffName || "-"}, Emp ID: ${d.staffEmpId || "-"}`,
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Doctor Signature Section
  //           { text: "Doctor:", style: "sectionHeader" },
  //           {
  //             table: {
  //               widths: ["auto", "*"],
  //               body: [
  //                 [
  //                   doctorSignBase64
  //                     ? { image: doctorSignBase64, width: 120, margin: [0, 5, 0, 5] }
  //                     : { text: "Signature: Not Available" },
  //                   {
  //                     stack: [
  //                       { text: `Name: ${d.doctorName || "-"}` },
  //                       { text: `Department: ${d.department || "-"}` },
  //                       { text: `KMC No: ${d.kmcNo || "-"}` },
  //                     ],
  //                     margin: [10, 5, 0, 0],
  //                   },
  //                 ],
  //               ],
  //             },
  //             layout: "noBorders",
  //             margin: [0, 10, 0, 0],
  //           },
  //         ],
  //         styles: {
  //           header: { fontSize: 16, bold: true },
  //           subheader: { fontSize: 14, bold: true },
  //           sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
  //         },
  //       };

  //       pdfMake.createPdf(docDefinition).open();
  //     })
  //     .catch((err) => {
  //       console.error("❌ Error generating PDF:", err);
  //     });
  // }
  private getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";  // important for cross-domain images
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = url;
    });
  }
  // Load appointment details
  loadAppointmentDetails(appointmentId: number) {
    this.appointmentService.getAppointmentById(appointmentId).subscribe({
      next: (appt) => {
        if (!appt) return;

        const user = appt.user || {};

        // 🧠 Extract clean staff name from username (e.g. "keerthu_superadmin@rashtrotthana" → "Keerthu")
        let staffName = '';
        if (user.username) {
          const raw = user.username.split('@')[0]; // remove domain
          const base = raw.split('_')[0];          // remove role suffix
          staffName = base.charAt(0).toUpperCase() + base.slice(1); // capitalize first letter
        }

        this.formData = {
          ...this.formData,   // keep handwritten sections, etc.

          // Patient Info
          patientName: appt.patientName || '',
          age: appt.age || '',
          gender: appt.gender || '',
          uhid: appt.prnNumber?.toString() || '',
          consultant: appt.doctorName || '',
          department: appt.department || '',
          date: appt.date || '',
          assessmentTime: this.convertTo24Hour(appt.time) || '',

          // Vitals (from appointment table itself)
          bp: appt.BPs && appt.BPd ? `${appt.BPs}/${appt.BPd}` : '',
          hr: appt.pulse || '',
          rr: appt.RR || '',
          temp: appt.temp || '',
          spo2: appt.spo2 || '',
          height: appt.height || '',
          weight: appt.weight || '',

          // Doctor details
          doctorName: appt.doctorName || '',
          kmcNo: appt.doctor?.kmcNumber || '', // if relation loaded
          staffName: staffName,
          staffEmpId: appt.user?.employeeId?.toString() || '',
          doctorSign: appt.doctor?.signUrl || ''
        };

        // Load department-scoped templates for the picker.
        if (appt.department) this.loadTemplatesFor(appt.department);
      },
      error: (err) => {
        console.error("Error loading appointment", err);
      }
    });
  }
  setActivePad(activeKey: string): void {
    const pads = {
      history: this.historyComp,
      examination: this.examinationComp,
      investigation: this.investigationComp,
      treatmentPlan: this.treatmentPlanComp,
    };

    Object.keys(pads).forEach(key => {
      pads[key as keyof typeof pads]?.setReadOnly(!!activeKey && key !== activeKey);
    });
  }

  // uploadVoice(file: File) {
  //   const formData = new FormData();
  //   formData.append('audio', file);
  //   this.voiceOPDService.uploadVoice(file).subscribe({
  //     next: (res) => {
  //       console.log('Voice response:', res);

  //       // Fill text data
  //       this.formData.history = res.history || '';
  //       this.formData.examination = res.examination || '';
  //       this.formData.investigation = res.investigation || '';
  //       this.formData.treatmentPlan = res.treatmentPlan || '';

  //       // Update handwriting pads
  //       // this.updateHandwrittenSections();
  //     },
  //     error: (err) => {
  //       console.error('Voice upload failed', err);
  //     }
  //   });
  // }
  uploadVoice(file: File) {
  this.voiceProcessing = true;
  // Phase 9.21 — when a template is selected, the backend structures the
  // transcript into THAT template's dynamic fields; otherwise it returns the
  // fixed history/examination/investigation/treatmentPlan sections.
  this.voiceOPDService.uploadVoice(file, this.selectedTemplateId || undefined).subscribe({
    next: (res) => {
      console.log('Voice response:', res);
      this.voiceProcessing = false;

      if (this.isTemplated && res.templatedValueMap) {
        // Merge structured speech into the dynamic template fields.
        this.templateValues = { ...this.templateValues, ...res.templatedValueMap };
      } else {
        // Legacy fixed sections.
        this.updateSection('history', res.history);
        this.updateSection('examination', res.examination);
        this.updateSection('diagnosis', (res as any).diagnosis);
        this.updateSection('investigation', res.investigation);
        this.updateSection('treatmentPlan', res.treatmentPlan);
      }
    },
    error: (err) => {
      console.error('Voice upload failed', err);
      this.voiceProcessing = false;
    }
  });
}
updateSection(key: string, newText?: string) {
  if (!newText) return;

  const existingText = this.formData[key];

  // If empty → fill
  if (!existingText || existingText.trim() === '') {
    this.formData[key] = newText;
  } 
  // If already exists → append with line break
  else {
    this.formData[key] = existingText + '\n' + newText;
  }
}

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('Recording started...');
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  }
  stopRecording() {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecording = false;

    this.mediaRecorder.onstop = () => {
      // const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      // const audioFile = new File([audioBlob], 'voice.wav', { type: 'audio/wav' });
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });

      this.uploadVoice(audioFile);
    };

    console.log('Recording stopped...');
  }

convertTo24Hour(time: string): string {
  if (!time) return '';

  const [timePart, modifier] = time.split(' ');
  let [hours, minutes] = timePart.split(':');

  let h = parseInt(hours, 10);

  if (modifier === 'PM' && h < 12) {
    h += 12;
  }
  if (modifier === 'AM' && h === 12) {
    h = 0;
  }

  return `${h.toString().padStart(2, '0')}:${minutes}`;
}

}
