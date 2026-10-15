import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  MealTimeSlot,
  AllergenMaster,
  DietMaster,
  DietMasterPayload,
  MealMaster,
  MenuPlanCell,
  CanteenChannel,
  DietTexture,
  SupplementMaster,
  DieteticsSettings,
  DietKind,
  DIET_KIND_LABEL,
  splitList,
  decodeJsonList,
  CanteenTvMode,
  parseCanteenViewSpec,
} from '../../services/dietetics.service';
import { MastersService, MasterWard } from '../../services/masters.service';

/**
 * Admin page — `/dietetics/setup`. Single tabbed shell covering every dietetics
 * master the super_admin manages — the hospital's own codes and timings:
 *   • Meal-time slots (with change cut-off)
 *   • Allergens
 *   • Diets (code, kind: oral / feed / no tray, macros, religious flags)
 *   • Textures (SD / VSD / MSD… combined with the diet code: SRDD-SD)
 *   • Supplements (Ensure DM, Resource Dialysis… prescribed per meal)
 *   • Meal items + their (diet, allergen) joins
 *   • Weekly menu grid per diet (day × slot → meal)
 *   • Sheet & label settings (sheet window, standing notes, label layout,
 *     screening-form defaults)
 *   • Canteen TV channels
 *
 * Drug-food interactions are seeded at deploy time, not edited here.
 */
@Component({
  selector: 'app-dietetics-setup',
  templateUrl: './dietetics-setup.component.html',
  styleUrls: ['../dietetics-shared.css', './dietetics-setup.component.css'],
})
export class DieteticsSetupComponent implements OnInit, OnDestroy {
  tab: 'slots' | 'allergens' | 'diets' | 'textures' | 'supplements' | 'meals' | 'menu' | 'settings' | 'channels' = 'slots';

  // Shared lists.
  slots: MealTimeSlot[] = [];
  allergens: AllergenMaster[] = [];
  diets: DietMaster[] = [];
  meals: MealMaster[] = [];
  channels: CanteenChannel[] = [];
  textures: DietTexture[] = [];
  supplements: SupplementMaster[] = [];
  settings: DieteticsSettings | null = null;
  maternalDepartmentsText = '';

  readonly dietKinds = (Object.keys(DIET_KIND_LABEL) as DietKind[])
    .map((value) => ({ value, label: DIET_KIND_LABEL[value] }));
  textureForm: Partial<DietTexture> = this.blankTexture();
  supplementForm: Partial<SupplementMaster> = this.blankSupplement();

  // Editor buffers.
  slotForm: Partial<MealTimeSlot> = this.blankSlot();
  allergenForm: Partial<AllergenMaster> = this.blankAllergen();
  dietForm: Partial<DietMaster> = this.blankDiet();
  mealForm: Partial<MealMaster> & { compatibleDietIds: string[]; allergenIds: string[] }
    = this.blankMeal();
  channelForm: Partial<CanteenChannel> = this.blankChannel();
  // Channel view, kept apart from the form and serialised into viewSpec on save.
  wards: MasterWard[] = [];
  channelWardIds: string[] = [];
  channelMode: CanteenTvMode = 'tickets';
  wardFilter = '';
  // Comma-separated text boxes for the diet's list fields.
  dietRestrictionsText = '';
  dietTargetConditionsText = '';

