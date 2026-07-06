import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { PrescriptionService } from '../../../services/prescription/prescription.service';

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
            this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Favorite removed from DB' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete favorite' }),
        });
      } else {
        this.favorites.removeAt(index);
        this.filteredBrandOptionsFavorites.splice(index, 1);
        this.filteredFavBrandNames.splice(index, 1);
      }
    } else {
      this.favorites.removeAt(index);
      this.filteredBrandOptionsFavorites.splice(index, 1);
      this.filteredFavBrandNames.splice(index, 1);
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
    }));
    const tabletIndex = this.tablets.length - 1;
    const brands = this.allTablets.filter((t) => t.genericName === fav.genericName).map((t) => t.brandName);
    if (!brands.includes(fav.brandName)) brands.unshift(fav.brandName);
    this.filteredBrandOptions[tabletIndex] = brands;
    this.messageService.add({ severity: 'info', summary: 'Added', detail: 'Favorite added to prescription.' });
  }

  onFavBrandInput(index: number): void {
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

  // ─── Allergies ─────────────────────────────────────────────────────────
  get allergies(): FormArray { return this.allergyForm.get('allergies') as FormArray; }

  openAllergyPopup(): void {
    this.showAllergy = true;
    this.prescriptionService.getAllergies(this.prn).subscribe((data: any[]) => {
      this.allergicGenerics = (data || []).map((a) => a.genericName);
      const formGroups = (data || []).map((a) => this.fb.group({ id: [a.id], genericName: [{ value: a.genericName, disabled: false }] }));
      this.allergyForm.setControl('allergies', this.fb.array(formGroups));
    });
  }
  addAllergy(): void { this.allergies.insert(0, this.fb.group({ genericName: [''] })); }
  removeAllergies(index: number): void {
    const allergy = this.allergies.at(index).value;
    if (allergy?.id) {
      this.prescriptionService.deleteAllergy(allergy.id).subscribe(() => {
        this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Allergy removed' });
        this.allergies.removeAt(index);
      });
    } else { this.allergies.removeAt(index); }
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
    const payload = this.form.value;
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
