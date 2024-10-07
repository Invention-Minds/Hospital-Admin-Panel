import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Doctor } from '../../models/doctor.model';// Assume Doctor interface is defined in the doctor-form component

@Injectable({
  providedIn: 'root'
})
export class DoctorServiceService {
  private doctors: Doctor[] = []; // Start with an empty list

  constructor() { }
  private doctorSubject = new BehaviorSubject<Doctor | null>(null);
  doctor$ = this.doctorSubject.asObservable();

  setDoctor(doctor: Doctor) {
    this.doctorSubject.next(doctor);
  }
  updateDoctor(updatedDoctor: Doctor): void {
    const index = this.doctors.findIndex(doctor => doctor.name === updatedDoctor.name);
    if (index !== -1) {
      this.doctors[index] = updatedDoctor;
    }
  }
}