  // Menu tab.
  menuDietId = '';
  menuRows: MenuPlanCell[] = [];
  readonly dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  loading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService, private masters: MastersService) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(t: typeof this.tab): void {
    this.tab = t;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ─── Loaders ────────────────────────────────────────────────────────
  refreshAll(): void {
    this.loading = true;
    this.svc.listMealTimeSlots().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.slots = r;
        // A blank "New slot" form gets the next free sequence instead of 0.
        if (!this.slotForm.id) this.slotForm.sequence = this.nextSlotSequence();
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load slots'; },
    });
    this.svc.listAllergens().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.allergens = r; },
      error: () => { /* swallow */ },
    });
    this.svc.listDiets().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.diets = r; },
      error: () => { /* swallow */ },
    });
    this.svc.listMeals().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.meals = r; this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.svc.listCanteenChannels().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.channels = r; },
      error: () => { /* swallow */ },
    });
    this.masters.listWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.wards = [...r].sort((a, b) => a.wardName.localeCompare(b.wardName)); },
      error: () => { /* swallow */ },
    });
    this.svc.listTextures().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.textures = r; },
      error: () => { /* swallow */ },
    });
    this.svc.listSupplements().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.supplements = r; },
      error: () => { /* swallow */ },
    });
    this.svc.getSettings().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => {
        this.settings = s;
        this.maternalDepartmentsText = (s.maternalDepartments ?? []).join(', ');
      },
      error: () => { /* swallow */ },
    });
  }

  // ─── Textures / supplements / settings ──────────────────────────────
  saveTexture(): void {
    if (!this.textureForm.code?.trim() || !this.textureForm.name?.trim()) {
      this.errorMessage = 'Texture code and name are required.';
      return;
    }
    this.svc.upsertTexture(this.textureForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Texture saved.'; this.textureForm = this.blankTexture(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  editTexture(t: DietTexture): void { this.textureForm = { ...t }; }
  blankTexture(): Partial<DietTexture> {
    return { code: '', name: '', description: null, sequence: (this.textures?.length ?? 0) + 1, isActive: true };
  }

  saveSupplement(): void {
    if (!this.supplementForm.name?.trim()) { this.errorMessage = 'Supplement name is required.'; return; }
    this.svc.upsertSupplement(this.supplementForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Supplement saved.'; this.supplementForm = this.blankSupplement(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  editSupplement(s: SupplementMaster): void { this.supplementForm = { ...s }; }
  blankSupplement(): Partial<SupplementMaster> {
    return { name: '', unit: null, defaultDose: null, notes: null, isActive: true };
  }

  saveSettings(): void {
    if (!this.settings) return;
    const payload: Partial<DieteticsSettings> = {
      ...this.settings,
      maternalDepartments: splitList(this.maternalDepartmentsText),
    };
    this.svc.updateSettings(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => {
        this.settings = s;
        this.maternalDepartmentsText = (s.maternalDepartments ?? []).join(', ');
        this.successMessage = 'Settings saved.';
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }

  loadMenu(): void {
    if (!this.menuDietId) { this.menuRows = []; return; }
    this.svc.getMenuForDiet(this.menuDietId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.menuRows = r; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load menu'; },
    });
  }

  cellAt(dayOfWeek: number, slotId: string): MenuPlanCell | undefined {
    return this.menuRows.find((c) => c.dayOfWeek === dayOfWeek && c.mealTimeSlotId === slotId);
  }

  // ─── Save handlers ──────────────────────────────────────────────────
  saveSlot(): void {
    if (!this.slotForm.name || !this.slotForm.code || !this.slotForm.startTime || !this.slotForm.endTime) {
      this.errorMessage = 'Name, code, startTime and endTime are required.';
      return;
    }
    this.svc.upsertMealTimeSlot(this.slotForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Slot saved.'; this.slotForm = this.blankSlot(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  nextSlotSequence(): number {
    return this.slots.reduce((max, s) => Math.max(max, s.sequence ?? 0), 0) + 1;
  }
  editSlot(s: MealTimeSlot): void {
    this.slotForm = { ...s };
    this.errorMessage = '';
    this.successMessage = '';
  }

  saveAllergen(): void {
    if (!this.allergenForm.name?.trim()) { this.errorMessage = 'Allergen name is required.'; return; }
    this.svc.upsertAllergen(this.allergenForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Allergen saved.'; this.allergenForm = this.blankAllergen(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  editAllergen(a: AllergenMaster): void {
    this.allergenForm = { ...a };
  }

  saveDiet(): void {
    if (!this.dietForm.name || !this.dietForm.code) { this.errorMessage = 'Name and code are required.'; return; }
    // The stored JSON strings are replaced by arrays parsed from the text boxes.
    const { restrictions: _r, targetConditions: _t, ...rest } = this.dietForm;
    const payload: DietMasterPayload = {
      ...rest,
      restrictions: splitList(this.dietRestrictionsText),
      targetConditions: splitList(this.dietTargetConditionsText),
    };
    this.svc.upsertDiet(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Diet saved.'; this.resetDietForm(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  editDiet(d: DietMaster): void {
    this.dietForm = { ...d };
    // Re-saving the diet also repairs rows that were JSON-encoded twice.
    this.dietRestrictionsText = decodeJsonList(d.restrictions).join(', ');
    this.dietTargetConditionsText = decodeJsonList(d.targetConditions).join(', ');
  }
  resetDietForm(): void {
    this.dietForm = this.blankDiet();
    this.dietRestrictionsText = '';
    this.dietTargetConditionsText = '';
  }

  saveMeal(): void {
    if (!this.mealForm.name) { this.errorMessage = 'Meal name is required.'; return; }
    this.svc.upsertMeal(this.mealForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Meal saved.'; this.mealForm = this.blankMeal(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  editMeal(m: MealMaster): void {
    this.mealForm = {
      ...m,
      compatibleDietIds: m.compatibleDietIds ?? [],
      allergenIds: m.allergenIds ?? [],
    };
  }
  toggleMealDiet(id: string): void {
    const set = new Set(this.mealForm.compatibleDietIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    this.mealForm.compatibleDietIds = Array.from(set);
  }
  toggleMealAllergen(id: string): void {
    const set = new Set(this.mealForm.allergenIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    this.mealForm.allergenIds = Array.from(set);
  }

  setMenuCell(dayOfWeek: number, slotId: string, mealId: string): void {
    if (!this.menuDietId) return;
    if (!mealId) {
      this.svc.clearMenuCell(this.menuDietId, slotId, dayOfWeek)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: () => this.loadMenu(), error: () => { /* swallow */ } });
      return;
    }
    this.svc.upsertMenuCell({
      dietMasterId: this.menuDietId,
      mealTimeSlotId: slotId,
      mealMasterId: mealId,
      dayOfWeek,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadMenu(),
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }

  saveChannel(): void {
    if (!this.channelForm.name?.trim()) { this.errorMessage = 'Channel name is required.'; return; }
    const viewSpec = JSON.stringify({ wardIds: this.channelWardIds, mode: this.channelMode });
    this.svc.upsertCanteenChannel({ ...this.channelForm, viewSpec }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Channel saved.'; this.resetChannel(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  editChannel(c: CanteenChannel): void {
    this.channelForm = { ...c };
    const spec = parseCanteenViewSpec(c.viewSpec);
    this.channelWardIds = spec.wardIds;
    this.channelMode = spec.mode;
    this.wardFilter = '';
  }
  resetChannel(): void {
    this.channelForm = this.blankChannel();
    this.channelWardIds = [];
    this.channelMode = 'tickets';
    this.wardFilter = '';
  }
  toggleChannelWard(id: string): void {
    const set = new Set(this.channelWardIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    this.channelWardIds = Array.from(set);
  }
  get filteredWards(): MasterWard[] {
    const q = this.wardFilter.trim().toLowerCase();
    if (!q) return this.wards;
    return this.wards.filter((w) =>
      [w.wardName, w.wardCode, w.floor ?? ''].some((s) => s.toLowerCase().includes(q)));
  }
  /** "All wards" or "4B, 4C, ICU" — for the channel list. */
  channelWardLabel(c: CanteenChannel): string {
    const ids = parseCanteenViewSpec(c.viewSpec).wardIds;
    if (!ids.length) return 'All wards';
    const names = ids.map((id) => this.wards.find((w) => w.id === id)?.wardName ?? '?');
    return names.length > 4 ? `${names.slice(0, 4).join(', ')} +${names.length - 4}` : names.join(', ');
  }
  channelModeLabel(c: CanteenChannel): string {
    return parseCanteenViewSpec(c.viewSpec).mode === 'summary' ? 'Summary' : 'Tickets';
  }
  /**
   * Wards no active ticket channel shows. A channel with no wards covers
   * everything, so then nothing is missing. Summary channels don't count:
   * the kitchen can't plate from a count.
   */
  get unassignedWards(): MasterWard[] {
    const ticketSpecs = this.channels
      .filter((c) => c.isActive)
      .map((c) => parseCanteenViewSpec(c.viewSpec))
      .filter((s) => s.mode === 'tickets');
    if (!ticketSpecs.length || ticketSpecs.some((s) => !s.wardIds.length)) return [];
    const covered = new Set(ticketSpecs.flatMap((s) => s.wardIds));
    return this.wards.filter((w) => !covered.has(w.id));
  }
  get unassignedWardNames(): string {
    return this.unassignedWards.map((w) => w.wardName).join(', ');
  }

  // ─── Blank-form factories ───────────────────────────────────────────
  blankSlot(): Partial<MealTimeSlot> {
    return { name: '', code: '', startTime: '', endTime: '', orderCutoff: null, sequence: this.nextSlotSequence(), isActive: true };
  }
  blankAllergen(): Partial<AllergenMaster> {
    return { name: '', isActive: true };
  }
  blankDiet(): Partial<DietMaster> {
    return {
      name: '', code: '', description: null,
      caloriesKcal: null, proteinG: null, carbsG: null, fatG: null,
      sodiumMg: null, potassiumMg: null, fluidMl: null,
      restrictions: null, targetConditions: null,
      isVeg: false, isJain: false, isHalal: false, isKosher: false, isNoOnionGarlic: false,
      isGeneral: false, kind: 'ORAL', isActive: true,
    };
  }
  blankMeal(): Partial<MealMaster> & { compatibleDietIds: string[]; allergenIds: string[] } {
    return { name: '', description: null, category: null, caloriesKcal: null, isVeg: true, isActive: true, compatibleDietIds: [], allergenIds: [] };
  }
  blankChannel(): Partial<CanteenChannel> {
    return { name: '', isActive: true, viewSpec: null };
  }
}
