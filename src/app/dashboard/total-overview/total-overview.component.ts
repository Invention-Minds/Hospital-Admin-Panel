// // import { Component, OnInit } from '@angular/core';
// // import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
// // import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
// // import { forkJoin } from 'rxjs';
// // import { LoadingService } from '../../services/loader.service';

// // @Component({
// //   selector: 'app-total-overview',
// //   templateUrl: './total-overview.component.html',
// //   styleUrls: ['./total-overview.component.css']
// // })
// // export class TotalOverviewComponent implements OnInit {
// //   totalAppointmentsToday: number = 0;
// //   pendingRequestsToday: number = 0;
// //   availableDoctorsToday: number = 0;
// //   unavailableDoctorsToday: number = 0;
// //   absentDoctorsToday: number = 0;

// //   doctors: any[] = [];
// //   availableDoctors: any[] = [];
// //   unavailableDoctors: any[] = [];
// //   absentDoctors: any[] = [];
// //   date: string = '';
// //   showAvailableDoctors: boolean = false;
// //   showUnavailableDoctors: boolean = false;
// //   showAbsentDoctors: boolean = false;

// //   constructor(
// //     private appointmentService: AppointmentConfirmService,
// //     private doctorService: DoctorServiceService,
// //     private loadingService: LoadingService
// //   ) {}

// //   ngOnInit(): void {
// //     this.fetchStatistics();
// //     this.fetchDoctorsWithAvailability();
// //     this.setupDynamicAvailabilityCheck();
// //   }

// //   private fetchStatistics(): void {
// //     const currentDate = this.formatDate(new Date());
// //     this.date = currentDate;

// //     const totalAppointments$ = this.appointmentService.getTotalAppointmentsCountForToday(currentDate);
// //     const pendingAppointments$ = this.appointmentService.fetchPendingAppointmentsCount();

// //     forkJoin([totalAppointments$, pendingAppointments$]).subscribe(
// //       ([totalAppointments, pendingRequests]) => {
// //         this.totalAppointmentsToday = totalAppointments.count;
// //         this.pendingRequestsToday = pendingRequests;
// //       },
// //       error => {
// //         console.error('Error fetching statistics:', error);
// //       }
// //     );
// //   }
// //   closeUnavailableDoctorList(): void {
// //     this.showUnavailableDoctors = false;
// //   }
// //   closeAbsentDoctorList(): void {
// //     this.showAbsentDoctors = false;
// //   }
// //   private fetchDoctorsWithAvailability(): void {
// //     // this.loadingService.startLoading();
// //     this.doctorService.getAllDoctors().subscribe(
// //       (doctors) => {
// //         // this.loadingService.stopLoading();
// //         console.log('Doctors:', doctors);
// //         this.doctors = doctors.map((doctor) => {
// //           const unavailableSlots = doctor.unavailableSlots || [];
// //           const formattedUnavailableSlots = unavailableSlots.map(slot => slot.time) // Array of strings
        
// //           // const unavailableSlots = doctor.unavailableSlots || [];
// //           const availableDay = doctor.availability?.find((avail: any) =>
// //             avail.day.toLowerCase() ===
// //             new Date(this.date).toLocaleString('en-us', { weekday: 'short' }).toLowerCase()
// //           );

// //           if (!availableDay) {
// //             return { ...doctor, status: 'Absent' };
// //           }

// //           const status = this.calculateDoctorStatus(
// //             availableDay.availableFrom,
// //             availableDay.slotDuration,
// //             formattedUnavailableSlots
// //           );

// //           return { ...doctor, status };
// //         });

// //         this.updateDoctorCounts();
// //       },
// //       (error) => {console.error('Error fetching doctors:', error)
// //         // this.loadingService.stopLoading();
// //       }
     
// //     );
// //   }

// //   private calculateDoctorStatus(
// //     availableFrom: string,
// //     slotDuration: number,
// //     unavailableSlots: string[]
// //   ): string {
// //     const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5));
// //     const timeRanges = availableFrom.split(',').map(range => range.trim());
  
