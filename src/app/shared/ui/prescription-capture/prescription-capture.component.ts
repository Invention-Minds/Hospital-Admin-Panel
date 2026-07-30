import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { PrescriptionService } from '../../../services/prescription/prescription.service';

/** Viewport coordinates for a position:fixed suggestion list. */
interface SuggestPos {
  top: number;
  left: number;
  width: number;
}

/**
 * Phase 9.22 — Prescription capture (full parity with the OP consulting-notes
 * prescription tab). Self-contained, standalone, embeddable. Mirrors the
 * drug-row table + Favorites / Allergies / Past Rx / Previous Rx, saving via
 * PrescriptionService. Patient + prescriber context comes in as @Inputs.
 *
 * NOTE: this is a deliberate duplicate of the consulting-notes prescription
 * feature (per request: leave that screen untouched). Keep the two in mind
 * when changing prescription behavior.
 */
@Component({
  selector: 'app-prescription-capture',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './prescription-capture.component.html',
  styleUrls: ['./prescription-capture.component.css'],
})
export class PrescriptionCaptureComponent implements OnInit, OnChanges {
  @Input() prn = '';
  @Input() patientName = '';
  @Input() doctorName = '';
  @Input() doctorId: string | number | null = null;
  @Input() doctorKmc = '';

  form: FormGroup;
  favoritesForm: FormGroup;
  allergyForm!: FormGroup;

  allTablets: any[] = [];
  genericOptions: any[] = [];
  brandOptions: any[] = [];
  tabletsMap: Record<string, string[]> = {};

  filteredBrandOptions: string[][] = [];
  filteredBrandOptionsFavorites: string[][] = [];
  filteredBrandNames: string[][] = [];
  showBrandSuggestions: boolean[] = [];
  filteredFavBrandNames: string[][] = [];
  showFavBrandSuggestions: boolean[] = [];

  allergicGenerics: string[] = [];
  selectedGeneric = '';
  allFavorites: any[] = [];
  favoriteSet = new Set<number>();

  showFavorite = false;
  showAllergy = false;
  showPreviousRx = false;
  showPastRx = false;

  previousPrescription: any = '';
  pastPrescriptions: any[] = [];
  selectedPrescriptionId: any = null;
  selectedPrescription: any = null;

  saved = false;
  isButtonLoading = false;
  username = '';
  today = '';
  selectPrescriptionPrint: any[] = [];

  readonly frequencyOptions = [
    '1-1-1', '1-0-1', '1-1-0', '0-1-1', '1-0-0', '0-0-1', '0-1-0', '2-2-2',
    '1/2-1/2-1/2', '1/2-0-1/2', '1/2-1/2-0', '1-1-1-1', '2-2-2-2',
    '5ml-5ml-5ml', 'Stat', 'Till Review', 'SOS', 'Daily',
  ];
  readonly durationOptions = ['Daily', '3 days', '5 days', '7 days', '10 days'];

  constructor(private fb: FormBuilder, private prescriptionService: PrescriptionService, private messageService: MessageService) {
    this.form = this.fb.group({
      prescribedBy: [''],
      prn: [''],
      patientName: [''],
      remarks: [''],
      prescribedDate: [''],
      prescribedById: [''],
      prescribedByKMC: [''],
      tablets: this.fb.array([]),
    });
    this.favoritesForm = this.fb.group({ favorites: this.fb.array([]) });
    this.allergyForm = this.fb.group({ allergies: this.fb.array([]) });
  }

