import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { AuthServiceService } from './auth/auth-service.service';
import { environment } from '../../environment/environment.prod';
import { tap } from 'rxjs/operators';
import { Doctor } from '../models/doctor.model';

export interface InvestigationOrderPayload {
  prn: string;
  doctorId: number;
  doctorName: string;
  remarks?: string;
  date?: string; // ISO format date: 'YYYY-MM-DD'
  labTests: number[];
  radiologyTests: number[];
  packages: number[];
}

export interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  department: string;
  doctorId: number;
  doctor?: any;
  date: string;
  time: string;
  status: string;
  email: string;
  requestVia?: string; // Optional property
  smsSent?: boolean; // Optional property
  emailSent?: boolean; // Optional property
  messageSent?: boolean;
  userId?: number; // Add userId to identify which user handled the appointment
  username?: string;
  user?: {
    id: number;
    username: string;
    password: string;
    role: string;
    createdAt: string;
  };
  created_at?: string;
  updated_at?: string;
  lockedBy?: string;
  lockExpiresAt?: Date | null;
  type?:string;
  serviceId?:number;



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
  private baseUrl = `${environment.apiUrl}/doctor-notes`;
  private historyUrl = `${environment.apiUrl}/history-notes`;
    private investigationUrl = `${environment.apiUrl}/investigation`

  constructor(private http: HttpClient, private authService: AuthServiceService) { }

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
    if (appointment.id !== null) { // Ensure that the id is defined and not null
      // Update appointment status to 'confirmed' in backend

      appointment.status = 'confirmed'; // Update status
      if (appointment.email == null || appointment.email == '') {
        appointment.emailSent = false; // Update email sent status
      }
      else {
        appointment.emailSent = true; // Update email sent status
      } // Update email sent status
      appointment.smsSent = true; // Update SMS sent status
      appointment.messageSent = true;
      // console.log("confirm",appointment)
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
  createAppointment(appointment: Appointment): void {
const appointmentData = appointment

    // console.log('Adding new appointment:', appointmentData);
    // Send the appointment details to the backend without an ID
    this.http.post<Appointment>(`${this.apiUrl}/new`, appointmentData).subscribe((newAppointment) => {
      this.fetchAppointments(); // Fetch appointments to update the list
    });
  }

  // Method to add a canceled appointment
  addCancelledAppointment(appointment: Appointment): void {
    if (appointment.id !== null) { // Ensure that the id is defined and not null
      // Update appointment status to 'confirmed' in backend
      appointment.status = 'cancelled'; // Update status
      if (appointment.email == null || appointment.email == '') {
        appointment.emailSent = false; // Update email sent status
      }
      else {
        appointment.emailSent = true; // Update email sent status
      } // Update email sent status
      appointment.smsSent = true; // Update SMS sent status
      appointment.messageSent = true;
      this.updateAppointmentStatus(appointment);
    } else {
      console.error('Cannot cancelled appointment: Appointment ID is missing.');
    }
  }
  addCompletedAppointment(appointment: Appointment): void {
    if (appointment.id !== null) { // Ensure that the id is defined and not null
      // Update appointment status to 'confirmed' in backend
      appointment.status = 'completed'; // Update status
      if (appointment.email == null || appointment.email == '') {
        appointment.emailSent = false; // Update email sent status
      }
      else {
        appointment.emailSent = true; // Update email sent status
      }
      appointment.smsSent = true; // Update SMS sent status
      appointment.messageSent = true;
      this.updateAppointmentStatus(appointment);
    } else {
      console.error('Cannot completed appointment: Appointment ID is missing.');
    }
  }
  public selectedAppointmentSource = new BehaviorSubject<{ doctor: Doctor, slot: any } | null>(null);
  selectedAppointment$ = this.selectedAppointmentSource.asObservable();

  selectSlot(doctor: Doctor, slot: any): void {
    console.log('Selected slot:', doctor, slot);
    this.selectedAppointmentSource.next({ doctor, slot });
  }
  // Method to update appointment status
  private updateAppointmentStatus(appointment: Appointment): void {
    // console.log('Updating appointment status:', appointment);
    const userId = this.authService.getUserId();
    // const updateData = userId ? { status, userId, ...appointment } : { status };
    const updateData = {
      ...appointment,
      userId: userId ? userId : appointment.userId // Include userId if available
    };
    this.http.put<Appointment>(`${this.apiUrl}/${appointment!.id}`, updateData).subscribe(() => {
      this.fetchAppointments(); // Fetch appointments to update the list
    });
  }

  updateAppointment(appointment: Appointment): void {

    this.http.put<Appointment>(`${this.apiUrl}/${appointment.id}`, appointment).subscribe(() => {
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
  getBookedSlots(doctorId: number, date: string): Observable<{ time: string; complete: boolean }[]> {
    const bookedSlotsUrl = `${environment.apiUrl}/doctors/booked-slots?doctorId=${doctorId}&date=${date}`;
    return this.http.get<{ time: string; complete: boolean }[]>(bookedSlotsUrl);
  }
  // Method to get today's total appointments count
  getTotalAppointmentsCountForToday(date: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/total`, {
      params: { date: date }
    });
  }
  getTotalCheckinToday(date: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/check-in`, {
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
  getAppointmentsByDoctor(userId: number): Observable<any[]> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.get<any[]>(`${this.apiUrl}/by-doctor`, { params });
  }

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
  // Method to get appointments by slot
  getAppointmentsBySlot(doctorId: number, date: string, time: string): Observable<any> {
    const params = new HttpParams()
      .set('doctorId', doctorId.toString())
      .set('date', date)
      .set('time', time);

    return this.http.get<any>(`${this.apiUrl}/slotsbyappointments`, { params });
  }
  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }
  sendEmail(to: string | string[], status: string, appointmentDetails: any, recipientType: any): Observable<any> {
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
  sendEmailHealthCheckup(to: string | string[], status: string, appointmentDetails: any): Observable<any> {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    const emailRequest = {
      to: recipients,
      status,
      appointmentDetails,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http.post<any>(`${environment.apiUrl}/email/send-email-service`, emailRequest, { headers });
  }
  sendMailtoApprover(to: string | string[], patientName: string, pdfLink: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/email/send-approver-email`, { to, patientName, pdfLink });
  }
  getNotifications(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/appointments/notifications`);
  }
  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/notifications/${notificationId}`);
  }
  getNotificationsByRole(params: { userId: string; isReceptionist: boolean }): Observable<any[]> {
    const { userId, isReceptionist } = params;
    return this.http.get<any[]>(`${this.apiUrl}/notifications`, {
      params: { userId, isReceptionist: String(isReceptionist) },
    });
  }

  // Method to send WhatsApp message
  sendWhatsAppMessage(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/whatsapp/send`, data);
  }
  sendSmsMessage(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/sms/send-sms`, data);
  }
  individualComplete(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/whatsapp/mark-complete`, data);
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
  getAllPatients(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/patients`);
  }
  getDetailsByPRN(prnNumber: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/patients/get-details-by-prn`, { prnNumber });
  }
  updatePatientByPRN(prn: string, data: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/patients/${prn}`, data);
  }
  checkedinAppointment(appointmentId: number, username: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${appointmentId}/checkin`, { username });
  }
  deleteAppointment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
  // createEstimation(doctorId:number, departmentId:number, estimation:string): Observable<any>{
  //   return this.http.post(`${environment.apiUrl}/estimation`, {doctorId, departmentId, estimation});
  // }
  sendAdminMessage(doctorName: string, departmentName:string, startDate: string, endDate: string, adminPhoneNumber: string[]): Observable<any> {
    return this.http.post(`${environment.apiUrl}/whatsapp/send-admin-message`, { doctorName,departmentName, startDate, endDate, adminPhoneNumber });
  }
  updateExtraWaitingTime(appointmentId: number, waitingTime: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${appointmentId}/waitingTime`, { waitingTime });
  }
  sendWaitingTimeAlert(payload: {
    adminPhoneNumbers: string[],
    doctorPhoneNumber: string,
    noOfPatients: number,
    doctorName: string,
    waitingMultiplier: number
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/whatsapp/send-waiting-message`, payload);
  }
  lateLogin(payload: {
    doctorPhoneNumber: string,
    noOfPatients: number,
    doctorName: string,
    doctorId: number
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/whatsapp/send-doctor-remainder`, payload);
  }
  adminLateLoginDoctor(payload: {
    adminPhoneNumber: string[],
    noOfPatients: number,
    doctorName: string,
    doctorId: number
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/whatsapp/send-admin-late`, payload);
  }
  bulkUpdateAppointments(appointments: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/bulk-update`, appointments);
  }
  bulkUpdateAppointmentsForAccept(appointments: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/bulk-updates-accept`, appointments);
  }
  bulkCancel(appointments: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/bulk-cancel`, appointments);
  }
  private leaveRequestSubject = new Subject<boolean>();

  // Observable to listen for leave request popup trigger
  leaveRequest$ = this.leaveRequestSubject.asObservable();

  // Function to trigger the leave request popup
  triggerLeaveRequest() {
    this.leaveRequestSubject.next(true);
  }
  private settingsModalSubject = new Subject<boolean>();
  settingsModalState$ = this.settingsModalSubject.asObservable();

  openSettingsModal() {
    this.settingsModalSubject.next(true);
  }

  closeSettingsModal() {
    this.settingsModalSubject.next(false);
  }
  getAppointmentsByServiceId(serviceId: any, date?: string): Observable<any> {
    let apiUrl = `${this.apiUrl}/appts-by-serviceId?serviceId=${serviceId}`;
    
    if (date) {
      apiUrl += `&date=${date}`; // Append date parameter if provided
    }
  
    return this.http.get<any>(apiUrl);
  }
  createNote(noteData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}`, noteData);
  }

  // Get all doctor notes
  getAllNotes(): Observable<any> {
    return this.http.get(`${this.baseUrl}`);
  }


  createPatient(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/patients`, data);
  }
  getDoctorNoteByPRNAndDate(prn: number, date: string): Observable<any> {
    const params = new HttpParams().set('date', date);
    return this.http.get(`${this.baseUrl}/${prn}`, { params });
  }

  saveDoctorNote(prn: number, date: string, data: any): Observable<any> {
    const params = new HttpParams().set('date', date);
    return this.http.put(`${this.baseUrl}/${prn}`, data, { params });
  }
  getTodayCheckin(date: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/today-checkin`, {
      params: { date: date }
    });
  }
  updateAppointmentVitals(appointmentId: number, vitals: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${appointmentId}/vitals`, vitals);
  }
  createHistoryNote(noteData: any): Observable<any> {
    return this.http.post(`${this.historyUrl}`, noteData);
  }

  // Get all doctor notes
  getAllHistoryNotes(): Observable<any> {
    return this.http.get(`${this.historyUrl}`);
  }
  getHistoryNoteByPRNAndDate(prn: number, date: string): Observable<any> {
    const params = new HttpParams().set('date', date);
    return this.http.get(`${this.historyUrl}/${prn}`, { params });
  }

  saveHistoryNote(prn: number, date: string, data: any): Observable<any> {
    const params = new HttpParams().set('date', date);
    return this.http.put(`${this.historyUrl}/${prn}`, data, { params });
  }
  getLabTests(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/investigation/lab-tests`);
  }

  getRadiologyTests(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/investigation/radiology-tests`);
  }
  createOrder(payload: InvestigationOrderPayload): Observable<any> {
    return this.http.post(`${this.investigationUrl}/investigation-orders`, payload);
  }
  addLabTest(payload: { description: string; department: string }) {
    return this.http.post<any>(`${this.investigationUrl}/lab-tests`, payload);
  }
  
  addRadiologyTest(payload: { description: string; department: string }) {
    return this.http.post<any>(`${this.investigationUrl}/radiology-tests`, payload);
  }
  
  
}
