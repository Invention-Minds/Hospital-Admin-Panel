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
  requestVia?: string; // Optional property
  smsSent?: boolean; // Optional property
}
@Injectable({
  providedIn: 'root'
})
export class AppointmentConfirmService {
  private confirmedAppointmentsSource = new BehaviorSubject<Appointment[]>([]);
  confirmedAppointments$ = this.confirmedAppointmentsSource.asObservable();

  private canceledAppointmentsSource = new BehaviorSubject<Appointment[]>([]);
  canceledAppointments$ = this.canceledAppointmentsSource.asObservable();

  // Method to add a confirmed appointment
  addConfirmedAppointment(appointment: Appointment) {
    const currentAppointments = this.confirmedAppointmentsSource.getValue();
    this.confirmedAppointmentsSource.next([...currentAppointments, appointment]); // Add the new appointment
  }
  addCancelledAppointment(appointment: Appointment) {
    const currentCanceledAppointments = this.canceledAppointmentsSource.getValue();
    this.canceledAppointmentsSource.next([...currentCanceledAppointments, appointment]);
    console.log('Cancelled appointments:', this.canceledAppointmentsSource);
  }
  constructor() { }
}