  ngOnInit(): void {
    const d = new Date();
    this.today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (typeof localStorage !== 'undefined') this.username = localStorage.getItem('userid') || '';
    this.loadTabletOptions();
    if (this.tablets.length === 0) this.addTablet();
    this.patchHeader();
    this.loadAllergiesForPatient();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prn'] || changes['patientName'] || changes['doctorName'] || changes['doctorId'] || changes['doctorKmc']) {
      this.patchHeader();
      if (changes['prn'] && this.prn) this.loadAllergiesForPatient();
    }
  }

  private patchHeader(): void {
    this.form.patchValue({
      prescribedBy: this.doctorName,
      prn: this.prn?.toString() ?? '',
      patientName: this.patientName,
      prescribedDate: this.today,
      prescribedById: this.doctorId != null ? this.doctorId.toString() : (this.username || ''),
      prescribedByKMC: this.doctorKmc,
    });
  }

  private loadAllergiesForPatient(): void {
    if (!this.prn) return;
    this.prescriptionService.getAllergies(this.prn).subscribe((allergies) => {
      this.allergicGenerics = (allergies || []).map((a: any) => a.genericName);
    });
  }

  loadTabletOptions(): void {
    this.prescriptionService.getAllTablets().subscribe((tablets) => {
      this.allTablets = tablets || [];
      this.genericOptions = [...new Set(this.allTablets.map((t: any) => t.genericName))];
      this.brandOptions = [...new Set(this.allTablets.map((t: any) => t.brandName))];
    });
  }

  // ─── Drug rows ─────────────────────────────────────────────────────────
  get tablets(): FormArray { return this.form.get('tablets') as FormArray; }

  /**
   * Current on-screen prescription, for a parent (e.g. OPD) that prints the
   * whole assessment in one PDF. Returns only filled drug rows.
   */
  getPrescriptionForPrint(): { prescribedDate: string; tablets: any[] } {
    const tablets = (this.tablets.value || []).filter(
      (t: any) => t && (t.genericName || t.brandName),
    );
    return {
      prescribedDate: this.form.get('prescribedDate')?.value || this.today,
      tablets,
    };
  }

  /**
   * Print data for a parent that bundles the whole assessment. Prefers on-screen
   * filled rows; if the form is empty (e.g. reopened assessment), falls back to
   * the latest SAVED prescription for this prn so "already prescribed" still
   * prints.
   */
  getPrescriptionForPrintAsync(): Promise<{ prescribedDate: string; tablets: any[] }> {
    const onScreen = this.getPrescriptionForPrint();
    if (onScreen.tablets.length || !this.prn) return Promise.resolve(onScreen);
    return new Promise((resolve) => {
      this.prescriptionService.getPrescriptionsByPrn(this.prn).subscribe({
        next: (data: any[]) => {
          if (!data || !data.length) { resolve(onScreen); return; }
          const latest = [...data].sort(
            (a, b) => new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime(),
          )[0];
          resolve({
            prescribedDate: latest?.prescribedDate || onScreen.prescribedDate,
            tablets: (latest?.tablets ?? []).filter((t: any) => t && (t.genericName || t.brandName)),
          });
        },
        error: () => resolve(onScreen),
      });
    });
  }

  addTablet(): void {
    const last = this.tablets.at(this.tablets.length - 1);
    if (last && !last.get('genericName')?.value && !last.get('brandName')?.value) return;
    this.tablets.push(this.fb.group({
      genericName: [''], brandName: [''], frequency: [''], duration: [''],
      instructions: [''], quantity: [''], isFavorite: [false],
      freqCustom: [false], durCustom: [false],
    }));
    this.filteredBrandOptions.push([]);
    this.brandOptions = this.allTablets.map((b: any) => b.brandName);
    this.filteredBrandNames.push([...this.brandOptions]);
  }

  removeTablet(index: number): void {
    this.tablets.removeAt(index);
    this.filteredBrandOptions.splice(index, 1);
    this.filteredBrandNames.splice(index, 1);
    this.showBrandSuggestions.splice(index, 1);
    this.brandPopupPos.splice(index, 1);
    this.dropGenericSuggestionState('tablets', index);
    // The removed row may have been mid-taper — relabel what's left.
    if (index > 0) this.relabelPhases(Math.min(index - 1, this.tablets.length - 1));
  }

  // ─── Phased / tapering regimens ──────────────────────────────────────────
  // Psychiatry (and steroid/benzodiazepine tapers generally) prescribe the same
  // drug in consecutive stages: 1-0-1 for a week, then 0-0-1 for a week, and so
  // on. Each stage is its own drug row — the schema already allows the same drug
  // more than once per prescription — and the day range goes into the
  // Instruction column so it prints and dispenses correctly with no schema
  // change. Rows of one regimen stay adjacent and are relabelled whenever a
  // duration in the block changes.

  /** Indices of the contiguous run of rows sharing this row's generic+brand. */
  private phaseBlock(index: number): number[] {
    const keyAt = (i: number) => {
      const row = this.tablets.at(i);
      const generic = String(row?.get('genericName')?.value ?? '').trim().toLowerCase();
      const brand = String(row?.get('brandName')?.value ?? '').trim().toLowerCase();
      return `${generic}|${brand}`;
    };
    if (index < 0 || index >= this.tablets.length) return [];
    const key = keyAt(index);
    let start = index;
    while (start > 0 && keyAt(start - 1) === key) start--;
    let end = index;
    while (end < this.tablets.length - 1 && keyAt(end + 1) === key) end++;
    const block: number[] = [];
    for (let i = start; i <= end; i++) block.push(i);
    return block;
  }

  /** Matches a label this code wrote, so relabelling stays idempotent. */
  private static readonly PHASE_LABEL = /^(?:then\s+)?(?:days?\s+\d+(?:\s*[–-]\s*\d+)?|phase\s+\d+)\s*(?:·\s*)?/i;

  private stripPhaseLabel(value: any): string {
    return String(value ?? '').replace(PrescriptionCaptureComponent.PHASE_LABEL, '').trim();
  }

  /** Add the next stage of the drug on `index`, directly below its block. */
  addPhase(index: number): void {
    const source = this.tablets.at(index);
    if (!source) return;
    const genericName = source.get('genericName')?.value;
    const brandName = source.get('brandName')?.value;
    if (!genericName && !brandName) {
      this.messageService.add({
        severity: 'warn', summary: 'Pick a drug first',
        detail: 'Choose the generic or brand on this row before adding a phase.',
      });
      return;
    }
    const block = this.phaseBlock(index);
    const insertAt = (block.length ? block[block.length - 1] : index) + 1;
    this.tablets.insert(insertAt, this.fb.group({
      genericName: [genericName], brandName: [brandName], frequency: [''], duration: [''],
      instructions: [''], quantity: [''], isFavorite: [false],
      freqCustom: [false], durCustom: [false],
    }));
    this.filteredBrandOptions.splice(insertAt, 0, this.filteredBrandOptions[index] ?? []);
    this.filteredBrandNames.splice(insertAt, 0, []);
    this.showBrandSuggestions.splice(insertAt, 0, false);
    this.brandPopupPos.splice(insertAt, 0, { top: 0, left: 0, width: 0 });
    this.insertGenericSuggestionState('tablets', insertAt);
    this.relabelPhases(insertAt);
  }

  /** Rewrite the day-range labels for the whole regimen `index` belongs to.
   *  Day ranges are used when every stage has a numeric duration; otherwise the
   *  stages fall back to "Phase n" so a "Till Review"/"SOS" stage still reads
   *  in order. Doctor-typed text after the label is preserved. */
  private relabelPhases(index: number): void {
    const block = this.phaseBlock(index);
    if (!block.length) return;
    const instructionOf = (i: number) => this.tablets.at(i)?.get('instructions');
    if (block.length < 2) {
      const control = instructionOf(block[0]);
      control?.setValue(this.stripPhaseLabel(control.value), { emitEvent: false });
      return;
    }
    const spans = block.map((i) => this.parseDurationDays(this.tablets.at(i)?.get('duration')?.value));
    const useDayRanges = spans.every((d) => d != null && d > 0);
    let day = 1;
    block.forEach((rowIndex, stage) => {
      const control = instructionOf(rowIndex);
      if (!control) return;
      const rest = this.stripPhaseLabel(control.value);
      let label: string;
      if (useDayRanges) {
        const span = spans[stage] as number;
        const from = day;
        const to = day + span - 1;
        day = to + 1;
        label = from === to ? `Day ${from}` : `Days ${from}–${to}`;
      } else {
        label = `Phase ${stage + 1}`;
      }
      if (stage > 0) label = `then ${label}`;
      control.setValue(rest ? `${label} · ${rest}` : label, { emitEvent: false });
    });
  }

  /** True when this row continues the regimen of the row above it. */
  isPhaseContinuation(index: number): boolean {
    const block = this.phaseBlock(index);
    return block.length > 1 && block[0] !== index;
  }

  /** Custom-typed duration: recompute quantity and the taper day ranges. */
  onCustomDurationInput(index: number): void {
    this.computeQuantity(index);
    this.relabelPhases(index);
  }

  /** Keep the generic-search state aligned with the rows after a removal. */
  private dropGenericSuggestionState(list: string, index: number): void {
    this.filteredGenericNames[list].splice(index, 1);
    this.showGenericSuggestions[list].splice(index, 1);
    this.highlightedGenericIndex[list].splice(index, 1);
  }

  /** Rows inserted mid-list shift the generic-search state along with them. */
  private insertGenericSuggestionState(list: string, index: number): void {
    this.filteredGenericNames[list].splice(index, 0, []);
    this.showGenericSuggestions[list].splice(index, 0, false);
    this.highlightedGenericIndex[list].splice(index, 0, -1);
  }

  /** Wipe the generic-search state when a list is rebuilt from scratch. */
  private resetGenericSuggestionState(list: string): void {
    this.filteredGenericNames[list] = [];
    this.showGenericSuggestions[list] = [];
    this.highlightedGenericIndex[list] = [];
  }

  onGenericChange(index: number): void {
    setTimeout(() => {
      const array = this.showFavorite ? this.favorites : this.tablets;
      const selectedGeneric = array.at(index).get('genericName')?.value;
      this.selectedGeneric = selectedGeneric;
      if (this.allergicGenerics.includes(selectedGeneric)) this.confirmAllergyAlert(selectedGeneric);
      const matching = this.allTablets.filter((tab) => tab.genericName === selectedGeneric);
      this.brandOptions = matching.map((tab) => tab.brandName);
      this.filteredBrandOptions[index] = this.brandOptions;
      this.filteredFavBrandNames[index] = this.brandOptions;
      this.filteredBrandOptionsFavorites[index] = this.brandOptions;
      array.at(index).patchValue({ brandName: '' });
    });
  }

  onBrandChange(index: number): void {
    const brandName = this.tablets.at(index).get('brandName')?.value;
    const brandObj = this.allTablets.find((tab) => tab.genericName === this.selectedGeneric && tab.brandName === brandName);
    if (brandObj) this.tablets.at(index).patchValue({ tabletId: brandObj.id });
  }

  onBrandBlur(index: number): void {
    const array = this.showFavorite ? this.favorites : this.tablets;
    const brandName = array.at(index).get('brandName')?.value?.trim();
    const genericName = array.at(index).get('genericName')?.value?.trim();
    if (!brandName) return;
    const existing = this.allTablets.find((t) => t.brandName === brandName);
    if (existing) { array.at(index).patchValue({ tabletId: existing.id, genericName: existing.genericName }); return; }
    this.prescriptionService.createTablet({
      brandName, genericName: genericName || brandName, type: 'default', description: '',
      doctorId: this.doctorId != null ? this.doctorId.toString() : undefined,
    }).subscribe((newTablet: any) => {
      array.at(index).patchValue({ tabletId: newTablet.id, genericName: newTablet.genericName });
      this.allTablets.push(newTablet);
      this.brandOptions.push(newTablet.brandName);
    });
  }
  onFavBrandBlur(index: number): void { this.onBrandBlur(index); }

  confirmAllergyAlert(genericName: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Allergy Alert', detail: `⚠️ ${genericName} is listed as an allergy for this patient.`, life: 5000 });
  }

  // ─── Quantity auto-calc + custom frequency/duration ─────────────────────
  // Quantity = (doses per day, summed from the frequency pattern) × (number of
  // days parsed from the duration). Non-numeric patterns (Stat / SOS / Daily …)
  // can't be quantified, so quantity is left for manual entry in those cases.

  /** Sum a dash-separated dose pattern into a per-day total.
   *  "1-0-1" → 2, "1/2-0-1/2" → 1, "5ml-5ml-5ml" → 15. Returns null if any
   *  token isn't numeric (e.g. "Stat", "SOS", "Daily"). */
  private parseFrequencyPerDay(freq: any): number | null {
    if (freq == null) return null;
    const f = String(freq).trim().toLowerCase();
    if (!f) return null;
    let total = 0;
    let counted = 0;
    for (const raw of f.split('-')) {
      const p = raw.replace(/\b(ml|tab|tabs|tsp|cap|caps|drops?|units?|puffs?)\b/gi, '').trim();
      if (p === '') continue;
      let val: number;
      if (p.includes('/')) {
        const [n, d] = p.split('/').map((x) => Number(x));
        if (!isFinite(n) || !isFinite(d) || d === 0) return null;
        val = n / d;
      } else {
        val = Number(p);
        if (!isFinite(val)) return null;
      }
      total += val;
      counted++;
    }
    return counted > 0 ? total : null;
  }

  /** First number found in the duration ("3 days" → 3, "7" → 7, "Daily" → null). */
  private parseDurationDays(dur: any): number | null {
    if (dur == null) return null;
    const m = String(dur).match(/\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }

  /** Recompute a row's quantity from its frequency × duration, when both parse. */
  computeQuantity(index: number): void {
    const row = this.tablets.at(index);
    if (!row) return;
    const perDay = this.parseFrequencyPerDay(row.get('frequency')?.value);
    const days = this.parseDurationDays(row.get('duration')?.value);
    if (perDay != null && days != null) {
      row.get('quantity')?.setValue(Math.round(perDay * days * 100) / 100);
    }
  }

  onFrequencyChange(index: number): void {
    const row = this.tablets.at(index);
    if (row.get('frequency')?.value === '__custom__') {
      row.get('freqCustom')?.setValue(true);
      row.get('frequency')?.setValue('');
      return;
    }
    this.computeQuantity(index);
  }
  revertFrequency(index: number): void {
    const row = this.tablets.at(index);
    row.get('freqCustom')?.setValue(false);
    row.get('frequency')?.setValue('');
    this.computeQuantity(index);
  }

  onDurationChange(index: number): void {
    const row = this.tablets.at(index);
    if (row.get('duration')?.value === '__custom__') {
      row.get('durCustom')?.setValue(true);
      row.get('duration')?.setValue('');
      return;
    }
    this.computeQuantity(index);
    this.relabelPhases(index); // day ranges of a taper shift with the durations
  }
  revertDuration(index: number): void {
    const row = this.tablets.at(index);
    row.get('durCustom')?.setValue(false);
    row.get('duration')?.setValue('');
    this.computeQuantity(index);
    this.relabelPhases(index);
  }

  toggleFavorite(index: number): void {
    const control = this.tablets.at(index);
    const current = this.favoriteSet.has(index);
    if (current) this.favoriteSet.delete(index); else this.favoriteSet.add(index);
    control.get('isFavorite')?.setValue(!current);
  }
  isFavorite(i: number): boolean { return this.tablets.at(i).get('isFavorite')?.value; }

  // ─── Favorites ─────────────────────────────────────────────────────────
  get favorites(): FormArray { return this.favoritesForm.get('favorites') as FormArray; }

  addFavorite(): void {
    this.favorites.insert(0, this.fb.group({
      genericName: [''], brandName: [''], frequency: [''], duration: [''], instructions: [''], isExisting: [false],
    }));
    this.filteredBrandOptionsFavorites.splice(0, 0, []);
    this.brandOptions = this.allTablets.map((b: any) => b.brandName);
    this.filteredBrandNames.push([...this.brandOptions]);
    this.insertGenericSuggestionState('favorites', 0); // rows are inserted at the top
  }

  removeFavorite(index: number): void {
    const control = this.favorites.at(index);
    if (control.get('isExisting')?.value) {
      const genericName = control.get('genericName')?.value;
      const brandName = control.get('brandName')?.value;
      const matchingFav = this.allFavorites.find((fav) => fav.tablet.genericName === genericName && fav.tablet.brandName === brandName);
      if (matchingFav) {
        this.prescriptionService.removeFavoriteTablet(matchingFav.id).subscribe({
          next: () => {
            this.favorites.removeAt(index);
            this.filteredBrandOptionsFavorites.splice(index, 1);
            this.filteredFavBrandNames.splice(index, 1);
            this.dropGenericSuggestionState('favorites', index);
            this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Favorite removed from DB' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete favorite' }),
        });
      } else {
        this.favorites.removeAt(index);
        this.filteredBrandOptionsFavorites.splice(index, 1);
        this.filteredFavBrandNames.splice(index, 1);
        this.dropGenericSuggestionState('favorites', index);
      }
    } else {
      this.favorites.removeAt(index);
      this.filteredBrandOptionsFavorites.splice(index, 1);
      this.filteredFavBrandNames.splice(index, 1);
      this.dropGenericSuggestionState('favorites', index);
    }
  }

  saveFavorites(): void {
    const favoritesPayload = this.favorites.value.filter((item: any) => item.genericName && item.brandName);
    if (!favoritesPayload.length) { this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill at least one entry!' }); return; }
    const mapped = favoritesPayload.map((fav: any) => {
      const t = this.allTablets.find((x) => x.genericName === fav.genericName && x.brandName === fav.brandName);
      return t ? { tabletId: t.id, userId: this.username, frequency: fav.frequency, duration: fav.duration, instructions: fav.instructions } : null;
    }).filter(Boolean);
    if (!mapped.length) { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No matching tablets found!' }); return; }
    this.prescriptionService.saveFavoriteTablet(mapped).subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Favorites saved successfully!' }); this.closeFavorites(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save favorites!' }),
    });
  }

  closeFavorites(): void { this.favorites.reset(); this.favoriteSet.clear(); this.showFavorite = false; }

  openFavorite(): void {
    this.prescriptionService.getAllFavorites().subscribe((favs) => {
      this.allFavorites = favs || [];
      this.favorites.clear();
      this.filteredBrandOptionsFavorites = [];
      this.filteredFavBrandNames = [];
      this.resetGenericSuggestionState('favorites');
      this.allFavorites.forEach((fav: any) => {
        this.favorites.push(this.fb.group({
          genericName: [{ value: fav.tablet.genericName, disabled: false }],
          brandName: [{ value: fav.tablet.brandName, disabled: false }],
          frequency: [fav.frequency], duration: [fav.duration], instructions: [fav.instructions], isExisting: [true],
        }));
        const brandOptions = this.allTablets.filter((tab: any) => tab.genericName === fav.tablet.genericName).map((tab: any) => tab.brandName);
        this.filteredBrandOptionsFavorites.push(brandOptions);
        this.filteredFavBrandNames.push(brandOptions);
      });
      this.showFavorite = true;
    });
  }

  addFavoriteToPrescription(index: number): void {
    const fav = JSON.parse(JSON.stringify(this.favorites.at(index).getRawValue()));
    if (!fav.genericName || !fav.brandName) { this.messageService.add({ severity: 'warn', summary: 'Incomplete Favorite', detail: 'Please select generic and brand.' }); return; }
    this.tablets.push(this.fb.group({
      genericName: [fav.genericName], brandName: [fav.brandName], frequency: [fav.frequency || ''],
      duration: [fav.duration || ''], instructions: [fav.instructions || ''], quantity: [''], isFavorite: [true],
      freqCustom: [false], durCustom: [false],
    }));
    const tabletIndex = this.tablets.length - 1;
    this.computeQuantity(tabletIndex);
    const brands = this.allTablets.filter((t) => t.genericName === fav.genericName).map((t) => t.brandName);
    if (!brands.includes(fav.brandName)) brands.unshift(fav.brandName);
    this.filteredBrandOptions[tabletIndex] = brands;
    this.messageService.add({ severity: 'info', summary: 'Added', detail: 'Favorite added to prescription.' });
  }

  onFavBrandInput(index: number, event?: Event): void {
    if (event) this.favBrandPopupPos[index] = this.popupPosFrom(event.target);
    const typed = this.favorites.at(index).get('brandName')?.value?.toLowerCase();
    this.filteredFavBrandNames[index] = typed
      ? this.brandOptions.filter((name) => name.toLowerCase().includes(typed))
      : [...this.brandOptions];
  }
  onFavBrandSelect(index: number, brand: string): void {
    this.favorites.at(index).patchValue({ brandName: brand });
    this.filteredFavBrandNames[index] = [];
    this.showFavBrandSuggestions[index] = false;
    this.onFavBrandBlur(index);
  }
  hideFavBrandSuggestionsWithDelay(index: number): void {
    setTimeout(() => { this.showFavBrandSuggestions[index] = false; this.filteredFavBrandNames[index] = []; this.onFavBrandBlur(index); }, 200);
  }

  // ─── Brand search on the drug rows (type-to-filter) ─────────────────────
  // Same typeahead the favorites modal already uses, so the main rows aren't a
  // plain <select> over the whole brand list.
  onBrandInput(index: number, event?: Event): void {
    if (event) this.brandPopupPos[index] = this.popupPosFrom(event.target);
    const typed = String(this.tablets.at(index)?.get('brandName')?.value ?? '').trim().toLowerCase();
    this.filteredBrandNames[index] = typed
      ? this.brandOptions.filter((name: string) => (name || '').toLowerCase().includes(typed))
      : [...this.brandOptions];
    this.showBrandSuggestions[index] = true;
  }
  onBrandSelect(index: number, brand: string): void {
    this.tablets.at(index).patchValue({ brandName: brand });
    this.filteredBrandNames[index] = [];
    this.showBrandSuggestions[index] = false;
    this.onBrandBlur(index);
  }
  hideBrandSuggestionsWithDelay(index: number): void {
    setTimeout(() => { this.showBrandSuggestions[index] = false; this.filteredBrandNames[index] = []; this.onBrandBlur(index); }, 200);
  }

  // ─── Generic-name search (type-to-filter) ───────────────────────────────
  // The generic column used to be a plain <select> over the whole drug master.
  // State is kept per list + row: 'tablets' = drug rows, 'favorites' /
  // 'allergies' = the matching modals, each of which has a generic column too.
  filteredGenericNames: { [list: string]: string[][] } = { tablets: [], favorites: [], allergies: [] };
  showGenericSuggestions: { [list: string]: boolean[] } = { tablets: [], favorites: [], allergies: [] };
  highlightedGenericIndex: { [list: string]: number[] } = { tablets: [], favorites: [], allergies: [] };

  // The drug rows sit in a fixed-height scrolling container, which clipped the
  // absolutely-positioned suggestion lists. The lists are position:fixed and
  // take their coordinates from the input's own rect when they open.
  genericPopupPos: { [list: string]: SuggestPos[] } = { tablets: [], favorites: [], allergies: [] };
  brandPopupPos: SuggestPos[] = [];
  favBrandPopupPos: SuggestPos[] = [];

  private popupPosFrom(target: EventTarget | null | undefined): SuggestPos {
    const el = target as HTMLElement | null;
    if (!el || typeof el.getBoundingClientRect !== 'function') return { top: 0, left: 0, width: 0 };
    const rect = el.getBoundingClientRect();
    return { top: rect.bottom + 2, left: rect.left, width: rect.width };
  }

  private genericList(list: string): FormArray {
    if (list === 'favorites') return this.favorites;
    if (list === 'allergies') return this.allergies;
    return this.tablets;
  }

  onGenericInput(list: string, index: number, event?: Event): void {
    if (event) this.genericPopupPos[list][index] = this.popupPosFrom(event.target);
    const typed = String(this.genericList(list).at(index)?.get('genericName')?.value ?? '').trim().toLowerCase();
    this.filteredGenericNames[list][index] = typed
      ? this.genericOptions.filter((name: string) => (name || '').toLowerCase().includes(typed))
      : [...this.genericOptions];
    this.showGenericSuggestions[list][index] = true;
    this.highlightedGenericIndex[list][index] = -1;
  }

  onGenericSelect(list: string, index: number, generic: string): void {
    this.genericList(list).at(index).patchValue({ genericName: generic });
    this.filteredGenericNames[list][index] = [];
    this.showGenericSuggestions[list][index] = false;
    this.highlightedGenericIndex[list][index] = -1;
    this.syncBrandsForGeneric(list, index, generic);
  }

  /** Re-derive a row's brand list once its generic settles. A brand that no
   *  longer belongs to the chosen generic is cleared (old <select> behaviour);
   *  one that still fits is kept, so merely tabbing through the generic box
   *  doesn't wipe a brand the doctor already picked. Allergy rows have no
   *  brand column. */
  private syncBrandsForGeneric(list: string, index: number, generic: string): void {
    if (list === 'allergies') return;
    const brand = String(this.genericList(list).at(index)?.get('brandName')?.value ?? '').trim();
    const fits = !!brand && this.allTablets.some((t: any) => t.genericName === generic && t.brandName === brand);
    if (!fits) {
      this.onGenericChange(index); // clears brand + tabletId, narrows the list
      return;
    }
    this.selectedGeneric = generic;
    this.brandOptions = this.allTablets.filter((t: any) => t.genericName === generic).map((t: any) => t.brandName);
    this.filteredBrandOptions[index] = this.brandOptions;
    this.filteredBrandNames[index] = this.brandOptions;
    this.filteredFavBrandNames[index] = this.brandOptions;
  }

  // Delay hiding so a mousedown on a suggestion registers before the list closes.
  hideGenericSuggestionsWithDelay(list: string, index: number): void {
    setTimeout(() => {
      this.showGenericSuggestions[list][index] = false;
      this.filteredGenericNames[list][index] = [];
      this.commitTypedGeneric(list, index);
    }, 200);
  }

  /** Snap free-typed text onto the catalog entry when it matches (case-insensitive). */
  private commitTypedGeneric(list: string, index: number): void {
    const row = this.genericList(list).at(index);
    const typed = String(row?.get('genericName')?.value ?? '').trim();
    if (!typed) return;
    const match = this.genericOptions.find((g: string) => (g || '').toLowerCase() === typed.toLowerCase());
    if (!match) return;
    if (match !== typed) row.patchValue({ genericName: match });
    this.syncBrandsForGeneric(list, index, match);
  }

  onGenericKeydown(event: KeyboardEvent, list: string, index: number): void {
    const options = this.filteredGenericNames[list][index] || [];
    if (!options.length) return;
    if (this.highlightedGenericIndex[list][index] === undefined) {
      this.highlightedGenericIndex[list][index] = -1;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedGenericIndex[list][index] =
          (this.highlightedGenericIndex[list][index] + 1) % options.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedGenericIndex[list][index] =
          (this.highlightedGenericIndex[list][index] - 1 + options.length) % options.length;
        break;
      case 'Enter': {
        event.preventDefault();
        const highlighted = this.highlightedGenericIndex[list][index];
        if (highlighted >= 0 && highlighted < options.length) {
          this.onGenericSelect(list, index, options[highlighted]);
        }
        break;
      }
      case 'Escape':
        this.showGenericSuggestions[list][index] = false;
        this.highlightedGenericIndex[list][index] = -1;
        break;
    }
    setTimeout(() => {
      const el = document.getElementById(
        `generic-option-${list}-${index}-${this.highlightedGenericIndex[list][index]}`,
      );
      if (el) el.scrollIntoView({ block: 'nearest' });
    });
  }

  // ─── Allergies ─────────────────────────────────────────────────────────
  get allergies(): FormArray { return this.allergyForm.get('allergies') as FormArray; }

  openAllergyPopup(): void {
    this.showAllergy = true;
    this.prescriptionService.getAllergies(this.prn).subscribe((data: any[]) => {
      this.allergicGenerics = (data || []).map((a) => a.genericName);
      const formGroups = (data || []).map((a) => this.fb.group({ id: [a.id], genericName: [{ value: a.genericName, disabled: false }] }));
      this.allergyForm.setControl('allergies', this.fb.array(formGroups));
      this.resetGenericSuggestionState('allergies');
    });
  }
  addAllergy(): void {
    this.allergies.insert(0, this.fb.group({ genericName: [''] }));
    this.insertGenericSuggestionState('allergies', 0);
  }
  removeAllergies(index: number): void {
    const allergy = this.allergies.at(index).value;
    if (allergy?.id) {
      this.prescriptionService.deleteAllergy(allergy.id).subscribe(() => {
        this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Allergy removed' });
        this.allergies.removeAt(index);
        this.dropGenericSuggestionState('allergies', index);
      });
    } else {
      this.allergies.removeAt(index);
      this.dropGenericSuggestionState('allergies', index);
    }
  }
  saveAllergies(): void {
    const payload = this.allergies.controls
      .filter((ctrl) => (!ctrl.get('id') || ctrl.get('id')?.value == null) && ctrl.get('genericName')?.value)
      .map((ctrl) => ({ prn: this.prn, genericName: ctrl.get('genericName')?.value }));
    if (payload.length === 0) { this.messageService.add({ severity: 'warn', summary: 'No New Allergies', detail: 'Nothing to save.' }); return; }
    this.prescriptionService.saveAllergies(payload as { prn: string; genericName: string }[]).subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Allergies saved successfully' }); this.closeAllergies(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not save allergies' }),
    });
  }
  closeAllergies(): void { this.showAllergy = false; this.allergies.clear(); }

  // ─── Past / Previous Rx ──────────────────────────────────────────────────
  openPreviousRx(): void {
    this.prescriptionService.getPrescriptionsByPrn(this.prn).subscribe({
      next: (data: any[]) => {
        if (!data || data.length === 0) { this.messageService.add({ severity: 'info', summary: 'No Record', detail: 'No previous prescriptions found.' }); return; }
        const sorted = data.sort((a, b) => new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime());
        this.previousPrescription = sorted[0];
        this.showPreviousRx = true;
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch previous prescription.' }),
    });
  }
  openPastRx(): void {
    this.prescriptionService.getPrescriptionsByPrn(this.prn).subscribe({
      next: (data: any[]) => {
        if (!data || data.length === 0) { this.messageService.add({ severity: 'info', summary: 'No Record', detail: 'No previous prescriptions found.' }); return; }
        this.pastPrescriptions = data.sort((a, b) => new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime());
        this.selectedPrescriptionId = null;
        this.selectedPrescription = null;
        this.showPastRx = true;
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch previous prescription.' }),
    });
  }
  selectPrescription(p: any): void {
    this.selectedPrescriptionId = p.prescriptionId;
    this.selectedPrescription = p;
    this.pastPrescriptions = [p, ...this.pastPrescriptions.filter((x) => x.prescriptionId !== p.prescriptionId)];
  }

  // ─── Save / Print ────────────────────────────────────────────────────────
  save(): void {
    this.patchHeader();
    // Strip UI-only flags (freqCustom/durCustom drive the custom text toggle,
    // they aren't part of the prescription record).
    const raw = this.form.value;
    const payload = {
      ...raw,
      tablets: (raw.tablets || []).map((t: any) => {
        const { freqCustom, durCustom, ...rest } = t;
        return rest;
      }),
    };
    this.isButtonLoading = true;
    this.prescriptionService.createPrescription(payload).subscribe({
      next: (response: any) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Prescription saved successfully!' });
        this.selectPrescriptionPrint = [response?.data];
        this.isButtonLoading = false;
        this.saved = true;
        // Persist any starred rows as favorites (same as consulting notes).
        const favPayload = (this.form.value.tablets || [])
          .filter((t: any) => t.isFavorite)
          .map((t: any) => {
            const matched = this.allTablets.find((tab) => tab.genericName === t.genericName && tab.brandName === t.brandName)
              ?? this.allTablets.find((tab) => tab.brandName === t.brandName);
            return matched ? { tabletId: matched.id, userId: this.username } : null;
          })
          .filter(Boolean);
        if (favPayload.length) this.prescriptionService.saveFavoriteTablet(favPayload).subscribe();
      },
      error: () => {
        this.saved = false;
        this.isButtonLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save prescription!' });
      },
    });
  }

  print(): void {
    if (typeof window === 'undefined') return;
    const rx = this.selectPrescriptionPrint?.[0] ?? this.form.value;
    const tablets = (rx?.tablets ?? []) as any[];
    // Every stage of a taper prints its own drug name — a blank cell reads as
    // missing data, and the sequence is already carried by the "Days 1–3" /
    // "then Days 4–8" labels in the Instruction column.
    const rows = tablets.map((t) => `
      <tr><td>${t.genericName || ''}</td><td>${t.brandName || ''}</td><td>${t.frequency || ''}</td>
      <td>${t.duration || ''}</td><td>${t.instructions || ''}</td><td>${t.quantity || ''}</td></tr>`).join('');
    const win = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
    if (!win) return;
    win.document.write(`<html><head><title>Prescription</title><style>
      body{font-family:Arial,sans-serif;margin:24px} table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #000;padding:8px;text-align:left;font-size:13px}
      h2{margin:0 0 6px} .meta{font-size:13px;color:#333}</style></head><body onload="window.print();window.close()">
      <h2>Prescription</h2>
      <div class="meta">Patient: ${rx?.patientName || this.patientName} &nbsp; PRN: ${rx?.prn || this.prn} &nbsp; Date: ${rx?.prescribedDate || this.today}</div>
      <div class="meta">Doctor: ${rx?.prescribedBy || this.doctorName}${(rx?.prescribedByKMC || this.doctorKmc) ? ' (KMC ' + (rx?.prescribedByKMC || this.doctorKmc) + ')' : ''}</div>
      <table><thead><tr><th>Generic</th><th>Brand</th><th>Frequency</th><th>Duration</th><th>Instruction</th><th>Qty</th></tr></thead>
      <tbody>${rows}</tbody></table>
      ${rx?.remarks ? '<p><b>Remarks:</b> ' + rx.remarks + '</p>' : ''}
      </body></html>`);
    win.document.close();
  }
}