// //     for (const range of timeRanges) {
// //       const [startTime, endTime] = range.split('-').map(time => time.trim());
// //       let currentSlotTime = this.timeToMinutes(startTime);
// //       const endSlotTime = this.timeToMinutes(endTime);
  
// //       while (currentSlotTime < endSlotTime) {
// //         const slotStart = this.minutesToString(currentSlotTime);
// //         const slotEnd = this.minutesToString(currentSlotTime + slotDuration);
// //         // console.log('slotStart:', slotStart, 'slotEnd:', slotEnd, unavailableSlots);
// //         const status = this.getSlotStatus(slotStart, slotEnd, currentTime, unavailableSlots, slotDuration);
// //         // console.log('status:', status);
  
// //         if (status === 'Unavailable') {
// //           return 'Unavailable';
// //         }
  
// //         currentSlotTime += slotDuration;
// //       }
// //     }
  
// //     return 'Available';
// //   }
  

// //   private getSlotStatus(
// //     slotStart: string,
// //     slotEnd: string,
// //     currentTime: number,
// //     unavailableSlots: string[],
// //     slotDuration: number
// //   ): string {
// //     const slotStartMinutes = this.timeToMinutes(slotStart);
// //     const slotEndMinutes = this.timeToMinutes(slotEnd);
  
// //     // Check if the slot is in the future
// //     if (currentTime < slotStartMinutes) {
// //       // console.log(`Future slot: ${slotStart} - ${slotEnd}`);
// //       return 'Available'; // Future slots are available by default
// //     }
  
// //     // Check if the current time is within the slot range
// //     const isCurrent = currentTime >= slotStartMinutes && currentTime < slotEndMinutes;
  
// //     // Check if the slot overlaps with any unavailable slots
// //     const isUnavailable = unavailableSlots.some((unavailableSlot) => {
// //       const unavailableParsed = this.parseTime(unavailableSlot); // Parse '07:00 PM' to '19:00'
// //       const unavailableStartMinutes = this.timeToMinutes(unavailableParsed);
// //       const unavailableEndMinutes = unavailableStartMinutes + slotDuration;
  
// //       // console.log('unavailableSlot:', unavailableSlot, 'parsed:', unavailableParsed);
// //       // console.log('unavailableStartMinutes:', unavailableStartMinutes, 'unavailableEndMinutes:', unavailableEndMinutes);
  
// //       return (
// //         currentTime >= unavailableStartMinutes &&
// //         currentTime < unavailableEndMinutes
// //       );
// //     });
  
// //     // console.log('isUnavailable:', isUnavailable);
  
// //     // Return appropriate status
// //     if (isCurrent) {
// //       return isUnavailable ? 'Unavailable' : 'Current';
// //     }
  
// //     return isUnavailable ? 'Unavailable' : 'Available';
// //   }
  
  
  
  
  
// //   private setupDynamicAvailabilityCheck(): void {
// //     setInterval(() => {
// //       this.fetchDoctorsWithAvailability();
// //     }, 10000000000); // Check every 60 seconds
// //   }

// //   private updateDoctorCounts(): void {
// //     this.availableDoctors = this.doctors.filter(doctor => doctor.status === 'Available');
// //     this.unavailableDoctors = this.doctors.filter(doctor => doctor.status === 'Unavailable');
// //     this.absentDoctors = this.doctors.filter(doctor => doctor.status === 'Absent');

// //     this.availableDoctorsToday = this.availableDoctors.length;
// //     this.unavailableDoctorsToday = this.unavailableDoctors.length;
// //     this.absentDoctorsToday = this.absentDoctors.length;
// //   }

// //   private timeCache: { [key: string]: number } = {};

// //   private timeToMinutes(time: string): number {
// //     if (this.timeCache[time]) return this.timeCache[time];
  
// //     const [hours, minutes] = time.split(':').map(Number);
// //     const totalMinutes = hours * 60 + minutes;
// //     this.timeCache[time] = totalMinutes;
// //     return totalMinutes;
// //   }
  
