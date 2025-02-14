// tv.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
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
  messageStopForDoctor :any[] = [];
  adminAlertSentForDoctor: any[] = []

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
    this.intervalId = setInterval(() => {
      this.updateDateTime();
    }, 60000);
    this.startAutoUpdate()
    this.checkDoctorAvailability(); // Check patient delays
  
    setInterval(() => {
      this.checkDoctorAvailability();
    }, 300000); // Run every 5 minutes

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
  
  }

  checkDoctorAvailability() {
    const todayDate = new Date().toLocaleDateString('en-CA')
    const notificationSent = new Map();
  
    this.doctorService.getAllDoctors().subscribe((doctors) => {
      doctors.forEach((doctor: any) => {
        if (!doctor || !doctor.availability || doctor.userId === null) {
          return; // Skip if doctor data is missing or userId is null
        }
        const isUnavailableToday = (doctor.unavailableDates || []).some((unavailableDate: any) => {
          const formattedUnavailableDate = new Date(unavailableDate.date).toISOString().split('T')[0];
          return formattedUnavailableDate === todayDate;  // Compare with today's date
        });
  
        if (isUnavailableToday) {
          console.warn(`🚫 Dr. ${doctor.name} is unavailable today.`);
          return; // Skip if doctor is unavailable today
        }
        const allUpdatedAtNull = doctor.availability.every((avail: any) => !avail.updatedAt);

        // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
        let latestTimestamp: string | null = null;
        if (!allUpdatedAtNull) {
          const maxTimestamp = doctor.availability
            .filter((avail: any) => avail.updatedAt) // Filter entries with non-null `updatedAt`
            .map((avail: any) => new Date(avail.updatedAt).getTime()) // Convert to timestamp
            .reduce((max: any, curr: any) => Math.max(max, curr), 0); // Find the max timestamp

          // Convert the max timestamp back to an ISO string
          latestTimestamp = new Date(maxTimestamp).toISOString();
        }

        // Step 3: Filter availability data based on the latest timestamp
        const latestAvailability = allUpdatedAtNull
          ? doctor.availability // If all are null, consider all availability as the latest
          : doctor.availability.filter((avail: any) => avail.updatedAt === latestTimestamp);
        // Step 1: Find today's availability
        const today = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
        const todayAvailability = latestAvailability.find((avail: any) => avail.day.toLowerCase() === today);
  
        if (!todayAvailability || !todayAvailability.availableFrom) {
          console.warn(`🛑 Dr. ${doctor.name} is not available today.`);
          return; // Skip if doctor is not available today
        }
        console.log(doctor)
  
        // Step 2: Extract the first available time
        const firstSlot = todayAvailability.availableFrom.split(',')[0].trim(); // Take first time slot
        const firstAvailableTime = firstSlot.split('-')[0].trim(); // Extract first start time
        const availableTime = this.parseTime(firstAvailableTime); // Convert to Date object

        this.appointmentService.getAppointmentsByDoctor(doctor.id).subscribe(
          (appointments) => {
            if (!appointments || !Array.isArray(appointments)) {
              console.warn(`No valid appointments found for doctor ${doctor.id}`);
              return;
            }
    
            const todayAppointments = appointments.filter(
              (appointment: any) =>
                appointment.checkedIn === true && 
                appointment.date === todayDate && 
                appointment.status === 'confirmed' 
            );
    
            if (todayAppointments.length > 0) {
              this.authService.getUserDetails(doctor.userId).subscribe((user) => {
                console.log('user')
                if (user) {
                  const { loggedInDate, loggedInTime } = user.user;
                  console.log(user)
                  
                  if (loggedInDate === todayDate) {
                    console.log(`✅ Dr. ${doctor.name} has already logged in today.`);
                    return; // Doctor has logged in today, no need to send notification
                  }
                  const firstSlot = todayAvailability.availableFrom.split(',')[0].trim(); // Take first time slot
                  const firstAvailableTime = firstSlot.split('-')[0].trim(); // Extract first start time
                  const availableTime = this.parseTime(firstAvailableTime); // Convert to Date object
        
                  // Step 4: Calculate notification trigger time (5 mins before shift)
                  const notificationTime = new Date(availableTime.getTime() - 5 * 60000); // 5 minutes before availableTime
                  const now = new Date();
                  console.log(doctor.id)
                  console.log(this.messageStopForDoctor)
                  console.log(notificationTime, now)
        
                  if (now >= notificationTime && now < availableTime && !this.messageStopForDoctor.includes(doctor.id)) {
      
                    console.warn(`🚨 Dr. ${doctor.name} has not logged in before their shift at ${firstAvailableTime}! Sending alert...`);
                    notificationSent.set(doctor.userId, true);
        
                    // Step 5: Send one-time notification to the doctor
                    this.appointmentService
                      .lateLogin({
                        doctorPhoneNumber: doctor.phone_number,
                        doctorName: doctor.name,
                        noOfPatients: todayAppointments.length,
                        doctorId: doctor.id
                      })
                      .subscribe(
                        (response) => {
                          console.log(`✅ Reminder sent to Dr. ${doctor.name}`);
                        },
                        (error) => {
                          console.error(`❌ Error sending reminder to Dr. ${doctor.name}:`, error);
                        }
                      );
                      this.messageStopForDoctor.push(doctor.id); 
                  }
                }
              });
              const firstAppointment = todayAppointments[0];
    
              // Get doctor's available time
            // Split by ',' in case of multiple slots
            const firstSlot =todayAvailability.availableFrom.split(',')[0].trim(); // Take the first slot and remove extra spaces
              const firstAvailableTime = firstSlot.split('-')[0].trim(); // Extract the first time before '-'
              const availableTime = this.parseTime(firstAvailableTime);
              
              const thresholdTime = new Date(availableTime.getTime() + 10 * 60000); // +10 minutes
              console.log(doctor.id)
              const now = new Date();
              console.log(now, thresholdTime, firstAppointment, this.adminAlertSentForDoctor)
    
              if (!firstAppointment.checkedOut && now > thresholdTime && !this.adminAlertSentForDoctor.includes(doctor.id) ) {
                console.warn(`⏳ Alert: First checked-in patient for Dr. ${doctor.name} has exceeded waiting time!`);
    
                // Send message to admin
                const adminPhoneNumbers = "919342287945";
                this.appointmentService
                .adminLateLoginDoctor({
                  adminPhoneNumber: adminPhoneNumbers,
                  doctorName: doctor.name,
                  noOfPatients: todayAppointments.length,
                  doctorId: doctor.id
                })
                .subscribe(
                  (response) => {
                    console.log(`✅ Reminder sent to Dr. ${doctor.name}`);
                  },
                  (error) => {
                    console.error(`❌ Error sending reminder to Dr. ${doctor.name}:`, error);
                  }
                );
                // this.adminAlertSentForDoctor.push(doctor.id)
              }
            }
          },
          (error) => {
            console.error(`Error fetching appointments for doctor ${doctor.doctorId}:`, error);
          }
        );
        // Step 3: Check if the doctor has logged in today


      });
    });
  

  }
  

  // checkDoctorLogin() {
  //   const todayDate = new Date().toLocaleDateString('en-CA')
  //   const notificationSent = new Map();
  
  //   this.doctorService.getAllDoctors().subscribe((doctors) => {
  //     doctors.forEach((doctor: any) => {
  //       if (!doctor || !doctor.availability || doctor.userId === null) {
  //         return; // Skip if doctor data is missing or userId is null
  //       }
  //       const isUnavailableToday = (doctor.unavailableDates || []).some((unavailableDate: any) => {
  //         const formattedUnavailableDate = new Date(unavailableDate.date).toISOString().split('T')[0];
  //         return formattedUnavailableDate === todayDate;  // Compare with today's date
  //       });
  
  //       if (isUnavailableToday) {
  //         console.warn(`🚫 Dr. ${doctor.name} is unavailable today.`);
  //         return; // Skip if doctor is unavailable today
  //       }
  //       const allUpdatedAtNull = doctor.availability.every((avail: any) => !avail.updatedAt);

  //       // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
  //       let latestTimestamp: string | null = null;
  //       if (!allUpdatedAtNull) {
  //         const maxTimestamp = doctor.availability
  //           .filter((avail: any) => avail.updatedAt) // Filter entries with non-null `updatedAt`
  //           .map((avail: any) => new Date(avail.updatedAt).getTime()) // Convert to timestamp
  //           .reduce((max: any, curr: any) => Math.max(max, curr), 0); // Find the max timestamp

  //         // Convert the max timestamp back to an ISO string
  //         latestTimestamp = new Date(maxTimestamp).toISOString();
  //       }

  //       // Step 3: Filter availability data based on the latest timestamp
  //       const latestAvailability = allUpdatedAtNull
  //         ? doctor.availability // If all are null, consider all availability as the latest
  //         : doctor.availability.filter((avail: any) => avail.updatedAt === latestTimestamp);
  //       // Step 1: Find today's availability
  //       const today = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
  //       const todayAvailability = latestAvailability.find((avail: any) => avail.day.toLowerCase() === today);
  
  //       if (!todayAvailability || !todayAvailability.availableFrom) {
  //         console.warn(`🛑 Dr. ${doctor.name} is not available today.`);
  //         return; // Skip if doctor is not available today
  //       }
  //       console.log(doctor)
  
  //       // Step 2: Extract the first available time
  //       const firstSlot = todayAvailability.availableFrom.split(',')[0].trim(); // Take first time slot
  //       const firstAvailableTime = firstSlot.split('-')[0].trim(); // Extract first start time
  //       const availableTime = this.parseTime(firstAvailableTime); // Convert to Date object
  
  //       // Step 3: Check if the doctor has logged in today
  //       this.authService.getUserDetails(doctor.userId).subscribe((user) => {
  //         if (user) {
  //           const { loggedInDate, loggedInTime } = user;
            
  //           if (loggedInDate === todayDate) {
  //             console.log(`✅ Dr. ${doctor.name} has already logged in today.`);
  //             return; // Doctor has logged in today, no need to send notification
  //           }
  
  //           // Step 4: Calculate notification trigger time (5 mins before shift)
  //           const notificationTime = new Date(availableTime.getTime() - 5 * 60000); // 5 minutes before availableTime
  //           const now = new Date();
  
  //           if (now >= notificationTime && now < availableTime) {

  //             console.warn(`🚨 Dr. ${doctor.name} has not logged in before their shift at ${firstAvailableTime}! Sending alert...`);
  //             notificationSent.set(doctor.userId, true);
  
  //             // Step 5: Send one-time notification to the doctor
  //             this.appointmentService
  //               .lateLogin({
  //                 doctorPhoneNumber: doctor.phoneNumber,
  //                 doctorName: doctor.name,
  //                 noOfPatients: 3
  //               })
  //               .subscribe(
  //                 (response) => {
  //                   console.log(`✅ Reminder sent to Dr. ${doctor.name}`);
  //                 },
  //                 (error) => {
  //                   console.error(`❌ Error sending reminder to Dr. ${doctor.name}:`, error);
  //                 }
  //               );
  //           }
  //         }
  //       });
  //     });
  //   });
  // }
  
  
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
        doctor.image = 'sunil.svg'

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

          const todayAppointments = appointments.filter(
            (appointment: any) =>
              appointment.checkedIn === true && appointment.date === todayDate && appointment.status === 'confirmed'

          );
          this.checkedInAppointments = todayAppointments
          todayAppointments.forEach(appointments =>{
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
          console.log(this.todayFullAppointments,todayDate)
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

    // Step 1: Filter all pending appointments
    const pendingAppointments = this.checkedInAppointments.filter(
      (appt: any) =>  appt.checkedIn === true
    );
    
    // Step 2: Group pending appointments by doctor
    const appointmentsByDoctor = pendingAppointments.reduce((acc: any, appointment: any) => {
      const doctorId = appointment.doctorId;
    
      if (!acc[doctorId]) {
        acc[doctorId] = {
          doctorName: appointment.doctorName,
          doctorPhoneNumber: appointment.doctor.phone_number,
          appointments: [],
          slotDuration: appointment.doctor.slotDuration
        };
      }
    
      acc[doctorId].appointments.push(appointment);
      return acc;
    }, {});
    console.log(appointmentsByDoctor)
    
    // Step 3: Loop through each doctor's appointments
    Object.values(appointmentsByDoctor).forEach((doctorData: any) => {
      const { doctorName, doctorPhoneNumber, appointments, slotDuration } = doctorData;
      console.log(appointments)
      const averageWaitingTime = slotDuration;
    
      // Find the currently checked-in patient who hasn't checked out yet
      const patientInAppointment = appointments.find(
        (appt: any) => appt.checkedOut === true && appt.endConsultationTime === null
      );
      const completeAppointment = pendingAppointments.filter(
        (appt:any) => appt.checkedOut === true
      )
    
      console.log(patientInAppointment)
      if (patientInAppointment) {
        setTimeout(() => {
          const scheduledTime = parseTimeToDate(patientInAppointment.scheduledTime);
    
          if (scheduledTime) {
            const elapsedTime = new Date().getTime() - scheduledTime.getTime();
            const elapsedMinutes = Math.floor(elapsedTime / 60000);
            console.log(scheduledTime, elapsedMinutes, elapsedTime)
            const extraThreshold = slotDuration + 10; // Slot duration + 10 mins
            const waitingMultiplier = Math.floor((elapsedMinutes - extraThreshold) / 5) + 1;

            if (elapsedMinutes >= extraThreshold && (elapsedMinutes - extraThreshold) % 5 === 0) {
              console.warn(
                `⏳ Alert: Patient ${patientInAppointment.patientName} under Dr. ${doctorName} has exceeded waiting time by ${
                  elapsedMinutes - averageWaitingTime
                } mins!`
              );
              
              // const waitingMultiplier = Math.ceil((elapsedMinutes - extraThreshold) / slotDuration);
              console.log(`Waiting Multiplier: ${waitingMultiplier}`);
              // Step 4: Find the next appointment for the doctor
              const nextAppointment = this.checkedInAppointments.find(
                (appt: any) => appt.status === "Next" && appt.doctorId === patientInAppointment.doctorId
              );
              console.log(nextAppointment)
    
              if (nextAppointment) {
                nextAppointment.extraWaitingTime = elapsedMinutes - extraThreshold;
                const extraWaitingTime = nextAppointment.extraWaitingTime;
    
                // Step 5: Update extra waiting time in DB
                this.appointmentService.updateExtraWaitingTime(nextAppointment.id, extraWaitingTime).subscribe(
                  (response: any) => {
                    console.log("Waiting time updated successfully", response);
                  },
                  (error) => {
                    console.error("Error updating waiting time:", error);
                  }
                );
    
                // Step 6: Send WhatsApp notifications to Admins & Doctor
                const adminPhoneNumbers = ["919342287945", "919698669181", "917708059010"]; // Admin List
                let noOfPatients = pendingAppointments.length - completeAppointment.length; // Pending appointments for this doctor
                noOfPatients = Math.max(noOfPatients, 0);
                const adminsToSend = Array.isArray(adminPhoneNumbers) 
                ? adminPhoneNumbers.slice(0, waitingMultiplier) 
                : [];

                this.appointmentService
                  .sendWaitingTimeAlert({
                    adminPhoneNumbers: adminsToSend,
                    doctorPhoneNumber: doctorPhoneNumber,
                    noOfPatients: noOfPatients,
                    doctorName: doctorName,
                    waitingMultiplier,
                  })
                  .subscribe(
                    (response) => {
                      console.log(`✅ WhatsApp message sent to Dr. ${doctorName}`, response);
                    },
                    (error) => {
                      console.error(`❌ Error sending message to Dr. ${doctorName}:`, error);
                    }
                  );
                
              }
            }
          }
        }, 1000);
      }
    });
    

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
      // If "PatientIn" has not been found, mark the first matching appointment as "PatientIn"
      if (!patientInFound && appointment.checkedOut === true && appointment.endConsultation === null) {
        appointment.status = 'PatientIn';
        appointment.scheduledTime = appointment.time
        appointment.time = 'PatientIn';
        patientInFound = true; // Mark that "PatientIn" is found
        return;
      }
      // if (appointment.checkedOut === true && appointment.endConsultation === true) {
      //   patientInFound = true;
      //   return;
      // }
      console.log(patientInFound)
      if (appointment.postPond === true) {
        appointment.status = 'Pending'
        appointment.time = 'Pending'
        return
      }

      if (
        latestCheckedOutAppointment &&
        !nextAppointmentFound &&
        patientInFound
      ) {
        appointment.status = "Next";
        appointment.time = "Next";
        nextAppointmentFound = true; // Ensure only one gets marked as "Next"
        return;
      }
      // If "PatientIn" is already found, the next appointment becomes "Next"
      if (
        latestEndConsultationAppointment && // Check if the appointment exists
        latestEndConsultationAppointment.endConsultationTime && // Check if endConsultationTime exists
        appointment.checkedOut === false &&
        appointment.time === formatTime(new Date(latestEndConsultationAppointment.endConsultationTime))
      ) {
        // If the appointment time matches the latest end consultation time and it's not checked out
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
}
