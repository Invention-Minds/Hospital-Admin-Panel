import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Doctor } from '../../models/doctor.model';
import { Department } from '../../models/department.model';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class DoctorServiceService {
  private doctors: Doctor[] = []; // Cache to store doctors locally
  private apiUrl = `${environment.apiUrl}`; // Replace with your actual backend URL

  // BehaviorSubject for managing doctor state across components
  private doctorSubject = new BehaviorSubject<Doctor | null>(null);
  doctor$ = this.doctorSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Sets the selected doctor to the BehaviorSubject
  setDoctor(doctor: Doctor): void {
    this.doctorSubject.next(doctor);
  }

  addOrUpdateExtraSlot(extraSlotData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/extraslot-count/add`, extraSlotData);
  }

  // Delete a doctor
  deleteDoctor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/doctors/${id}`);
  }
  // Get all doctors
  // getDoctors(): Observable<Doctor[]> {
  //   return this.http.get<Doctor[]>(`${this.apiUrl}/doctors`);
  // }
  getDoctors(date?: string): Observable<Doctor[]> {
    let url = `${this.apiUrl}/doctors`;
    if (date) {
      url += `?date=${date}`;
    }
    return this.http.get<Doctor[]>(url);
  }
  getAllDoctors(date?: string): Observable<Doctor[]> {
    let url = `${this.apiUrl}/doctors/get-doctor-details`;
    if (date) {
      url += `?date=${date}`;
    }
    return this.http.get<Doctor[]>(url);
  }

  getFutureBookedSlotDuration(doctorId: string, date: string): Observable<any> {
    const params = new HttpParams().set('doctorId', doctorId)
      .set('date', date);
    return this.http.get(`${this.apiUrl}/doctors/futureslotsForSlotDuration`, { params });
  }

  getFutureBookedSlots(doctorId: string, date: string, individualAvailability: boolean = false, dayOfWeek?: number): Observable<any> {
    let params = new HttpParams()
      .set('doctorId', doctorId)
      .set('date', date)
      .set('individualAvailability', individualAvailability.toString()); // Add individual availability flag

    // If individual availability is true, also add the day of the week
    if (individualAvailability && dayOfWeek !== undefined) {
      params = params.set('dayOfWeek', dayOfWeek);
    }

    return this.http.get(`${this.apiUrl}/doctors/futureBookedSlots`, { params });
  }


  // Create new doctor
  createDoctor(doctor: Doctor): Observable<Doctor> {
    return this.http.post<Doctor>(`${this.apiUrl}/doctors`, doctor);
  }

  // Update doctor details
  updateDoctor(doctor: Doctor): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/doctors/${doctor.id}`, doctor);
  }
  updateDoctorRoom(doctorId: number, roomNo: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/doctors/${doctorId}/room`, { roomNo });
  }

  // Get all departments
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departments`);
  }
  getBookedSlots(doctorId: number, date: string): Observable<{ time: string; complete: boolean }[]> {
    const bookedSlotsUrl = `${this.apiUrl}/doctors/booked-slots?doctorId=${doctorId}&date=${date}`;
    return this.http.get<{ time: string; complete: boolean }[]>(bookedSlotsUrl);
  }
  // Method to mark a booked slot as complete
  markSlotAsComplete(doctorId: number, date: string, time: string): Observable<any> {
    const markCompleteUrl = `${this.apiUrl}/doctors/mark-complete`;


    const body = { doctorId, date, time };

    return this.http.post<any>(markCompleteUrl, body);
  }
  getCancelledSlots(doctorId: number, date: string, time: string): Observable<any> {
    const bookingData = { doctorId, date, time };
    return this.http.post(`${environment.apiUrl}/doctors/cancel-booked-slot`, bookingData);
  }
  addUnavailableDates(doctorId: number, startDate: string, endDate: string, unavailableDates: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/doctors/unavailable-dates`, {
      doctorId,
      startDate,
      endDate,
      unavailableDates,
    });
  }
  getUnavailableDates(doctorId: number): Observable<{ date: string }[]> {
    return this.http.get<{ date: string }[]>(`${this.apiUrl}/doctors/unavailable-dates?doctorId=${doctorId}`);
  }
  getDoctorDetails(doctorId: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.apiUrl}/doctors/${doctorId}`);
  }

  // getUnavailableSlots(doctorId: number): Observable<{ date: string, time: string }[]> {
  //   return this.http.get<{ date: string, time: string }[]>(`${this.apiUrl}/doctors/${doctorId}/unavailableSlots`);
  // }
  getUnavailableSlots(doctorId: number): Observable<{ [date: string]: string[] }> {
    return this.http.get<{ [date: string]: string[] }>(`${this.apiUrl}/doctors/${doctorId}/unavailableSlots`);
  }



  addUnavailableSlots(doctorId: number, date: string, times: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/doctors/unavailableSlots`, { doctorId, date, times });
  }


  markDatesAsAvailable(doctorId: number, startDate: string, endDate: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/doctors/${doctorId}/mark-available`, {
      startDate,
      endDate
    });
  }
  addExtraSlots(doctorId: number, date: string, time: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/doctors/add-extra-slots`, { doctorId, date, time });
  }
  getExtraSlots(doctorId: number, date?: string): Observable<{ date: string; time: string }[]> {
    let url = `${this.apiUrl}/doctors/${doctorId}/extraSlots`;
    if (date) {
      url += `?date=${date}`;
    }
    return this.http.get<{ date: string; time: string }[]>(url);
  }
  getDoctorById(doctorId: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.apiUrl}/doctors/${doctorId}`);
  }
  getDoctorByUserId(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/doctors/get-doctor-by-userId/${userId}`);
  }
  getBulkFutureBookedSlots(startDate: string, endDate: string, doctorIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/doctors/bulk-future-slots`, { startDate, endDate, doctorIds });
  }
  
  setUnavailableForDoctors(data: { doctorIds: number[], startDate: string, endDate: string }) {
    return this.http.post(`${this.apiUrl}/doctors/add-unavailable-dates`, data);
  }
  
}
