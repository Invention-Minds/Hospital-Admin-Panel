import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment.prod';
import { HttpParams } from '@angular/common/http';

export interface Service {
  pnrNumber: string;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  package?: string;
  appointmentDate: string; // Format: YYYY-MM-DD
  appointmentTime: string;
  repeatChecked: boolean;
  daysInterval?: number;
  numberOfTimes?: number;
  requestVia?: string;
  appointmentStatus?: string;
  repeatedDates?: string[]; // Array of repeated date strings
  packageId?: number;
  packageName?: string;
  smsSent?: boolean;
  messageSent?: boolean;
  emailSent?: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class HealthCheckupServiceService {
  private baseUrl = `${environment.apiUrl}/services`; // Update this with your actual backend endpoint
  constructor(private http: HttpClient) { }
   // Create a new service
   createService(service: any): Observable<any> {
    return this.http.post(`${this.baseUrl}`, service);
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

  getAvailableSlots(date: string, packageId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/available-slots?date=${date}&packageId=${packageId}`);
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
  return this.http.post<any>(`${environment.apiUrl}/whatsapp/send-service-message`, data);
}
sendSmsMessage(data: any): Observable<any> {
  return this.http.post<any>(`${environment.apiUrl}/sms/send-sms-package`, data);
}
individualComplete(data: any): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/mark-complete`, data);
}
getConfirmedAppointments():Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/confirmed-appts`)
}
getCancelledAppointments():Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/cancelled-appts`)
}
getCompletedAppointments():Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/completed-appts`)
}
getPendingAppointments():Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/pending-appts`)
}
getTodayCheckinServices():Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/today-services`)
}
getTodayConfirmedServices():Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/today-confirmed`)
}
getMhcOverview():Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/get-mhc-overview`)
}
}