// //   private parseTime(time: string): string {
// //     const [hourMin, period] = time.split(' ');
// //     let [hours, minutes] = hourMin.split(':').map(Number);
  
// //     if (period.toUpperCase() === 'PM' && hours < 12) {
// //       hours += 12;
// //     } else if (period.toUpperCase() === 'AM' && hours === 12) {
// //       hours = 0;
// //     }
  
// //     return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
// //   }
// //   // private minutesToString(minutes: number): string {
// //   //   const hrs = Math.floor(minutes / 60);
// //   //   const mins = minutes % 60;
// //   //   return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
// //   // }
// //   private timeStringCache: { [key: number]: string } = {}; // Cache for minutes-to-string conversions

// // private minutesToString(minutes: number): string {
// //   if (this.timeStringCache[minutes]) {
// //     return this.timeStringCache[minutes]; // Return cached value if available
// //   }

// //   const hrs = Math.floor(minutes / 60);
// //   const mins = minutes % 60;
// //   const formattedTime = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
// //   this.timeStringCache[minutes] = formattedTime; // Cache the result
// //   return formattedTime;
// // }


// //   private formatDate(date: Date): string {
// //     const year = date.getFullYear();
// //     const month = (date.getMonth() + 1).toString().padStart(2, '0');
// //     const day = date.getDate().toString().padStart(2, '0');
// //     return `${year}-${month}-${day}`;
// //   }

// //   toggleAvailableDoctors(): void {
// //     this.showAvailableDoctors = true;
// //     this.showUnavailableDoctors = false;
// //     this.showAbsentDoctors = false;
// //   }

// //   toggleUnavailableDoctors(): void {
// //     this.showAvailableDoctors = false;
// //     this.showUnavailableDoctors = true;
// //     this.showAbsentDoctors = false;
// //   }

// //   toggleAbsentDoctors(): void {
// //     this.showAbsentDoctors = true;
// //     this.showUnavailableDoctors = false;
// //     this.showAvailableDoctors = false;
// //   }

// //   closeDoctorList(): void {
// //     this.showAvailableDoctors = false;
// //     this.showUnavailableDoctors = false;
// //     this.showAbsentDoctors = false;
// //   }
// // }

// import { Component, OnInit } from '@angular/core';
// import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
// import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';

// @Component({
//   selector: 'app-total-overview',
//   templateUrl: './total-overview.component.html',
//   styleUrls: ['./total-overview.component.css'],
// })
// export class TotalOverviewComponent implements OnInit {
//   totalAppointmentsToday: number = 0;
//   pendingRequestsToday: number = 0;
//   availableDoctorsToday: number = 0;
//   unavailableDoctorsToday: number = 0;
//   absentDoctorsToday: number = 0;

//   doctors: any[] = [];
//   availableDoctors: any[] = [];
//   unavailableDoctors: any[] = [];
//   absentDoctors: any[] = [];
//   date: string = '';
//   showAvailableDoctors: boolean = false;
//   showUnavailableDoctors: boolean = false;
//   showAbsentDoctors: boolean = false;

//   private timeCache: { [key: string]: number } = {};
//   private timeStringCache: { [key: number]: string } = {};

//   constructor(
//     private appointmentService: AppointmentConfirmService,
//     private doctorService: DoctorServiceService
//   ) {}

//   ngOnInit(): void {
//     this.date = this.formatDate(new Date());
//     this.fetchStatistics();
//     this.fetchDoctorsWithAvailability();
//   }

//   private fetchStatistics(): void {
//     const currentDate = this.date;

//     this.appointmentService
//       .getTotalAppointmentsCountForToday(currentDate)
//       .subscribe(
//         (totalAppointments) => {
//           this.totalAppointmentsToday = totalAppointments.count;
//         },
//         (error) => {
//           console.error('Error fetching total appointments:', error);
//         }
//       );

