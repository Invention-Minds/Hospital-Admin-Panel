import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment.prod';
import { HttpParams } from '@angular/common/http';

export interface Service {
  id?: number;
  pnrNumber: string;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  appointmentDate: string; // Format: YYYY-MM-DD
  appointmentTime: string;
  requestVia?: string;
  appointmentStatus?: string; // Array of repeated date strings
  smsSent?: boolean;
  emailSent?: boolean;
  messageSent?: boolean;
  checkedIn?: boolean;
  radioServiceName?: string;
  radioServiceId?: number; // Array of repeated date strings
  createdAt?: string;
}
@Injectable({
  providedIn: 'root'
})
export class RadiologyService {
  private baseUrl = `${environment.apiUrl}/radiology`; // Update this with your actual backend endpoint
  constructor(private http: HttpClient) { }
   // Create a new service
   createService(service: any): Observable<any> {
    return this.http.post(`${this.baseUrl}`, service);
  }

  createNewService(service:any):Observable<any>{
    return this.http.post(`${this.baseUrl}/new`, service);
  }
  // Get all services
  getAllServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.baseUrl}`);
  }

  // Get a single service by ID
  getServiceById(id: number): Observable<Service> {
    return this.http.get<Service>(`${this.baseUrl}/${id}`);
  }

  // Update an existing service
  updateService(id: number, service: Service): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/update`, service);
  }
  updateServiceStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, { appointmentStatus: status });
  }
  updateServiceMessageStatus(id: number, status: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/update-message`, { status });
  }
  // Delete a service by ID
  deleteService(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getAvailableSlots(date: string, radioServiceId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/available-slots?date=${date}&packageId=${radioServiceId}`);
  }

  stopRepeat(serviceId: number, stopDate: string): Observable<any> {
    const payload = { serviceId, stopDate };
    return this.http.post(`${this.baseUrl}/stop-repeat`, payload);
  }
  getPackages(): Observable<any> {
    return this.http.get(`${this.baseUrl}/packages`); // Endpoint to fetch packages
  }
  scheduleServiceCompletion(serviceId: number, delayMinutes: number): Observable<any> {
    const params = new HttpParams()
      .set('id', serviceId.toString())
      .set('delayMinutes', delayMinutes.toString());

    return this.http.post(`${this.baseUrl}/schedule-completion`, {}, { params });
  }
  // Lock a service
lockService(serviceId: number, userId: number): Observable<any> {
  return this.http.put(`${this.baseUrl}/${serviceId}/lock`, { userId });
}

// Unlock a service
unlockService(serviceId: number): Observable<any> {
  return this.http.put(`${this.baseUrl}/${serviceId}/unlock`, {});
}
sendWhatsappMessageForService(data: any): Observable<any> {
  return this.http.post<any>(`${environment.apiUrl}/whatsapp/send-radiology-message`, data);
}
sendSmsMessage(data: any): Observable<any> {
  return this.http.post<any>(`${environment.apiUrl}/sms/send-sms-radiology`, data);
}
sendLabDone(data: any): Observable<any> {
  return this.http.post<any>(`${environment.apiUrl}/whatsapp/send-lab-message`, data);
}
sendRadioDone(data: any): Observable<any> {
  return this.http.post<any>(`${environment.apiUrl}/whatsapp/send-radio-message`, data);
}

getAppointmentsByServiceId(serviceId: any, date?: string): Observable<any> {
  let apiUrl = `${this.baseUrl}/appts-by-serviceId?serviceId=${serviceId}`;
  
  if (date) {
    apiUrl += `&date=${date}`; // Append date parameter if provided
  }

  return this.http.get<any>(apiUrl);
}
getTodayCheckinServices():Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/today-services`)
}
getLockStatus() {
  return this.http.get<{ isActive: boolean }>(`${environment.apiUrl}/radiology-queue/system-lock/check-in`);
}

unlock() {
  return this.http.post(`${environment.apiUrl}/radiology-queue/unlock-checkins`, {});
}

checkIn(serviceId: number) {
  return this.http.post(`${environment.apiUrl}/radiology-queue/${serviceId}/checkin`, {});
}

}
