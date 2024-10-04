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

  public canceledAppointmentsSource = new BehaviorSubject<Appointment[]>([]);
  canceledAppointments$ = this.canceledAppointmentsSource.asObservable();

  // Method to add a confirmed appointment
  addConfirmedAppointment(appointment: Appointment) {
    const currentAppointments = this.confirmedAppointmentsSource.getValue();
    this.confirmedAppointmentsSource.next([...currentAppointments, appointment]); // Add the new appointment
  }
  // addCancelledAppointment(appointment: Appointment) {
  //   const currentCanceledAppointments = this.canceledAppointmentsSource.getValue();
  //   this.canceledAppointmentsSource.next([...currentCanceledAppointments, appointment]);
  //   console.log('Cancelled appointments in service:', this.canceledAppointmentsSource);
  // }
  addCancelledAppointment(appointment: Appointment) {
    const currentCanceledAppointments = this.canceledAppointmentsSource.getValue();
    console.log('Before adding:', currentCanceledAppointments);
    this.canceledAppointmentsSource.next([...currentCanceledAppointments, appointment]);
    console.log('After adding:', this.canceledAppointmentsSource.getValue());
}
removeCancelledAppointment(phoneNumber: string) {
  const currentCanceledAppointments = this.canceledAppointmentsSource.getValue();
  const updatedAppointments = currentCanceledAppointments.filter(appointment => appointment.phoneNumber !== phoneNumber);
  this.canceledAppointmentsSource.next(updatedAppointments);
  console.log('Cancelled appointments after removal:', this.canceledAppointmentsSource.getValue());
}

  constructor() { }
}
