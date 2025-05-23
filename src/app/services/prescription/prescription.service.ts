import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment.prod';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  constructor(private http: HttpClient) { }

  baseUrl: string = `${environment.apiUrl}/prescription`;

  createPrescription(prescription: any) {
    return this.http.post(`${this.baseUrl}`, prescription);
  }

  // Optional: Fetch previous Rx
  getPreviousPrescriptions(prn: string) {
    return this.http.get(`${this.baseUrl}/?prn=${prn}`);
  }
  getAllTablets() {
    return this.http.get<any[]>(`${this.baseUrl}/tablets`);
  }

  getTabletById(id: number) {
    return this.http.get<any>(`${this.baseUrl}/tablets/${id}`);
  }

  createTablet(data: {
    genericName: string;
    brandName: string;
    type: string;
    description?: string;
  }) {
    return this.http.post(`${this.baseUrl}/tablets`, data);
  }

  // --- FavoriteTablet APIs ---

  getFavoritesByUser(userId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/favorites/${userId}`);
  }

  saveFavoriteTablet(payload: { tabletId: number; userId: string }[]) {
    return this.http.post(`${this.baseUrl}/favorites`, { favorites: payload });
  }
  

  removeFavoriteTablet(favId: number) {
    return this.http.delete(`${this.baseUrl}/favorites/${favId}`);
  }
  getAllFavorites() {
    return this.http.get<any[]>(`${this.baseUrl}/favorites`);
  }
  getAllergies(prn: string) {
    return this.http.get<any[]>(`${this.baseUrl}/allergies/${prn}`);
  }
  
  saveAllergies(allergies: { prn: string, genericName: string }[]) {
    return this.http.post(`${this.baseUrl}/allergies`, { allergies });
  }
  
  deleteAllergy(id: number) {
    return this.http.delete(`${this.baseUrl}/allergies/${id}`);
  }
  getPrescriptionsByPrn(prn: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${prn}`);
  }
}
