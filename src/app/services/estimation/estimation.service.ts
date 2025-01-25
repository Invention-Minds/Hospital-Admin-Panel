import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment.prod';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EstimationService {
  private apiUrl = `${environment.apiUrl}/estimation`;
  constructor(private http: HttpClient) { }

  createEstimation(doctorId: number, departmentId: number, estimation: string, estimationType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}`, { doctorId, departmentId, estimation, estimationType });
  }
  getEstimationsByDepartment(departmentId: number, estimationType: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/department/${departmentId}/${estimationType}`
    );
  }
  createEstimationDetails(estimationDetails: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/estimation-details`, estimationDetails);
  }
  getAllEstimation(): Observable<any>{
    return this.http.get<any>(`${this.apiUrl}` )
  }
}