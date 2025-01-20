// tv.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChannelService } from '../../services/channel/channel.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { EventService } from '../../services/event.service';
import { Subscription } from 'rxjs';

import {
  trigger,
  transition,
  style,
  animate,
} from '@angular/animations';

interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  doctorId: number;
  department: string;
  date: string;
  time: string;
  status: string;
  email: string;
  smsSent?: boolean;
  emailSent?: boolean;
  messageSent?:boolean;
  requestVia?: string; // Optional property
  created_at?: string;
  checkedIn?:boolean;
  user?: any;
  selectedSlot?: boolean;
}
@Component({
  selector: 'app-tv',
  templateUrl: './tv.component.html',
  styleUrls: ['./tv.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.3s ease-in', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('0.3s ease-out', style({ opacity: 0, transform: 'translateY(-20px)' })),
      ]),
    ]),
  ],
})

export class TvComponent implements OnInit, OnDestroy {
  currentDate: string = '';
  currentTime: string = '';
  loading: boolean = false;
  doctors: any[] = [];
  private intervalId: any;
  private eventSubscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private channelService: ChannelService,
    private appointmentService: AppointmentConfirmService ,
    private eventService: EventService
  ) {}

  ngOnInit() {
    this.updateDateTime();
    this.intervalId = setInterval(() => {
      this.updateDateTime();
    }, 60000);

    // Fetch channel ID from the URL and fetch doctors for that channel
    const channelId = this.route.snapshot.paramMap.get('channelId');
    if (channelId) {
      this.loadDoctorsForChannel(channelId);
    }
    this.eventSubscription = this.eventService.consultationEvent$.subscribe((event) => {
      this.updateAppointment(event.doctorId, event.appointmentId);
      console.log(event.appointmentId, event.doctorId)
    });
    
  }

  loadDoctorsForChannel(channelId: string) {
    this.channelService.getDoctorsByChannel(channelId).subscribe(
      (response: any) => {
        this.doctors = response.doctors;
        this.loadAppointmentsForDoctors();
      },
      (error) => {
        console.error('Error fetching doctors for channel:', error);
      }
    );
  }
  loadAppointmentsForDoctors() {
    console.log('Loading appointments for doctors...');
    const todayDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
  
    this.doctors.forEach((doctor) => {
      if (!doctor || !doctor.doctorId) {
        console.warn('Skipping doctor with missing or undefined ID:', doctor);
        return;
      }
  
      this.appointmentService.getAppointmentsByDoctor(doctor.doctorId).subscribe(
        (appointments) => {
          if (!appointments || !Array.isArray(appointments)) {
            console.warn(`No valid appointments found for doctor ${doctor.id}`);
            doctor.patients = []; // Default to empty array
            return;
          }
          const todayAppointments = appointments.filter(
            (appointment: any) =>
              appointment.checkedIn === true && appointment.date === todayDate
          );
  
          // Filter for checkedIn appointments
          todayAppointments.forEach((appointment: any, index: number) => {
            if (appointment.checkedOut === true) {
              appointment.status = ''; // No status for checked-out appointments
            } else if (index === 0) {
              appointment.status = 'PatientIn'; // First appointment is "PatientIn"
            } else if (index === 1) {
              appointment.status = 'Next'; // Second appointment is "Next"
            } else {
              appointment.status = ''; // All other appointments have no status
            }
          });
  
          // Assign updated appointments to doctor
          doctor.patients = todayAppointments;
          console.log(`Loaded ${doctor.patients.length} patients for doctor ${doctor.name}`);
        },
        (error) => {
          console.error(`Error fetching appointments for doctor ${doctor.id}:`, error);
          doctor.patients = []; // Handle error gracefully by assigning an empty array
        }
      );
    });
  }
  updateAppointment(doctorId: number, appointmentId: number): void {
    console.log("update")
    const doctor = this.doctors.find((doc) => doc.doctorId === doctorId);
    if (doctor) {
      const appointmentIndex = doctor.patients.findIndex((appt: any) => appt.id === appointmentId);
      if (appointmentIndex !== -1) {
        // Mark the appointment as checked out
        doctor.patients[appointmentIndex].checkedOut = true;
  
        // Filter out checked-out appointments
        doctor.patients = doctor.patients.filter((appt: any) => !appt.checkedOut);
        console.log(doctor.patients)
  
        // Update the status of remaining patients
        if (doctor.patients.length > 0) {
          doctor.patients[0].status = 'PatientIn';
          if (doctor.patients.length > 1) {
            doctor.patients[1].status = 'Next';
          }
        }
      }
    }
    this.removeCheckedOutPatients(doctor)
  }
  

  updateDateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    };
    this.currentDate = new Intl.DateTimeFormat('en-US', options).format(now);

    this.currentTime = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: true,
    }).format(now);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
  isFourDoctors(): boolean {
    return this.doctors.length === 4;
  }
  removeCheckedOutPatients(doctor: any) {
    doctor.patients = doctor.patients.filter((appointment: any) => !appointment.checkedOut);
    this.updateAppointmentStatuses(doctor);
  }
  
  // Update statuses after removing a row
  updateAppointmentStatuses(doctor: any) {
    doctor.patients.forEach((appointment: any, index: number) => {
      if (index === 0) {
        appointment.status = 'PatientIn';
      } else if (index === 1) {
        appointment.status = 'Next';
      } else {
        appointment.status = '';
      }
    });
  }
  markCheckedOut(patient: any, doctor: any) {
    patient.checkedOut = true;
    this.removeCheckedOutPatients(doctor);
  }

  trackByFn(index: number, item: any): number {
    return item.id; // Use a unique identifier for tracking
  }
}