//     this.appointmentService.fetchPendingAppointmentsCount().subscribe(
//       (pendingRequests) => {
//         this.pendingRequestsToday = pendingRequests;
//       },
//       (error) => {
//         console.error('Error fetching pending requests:', error);
//       }
//     );
//   }

//   private fetchDoctorsWithAvailability(): void {
//     this.doctorService.getAllDoctors().subscribe(
//       (doctors) => {
//         const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5)); // Current time in minutes
//         const currentDay = new Date(this.date)
//           .toLocaleString('en-us', { weekday: 'short' })
//           .toLowerCase();
//         const selectedDate = this.date;

//         // Initialize counts
//         let availableCount = 0;
//         let unavailableCount = 0;
//         let absentCount = 0;

//         this.doctors = doctors
//         .filter((doctor) => {
//           // Filter logic for Visiting Consultants
//           if (doctor.doctorType === 'Visiting Consultant') {
//             return doctor.bookedSlots && doctor.bookedSlots.length > 0; // Only include if booked slots exist
//           }
//           return true; // Include all non-visiting consultant doctors
//         })
//         .map((doctor) => {
//           const unavailableSlots = doctor.unavailableSlots || [];
//           const formattedUnavailableSlots = unavailableSlots.map((slot) => ({
//             time: slot.time,
//             duration: slot.duration || 20, // Default to 20 minutes if duration is not provided
//           }));
//           console.log('formattedUnavailableSlots:', formattedUnavailableSlots);

//           const isAbsent =
//             !doctor.availability?.some(
//               (avail: any) => avail.day.toLowerCase() === currentDay
//             ) ||
//             (doctor.unavailableDates || []).some((unavailableDate: any) => {
//               const formattedUnavailableDate = new Date(
//                 unavailableDate.date
//               ).toISOString().split('T')[0];
//               return formattedUnavailableDate === selectedDate;
//             });

//           let status: string;

//           if (isAbsent) {
//             absentCount++;
//             status = 'Absent';
//           } else if (this.isDoctorUnavailable(currentTime, formattedUnavailableSlots)) {
//             unavailableCount++;
//             status = 'Unavailable';
//           } else {
//             availableCount++;
//             status = 'Available';
//           }

//           return { ...doctor, status };
//         });

//         // Update counts
//         this.availableDoctorsToday = availableCount;
//         this.unavailableDoctorsToday = unavailableCount;
//         this.absentDoctorsToday = absentCount;

//         this.updateDoctorLists();
//       },
//       (error) => {
//         console.error('Error fetching doctors:', error);
//       }
//     );
//   }

//   private isDoctorUnavailable(
//     currentTime: number,
//     unavailableSlots: { time: string; duration: number }[]
//   ): boolean {
//     return unavailableSlots.some((slot) => {
//       const slotStartMinutes = this.timeToMinutes(slot.time);
//       const slotDuration = slot.duration || 20; // Default duration
//       const slotEndMinutes = slotStartMinutes + slotDuration;
  
//       if (isNaN(slotStartMinutes) || isNaN(slotEndMinutes)) {
//         console.error("Invalid slot timing:", slot);
//         return false;
//       }
  
//       console.log("Slot Timings:", { currentTime, slotStartMinutes, slotEndMinutes });
  
//       return currentTime >= slotStartMinutes && currentTime < slotEndMinutes;
//     });
//   }
  

//   private updateDoctorLists(): void {
//     this.availableDoctors = this.doctors.filter(
//       (doctor) => doctor.status === 'Available'
//     );
//     this.unavailableDoctors = this.doctors.filter(
//       (doctor) => doctor.status === 'Unavailable'
//     );
//     this.absentDoctors = this.doctors.filter(
//       (doctor) => doctor.status === 'Absent'
//     );
//   }
//   private timeToMinutes(time: string): number {
//     if (!time || (!time.includes(":") && !time.includes(" "))) {
//       console.error("Invalid time format:", time);
//       return NaN;
//     }
  
//     if (this.timeCache[time]) return this.timeCache[time];
  
