import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { AuthServiceService } from './auth/auth-service.service';
import { environment } from '../../environment/environment.prod';
import { tap } from 'rxjs/operators';

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
  user?: {
    id: number;
    username: string;
    password: string;
    role: string;
    createdAt: string;
  };
  created_at?:string;
  updated_at?:string;
  lockedBy?: string;
  lockExpiresAt?: Date | null;

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

  private apiUrl = `${environment.apiUrl}/appointments`; // Update this with your actual backend endpoint
  private url = `${environment.apiUrl}/doctors`; // Update this with your actual backend endpoint

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
    // console.log('appointment',appointment)
    if (appointment.id != null) { // Ensure that the id is defined and not null
      // Update appointment status to 'confirmed' in backend
      appointment.status = 'confirmed'; // Update status
      appointment.emailSent = true; // Update email sent status
      appointment.smsSent = true; // Update SMS sent status
      this.updateAppointmentStatus(appointment);
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

    const appointmentData = userId ? { ...appointment, userId } : appointment;

  // console.log('Adding new appointment:', appointmentData);
  // Send the appointment details to the backend without an ID
  this.http.post<Appointment>(`${this.apiUrl}`, appointmentData).subscribe((newAppointment) => {
    this.fetchAppointments(); // Fetch appointments to update the list
  });
}

   // Method to add a canceled appointment
   addCancelledAppointment(appointment: Appointment): void {
    if (appointment.id != null) { // Ensure that the id is defined and not null
      // Update appointment status to 'confirmed' in backend
    appointment.status = 'cancelled'; // Update status
    appointment.emailSent = true; // Update email sent status
    appointment.smsSent = true; // Update SMS sent status
    this.updateAppointmentStatus(appointment);
    } else {
      console.error('Cannot cancelled appointment: Appointment ID is missing.');
    }
  }
  addCompletedAppointment(appointment: Appointment): void {
    if (appointment.id != null) { // Ensure that the id is defined and not null
      // Update appointment status to 'confirmed' in backend
    appointment.status = 'completed'; // Update status
    appointment.emailSent = true; // Update email sent status
    appointment.smsSent = true; // Update SMS sent status
    this.updateAppointmentStatus(appointment);
    } else {  
      console.error('Cannot completed appointment: Appointment ID is missing.');
    }
  }
   // Method to update appointment status
   private updateAppointmentStatus(appointment: Appointment): void {
    const userId = this.authService.getUserId();
    // const updateData = userId ? { status, userId, ...appointment } : { status };
    const updateData = {
      ...appointment,
      userId: userId ? userId : appointment.userId // Include userId if available
    };
    this.http.put<Appointment>(`${this.apiUrl}/${appointment.id}`,updateData).subscribe(() => {
      this.fetchAppointments(); // Fetch appointments to update the list
    });
  }

  // Remove canceled appointment from backend
  removeCancelledAppointment(id: number): void {
    const currentCanceledAppointments = this.canceledAppointmentsSource.getValue();
    const appointmentToDelete = currentCanceledAppointments.find(a => a.id === id);
    if (appointmentToDelete) {
      this.http.delete(`${this.apiUrl}/${appointmentToDelete.id}`).subscribe(() => {
        const updatedAppointments = currentCanceledAppointments.filter(a => a.id !== id);
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
    const availabilityUrl = `${environment.apiUrl}/doctors/availability?doctorId=${doctorId}&date=${date}`;
    return this.http.get<any>(availabilityUrl);
}
addBookedSlot(doctorId: number, date: string, time: string): Observable<any> {
  const bookingData = { doctorId, date, time };
  return this.http.post(`${environment.apiUrl}/doctors/booked-slots`, bookingData);
}
getBookedSlots(doctorId: number, date: string): Observable<string[]> {
  const bookedSlotsUrl = `${environment.apiUrl}/doctors/booked-slots?doctorId=${doctorId}&date=${date}`;
  return this.http.get<string[]>(bookedSlotsUrl);
}
 // Method to get today's total appointments count
 getTotalAppointmentsCountForToday(date: string): Observable<{ count: number }> {
  return this.http.get<{ count: number }>(`${this.apiUrl}/total`, {
    params: { date: date }
  });
}
fetchPendingAppointmentsCount(): Observable<number> {
  return this.http.get<Appointment[]>(`${this.apiUrl}`).pipe(
    map(appointments => appointments.filter(a => a.status === 'pending').length)
  );
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
  return this.http.get<number>(`${environment.apiUrl}/doctors/available/count`, { params });
}
getAvailableDoctors(date: string): Observable<number> {
  const params = new HttpParams().set('date', date);
  return this.http.get<number>(`${environment.apiUrl}/doctors/available/`, { params });
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
 // Method to fetch all appointments
 getAllAppointments(): Observable<Appointment[]> {
  return this.http.get<Appointment[]>(`${this.apiUrl}`);
}
// getDoctorReport(userId: number): Observable<{ confirmedAppointments: Appointment[]; completedAppointments: Appointment[] }> {
//   return this.http.get<{ confirmedAppointments: Appointment[]; completedAppointments: Appointment[] }>(
//     `${this.apiUrl}/by-doctor`, 
//     { params: { userId: userId.toString() } }
//   );
// }

  // Method to lock an appointment
  lockAppointment(appointmentId: number, userId: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.apiUrl}/${appointmentId}/lock`, { userId }, { headers });
  }

  // Method to unlock an appointment
  unlockAppointment(appointmentId: number): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.apiUrl}/${appointmentId}/unlock`, {}, { headers });
  }
  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }
  sendEmail(to: string| string[], status: string, appointmentDetails: any, recipientType:any): Observable<any> {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    const emailRequest = {
      to: recipients,
      status,
      appointmentDetails,
      recipientType
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.post<any>(`${environment.apiUrl}/email/send-email`, emailRequest, { headers });
  }
    // Method to send WhatsApp message
    sendWhatsAppMessage(data: any): Observable<any> {
      return this.http.post<any>(`${environment.apiUrl}/whatsapp/send`, data);
    }
  // Method to get appointment by ID (if needed)
  getAppointmentById(appointmentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${appointmentId}`);
  }

    // Method to schedule an appointment completion
    scheduleCompletion(appointmentId: number, delayMinutes: number): Observable<any> {
      const url = `${this.apiUrl}/${appointmentId}/schedule-completion`;
      return this.http.put(url, { delayMinutes });
    }
    sendRescheduledMessage(appointmentDetails: any): Observable<any> {
      return this.sendWhatsAppMessage(appointmentDetails).pipe(
        tap(() => {
          this.sendEmail(appointmentDetails.doctorEmail, 'rescheduled', appointmentDetails, 'doctor').subscribe();
          this.sendEmail(appointmentDetails.patientEmail, 'rescheduled', appointmentDetails, 'patient').subscribe();
        })
      );
    }
    
    sendConfirmedMessage(appointmentDetails: any): Observable<any> {
      return this.sendWhatsAppMessage(appointmentDetails).pipe(
        tap(() => {
          this.sendEmail(appointmentDetails.doctorEmail, 'confirmed', appointmentDetails, 'doctor').subscribe();
          this.sendEmail(appointmentDetails.patientEmail, 'confirmed', appointmentDetails, 'patient').subscribe();
        })
      );
    }
    addPatient(patientDetails: any): Observable<any> {
      return this.http.post(`${environment.apiUrl}/patients`, patientDetails);
    }
    getPatientById(patientId: number): Observable<any> {
      return this.http.get(`${environment.apiUrl}/patients/${patientId}`);
    }
    checkedinAppointment(appointmentId: number): Observable<any> {
      return this.http.put(`${this.apiUrl}/${appointmentId}/checkin`, {});
    }
    deleteAppointment(id: number): Observable<void> {
      return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
    }
    
}
