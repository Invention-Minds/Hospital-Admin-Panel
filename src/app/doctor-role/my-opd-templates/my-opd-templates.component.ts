import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  CreateTemplatePayload,
  FieldDef,
  FieldType,
  NoteTemplate,
  NoteTemplateService,
  NoteType,
} from '../../services/note-template.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AlertService } from '../../services/alert.service';

/**
 * Doctor page — `/my-opd-templates`. Phase 9.21 self-service manager that lets
 * a doctor create / edit their OWN OPD templates (the field set that renders on
 * their OPD console + assessment forms).
 *
 * Scoped on purpose, distinct from the super_admin `/note-templates` manager:
 *   • Lists ONLY the doctor's personal templates (server enforces via /mine).
 *   • noteType is limited to the two OPD forms a doctor authors.
 *   • scope is hard-wired to 'mine'; department auto-fills from the doctor's
 *     own profile — there are no department / shared-template controls.
 */
@Component({
  selector: 'app-my-opd-templates',
  templateUrl: './my-opd-templates.component.html',
  // Reuse the admin manager's styles — same markup classes, single source of truth.
  styleUrls: ['../../note-template-manager/note-template-manager.component.css'],
})
export class MyOpdTemplatesComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  successMessage = '';

  // The logged-in doctor — resolved once on init; department auto-fills new templates.
  private myDepartment = '';
  private profileReady = false;

  templates: NoteTemplate[] = [];

  editing: NoteTemplate | null = null;
  editForm = this.blankForm();
  isNew = false;
  saving = false;

  showPreview = false;
  previewValues: Record<string, unknown> = {};

  // Doctors only author OPD forms — discharge / diet-plan stay admin-only.
  readonly noteTypeOptions: { value: NoteType; label: string }[] = [
    { value: 'opd-doctor',      label: 'Doctor manual notes (OPD console)' },
    { value: 'opd-handwritten', label: 'OPD assessment (with hand-written canvases)' },
  ];

  readonly fieldTypeOptions: { value: FieldType; label: string }[] = [
    { value: 'text',         label: 'Single-line text' },
    { value: 'textarea',     label: 'Multi-line text' },
    { value: 'number',       label: 'Number' },
    { value: 'date',         label: 'Date' },
    { value: 'datetime',     label: 'Date + time' },
    { value: 'select',       label: 'Dropdown (single)' },
    { value: 'multiselect',  label: 'Checkboxes (multi-select)' },
    { value: 'radio',        label: 'Radio (single)' },
    { value: 'checkbox',     label: 'Yes / No checkbox' },
    { value: 'handwritten',  label: 'Hand-written canvas (option C)' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private templateService: NoteTemplateService,
    private doctorService: DoctorServiceService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Resolve the doctor's own department so new personal templates carry it. */
  private loadProfile(): void {
    const userId = Number(localStorage.getItem('userid') || '0');
    if (!userId) { this.profileReady = true; return; }
    this.doctorService
      .getDoctorByUserId(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doc) => {
          this.myDepartment = doc?.departmentName ?? '';
          this.profileReady = true;
        },
        error: () => { this.profileReady = true; },
      });
  }

  // ─── List loading ───────────────────────────────────────────────────
  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.templateService
      .listMine()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.templates = rows;
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Failed to load templates';
          this.loading = false;
        },
      });
  }

  // ─── Editor open / close ───────────────────────────────────────────
  startNew(): void {
    this.editing = null;
    this.isNew = true;
    this.editForm = this.blankForm();
    this.previewValues = {};
    this.showPreview = false;
    this.successMessage = '';
    this.errorMessage = '';
  }

  selectTemplate(row: NoteTemplate): void {
    this.editing = row;
    this.isNew = false;
    this.editForm = {
      name: row.name,
      noteType: row.noteType,
      fields: row.fields.map((f) => ({ ...f })), // shallow clone so editor
                                                 // changes don't leak to the list
      isActive: row.isActive,
      isDefault: row.isDefault,
    };
    this.previewValues = {};
    this.showPreview = false;
    this.successMessage = '';
    this.errorMessage = '';
  }

  // ─── Field-list editing ─────────────────────────────────────────────
  addField(): void {
    this.editForm.fields = [
      ...this.editForm.fields,
      {
        key: `field_${this.editForm.fields.length + 1}`,
        label: 'New field',
        type: 'text',
        required: false,
        order: this.editForm.fields.length,
      },
    ];
  }

  removeField(idx: number): void {
    this.editForm.fields = this.editForm.fields.filter((_, i) => i !== idx);
  }

  moveField(idx: number, delta: -1 | 1): void {
    const next = idx + delta;
    if (next < 0 || next >= this.editForm.fields.length) return;
    const arr = [...this.editForm.fields];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    arr.forEach((f, i) => (f.order = i));
    this.editForm.fields = arr;
  }

  optionsAsText(field: FieldDef): string {
    return (field.options ?? []).join(', ');
  }
  setOptionsFromText(field: FieldDef, text: string): void {
    field.options = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  onFieldTypeChange(field: FieldDef): void {
    const needsOptions = ['select', 'multiselect', 'radio'].includes(field.type);
    if (!needsOptions) field.options = undefined;
    else if (!field.options) field.options = [];
  }

  fieldNeedsOptions(type: FieldType): boolean {
    return type === 'select' || type === 'multiselect' || type === 'radio';
  }

  // ─── Save / publish ─────────────────────────────────────────────────
  save(): void {
    if (this.saving) return;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.editForm.name?.trim() || this.editForm.name.trim().length < 3) {
      this.errorMessage = 'Template name must be at least 3 characters.';
      return;
    }
    if (this.editForm.fields.length === 0) {
      this.errorMessage = 'Add at least one field before saving.';
      return;
    }
    for (const f of this.editForm.fields) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(f.key)) {
        this.errorMessage = `Field key "${f.key}" is invalid (letters, digits, underscore only; must start with a letter).`;
        return;
      }
      if (!f.label?.trim()) {
        this.errorMessage = `Field "${f.key}" needs a label.`;
        return;
      }
      if (this.fieldNeedsOptions(f.type) && (!f.options || f.options.length === 0)) {
        this.errorMessage = `Field "${f.key}" (${f.type}) needs at least one option.`;
        return;
      }
    }

    // New personal templates need a department — taken from the doctor's profile,
    // never picked by the doctor. Block if we couldn't resolve it.
    if (this.isNew && !this.myDepartment.trim()) {
      this.errorMessage = this.profileReady
        ? 'Could not determine your department — contact an administrator.'
        : 'Still loading your profile — try again in a moment.';
      return;
    }

    this.saving = true;
    const payload: CreateTemplatePayload = {
      name: this.editForm.name.trim(),
      noteType: this.editForm.noteType,
      // On update the server keeps the existing department; on create use the doctor's own.
      department: this.editing?.department ?? this.myDepartment.trim(),
      fields: this.editForm.fields,
      isActive: this.editForm.isActive,
      isDefault: this.editForm.isDefault,
      ...(this.isNew ? { scope: 'mine' as const } : {}),
    };
    const obs = this.isNew || !this.editing
      ? this.templateService.create(payload)
      : this.templateService.update(this.editing.id, payload);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (row) => {
        this.saving = false;
        this.successMessage = this.isNew ? 'Template created.' : 'Template saved.';
        this.refresh();
        this.selectTemplate(row);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Save failed';
      },
    });
  }

  setAsDefault(): void {
    if (!this.editing) return;
    this.templateService.setDefault(this.editing.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.successMessage = 'Default updated.';
          this.refresh();
          this.selectTemplate(row);
        },
        error: (err) => { this.errorMessage = err?.error?.error || 'Failed to set default'; },
      });
  }

  async deactivate(): Promise<void> {
    if (!this.editing) return;
    if (!await this.alertSvc.confirm(`Deactivate "${this.editing.name}"? It will no longer appear on your OPD forms.`, { severity: 'warning', confirmLabel: 'Deactivate' })) return;
    this.templateService.delete(this.editing.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Template deactivated.';
          this.editing = null;
          this.refresh();
        },
        error: (err) => { this.errorMessage = err?.error?.error || 'Deactivate failed'; },
      });
  }

  // ─── View helpers ───────────────────────────────────────────────────
  blankForm(): {
    name: string;
    noteType: NoteType;
    fields: FieldDef[];
    isActive: boolean;
    isDefault: boolean;
  } {
    return {
      name: '',
      noteType: 'opd-doctor',
      fields: [],
      isActive: true,
      isDefault: false,
    };
  }

  noteTypeLabel(t: NoteType): string {
    return this.noteTypeOptions.find((o) => o.value === t)?.label ?? t;
  }
}