//     // Split the time into hours, minutes, and optional AM/PM
//     const [timePart, period] = time.split(" ");
//     const [hours, minutes] = timePart.split(":").map(Number);
  
//     if (isNaN(hours) || isNaN(minutes)) {
//       console.error("Invalid time components:", time);
//       return NaN;
//     }
  
//     let totalMinutes = hours * 60 + minutes;
  
//     // Adjust for 12-hour clock if AM/PM is present
//     if (period?.toUpperCase() === "PM" && hours < 12) {
//       totalMinutes += 12 * 60;
//     } else if (period?.toUpperCase() === "AM" && hours === 12) {
//       totalMinutes -= 12 * 60;
//     }
  
//     this.timeCache[time] = totalMinutes;
//     return totalMinutes;
//   }
  

//   private minutesToString(minutes: number): string {
//     if (this.timeStringCache[minutes]) return this.timeStringCache[minutes];

//     const hrs = Math.floor(minutes / 60);
//     const mins = minutes % 60;
//     const formattedTime = `${hrs
//       .toString()
//       .padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
//     this.timeStringCache[minutes] = formattedTime;
//     return formattedTime;
//   }

//   private formatDate(date: Date): string {
//     const year = date.getFullYear();
//     const month = (date.getMonth() + 1).toString().padStart(2, '0');
//     const day = date.getDate().toString().padStart(2, '0');
//     return `${year}-${month}-${day}`;
//   }

//   toggleAvailableDoctors(): void {
//     this.showAvailableDoctors = true;
//     this.showUnavailableDoctors = false;
//     this.showAbsentDoctors = false;
//   }

//   toggleUnavailableDoctors(): void {
//     this.showAvailableDoctors = false;
//     this.showUnavailableDoctors = true;
//     this.showAbsentDoctors = false;
//   }

//   toggleAbsentDoctors(): void {
//     this.showAbsentDoctors = true;
//     this.showUnavailableDoctors = false;
//     this.showAvailableDoctors = false;
//   }

//   closeDoctorList(): void {
//     this.showAvailableDoctors = false;
//     this.showUnavailableDoctors = false;
//     this.showAbsentDoctors = false;
//   }
//   closeUnavailableDoctorList(): void {
//     this.showUnavailableDoctors = false;
//   }
//   closeAbsentDoctorList(): void {
//     this.showAbsentDoctors = false;
//   }
// }
import { Component, OnInit } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';

@Component({
  selector: 'app-total-overview',
  templateUrl: './total-overview.component.html',
  styleUrls: ['./total-overview.component.css'],
})
export class TotalOverviewComponent implements OnInit {
  totalAppointmentsToday: number = 0;
  pendingRequestsToday: number = 0;
  availableDoctorsToday: number = 0;
  unavailableDoctorsToday: number = 0;
  absentDoctorsToday: number = 0;

  doctors: any[] = [];
  availableDoctors: any[] = [];
  unavailableDoctors: any[] = [];
  absentDoctors: any[] = [];
  date: string = '';
  showAvailableDoctors: boolean = false;
  showUnavailableDoctors: boolean = false;
  showAbsentDoctors: boolean = false;

  private timeCache: { [key: string]: number } = {};
  private timeStringCache: { [key: number]: string } = {};

  constructor(
    private appointmentService: AppointmentConfirmService,
    private doctorService: DoctorServiceService
  ) {}

  ngOnInit(): void {
    this.date = this.formatDate(new Date());
    this.fetchStatistics();
    this.fetchDoctorsWithAvailability();
  }

  private fetchStatistics(): void {
    const currentDate = this.date;

    this.appointmentService
      .getTotalAppointmentsCountForToday(currentDate)
      .subscribe(
        (totalAppointments) => {
          this.totalAppointmentsToday = totalAppointments.count;
        },
        (error) => {
          console.error('Error fetching total appointments:', error);
        }
      );

    this.appointmentService.fetchPendingAppointmentsCount().subscribe(
      (pendingRequests) => {
        this.pendingRequestsToday = pendingRequests;
      },
      (error) => {
        console.error('Error fetching pending requests:', error);
      }
    );
  }

