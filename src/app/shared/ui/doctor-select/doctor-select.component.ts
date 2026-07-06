import { Component, forwardRef, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';

import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import { MastersService } from '../../../services/masters.service';

/**
 * Reusable searchable doctor/surgeon/assistant picker.
 *
 * Implements ControlValueAccessor over a plain STRING (the selected name), so
 * existing `[(ngModel)]="x.surgeonName"` free-text fields can be swapped to
 * `<app-doctor-select [(ngModel)]="x.surgeonName">` with no payload change.
 *
 * Data source is chosen by [source]:
 *   - 'doctors'    → DoctorServiceService.getActiveDoctors() → doctor.name
 *   - 'surgeons'   → MastersService.listSurgeons('surgeon')   → MasterSurgeon.name
 *   - 'assistants' → MastersService.listSurgeons('assistant') → MasterSurgeon.name
 *
 * Built on PrimeNG 17 p-autoComplete (dropdown button + type-to-filter,
 * case-insensitive contains). The model is always the current string — a
 * pre-existing free-text value writes through and displays even if it isn't in
 * the loaded list.
 */
@Component({
  selector: 'app-doctor-select',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DoctorSelectComponent),
      multi: true,
    },
  ],
  template: `
    <p-autoComplete
      [(ngModel)]="value"
      [suggestions]="filtered"
      (completeMethod)="search($event)"
      (onSelect)="onSelect($event.value ?? $event)"
      (onClear)="onClear()"
      (onBlur)="onTouched()"
      [dropdown]="true"
      [forceSelection]="false"
      [placeholder]="placeholder"
      [disabled]="disabled"
      styleClass="w-full"
      appendTo="body"
    ></p-autoComplete>
  `,
})
export class DoctorSelectComponent implements OnInit, ControlValueAccessor {
  @Input() source: 'doctors' | 'surgeons' | 'assistants' = 'doctors';
  @Input() placeholder = 'Select...';

  /** All available name strings for the chosen source. */
  names: string[] = [];
  /** Suggestions currently shown in the dropdown. */
  filtered: string[] = [];
  /** Bound model — always the current name string. */
  value = '';
  disabled = false;

  private onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor(
    private doctorService: DoctorServiceService,
    private masters: MastersService,
  ) {}

  ngOnInit(): void {
    this.loadNames();
  }

  private loadNames(): void {
    if (this.source === 'doctors') {
      this.doctorService.getActiveDoctors().subscribe({
        next: (docs) => {
          this.names = (docs || []).map((d) => d.name).filter((n) => !!n);
        },
        error: () => {
          this.names = [];
        },
      });
    } else {
      const type = this.source === 'surgeons' ? 'surgeon' : 'assistant';
      this.masters.listSurgeons(type).subscribe({
        next: (rows) => {
          this.names = (rows || []).map((r) => r.name).filter((n) => !!n);
        },
        error: () => {
          this.names = [];
        },
      });
    }
  }

  /** PrimeNG completeMethod — case-insensitive contains filter by name. */
  search(event: { query: string }): void {
    const q = (event?.query || '').toLowerCase().trim();
    if (!q) {
      this.filtered = [...this.names];
      return;
    }
    this.filtered = this.names.filter((n) => n.toLowerCase().includes(q));
  }

  onSelect(name: string): void {
    this.value = name ?? '';
    this.onChange(this.value);
  }

  onClear(): void {
    this.value = '';
    this.onChange('');
  }

  // ─── ControlValueAccessor ───────────────────────────────────────────
  writeValue(val: unknown): void {
    // Accept any non-empty string and display it even if not in the loaded
    // list, so existing saved free-text names still show.
    this.value = typeof val === 'string' && val ? val : '';
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
