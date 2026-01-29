import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';



// ---------- Models ----------
export interface Therapy {
  id?: number;
  name: string;
  description?: string;
  duration?: number;
}

export interface Therapist {
  id?: number;
  name: string;
  phoneNumber: string;
  email?: string;
  qualification?: string;
  isActive?: boolean;
}

export interface TherapyAppointment {
  id?: number;
  prn?: number;
  name: string;
  phone: string;
  email?: string;
  doctorId?: number;
  therapistId?: number;
  therapyIds: number[]; 
  therapyId: number;
  roomNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status?: string;
  checkedIn?: boolean;
  checkedInTime?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  startedBy?: string;
  finishedBy?: string;
  reminderSent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TherapyService {

  constructor(private http: HttpClient) { }

  BASE_URL: string = `${environment.apiUrl}/therapy-appt`;

  // ------------------- THERAPY -------------------
  createTherapy(data: Therapy): Observable<any> {
    return this.http.post(`${this.BASE_URL}/therapy`, data);
  }

  getAllTherapies(): Observable<Therapy[]> {
    return this.http.get<Therapy[]>(`${this.BASE_URL}/therapy`);
  }

  getTherapyById(id: number): Observable<Therapy> {
    return this.http.get<Therapy>(`${this.BASE_URL}/therapy/${id}`);
  }

  updateTherapy(id: number, data: Partial<Therapy>): Observable<any> {
    return this.http.put(`${this.BASE_URL}/therapy/${id}`, data);
  }

  deleteTherapy(id: number): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/therapy/${id}`);
  }

  // ------------------- THERAPIST -------------------
  createTherapist(data: Therapist): Observable<any> {
    return this.http.post(`${this.BASE_URL}/therapist`, data);
  }

  getAllTherapists(): Observable<Therapist[]> {
    return this.http.get<Therapist[]>(`${this.BASE_URL}/therapist`);
  }

  getTherapistById(id: number): Observable<Therapist> {
    return this.http.get<Therapist>(`${this.BASE_URL}/therapist/${id}`);
  }

  updateTherapist(id: number, data: Partial<Therapist>): Observable<any> {
    return this.http.put(`${this.BASE_URL}/therapist/${id}`, data);
  }

  deleteTherapist(id: number): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/therapist/${id}`);
  }

  // ------------------- APPOINTMENT -------------------
  createTherapyAppointment(data: TherapyAppointment): Observable<any> {
    return this.http.post(`${this.BASE_URL}`, data);
  }

  getAllTherapyAppointments(): Observable<TherapyAppointment[]> {
    return this.http.get<TherapyAppointment[]>(`${this.BASE_URL}`);
  }

  checkInTherapyAppointment(id: number, checkedInBy: any): Observable<any> {
    return this.http.patch(`${this.BASE_URL}/checkin/${id}`, {checkedInBy });
  }

  getAyurvedaDoctors(): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/ayurveda-doctors`);
  }

  // 🗓️ Get therapy schedule by date
  getTherapyScheduleByDate(date: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/schedule/${date}`);
  }

  getConfirmedAppointments(): Observable<TherapyAppointment[]> {
    return this.http.get<TherapyAppointment[]>(`${this.BASE_URL}/confirmed`);
  }

  getCancelledAppointments(): Observable<TherapyAppointment[]> {
    return this.http.get<TherapyAppointment[]>(`${this.BASE_URL}/cancelled`);
  }

  getCompletedAppointments(): Observable<TherapyAppointment[]> {
    return this.http.get<TherapyAppointment[]>(`${this.BASE_URL}/completed`);
  }

  updateTherapyAppointment(id: number, data: any): Observable<any> {
    return this.http.put(`${this.BASE_URL}/${id}`, data);
  }

  cancelTherapyAppointment(id: number, cancelledBy: string) {
    return this.http.patch(`${this.BASE_URL}/cancel/${id}`, { cancelledBy });
  }
  lockTherapyAppointment(id: number, userId: number) {
    return this.http.patch(`${this.BASE_URL}/lock/${id}`, { userId });
  }
  
  unlockTherapyAppointment(id: number) {
    return this.http.patch(`${this.BASE_URL}/unlock/${id}`, {});
  }
  
  todayCheckedInTherapies(therapistId: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/today-confirmed/${therapistId}`);
  }

  todayCheckedInTherapiesChannel(): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/today-checkedin`);
  }

  updateTherapyProgress(id: number, payload: any) {
    return this.http.patch(`${this.BASE_URL}/progress/${id}`, payload);
  }
  
} 
