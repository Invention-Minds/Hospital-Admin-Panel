// tv.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChannelService } from '../../services/channel/channel.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
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
  messageSent?: boolean;
  requestVia?: string; // Optional property
  created_at?: string;
  checkedIn?: boolean;
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
  today: string = ''
  doctors: any[] = [];
  private intervalId: any;
  private anotherIntervalId: any;
  private eventSubscription!: Subscription;
  todayFullAppointments: any[] = []

  constructor(
    private route: ActivatedRoute,
    private channelService: ChannelService,
    private appointmentService: AppointmentConfirmService,
    private eventService: EventService,
    private doctorService: DoctorServiceService,
  ) { }

  ngOnInit() {
    this.updateDateTime();
    this.intervalId = setInterval(() => {
      this.updateDateTime();
    }, 60000);

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;

    // Fetch channel ID from the URL and fetch doctors for that channel
    const channelId = this.route.snapshot.paramMap.get('channelId');
    if (channelId) {
      this.loadDoctorsForChannel(channelId);
      // this.anotherIntervalId = setInterval(() => {
      //   this.loadAppointmentsForDoctors();
      // }, 30000);
      // console.log(this.loadDoctorsForChannel(channelId))
      // console.log(channelId)
    }
    this.eventSubscription = this.eventService.consultationEvent$.subscribe((event) => {
      // console.log(event.doctorId, event.appointmentId, event.channelId, channelId)
      if (event.channelId === Number(channelId)) {
        this.updateAppointment(event.doctorId, event.appointmentId);
      }
    });

  }



  loadDoctorsForChannel(channelId: string) {
    this.channelService.getDoctorsByChannel(channelId).subscribe(
      (response: any) => {
        this.doctors = response.doctors;
        // console.log(this.doctors)
        this.doctors.forEach(doctor => {
          this.loadDoctorDetails(doctor)
        })
        // this.loadDoctorDetails(this.doctors)
        this.loadAppointmentsForDoctors();
      },
      (error) => {
        console.error('Error fetching doctors for channel:', error);
      }
    );
  }
  loadDoctorDetails(doctor: any): void {
    const today = new Date()
    // this.doctorService.getDoctorById(doctor.doctorId).subscribe((doctorDetails) => {
    //   if (doctorDetails && doctorDetails.availability) {
    //     // Step 1: Check if all `updatedAt` fields are null
    //     const allUpdatedAtNull = doctorDetails.availability.every((avail: any) => !avail.updatedAt);

    //     // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
    //     let latestTimestamp: string | null = null;
    //     if (!allUpdatedAtNull) {
    //       const maxTimestamp = doctorDetails.availability
    //         .filter((avail: any) => avail.updatedAt) // Filter entries with non-null `updatedAt`
    //         .map((avail: any) => new Date(avail.updatedAt).getTime()) // Convert to timestamp
    //         .reduce((max, curr) => Math.max(max, curr), 0); // Find the max timestamp

    //       // Convert the max timestamp back to an ISO string
    //       latestTimestamp = new Date(maxTimestamp).toISOString();
    //     }

    //     // Step 3: Filter availability data based on the latest timestamp
    //     const latestAvailability = allUpdatedAtNull
    //       ? doctorDetails.availability // If all are null, consider all availability as the latest
    //       : doctorDetails.availability.filter((avail: any) => avail.updatedAt === latestTimestamp);

    //     // console.log(latestAvailability)

    //     const dayOfWeek = today.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
    //     // console.log(dayOfWeek);
    //     const availableDay = latestAvailability?.find(avail => avail.day.toLowerCase() === dayOfWeek);

    //     if (availableDay?.availableFrom) {
    //       // Split the availableFrom string into "start" and "end" times
    //       const [availableFromStr, availableToStr] = availableDay.availableFrom.split('-');
    //       console.log(availableFromStr, availableToStr)

    //       // Parse the start and end times
    //       const availableFrom = this.parseTime(availableFromStr.trim());
    //       const availableTo = this.parseTime(availableToStr.trim());

    //       const currentTime = new Date();

    //       // Check if the current time is within the available slot
    //       if (currentTime >= availableFrom && currentTime <= availableTo) {
    //         // Calculate remaining time in minutes
    //         const remainingTimeMinutes = Math.floor((availableTo.getTime() - currentTime.getTime()) / (1000 * 60));
    //         doctor.remainingTime = `${remainingTimeMinutes} mins`;
    //       } else {
    //         // If not within the slot, set remaining time to 0
    //         doctor.remainingTime = `Slot not active`;
    //       }
    //     } else {
    //       doctor.remainingTime = 'No Availability';
    //     }
    //     this.doctorService.getExtraSlots(doctor.doctorId, this.today).subscribe(
    //       (extraSlots: { date: string; time: string }[]) => {
    //         // Parse extra slots times
    //         const extraSlotTimes = extraSlots.map(slot => this.parseTime(slot.time));

    //         // Calculate the duration of each extra slot based on the slot duration
    //         const slotDuration = doctor.slotDuration; // Assuming each slot is 20 minutes
    //         const extraMinutes = extraSlotTimes.length * slotDuration;
    //         doctor.remainingTime = remainingTimeMinutes + extraMinutes
    //       })


    //     // Step 4: Update the doctor's time based on the latest availability
    //     const latestAvailableFrom = availableDay?.availableFrom || 'N/A'

    //     // Assign the `availableFrom` time back to the doctor object
    //     doctor.time = latestAvailableFrom;

    //     // console.log(`Updated Doctor Time for ${doctor.name}: ${doctor.time}`);
    //   }
    // });
    this.doctorService.getDoctorById(doctor.doctorId).subscribe((doctorDetails) => {
      if (doctorDetails && doctorDetails.availability) {
        // Step 1: Check if all `updatedAt` fields are null
        const allUpdatedAtNull = doctorDetails.availability.every((avail: any) => !avail.updatedAt);
    
        // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
        let latestTimestamp: string | null = null;
        if (!allUpdatedAtNull) {
          const maxTimestamp = doctorDetails.availability
            .filter((avail: any) => avail.updatedAt) // Filter entries with non-null `updatedAt`
            .map((avail: any) => new Date(avail.updatedAt).getTime()) // Convert to timestamp
            .reduce((max, curr) => Math.max(max, curr), 0); // Find the max timestamp
    
          // Convert the max timestamp back to an ISO string
          latestTimestamp = new Date(maxTimestamp).toISOString();
        }
    
        // Step 3: Filter availability data based on the latest timestamp
        const latestAvailability = allUpdatedAtNull
          ? doctorDetails.availability // If all are null, consider all availability as the latest
          : doctorDetails.availability.filter((avail: any) => avail.updatedAt === latestTimestamp);
    
        const dayOfWeek = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
        const availableDay = latestAvailability?.find(avail => avail.day.toLowerCase() === dayOfWeek);
    
        let remainingTimeMinutes = 0;
    
        if (availableDay?.availableFrom) {
          // Split the availableFrom string into "start" and "end" times
          const [availableFromStr, availableToStr] = availableDay.availableFrom.split('-');
    
          // Parse the start and end times
          const availableFrom = this.parseTime(availableFromStr.trim());
          const availableTo = this.parseTime(availableToStr.trim());
    
          const currentTime = new Date();
    
          // Check if the current time is within the available slot
          if (currentTime >= availableFrom && currentTime <= availableTo) {
            // Calculate remaining time in minutes
            remainingTimeMinutes = Math.floor((availableTo.getTime() - currentTime.getTime()) / (1000 * 60));
          }
        }
    
        // Get extra slots
        this.doctorService.getExtraSlots(doctor.doctorId, this.today).subscribe(
          (extraSlots: { date: string; time: string }[]) => {
            // Parse extra slots times
            const extraSlotTimes = extraSlots.map(slot => this.parseTime(slot.time));
    
            // Calculate the duration of each extra slot based on the slot duration
            const slotDuration = doctorDetails.slotDuration || 20; // Default to 20 minutes if not defined
            const extraMinutes = extraSlotTimes.length * slotDuration;
    
            // Add extra minutes to the remaining time
            const totalRemainingTime = remainingTimeMinutes + extraMinutes;
    
            // Update the doctor's remaining time
            doctor.remainingTime = totalRemainingTime > 0 ? `${totalRemainingTime} mins` : 'No active slots';
    
            console.log(
              `Doctor ${doctor.name} has ${extraSlotTimes.length} extra slots. Total remaining time: ${doctor.remainingTime}`
            );
          },
          (error) => {
            console.error(`Error fetching extra slots for doctor ${doctor.doctorId}:`, error);
            doctor.remainingTime = 'No Availability'; // Handle errors gracefully
          }
        );
    
        // Step 4: Update the doctor's availableFrom time based on the latest availability
        const latestAvailableFrom = availableDay?.availableFrom || 'N/A';
        doctor.time = latestAvailableFrom;
    
        console.log(`Updated Doctor Time for ${doctor.name}: ${doctor.time}`);
      } else {
        doctor.remainingTime = 'No Availability';
      }
    });
    
  }
  parseTime(timeStr: string): Date {
    const [time, modifier] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    const date = new Date();
    date.setHours(modifier === 'PM' && hours !== 12 ? hours + 12 : hours);
    date.setMinutes(minutes);
    date.setSeconds(0);

    return date;
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
          todayAppointments.sort((a, b) => {
            const timeA = this.parseTimeToMinutes(a.time);
            const timeB = this.parseTimeToMinutes(b.time);
            return timeA - timeB; // Ascending order
          });
          // console.log(todayAppointments)
          // todayAppointments.forEach((appointment: any) => {
          //   if (appointment.checkedOut) {
          //     this.updateAppointment(doctor.doctorId, appointment.id);
          //   }
          // });
          this.todayFullAppointments = appointments.filter(
            (appointment: any) =>
              appointment.checkedIn === true && appointment.date === todayDate
          );
          // Filter for checkedIn appointments
          // todayAppointments.forEach((appointment: any, index: number) => {
          //   if (appointment.checkedOut === true) {
          //     appointment.status = ''; // No status for checked-out appointments
          //   } else if (index === 0) {
          //     appointment.status = 'PatientIn'; // First appointment is "PatientIn"
          //   } else if (index === 1) {
          //     appointment.status = 'Next'; // Second appointment is "Next"
          //   } else {
          //     appointment.status = ''; // All other appointments have no status
          //   }
          // });
          this.updateAppointmentStatuses(todayAppointments.filter((appt: any) => appt.endConsultation === null));



          // Assign updated appointments to doctor
          doctor.patients = todayAppointments;
          console.log(doctor.patients)
          console.log(`Loaded ${doctor.patients.length} patients for doctor ${doctor.name}`);
        },
        (error) => {
          console.error(`Error fetching appointments for doctor ${doctor.id}:`, error);
          doctor.patients = []; // Handle error gracefully by assigning an empty array
        }
      );
    });
  }

  parseTimeToMinutes(time: string): number {
    const [hours, minutesPart] = time.split(':');
    const minutes = parseInt(minutesPart.slice(0, 2), 10); // Extract the numeric minutes
    const isPM = time.toLowerCase().includes('pm');

    let hoursInMinutes = parseInt(hours, 10) * 60;
    if (isPM && parseInt(hours, 10) !== 12) {
      hoursInMinutes += 12 * 60; // Add 12 hours for PM times
    } else if (!isPM && parseInt(hours, 10) === 12) {
      hoursInMinutes -= 12 * 60; // Subtract 12 hours for 12 AM
    }

    return hoursInMinutes + minutes;
  }



  updateAppointment(doctorId: number, appointmentId: number): void {
    // console.log("update")
    const doctor = this.doctors.find((doc) => doc.doctorId === doctorId);
    if (doctor) {
      const appointmentIndex = doctor.patients.findIndex((appt: any) => appt.id === appointmentId);
      if (appointmentIndex !== -1) {
        // Mark the appointment as checked out
        doctor.patients[appointmentIndex].checkedOut = true;

        // Filter out checked-out appointments
        doctor.patients = doctor.patients.filter((appt: any) => !appt.checkedOut);
        // console.log(doctor.patients)

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
    // if (this.anotherIntervalId) {
    //   clearImmediate(this.anotherIntervalId)
    // }
  }
  isFourDoctors(): boolean {
    return this.doctors.length === 4;
  }
  isTwoDoctors(): boolean {
    return this.doctors.length === 2;
  }
  removeCheckedOutPatients(doctor: any) {
    doctor.patients = doctor.patients.filter((appointment: any) => !appointment.checkedOut);
    this.updateAppointmentStatuses(doctor);
  }



  updateAppointmentStatuses(appointments: any[]): void {
    let patientInFound = false; // Flag to track if "PatientIn" is found

    appointments.forEach((appointment: any) => {
      // If appointment is not checked out, mark as Default

      // If "PatientIn" has not been found, mark the first matching appointment as "PatientIn"
      if (!patientInFound && appointment.checkedOut === true && appointment.endConsultation === null) {
        appointment.status = 'PatientIn';
        appointment.time = 'PatientIn';
        patientInFound = true; // Mark that "PatientIn" is found
        return;
      }
      if (appointment.checkedOut === true && appointment.endConsultation === true) {
        patientInFound = true;
        return;
      }
      console.log(patientInFound)
      // If "PatientIn" is already found, the next appointment becomes "Next"
      if (patientInFound && appointment.checkedOut === false) {
        appointment.status = 'Next';
        appointment.time = 'Next';
        patientInFound = false; // Reset the flag, as "Next" can only be assigned once
        return;
      }
      if (appointment.checkedOut !== true) {
        appointment.status = 'Default';
        return;
      }

      // Mark all remaining appointments as "Default"
      appointment.status = 'Default';
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
