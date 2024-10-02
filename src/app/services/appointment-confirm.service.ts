import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
export interface Appointment {
  id: string;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  therapy: string;
  date: string;
  time: string;
  status: string;
  email: string;
  smsSent?: boolean; // Optional property
}
@Injectable({
  providedIn: 'root'
})
export class AppointmentConfirmService {
  private confirmedAppointmentsSource = new BehaviorSubject<Appointment[]>([]);
  confirmedAppointments$ = this.confirmedAppointmentsSource.asObservable();

  // Method to add a confirmed appointment
  addConfirmedAppointment(appointment: Appointment) {
    const currentAppointments = this.confirmedAppointmentsSource.getValue();
    this.confirmedAppointmentsSource.next([...currentAppointments, appointment]); // Add the new appointment
  }
  constructor() { }
}
