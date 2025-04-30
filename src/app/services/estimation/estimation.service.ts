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
  getEstimationsByType(estimationType: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/department/${estimationType}`
    );
  }
  createEstimationDetails(estimationDetails: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/estimation-details`, estimationDetails);
  }
  getAllEstimation(): Observable<any>{
    return this.http.get<any>(`${this.apiUrl}` )
  }
  updateEstimationDetails(estimationId: string, estimationData: any): Observable<any> {
    const encodedEstimationId = encodeURIComponent(estimationId);
    return this.http.put<any>(`${this.apiUrl}/estimation-details/${encodedEstimationId}`, estimationData);
  }
  createNewEstimationDetails(estimationData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/new-estimation-details/`, estimationData);
  }
  updateFollowUps(estimationId: string, followUpData: any): Observable<any> {
    const encodedEstimationId = encodeURIComponent(estimationId); // Encode estimationId for safety
    return this.http.post<any>(`${this.apiUrl}/estimations/${encodedEstimationId}/follow-ups`, followUpData);
}
updateAdvanceDetails(estimationId: string, updateFields: any): Observable<any> {
  const encodedEstimationId = encodeURIComponent(estimationId);
  return this.http.put(`${this.apiUrl}/estimation-details/${encodedEstimationId}/advance`, updateFields);
}
markComplete(estimationId: string, updateFields: any): Observable<any> {
  const encodedEstimationId = encodeURIComponent(estimationId);
  return this.http.put(`${this.apiUrl}/estimation-details/${encodedEstimationId}/mark-complete`, updateFields);
}
updateEstimationFeedback(estimationId: string, data: any): Observable<any> {
  const encodedEstimationId = encodeURIComponent(estimationId);
  return this.http.put(`${this.apiUrl}/estimation-details/${encodedEstimationId}/cancel`, data); // Use PUT or PATCH depending on your API design
}
updateEstimationPacDone(estimationId: string, data: any): Observable<any>{
  const encodedEstimationId = encodeURIComponent(estimationId);
  return this.http.put(`${this.apiUrl}/estimation-details/${encodedEstimationId}/pacDone`,data);
}
updateSurgeryDate(estimationId: string, data: any): Observable<any>{
  const encodedEstimationId = encodeURIComponent(estimationId);
  return this.http.put(`${this.apiUrl}/estimation-details/${encodedEstimationId}/updateDate`,data);
}
updateEstimationConfirm(estimationId: string, data: any): Observable<any>{
  const encodedEstimationId = encodeURIComponent(estimationId);
  return this.http.put(`${this.apiUrl}/estimation-details/${encodedEstimationId}/confirm`,data);
}
generateAndSendPdf(estimationId: string, estimationData: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/generate-pdf`, estimationData);
}
lockService(serviceId: number, userId: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/${serviceId}/lock`, { userId });
}

// Unlock a service
unlockService(serviceId: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/${serviceId}/unlock`, {});
}
}