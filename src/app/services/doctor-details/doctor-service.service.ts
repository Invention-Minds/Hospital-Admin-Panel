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

  // Updates the selected doctor locally
  // updateDoctorLocally(updatedDoctor: Doctor): void {
  //   const index = this.doctors.findIndex((doctor) => doctor.name === updatedDoctor.name);
  //   if (index !== -1) {
  //     this.doctors[index] = updatedDoctor;
  //   }
  // }

  // // Fetch all doctors from the backend
  // getDoctors(): Observable<Doctor[]> {
  //   return this.http.get<Doctor[]>(`${this.apiUrl}/doctors`);
  // }
  // getDepartments(): Observable<Department[]> {
  //   return this.http.get<Department[]>(`${this.apiUrl}/departments`);
  // }


  // // Create a new doctor
  // createDoctor(doctor: Doctor): Observable<Doctor> {
  //   return this.http.post<Doctor>(this.apiUrl, doctor);
  // }

  // // Update an existing doctor
  // updateDoctor(updatedDoctor: Doctor): Observable<Doctor> {
  //   return this.http.put<Doctor>(`${this.apiUrl}/${updatedDoctor.id}`, updatedDoctor);
  // }

  // Delete a doctor
  deleteDoctor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
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
}
