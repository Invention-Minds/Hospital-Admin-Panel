import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  MealTimeSlot,
  AllergenMaster,
  DietMaster,
  MealMaster,
  MenuPlanCell,
  CanteenChannel,
} from '../../services/dietetics.service';

/**
 * Admin page — `/dietetics/setup`. Single tabbed shell covering every dietetics
 * master the super_admin manages:
 *   • Meal-time slots (breakfast / lunch / dinner / snacks…)
 *   • Allergens
 *   • Diets (with macros + religious flags)
 *   • Meal items + their (diet, allergen) joins
 *   • Weekly menu grid per diet (day × slot → meal)
 *   • Canteen TV channels
 *
 * Drug-food interactions are seeded at deploy time, not edited here.
 */
@Component({
  selector: 'app-dietetics-setup',
  templateUrl: './dietetics-setup.component.html',
  styleUrls: ['./dietetics-setup.component.css'],
})
export class DieteticsSetupComponent implements OnInit, OnDestroy {
  tab: 'slots' | 'allergens' | 'diets' | 'meals' | 'menu' | 'channels' = 'slots';

  // Shared lists.
  slots: MealTimeSlot[] = [];
  allergens: AllergenMaster[] = [];
  diets: DietMaster[] = [];
  meals: MealMaster[] = [];
  channels: CanteenChannel[] = [];

  // Editor buffers.
  slotForm: Partial<MealTimeSlot> = this.blankSlot();
  allergenForm: Partial<AllergenMaster> = this.blankAllergen();
  dietForm: Partial<DietMaster> = this.blankDiet();
  mealForm: Partial<MealMaster> & { compatibleDietIds: string[]; allergenIds: string[] }
    = this.blankMeal();
  channelForm: Partial<CanteenChannel> = this.blankChannel();

  // Menu tab.
  menuDietId = '';
  menuRows: MenuPlanCell[] = [];
  readonly dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  loading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

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
      next: (r) => { this.slots = r; },
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
    this.svc.upsertDiet(this.dietForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Diet saved.'; this.dietForm = this.blankDiet(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  editDiet(d: DietMaster): void {
    this.dietForm = { ...d };
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
    this.svc.upsertCanteenChannel(this.channelForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Channel saved.'; this.channelForm = this.blankChannel(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  editChannel(c: CanteenChannel): void {
    this.channelForm = { ...c };
  }

  // ─── Blank-form factories ───────────────────────────────────────────
  blankSlot(): Partial<MealTimeSlot> {
    return { name: '', code: '', startTime: '', endTime: '', sequence: 0, isActive: true };
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
      isActive: true,
    };
  }
  blankMeal(): Partial<MealMaster> & { compatibleDietIds: string[]; allergenIds: string[] } {
    return { name: '', description: null, category: null, caloriesKcal: null, isVeg: true, isActive: true, compatibleDietIds: [], allergenIds: [] };
  }
  blankChannel(): Partial<CanteenChannel> {
    return { name: '', isActive: true, viewSpec: null };
  }
}
