import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Doctor } from '../../models/doctor.model';
import { Department } from '../../models/department.model';

@Injectable({
  providedIn: 'root',
})
export class DoctorServiceService {
  private doctors: Doctor[] = []; // Cache to store doctors locally
  private apiUrl = 'http://localhost:3000/api'; // Replace with your actual backend URL

  // BehaviorSubject for managing doctor state across components
  private doctorSubject = new BehaviorSubject<Doctor | null>(null);
  doctor$ = this.doctorSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Sets the selected doctor to the BehaviorSubject
  setDoctor(doctor: Doctor): void {
    this.doctorSubject.next(doctor);
  }



  // Delete a doctor
  deleteDoctor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/doctors/${id}`);
  }
  // Get all doctors
  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors`);
  }

  // Create new doctor
  createDoctor(doctor: Doctor): Observable<Doctor> {
    return this.http.post<Doctor>(`${this.apiUrl}/doctors`, doctor);
  }

  // Update doctor details
  updateDoctor(doctor: Doctor): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/doctors/${doctor.id}`, doctor);
  }

  // Get all departments
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departments`);
  }
  getBookedSlots(doctorId: number, date: string): Observable<string[]> {
    const bookedSlotsUrl = `http://localhost:3000/api/doctors/booked-slots?doctorId=${doctorId}&date=${date}`;
    return this.http.get<string[]>(bookedSlotsUrl);
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
    return this.http.get<{ date: string }[]>(`http://localhost:3000/api/doctors/unavailable-dates?doctorId=${doctorId}`);
  }  
  getDoctorDetails(doctorId: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.apiUrl}/doctors/${doctorId}`);
  }

}