  // private fetchDoctorsWithAvailability(): void {
  //   this.doctorService.getAllDoctors().subscribe(
  //     (doctors) => {
  //       const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5));
  //       const currentDay = new Date(this.date)
  //         .toLocaleString('en-us', { weekday: 'short' })
  //         .toLowerCase();
  //       const selectedDate = this.date;

  //       // Initialize counts
  //       let availableCount = 0;
  //       let unavailableCount = 0;
  //       let absentCount = 0;

  //       this.doctors = doctors
  //         .filter((doctor) => {
  //           // Filter for Visiting Consultants
  //           if (doctor.doctorType === 'Visiting Consultant') {
  //             return doctor.bookedSlots && doctor.bookedSlots.length > 0; // Include only if booked slots exist
  //           }
  //           return true; // Include all other doctors
  //         })
  //         .map((doctor) => {
  //           const unavailableSlots = doctor.unavailableSlots || [];
  //           const formattedUnavailableSlots = unavailableSlots.map((slot) => ({
  //             time: slot.time,
  //             duration: slot.duration || 20, // Default to 20 minutes if not provided
  //           }));

  //           const isAbsent =
  //             !doctor.availability?.some(
  //               (avail: any) => avail.day.toLowerCase() === currentDay
  //             ) ||
  //             (doctor.unavailableDates || []).some((unavailableDate: any) => {
  //               const formattedUnavailableDate = new Date(
  //                 unavailableDate.date
  //               ).toISOString().split('T')[0];
  //               return formattedUnavailableDate === selectedDate;
  //             });

  //           let status: string;
  //           if (doctor.doctorType === 'Visiting Consultant') {
  //             if(doctor.bookedSlots)
  //             // Visiting Consultant with booked slots is marked as Available
  //             availableCount++;
  //             status = 'Available';
  //           }
  //           if (isAbsent) {
  //             absentCount++;
  //             status = 'Absent';
  //           } else if (
  //             this.isDoctorUnavailable(currentTime, formattedUnavailableSlots)
  //           ) {
  //             unavailableCount++;
  //             status = 'Unavailable';
  //           } else {
  //             availableCount++;
  //             status = 'Available';
  //           }

  //           return { ...doctor, status };
  //         });

  //       // Update counts
  //       this.availableDoctorsToday = availableCount;
  //       this.unavailableDoctorsToday = unavailableCount;
  //       this.absentDoctorsToday = absentCount;

  //       this.updateDoctorLists();
  //     },
  //     (error) => {
  //       console.error('Error fetching doctors:', error);
  //     }
  //   );
  // }

