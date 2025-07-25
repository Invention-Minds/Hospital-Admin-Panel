// tv.component.ts
import { Component, OnInit, OnDestroy,ElementRef,ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChannelService } from '../../services/channel/channel.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { EventService } from '../../services/event.service';
import { Subscription, interval } from 'rxjs';
import { environment } from '../../../environment/environment';

import {
  trigger,
  transition,
  style,
  animate,
} from '@angular/animations';
import { app } from '../../../../server';

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
  scheduledTime?: string
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
  checkedInAppointments: any[] = [];
  private updateTimeInterval!: Subscription;
  private eventSource: EventSource | null = null;
  messageStopForDoctor: any[] = [];
  adminAlertSentForDoctor: any[] = [];
  showPopup = false;
  popupImage = '/popup.jpeg'; // Set a different popup image
  popupInterval: any;
  popupMedia = '';
  isImage = true; 
  currentMediaIndex = 0;
  scrollingText = '';  // Scrolling text for marquee
  mediaFiles: { type: string, src: string }[] = [];
  ads: any[] = []
  adStatuses: { [key: string]: boolean } = {};
  existingAds: any = {}; 
  doctorSlideInterval: any;
currentSlideIndex: number = 0;
visibleDoctors: any[] = [];
doctorSlides: any[][] = [];

  @ViewChild('popupVideo') popupVideo!: ElementRef; // Reference for video tag
  constructor(
    private route: ActivatedRoute,
    private channelService: ChannelService,
    private appointmentService: AppointmentConfirmService,
    private eventService: EventService,
    private doctorService: DoctorServiceService,
    private router: Router,
    private authService: AuthServiceService
  ) { }

  ngOnInit() {
    this.updateDateTime();
    this.fetchLatestAds()
    this.startPopupRotation();

    this.intervalId = setInterval(() => {
      this.updateDateTime();
    }, 60000);
    this.startAutoUpdate()
    // this.checkDoctorAvailability(); // Check patient delays

    // setInterval(() => {
    //   this.checkDoctorAvailability();
    // }, 300000); // Run every 5 minutes

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;

    // Fetch channel ID from the URL and fetch doctors for that channel
    const channelId = this.route.snapshot.paramMap.get('channelId');
    if (channelId) {
      this.loadDoctorsForChannel(channelId);
      this.anotherIntervalId = setInterval(() => {
        this.loadAppointmentsForDoctors();
      }, 30000);
      // console.log(this.loadDoctorsForChannel(channelId))
      // console.log(channelId)
    }
    this.eventSubscription = this.eventService.consultationEvent$.subscribe((event) => {
      // console.log(event.doctorId, event.appointmentId, event.channelId, channelId)
      if (event.channelId === Number(channelId)) {
        this.updateAppointment(event.doctorId, event.appointmentId);
      }
    });
    this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);

    this.eventSource.addEventListener('channelRemoval', (event: MessageEvent) => {
      const removedChannel = JSON.parse(event.data);
      console.log('Channel Removed:', removedChannel);

      const currentRoute = this.router.url;
      console.log(currentRoute)
      if (currentRoute.includes(channelId!)) {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate([currentRoute]); // Refresh the current route
        });
      }
    });
    this.eventSource.addEventListener('messageSent', (event: MessageEvent) => {
      const doctorId = JSON.parse(event.data);
      console.log('doctorId', doctorId);

      this.messageStopForDoctor.push(doctorId)
      console.log(this.messageStopForDoctor)

    });
    this.eventSource.addEventListener('adminAlertSent', (event: MessageEvent) => {
      const doctorId = JSON.parse(event.data);
      console.log('doctorId', doctorId);

      this.adminAlertSentForDoctor.push(doctorId)
      console.log(this.adminAlertSentForDoctor)

    });
    this.eventSource.addEventListener('loadTv', (event: MessageEvent) => {
      const type = JSON.parse(event.data);
      this.fetchLatestAds()

    });

  }



  loadDoctorsForChannel(channelId: string) {
    this.channelService.getDoctorsByChannel(channelId).subscribe(
      (response: any) => {
        this.doctors = response.doctors;
        // console.log(this.doctors)
        this.doctors.forEach(doctor => {
          const updateTimeInterval = interval(60000).subscribe(() => {
            this.loadDoctorDetails(doctor);
          });
        })
        this.groupDoctorsForSlides();
        setInterval(() => {
          this.nextSlide();
        }, 15000); // every 15 seconds
        // this.loadDoctorDetails(this.doctors)
        this.loadAppointmentsForDoctors();
      },
      (error) => {
        console.error('Error fetching doctors for channel:', error);
      }
    );
  }
  startAutoUpdate() {
    this.updateTimeInterval = interval(60000).subscribe(() => {
      this.loadDoctorDetails(this.doctors);
    });
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
            if (totalRemainingTime >= 60) {
              const hours = Math.floor(totalRemainingTime / 60);
              const minutes = totalRemainingTime % 60;
              doctor.remainingTime = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
            } else {
              doctor.remainingTime = totalRemainingTime > 0 ? `${totalRemainingTime} mins` : 'No active slots';
            }

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
        doctor.image = 'sunil.svg';
        doctor.roomNo = doctorDetails.roomNo
        console.log(doctor.roomNo)

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
    const todayDate = new Date().toLocaleDateString('en-CA')// Format as YYYY-MM-DD
    console.log(todayDate)

    this.doctors.forEach((doctor) => {
      if (!doctor || !doctor.doctorId) {
        console.warn('Skipping doctor with missing or undefined ID:', doctor);
        return;
      }
      doctor.patients = doctor.patients || [];
      this.appointmentService.getAppointmentsByDoctor(doctor.doctorId).subscribe(
        (appointments) => {
          if (!appointments || !Array.isArray(appointments)) {
            console.warn(`No valid appointments found for doctor ${doctor.id}`);
            doctor.patients = []; // Default to empty array
            return;
          }

          const todayAppointments = appointments
          this.checkedInAppointments = todayAppointments
          todayAppointments.forEach(appointments => {
            appointments.actualTime = appointments.time
          })
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
          // console.log(this.checkedInAppointments)
          this.todayFullAppointments = appointments.filter(
            (appointment: any) =>
              appointment.checkedIn === true && appointment.date === todayDate && appointment.status === 'confirmed'
          );
          console.log(this.todayFullAppointments, todayDate)
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
          doctor.patients = todayAppointments || [];

          const allConsultationsEnded = todayAppointments.every(
            (appointment: any) => appointment.endConsultation === true
          );

          if (allConsultationsEnded) {
            doctor.patients = []; // If all consultations are ended, set to empty array
          } else {
            doctor.patients = todayAppointments; // Otherwise, set to the filtered appointments
          }
          console.log(doctor.patients)
          // console.log(`Loaded ${doctor.patients.length} patients for doctor ${doctor.name}`);
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
    clearInterval(this.popupInterval);
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    // if (this.anotherIntervalId) {
    //   clearImmediate(this.anotherIntervalId)
    // }
    if (this.updateTimeInterval) {
      this.updateTimeInterval.unsubscribe(); // Stop interval when component is destroyed
    }
    if (this.eventSource) {
      this.eventSource.close(); // Clean up the connection
    }
    if (this.doctorSlideInterval) {
      clearInterval(this.doctorSlideInterval);
    }
  }
  isFourDoctors(): boolean {
    return this.doctors.length >= 4;
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
    const slotDuration = 20; // Slot duration in minutes

    // Sort appointments by `endConsultationTime` (latest first)
    const validAppointments = this.todayFullAppointments.filter(appt => appt.endConsultation);
    console.log(validAppointments)

    // Sort valid appointments by descending endConsultation time
    const sortedAppointments = [...validAppointments].sort((a, b) => {
      const endConsultationA = new Date(a.endConsultation!).getTime();
      const endConsultationB = new Date(b.endConsultation!).getTime();
      return endConsultationA - endConsultationB; // Descending order
    });

    // Find the latest endConsultation appointment
    const latestEndConsultationAppointment = sortedAppointments[sortedAppointments.length - 1] || null;
    let adjustedTime: Date | null = latestEndConsultationAppointment
      ? new Date(latestEndConsultationAppointment.endConsultationTime!)
      : null;

    // console.log(latestEndConsultationAppointment)

    // Helper function to format time as "hh:mm AM/PM"
    const formatTime = (time: Date): string => {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const period = hours >= 12 ? "PM" : "AM";
      const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");
      const formattedMinutes = minutes.toString().padStart(2, "0");
      return `${formattedHours}:${formattedMinutes} ${period}`;
    };
    // const formatTimeInIST = (time: Date): string => {
    //   const options: Intl.DateTimeFormatOptions = {
    //     hour: "2-digit",
    //     minute: "2-digit",
    //     hour12: true,
    //     timeZone: "Asia/Kolkata", // Convert to IST
    //   };
    //   return time.toLocaleString("en-US", options);
    // };

    // console.log(adjustedTime, formatTime(adjustedTime!))
    const latestCheckedOutAppointment = appointments
      .filter((appt: any) => appt.checkedOut === true)
      .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];

    const parseTimeToDate = (timeString: string | null): Date | null => {
      if (!timeString) return null;

      const match = timeString.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/);
      if (!match) {
        console.error("⚠️ Invalid scheduledTime format:", timeString);
        return null;
      }

      const [, hours, minutes, period] = match;
      const parsedDate = new Date();
      parsedDate.setHours(period === "PM" ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12);
      parsedDate.setMinutes(parseInt(minutes));
      parsedDate.setSeconds(0);
      return parsedDate;
    };
    let nextAppointmentFound = false;

  


    appointments.forEach((appointment: any) => {
      if (adjustedTime && !isNaN(adjustedTime.getTime())) {
        // Adjust the appointment time based on the latest endConsultationTime
        appointment.time = formatTime(adjustedTime);
        console.log(appointment.time)
        adjustedTime.setMinutes(adjustedTime.getMinutes() + appointment.doctor.slotDuration); // Add slot duration
      } else {
        // If no valid endConsultationTime, fallback to the original appointment time
        const originalTimeParts = appointment.time.match(/(\d+):(\d+)\s?(AM|PM)/);
        if (originalTimeParts) {
          const [_, hours, minutes, period] = originalTimeParts;
          const originalTime = new Date();
          originalTime.setHours(
            period === "PM" ? parseInt(hours) % 12 + 12 : parseInt(hours) % 12,
            parseInt(minutes),
            0,
            0
          );
          appointment.time = formatTime(originalTime);
          adjustedTime = new Date(originalTime);
          adjustedTime.setMinutes(adjustedTime.getMinutes() + appointment.doctor.slotDuration);
        } else {
          console.error("Invalid appointment time format:", appointment.time);
        }
      }
      let patientInFound = false; // Track if "PatientIn" is found
      let nextAppointmentSet = false; // Ensure only one "Next" is assigned
      let patientInIndex = -1; // Track index of "PatientIn"


      const filteredAppointments = appointments.filter(appt => !appt.endConsultation);

      // **Step 2: Sort appointments by time (earliest first)**
      const sortedAppointments = [...filteredAppointments].sort((a, b) =>
        this.parseTimeToMinutesAppt(a.time) - this.parseTimeToMinutesAppt(b.time)
      );
      const sortedTimeAppointments = [...filteredAppointments].sort((a, b) =>
        this.parseTimeToMinutesAppt(a.time) - this.parseTimeToMinutesAppt(b.time)
      );

      // **Step 3: Assign statuses (Reset all first)**
      sortedAppointments.forEach((appointment, index) => {
        appointment.status = "Default"; // Reset status

        if (appointment.checkedOut === true && !patientInFound) {
          // **Assign "PatientIn" to the first checked-out appointment**
          appointment.status = "PatientIn";
          appointment.time = "Patient-In"
          patientInFound = true;
          patientInIndex = index; // Save index of "PatientIn"
        }
        if (appointment.postPond === true) {
          console.log('postpond')
          appointment.status = 'Pending'
          appointment.time = 'Pending'
        }
      });

      // **Step 4: Select the next patient based on pending list**
      const pendingAppointments = sortedTimeAppointments.filter(
        (appt) => appt.checkedIn === true && appt.checkedOut === false
      );

      const sortedPendingAppointments = pendingAppointments.sort((a, b) =>
        this.parseTimeToMinutesAppt(a.time) - this.parseTimeToMinutesAppt(b.time)
      );

      const nextAppointment = sortedPendingAppointments.length > 0 ? sortedPendingAppointments[0] : null;
      console.log(nextAppointment)

      // **Step 5: Assign "Next" only after "PatientIn"**
      if (nextAppointment) {
        // for (let i = patientInIndex + 1; i < sortedAppointments.length; i++) {
        //     if (sortedAppointments[i].checkedOut === false) {
        //         sortedAppointments[i].status = "Next";
        //         break; // Ensure only one "Next" is assigned
        //     }
        // }
        if (nextAppointment.postPond === true) {
          nextAppointment.status = 'Pending'
          nextAppointment.time = 'Pending'
        } else {
          nextAppointment.status = "Next";
          nextAppointment.time = "Next"
        }

      }




      // Mark all remaining appointments as "Default"
      // appointment.status = 'Default';
    });
  }


  markCheckedOut(patient: any, doctor: any) {
    patient.checkedOut = true;
    this.removeCheckedOutPatients(doctor);
  }

  trackByFn(index: number, item: any): number {
    return item.id; // Use a unique identifier for tracking
  }
  parseTimeToMinutesAppt(timeString: string): number {
    const match = timeString.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/);
    if (!match) return 0;

    let [, hours, minutes, period] = match;
    let hour = parseInt(hours);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return hour * 60 + parseInt(minutes);
  }
  // startPopupRotation() {
  //   this.popupInterval = setInterval(() => {
  //     this.showPopup = true;

  //     // Hide popup after 5 seconds
  //     setTimeout(() => {
  //       this.showPopup = false;
  //     }, 5000);
  //   }, 30000); // Show popup every 30 seconds
  // }
  startPopupRotation() {
    if (this.popupInterval) {
      clearInterval(this.popupInterval);
    }
  
    this.popupInterval = setInterval(() => {
      // this.fetchLatestAds()
      if (this.mediaFiles.length === 0) return;

      const media = this.mediaFiles[this.currentMediaIndex];
      this.popupMedia = media.src;
      this.isImage = media.type === 'image';
      this.showPopup = true;

      if (this.isImage) {
        // ✅ If it's an image, hide after 5 seconds
        setTimeout(() => {
          this.showPopup = false;
        }, 10000);
      } else {
        // ✅ If it's a video, play only if allowed by the browser
        setTimeout(() => {
          if (this.popupVideo) {
            const videoElement = this.popupVideo.nativeElement;
            
            videoElement.muted = false; // ✅ Ensure the video starts muted
            videoElement.play().catch((error: any) => {
              console.error("Autoplay blocked. Waiting for user interaction:", error);
            });
          }
        }, 500);
      }

      // ✅ Move to the next media
      this.currentMediaIndex = (this.currentMediaIndex + 1) % this.mediaFiles.length;
    }, 60000);
}

// ✅ Handle Video Playback When It Becomes Ready
onVideoCanPlay() {
  if (this.popupVideo) {
    this.popupVideo.nativeElement.muted = false; // Unmute after autoplay
  }
}

  fetchLatestAds() {
    this.channelService.getAllAds().subscribe(response => {
        this.mediaFiles = []; // ✅ Clear previous ads
        this.scrollingText = ''; // ✅ Reset scrolling text

        console.log("Fetched All Ads:", response);

        // ✅ Store all ads for reference
        this.ads = response.ads;
        
        // ✅ Convert ads array into an object by type
        this.existingAds = response.ads.reduce((acc: any, ad: any) => {
            acc[ad.type] = ad;
            return acc;
        }, {});

        // ✅ Store active status of each ad type
        this.adStatuses = response.ads.reduce((acc: any, ad: any) => {
            acc[ad.type] = ad.isActive ?? false; // Default to false if null
            return acc;
        }, {});

        // ✅ Display only active text ad
        if (this.existingAds.text && this.existingAds.text.isActive) {
            this.scrollingText = this.existingAds.text.content;
            console.log(this.scrollingText)
        }

        // ✅ Display only active image/video ads
        response.ads.forEach((ad:any) => {
            // if ((ad.type === 'image' || ad.type === 'video') && ad.isActive) {
            //     this.mediaFiles.push({
            //         type: ad.type,
            //         src: ad.content
            //     });
            // }
            if (ad.type === 'image' && ad.AdvertisementMedia?.length > 0) {
              const activeMedia = ad.AdvertisementMedia.filter((media: any) => media.isActive);
              activeMedia.forEach((media: any) => {
                this.mediaFiles.push({
                  type: 'image',
                  src: media.url
                });
              });
            }
          
            if (ad.type === 'video' && ad.isActive && ad.content) {
              this.mediaFiles.push({
                type: 'video',
                src: ad.content
              });
            }
        });

        console.log("Updated Media Files:", this.mediaFiles);

        // ✅ Restart popup rotation if media ads exist
        if (this.mediaFiles.length > 0) {
            this.currentMediaIndex = 0;
            this.startPopupRotation();
        }


    });
}

slideIndex = 0;
doctorsPages: any[][] = [];



groupDoctorsForSlides() {
  const chunkSize = 3;
  const doctorsCount = this.doctors.length;

  this.doctorsPages = [];

  for (let i = 0; i < doctorsCount; i += chunkSize) {
    this.doctorsPages.push(this.doctors.slice(i, i + chunkSize));
  }
}

nextSlide() {
  this.slideIndex = (this.slideIndex + 1) % this.doctorsPages.length;
}
handleImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  target.src = '/doctor-image.jpg'; // Fallback image
}


}
