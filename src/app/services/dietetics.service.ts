import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Dietetics service — single client surface for the dietician, canteen, and
 * ward nurses. Field names mirror the backend Prisma schema 1:1.
 *
 * Routes consumed:
 *   GET    /api/dietetics/queue
 *   CRUD   /api/dietetics/{meal-time-slots,allergens,diets,meals}
 *   GET    /api/dietetics/menu/:dietId
 *   POST   /api/dietetics/menu  (upsert cell)
 *   DELETE /api/dietetics/menu/:dietId/:slotId/:dayOfWeek
 *   GET    /api/dietetics/drug-food-interactions{,/admission/:id}
 *   CRUD   /api/dietetics/plans
 *   POST   /api/dietetics/plans/:id/{sign,end}
 *   GET    /api/dietetics/meal-orders/{kitchen,admission/:id}
 *   POST   /api/dietetics/meal-orders/{plate,:id/deliver,:id/intake,:id/skip,regenerate}
 *   CRUD   /api/dietetics/canteen-channels
 *   GET    /api/dietetics/canteen-channels/:id/snapshot (public)
 */

export interface MealTimeSlot {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  sequence: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AllergenMaster {
  id: string;
  name: string;
  isActive: boolean;
}

export interface DietMaster {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  sodiumMg?: number | null;
  potassiumMg?: number | null;
  fluidMl?: number | null;
  restrictions?: string | null;
  isVeg: boolean;
  isJain: boolean;
  isHalal: boolean;
  isKosher: boolean;
  isNoOnionGarlic: boolean;
  targetConditions?: string | null;
  isActive: boolean;
}

export interface MealMaster {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  caloriesKcal?: number | null;
  isVeg: boolean;
  isActive: boolean;
  compatibleDietIds?: string[];
  allergenIds?: string[];
}

export interface MenuPlanCell {
  id?: string;
  dietMasterId: string;
  mealTimeSlotId: string;
  mealMasterId: string;
  dayOfWeek: number; // 0..6
  notes?: string | null;
  meal?: MealMaster;
  mealTimeSlot?: MealTimeSlot;
}

export interface DrugFoodInteraction {
  id: string;
  match: string;
  severity: 'info' | 'warning' | 'critical' | string;
  foodGuidance: string;
  isActive: boolean;
}

export interface AdmissionInteractionHit {
  drug: { id: string; genericName?: string | null; brandName?: string | null };
  interaction: DrugFoodInteraction;
}

export interface DietPlan {
  id: string;
  admissionId: string;
  dietMasterId: string;
  diet?: DietMaster;
  startDate: string;
  endDate?: string | null;
  npoUntil?: string | null;
  restrictionsSnapshot?: string | null;
  allergensSnapshot?: string | null;
  notesForKitchen?: string | null;
  noteTemplateId?: string | null;
  templatedValues?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
  signedById?: number | null;
  signatureId?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'ENDED';
  reassessmentReason?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface UpsertDietPlanPayload {
  admissionId: string;
  dietMasterId: string;
  startDate?: string;
  endDate?: string | null;
  npoUntil?: string | null;
  restrictionsSnapshot?: string[];
  allergensSnapshot?: string[];
  notesForKitchen?: string | null;
  noteTemplateId?: string | null;
  templatedValueMap?: Record<string, unknown>;
  reassessmentReason?: string | null;
}

export interface DieticianQueueRow {
  id: string;
  admissionNo: string;
  prn: string;
  admissionDate: string;
  department: string;
  diagnosis: string;
  admittingDoctor: string;
}

export interface DieticianQueue {
  pending: DieticianQueueRow[];
  reassess: DieticianQueueRow[];
  active: DietPlan[];
}

export interface MealOrder {
  id: string;
  admissionId: string;
  dietPlanId: string;
  mealTimeSlotId: string;
  mealMasterId?: string | null;
  meal?: MealMaster;
  mealTimeSlot?: MealTimeSlot;
  scheduledFor: string;
  wardId?: string | null;
  bedId?: string | null;
  status: 'ORDERED' | 'PLATED' | 'DELIVERED' | 'CONSUMED' | 'SKIPPED';
  platedAt?: string | null;
  platedBy?: string | null;
  deliveredAt?: string | null;
  deliveredBy?: string | null;
  kitchenNotes?: string | null;
  skipReason?: string | null;
  delivery?: MealDelivery | null;
  intake?: MealIntake | null;
  // Hydrated by the backend /kitchen endpoint:
  admissionNo?: string | null;
  patientName?: string | null;
  wardName?: string | null;
  bedNumber?: string | null;
  department?: string | null;
  dietPlan?: { diet?: DietMaster };
}

export interface MealDelivery {
  id: string;
  mealOrderId: string;
  deliveredAt: string;
  deliveredBy?: string | null;
  deliveredById?: number | null;
  signatureId?: string | null;
  twoIdVerified: boolean;
  trayHotTempC?: number | null;
  trayColdTempC?: number | null;
  notes?: string | null;
}

export interface MealIntake {
  id: string;
  mealOrderId: string;
  percentConsumed: number; // 0|25|50|75|100
  complaint?: string | null;
  notes?: string | null;
  negativeFlag: boolean;
  recordedAt: string;
  recordedBy?: string | null;
}

export interface CanteenChannel {
  id: string;
  name: string;
  isActive: boolean;
  viewSpec?: string | null;
}

export interface CanteenTvSnapshot {
  channel: CanteenChannel;
  slot: MealTimeSlot | null;
  groups: Array<{
    wardName: string;
    rows: Array<{
      admissionNo: string;
      bedNumber?: string | null;
      mealName: string;
      dietName: string;
      status: MealOrder['status'];
    }>;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DieteticsService {
  private base = `${environment.apiUrl}/dietetics`;

  constructor(private http: HttpClient) {}

  // ─── Masters ────────────────────────────────────────────────────────
  listMealTimeSlots(): Observable<MealTimeSlot[]> {
    return this.http.get<MealTimeSlot[]>(`${this.base}/meal-time-slots`);
  }
  upsertMealTimeSlot(payload: Partial<MealTimeSlot>): Observable<MealTimeSlot> {
    return payload.id
      ? this.http.put<MealTimeSlot>(`${this.base}/meal-time-slots/${payload.id}`, payload)
      : this.http.post<MealTimeSlot>(`${this.base}/meal-time-slots`, payload);
  }

  listAllergens(): Observable<AllergenMaster[]> {
    return this.http.get<AllergenMaster[]>(`${this.base}/allergens`);
  }
  upsertAllergen(payload: Partial<AllergenMaster>): Observable<AllergenMaster> {
    return payload.id
      ? this.http.put<AllergenMaster>(`${this.base}/allergens/${payload.id}`, payload)
      : this.http.post<AllergenMaster>(`${this.base}/allergens`, payload);
  }

  listDiets(filters?: { isActive?: boolean }): Observable<DietMaster[]> {
    let params = new HttpParams();
    if (filters?.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    return this.http.get<DietMaster[]>(`${this.base}/diets`, { params });
  }
  upsertDiet(payload: Partial<DietMaster>): Observable<DietMaster> {
    return payload.id
      ? this.http.put<DietMaster>(`${this.base}/diets/${payload.id}`, payload)
      : this.http.post<DietMaster>(`${this.base}/diets`, payload);
  }

  listMeals(filters?: { isVeg?: boolean }): Observable<MealMaster[]> {
    let params = new HttpParams();
    if (filters?.isVeg !== undefined) params = params.set('isVeg', String(filters.isVeg));
    return this.http.get<MealMaster[]>(`${this.base}/meals`, { params });
  }
  upsertMeal(payload: Partial<MealMaster>): Observable<MealMaster> {
    return payload.id
      ? this.http.put<MealMaster>(`${this.base}/meals/${payload.id}`, payload)
      : this.http.post<MealMaster>(`${this.base}/meals`, payload);
  }

  getMenuForDiet(dietId: string): Observable<MenuPlanCell[]> {
    return this.http.get<MenuPlanCell[]>(`${this.base}/menu/${dietId}`);
  }
  upsertMenuCell(payload: MenuPlanCell): Observable<MenuPlanCell> {
    return this.http.post<MenuPlanCell>(`${this.base}/menu`, payload);
  }
  clearMenuCell(dietId: string, slotId: string, dayOfWeek: number): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/menu/${dietId}/${slotId}/${dayOfWeek}`);
  }

  listDrugFoodInteractions(): Observable<DrugFoodInteraction[]> {
    return this.http.get<DrugFoodInteraction[]>(`${this.base}/drug-food-interactions`);
  }
  getInteractionsForAdmission(admissionId: string): Observable<AdmissionInteractionHit[]> {
    return this.http.get<AdmissionInteractionHit[]>(`${this.base}/drug-food-interactions/admission/${admissionId}`);
  }

  // ─── Diet plans ─────────────────────────────────────────────────────
  getQueue(): Observable<DieticianQueue> {
    return this.http.get<DieticianQueue>(`${this.base}/queue`);
  }
  getCurrentPlan(admissionId: string): Observable<DietPlan | null> {
    return this.http.get<DietPlan | null>(`${this.base}/plans/admission/${admissionId}/current`);
  }
  getPlanHistory(admissionId: string): Observable<DietPlan[]> {
    return this.http.get<DietPlan[]>(`${this.base}/plans/admission/${admissionId}/history`);
  }
  createDraft(payload: UpsertDietPlanPayload): Observable<DietPlan> {
    return this.http.post<DietPlan>(`${this.base}/plans`, payload);
  }
  updateDraft(id: string, payload: UpsertDietPlanPayload): Observable<DietPlan> {
    return this.http.put<DietPlan>(`${this.base}/plans/${id}`, payload);
  }
  signPlan(id: string, body: { signatureId: string; signedBy?: string }): Observable<DietPlan> {
    return this.http.post<DietPlan>(`${this.base}/plans/${id}/sign`, body);
  }
  endPlan(id: string): Observable<DietPlan> {
    return this.http.post<DietPlan>(`${this.base}/plans/${id}/end`, {});
  }

  // ─── Meal orders ────────────────────────────────────────────────────
  getKitchenList(filters: { date?: string; mealTimeSlotId?: string }): Observable<MealOrder[]> {
    let params = new HttpParams();
    if (filters.date) params = params.set('date', filters.date);
    if (filters.mealTimeSlotId) params = params.set('mealTimeSlotId', filters.mealTimeSlotId);
    return this.http.get<MealOrder[]>(`${this.base}/meal-orders/kitchen`, { params });
  }
  getOrdersForAdmission(admissionId: string, date?: string): Observable<MealOrder[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<MealOrder[]>(`${this.base}/meal-orders/admission/${admissionId}`, { params });
  }
  markPlated(ids: string[]): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/meal-orders/plate`, { ids });
  }
  markDelivered(id: string, body: {
    signatureId?: string;
    twoIdVerified?: boolean;
    trayHotTempC?: number;
    trayColdTempC?: number;
    notes?: string;
  }): Observable<MealOrder> {
    return this.http.post<MealOrder>(`${this.base}/meal-orders/${id}/deliver`, body);
  }
  recordIntake(id: string, body: { percentConsumed: number; complaint?: string; notes?: string }): Observable<MealOrder> {
    return this.http.post<MealOrder>(`${this.base}/meal-orders/${id}/intake`, body);
  }
  skipMeal(id: string, reason: string): Observable<MealOrder> {
    return this.http.post<MealOrder>(`${this.base}/meal-orders/${id}/skip`, { reason });
  }
  regenerateForDate(date: string): Observable<{ generated: number; date: string }> {
    let params = new HttpParams().set('date', date);
    return this.http.post<{ generated: number; date: string }>(`${this.base}/meal-orders/regenerate`, {}, { params });
  }

  // ─── Canteen TV channels ────────────────────────────────────────────
  listCanteenChannels(): Observable<CanteenChannel[]> {
    return this.http.get<CanteenChannel[]>(`${this.base}/canteen-channels`);
  }
  upsertCanteenChannel(payload: Partial<CanteenChannel>): Observable<CanteenChannel> {
    return payload.id
      ? this.http.put<CanteenChannel>(`${this.base}/canteen-channels/${payload.id}`, payload)
      : this.http.post<CanteenChannel>(`${this.base}/canteen-channels`, payload);
  }
  getTvSnapshot(channelId: string): Observable<CanteenTvSnapshot> {
    return this.http.get<CanteenTvSnapshot>(`${this.base}/canteen-channels/${channelId}/snapshot`);
  }
}