  private fetchDoctorsWithAvailability(): void {
    this.doctorService.getAllDoctors().subscribe(
      (doctors) => {
        const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5)); // Current time in minutes
        const selectedDate = this.date;
  
        // Initialize counts
        let availableCount = 0;
        let unavailableCount = 0;
        let absentCount = 0;
  
        this.doctors = doctors
          .filter((doctor) => {
            if (doctor.doctorType === 'Visiting Consultant') {
              // Include only if booked slots exist for today
              return (
                doctor.bookedSlots &&
                doctor.bookedSlots.some(
                  (slot: any) =>
                    new Date(slot.date).toISOString().split('T')[0] === selectedDate
                )
              );
            }
            return true; // Include all other doctors
          })
          .map((doctor) => {
            const unavailableSlots = doctor.unavailableSlots || [];
            const formattedUnavailableSlots = unavailableSlots.map((slot) => ({
              time: slot.time,
              duration: slot.duration || 20, // Default to 20 minutes if not provided
            }));
  
            let status: string;
  
            if (doctor.doctorType === 'Visiting Consultant') {
              // Visiting Consultant with booked slots for today is Available
              availableCount++;
              status = 'Available';
            } else {
              const isAbsent =
                !doctor.availability?.some(
                  (avail: any) =>
                    avail.day.toLowerCase() ===
                    new Date(selectedDate)
                      .toLocaleString('en-us', { weekday: 'short' })
                      .toLowerCase()
                ) ||
                (doctor.unavailableDates || []).some((unavailableDate: any) => {
                  const formattedUnavailableDate = new Date(
                    unavailableDate.date
                  ).toISOString().split('T')[0];
                  return formattedUnavailableDate === selectedDate;
                });
  
              if (isAbsent) {
                absentCount++;
                status = 'Absent';
              } else if (
                this.isDoctorUnavailable(currentTime, formattedUnavailableSlots)
              ) {
                unavailableCount++;
                status = 'Unavailable';
              } else {
                availableCount++;
                status = 'Available';
              }
            }
  
            return { ...doctor, status };
          });
  
        // Update counts
        this.availableDoctorsToday = availableCount;
        this.unavailableDoctorsToday = unavailableCount;
        this.absentDoctorsToday = absentCount;
  
        this.updateDoctorLists();
      },
      (error) => {
        console.error('Error fetching doctors:', error);
      }
    );
  }
  

  private isDoctorUnavailable(
    currentTime: number,
    unavailableSlots: { time: string; duration: number }[]
  ): boolean {
    return unavailableSlots.some((slot) => {
      const slotStartMinutes = this.timeToMinutes(slot.time);
      const slotDuration = slot.duration || 20; // Default duration
      const slotEndMinutes = slotStartMinutes + slotDuration;

      if (isNaN(slotStartMinutes) || isNaN(slotEndMinutes)) {
        console.error('Invalid slot timing:', slot);
        return false;
      }

      return currentTime >= slotStartMinutes && currentTime < slotEndMinutes;
    });
  }

  private updateDoctorLists(): void {
    this.availableDoctors = this.doctors.filter(
      (doctor) => doctor.status === 'Available'
    );
    this.unavailableDoctors = this.doctors.filter(
      (doctor) => doctor.status === 'Unavailable'
    );
    this.absentDoctors = this.doctors.filter(
      (doctor) => doctor.status === 'Absent'
    );
  }

  private timeToMinutes(time: string): number {
    if (!time || (!time.includes(':') && !time.includes(' '))) {
      console.error('Invalid time format:', time);
      return NaN;
    }

    if (this.timeCache[time]) return this.timeCache[time];

    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      console.error('Invalid time components:', time);
      return NaN;
    }

    let totalMinutes = hours * 60 + minutes;

    // Adjust for 12-hour clock if AM/PM is present
    if (period?.toUpperCase() === 'PM' && hours < 12) {
      totalMinutes += 12 * 60;
    } else if (period?.toUpperCase() === 'AM' && hours === 12) {
      totalMinutes -= 12 * 60;
    }

    this.timeCache[time] = totalMinutes;
    return totalMinutes;
  }

  private minutesToString(minutes: number): string {
    if (this.timeStringCache[minutes]) return this.timeStringCache[minutes];

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const formattedTime = `${hrs
      .toString()
      .padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    this.timeStringCache[minutes] = formattedTime;
    return formattedTime;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleAvailableDoctors(): void {
    this.showAvailableDoctors = true;
    this.showUnavailableDoctors = false;
    this.showAbsentDoctors = false;
  }

  toggleUnavailableDoctors(): void {
    this.showAvailableDoctors = false;
    this.showUnavailableDoctors = true;
    this.showAbsentDoctors = false;
  }

  toggleAbsentDoctors(): void {
    this.showAbsentDoctors = true;
    this.showUnavailableDoctors = false;
    this.showAvailableDoctors = false;
  }

  closeDoctorList(): void {
    this.showAvailableDoctors = false;
    this.showUnavailableDoctors = false;
    this.showAbsentDoctors = false;
  }

  closeUnavailableDoctorList(): void {
    this.showUnavailableDoctors = false;
  }

  closeAbsentDoctorList(): void {
    this.showAbsentDoctors = false;
  }
}
