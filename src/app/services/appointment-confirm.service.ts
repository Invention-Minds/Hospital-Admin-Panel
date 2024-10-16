import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { AuthServiceService } from './auth/auth-service.service';

export interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  department: string;
  doctorId:number;
  date: string;
  time: string;
  status: string;
  email: string;
  requestVia?: string; // Optional property
  smsSent?: boolean; // Optional property
  emailSent?: boolean; // Optional property
  userId?: number; // Add userId to identify which user handled the appointment
  username?:string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentConfirmService {
  private confirmedAppointmentsSource = new BehaviorSubject<Appointment[]>([]);
  confirmedAppointments$ = this.confirmedAppointmentsSource.asObservable();

  private canceledAppointmentsSource = new BehaviorSubject<Appointment[]>([]);
  canceledAppointments$ = this.canceledAppointmentsSource.asObservable();

  private completedAppointmentsSource = new BehaviorSubject<Appointment[]>([]);
  completedAppointments$ = this.completedAppointmentsSource.asObservable();

  private apiUrl = 'http://localhost:3000/api/appointments'; // Update this with your actual backend endpoint

  constructor(private http: HttpClient, private authService: AuthServiceService) {}

  // Fetch appointments from backend
  fetchAppointments(): void {
    this.http.get<Appointment[]>(`${this.apiUrl}`).subscribe((appointments) => {
      const confirmed = appointments.filter(a => a.status.toLowerCase() === 'confirmed');
      const canceled = appointments.filter(a => a.status.toLowerCase() === 'cancelled');
      const completed = appointments.filter(a => a.status.toLowerCase() === 'completed');

      this.confirmedAppointmentsSource.next(confirmed);
      this.canceledAppointmentsSource.next(canceled);
      this.completedAppointmentsSource.next(completed);
    });
  }
  // Method to add a confirmed appointment
  addConfirmedAppointment(appointment: Appointment): void {
    if (appointment.id != null) { // Ensure that the id is defined and not null
      console.log('Confirming appointment:', appointment);
      // Update appointment status to 'confirmed' in backend
      this.updateAppointmentStatus(appointment.id, 'confirmed');
    } else {
      console.error('Cannot confirm appointment: Appointment ID is missing.');
    }
  }
  // Fetch pending appointments from backend
   // Fetch pending appointments from backend
   fetchPendingAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}`).pipe(
      map(appointments => appointments.filter(a => a.status === 'pending'))
    );
  }
// Method to add a new appointment
addNewAppointment(appointment: Appointment): void {
  const userId = this.authService.getUserId();
  console.log(userId, "in service");
    const appointmentData = userId ? { ...appointment, userId } : appointment;
    console.log('Adding new appointment:', appointmentData);
  // console.log('Adding new appointment:', appointmentData);
  // Send the appointment details to the backend without an ID
  this.http.post<Appointment>(`${this.apiUrl}`, appointmentData).subscribe((newAppointment) => {
    this.fetchAppointments(); // Fetch appointments to update the list
  });
}

   // Method to add a canceled appointment
   addCancelledAppointment(appointment: Appointment): void {
    if (appointment.id != null) { // Ensure that the id is defined and not null
      console.log('Confirming appointment:', appointment);
      // Update appointment status to 'confirmed' in backend
      this.updateAppointmentStatus(appointment.id, 'cancelled');
    } else {
      console.error('Cannot cancelled appointment: Appointment ID is missing.');
    }
  }
  addCompletedAppointment(appointment: Appointment): void {
    if (appointment.id != null) { // Ensure that the id is defined and not null
      console.log('Confirming appointment:', appointment);
      // Update appointment status to 'confirmed' in backend
      this.updateAppointmentStatus(appointment.id, 'completed');
    } else {  
      console.error('Cannot completed appointment: Appointment ID is missing.');
    }
  }
   // Method to update appointment status
   private updateAppointmentStatus(appointmentId: number, status: string): void {
    const userId = this.authService.getUserId();
    const updateData = userId ? { status, userId } : { status };
    this.http.put<Appointment>(`${this.apiUrl}/${appointmentId}`,updateData).subscribe(() => {
      this.fetchAppointments(); // Fetch appointments to update the list
    });
  }

  // Remove canceled appointment from backend
  removeCancelledAppointment(phoneNumber: string): void {
    const currentCanceledAppointments = this.canceledAppointmentsSource.getValue();
    const appointmentToDelete = currentCanceledAppointments.find(a => a.phoneNumber === phoneNumber);
    if (appointmentToDelete) {
      this.http.delete(`${this.apiUrl}/${appointmentToDelete.id}`).subscribe(() => {
        const updatedAppointments = currentCanceledAppointments.filter(a => a.phoneNumber !== phoneNumber);
        this.canceledAppointmentsSource.next(updatedAppointments);
      });
    }
  }

  // Method to check if a time is available
  isTimeAvailable(date: string, time: string): Observable<boolean> {
    return this.http.get<Appointment[]>(`${this.apiUrl}`).pipe(
      map(appointments => !appointments.some(appointment =>
        appointment.date === date && appointment.time === time
      ))
    );
  }
  getAvailableSlots(doctorId: number, date: string): Observable<any> {
    const availabilityUrl = `http://localhost:3000/api/doctors/availability?doctorId=${doctorId}&date=${date}`;
    return this.http.get<any>(availabilityUrl);
}
addBookedSlot(doctorId: number, date: string, time: string): Observable<any> {
  const bookingData = { doctorId, date, time };
  return this.http.post(`http://localhost:3000/api/doctors/booked-slots`, bookingData);
}
getBookedSlots(doctorId: number, date: string): Observable<string[]> {
  const bookedSlotsUrl = `http://localhost:3000/api/doctors/booked-slots?doctorId=${doctorId}&date=${date}`;
  return this.http.get<string[]>(bookedSlotsUrl);
}
 // Method to get today's total appointments count
 getTotalAppointmentsCountForToday(date: string): Observable<{ count: number }> {
  return this.http.get<{ count: number }>(`${this.apiUrl}/total`, {
    params: { date: date }
  });
}

// Method to get today's pending appointment requests count
getPendingAppointmentsCountForToday(date: string): Observable<{ count: number }> {
  return this.http.get<{ count: number }>(`${this.apiUrl}/pending`, {
    params: { date: date }
  });
}
 // Method to get the count of available doctors for a specific date
 getAvailableDoctorsCount(date: string): Observable<number> {
  const params = new HttpParams().set('date', date);
  return this.http.get<number>(`http://localhost:3000/api/doctors/available/count`, { params });
}
getAvailableDoctors(date: string): Observable<number> {
  const params = new HttpParams().set('date', date);
  return this.http.get<number>(`http://localhost:3000/api/doctors/available/`, { params });
}
getAppointmentsByUser(userId: number, status?: string): Observable<Appointment[]> {
  let params = new HttpParams().set('userId', userId.toString());
  if (status) {
    params = params.set('status', status);
  }
  return this.http.get<Appointment[]>(`${this.apiUrl}/by-user`, { params });
}
// Service method to get all admins' appointments for sub_admins or super_admins
getAppointmentsByRole(): Observable<Appointment[]> {
  return this.http.get<Appointment[]>(`${this.apiUrl}/by-role`);
}


}
