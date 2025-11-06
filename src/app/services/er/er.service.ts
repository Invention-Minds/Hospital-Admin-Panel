import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class ErService {

  private baseUrl = `${environment.apiUrl}/er`;

  constructor(private http: HttpClient) {}

  saveAssessment(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  getAssessmentByAppointmentId(appointmentId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${appointmentId}`);
  }

  updateAssessment(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }
  getAllAssessments(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }
}
