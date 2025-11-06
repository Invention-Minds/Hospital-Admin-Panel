import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class OpdAssessmentsService {


  apiUrl: string = `${environment.apiUrl}/opd`;

  constructor(private http: HttpClient) {}

  saveAssessment(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getAssessmentById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateAssessment(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }
  getAssessmentByAppointmentId(appointmentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/by-appointment/${appointmentId}`);
  }
  
}
