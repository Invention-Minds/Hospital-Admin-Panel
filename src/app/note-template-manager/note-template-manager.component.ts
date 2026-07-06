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
} from '../services/note-template.service';
import { DoctorServiceService } from '../services/doctor-details/doctor-service.service';
import { AlertService } from '../services/alert.service';
import { Department } from '../models/department.model';

/**
 * Admin page — `/note-templates`. Lets super_admin define department-scoped
 * templates for discharge / OPD-handwritten / OPD-doctor notes.
 *
 * Three regions:
 *   • Top toolbar — filter by noteType / department.
 *   • Left list — all templates matching the filter, click to open in editor.
 *   • Right editor — name / department / noteType / fields[] with add-remove-
 *     reorder. Also shows a preview using the same renderer the doctor sees.
 */
@Component({
  selector: 'app-note-template-manager',
  templateUrl: './note-template-manager.component.html',
  styleUrls: ['./note-template-manager.component.css'],
})
export class NoteTemplateManagerComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Filter state for the left list.
  filterNoteType: NoteType | '' = '';
  filterDepartment = '';
  filterIsActive: '' | 'true' | 'false' = '';

  // Master lists.
  templates: NoteTemplate[] = [];
  departments: Department[] = [];

  // Editor state — null when nothing selected (placeholder shows on the right).
  editing: NoteTemplate | null = null;
  editForm = this.blankForm();
  isNew = false;
  saving = false;

  // Preview pane — toggles a read-only render of the current editor fields[].
  showPreview = false;
  previewValues: Record<string, unknown> = {};

  readonly noteTypeOptions: { value: NoteType; label: string }[] = [
    { value: 'discharge',       label: 'IPD Discharge summary' },
    { value: 'opd-handwritten', label: 'OPD assessment (with hand-written canvases)' },
    { value: 'opd-doctor',      label: 'Doctor manual notes (OPD console)' },
    { value: 'diet-plan',       label: 'Dietetics — diet plan' },
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
    this.refresh();
    this.loadDepartments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── List loading ───────────────────────────────────────────────────
  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.templateService
      .list({
        noteType: this.filterNoteType || undefined,
        department: this.filterDepartment || undefined,
        isActive:
          this.filterIsActive === ''
            ? undefined
            : this.filterIsActive === 'true',
      })
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

  private loadDepartments(): void {
    this.doctorService
      .getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => { this.departments = rows ?? []; },
        error: () => { this.departments = []; },
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
      department: row.department,
      fields: row.fields.map((f) => ({ ...f })), // shallow clone so editor
                                                 // changes don't leak to the list
      isActive: row.isActive,
      isDefault: row.isDefault,
      scope: row.doctorId != null ? 'mine' : 'department',
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
    // Re-stamp order so server sees the new sequence.
    arr.forEach((f, i) => (f.order = i));
    this.editForm.fields = arr;
  }

  /** Comma-separated string ↔ string[] helper for the select/radio/multiselect options field. */
  optionsAsText(field: FieldDef): string {
    return (field.options ?? []).join(', ');
  }
  setOptionsFromText(field: FieldDef, text: string): void {
    field.options = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Field type may have changed from select → text — clear options if the
   * new type doesn't support them. Saves bytes + avoids stale data.
   */
  onFieldTypeChange(field: FieldDef): void {
    const needsOptions = ['select', 'multiselect', 'radio'].includes(field.type);
    if (!needsOptions) field.options = undefined;
    else if (!field.options) field.options = [];
  }

  /** Whether this field type needs the options input rendered. */
  fieldNeedsOptions(type: FieldType): boolean {
    return type === 'select' || type === 'multiselect' || type === 'radio';
  }

  // ─── Save / publish ─────────────────────────────────────────────────
  save(): void {
    if (this.saving) return;
    this.errorMessage = '';
    this.successMessage = '';

    // Light client-side guard so we don't round-trip obvious mistakes.
    if (!this.editForm.name?.trim() || this.editForm.name.trim().length < 3) {
      this.errorMessage = 'Template name must be at least 3 characters.';
      return;
    }
    if (!this.editForm.department?.trim()) {
      this.errorMessage = 'Department is required.';
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

    this.saving = true;
    const payload: CreateTemplatePayload = {
      name: this.editForm.name.trim(),
      noteType: this.editForm.noteType,
      department: this.editForm.department.trim(),
      fields: this.editForm.fields,
      isActive: this.editForm.isActive,
      isDefault: this.editForm.isDefault,
      // Scope only applies when creating; doctorId is fixed thereafter (clone to re-scope).
      ...(this.isNew ? { scope: this.editForm.scope } : {}),
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

  cloneCurrent(): void {
    if (!this.editing) return;
    this.templateService.clone(this.editing.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.successMessage = `Cloned to "${row.name}"`;
          this.refresh();
          this.selectTemplate(row);
        },
        error: (err) => { this.errorMessage = err?.error?.error || 'Clone failed'; },
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
    if (!await this.alertSvc.confirm(`Deactivate "${this.editing.name}"? Doctors will no longer see it on their forms.`, { severity: 'warning', confirmLabel: 'Deactivate' })) return;
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
    department: string;
    fields: FieldDef[];
    isActive: boolean;
    isDefault: boolean;
    scope: 'mine' | 'department';
  } {
    return {
      name: '',
      noteType: 'discharge',
      department: '',
      fields: [],
      isActive: true,
      isDefault: false,
      scope: 'department',
    };
  }

  noteTypeLabel(t: NoteType): string {
    return this.noteTypeOptions.find((o) => o.value === t)?.label ?? t;
  }
}
