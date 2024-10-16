import { Component, Input, Output } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';
import { DoctorWithSlots } from '../../models/doctos_with_slots.model';
import { ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';

interface Slot {
  time: string;
  status: 'available' | 'booked' | 'unavailable';
}

@Component({
  selector: 'app-doctor-availability',
  templateUrl: './doctor-availability.component.html',
  styleUrl: './doctor-availability.component.css'
})
export class DoctorAvailabilityComponent {
  selectedDate: Date = new Date();
  opdStartTime: string = '08:00';
  opdEndTime: string = '20:00';
  doctors: DoctorWithSlots[] = [];
  selectedCalendarView: string = 'calendar'; // Add this property
  filteredDoctors: DoctorWithSlots[] = [];
  searchQuery: string = '';

  constructor(private doctorService: DoctorServiceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchDoctors();
  }

//   fetchDoctors(): void {
//     const formattedDate = this.formatDate(this.selectedDate);
//     console.log('formattedDate',formattedDate)
//     this.doctorService.getDoctors().subscribe((doctors: Doctor[]) => {
//       const doctorRequests = doctors
//         .filter(doctor => doctor.id !== undefined)
//         .map(doctor =>
//           forkJoin({
//             bookedSlots: this.doctorService.getBookedSlots(doctor.id!, this.formatDate(this.selectedDate)),
//             unavailableDates: this.doctorService.getUnavailableDates(doctor.id!)
//           })
//         );

//       forkJoin(doctorRequests).subscribe((doctorDataArray) => {
//         this.doctors = doctors.map((doctor, index) => {
//           const { bookedSlots, unavailableDates } = doctorDataArray[index];

//           // Determine if the selected day is unavailable for the doctor
//           const isUnavailableDay = unavailableDates.some(unavailable => {
//             const unavailableDate = new Date(unavailable.date);
//             const formattedUnavailableDate = unavailableDate.toISOString().split('T')[0];
//             return formattedUnavailableDate === formattedDate;
//           });
// // Set an `isUnavailable` flag for the doctor
// const isUnavailable = isUnavailableDay;
//           return {
//             ...doctor,
//             isUnavailable,
//             slots: this.generateDoctorSlots(doctor.availableFrom, doctor.slotDuration, bookedSlots, isUnavailableDay)
//           };
//         });
//         this.applySearchFilter();
//       });
//     });
//   }
fetchDoctors(): void {
  const formattedDate = this.formatDate(this.selectedDate);
  console.log('formattedDate', formattedDate);

  this.doctorService.getDoctors().subscribe((doctors: Doctor[]) => {
    const doctorRequests = doctors
      .filter(doctor => doctor.id !== undefined)
      .map(doctor =>
        forkJoin({
          bookedSlots: this.doctorService.getBookedSlots(doctor.id!, this.formatDate(this.selectedDate)),
          unavailableDates: this.doctorService.getUnavailableDates(doctor.id!)
        })
      );

    forkJoin(doctorRequests).subscribe((doctorDataArray) => {
      this.doctors = doctors.map((doctor, index) => {
        const { bookedSlots, unavailableDates } = doctorDataArray[index];

        // Determine if the selected day is unavailable for the doctor
        const isUnavailableDay = unavailableDates.some(unavailable => {
          const unavailableDate = new Date(unavailable.date);
          const formattedUnavailableDate = unavailableDate.toISOString().split('T')[0];
          return formattedUnavailableDate === formattedDate;
        });

        // Check if the doctor is available on the given day of the week
        const dayOfWeek = this.selectedDate.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
        const availableDay = doctor.availability?.find((avail: any) =>
          avail.day.toLowerCase() === dayOfWeek
        );

        // If the doctor is not available on this day, mark as unavailable
        const isUnavailableDueToSchedule = !availableDay;

        // Set an `isUnavailable` flag for the doctor based on unavailable date or default availability
        const isUnavailable = isUnavailableDay || isUnavailableDueToSchedule;

        // Provide default values for `availableFrom` and `slotDuration` if `availableDay` is not available
        const availableFrom = availableDay?.availableFrom ?? '08:00-20:00'; // Use a default value for unavailable days
        const slotDuration = availableDay?.slotDuration ?? 20; // Default to 30-minute slots if unavailable

        return {
          ...doctor,
          isUnavailable,
          slots: this.generateDoctorSlots(availableFrom, slotDuration, bookedSlots, isUnavailable)
        };
      });
      this.applySearchFilter();
    });
  });
}



  reloadData(): void {
    this.fetchDoctors();
    this.selectedDate = new Date();
  }

  onDateChange(event: any): void {
    console.log("event in",event)
    if (event instanceof Date) {
      this.selectedDate = event;
      console.log('event',this.selectedDate)
    } else {
      this.selectedDate = new Date(event); // Ensure correct date parsing
    }

    console.log('selectedDate',this.selectedDate)
    this.fetchDoctors();
    this.cdr.detectChanges(); // Ensure the changes are applied immediately
  }

  prevDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.selectedDate = new Date(this.selectedDate);
    this.fetchDoctors();
  }

  nextDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.selectedDate = new Date(this.selectedDate);
    this.fetchDoctors();
  }

  today(): void {
    this.selectedDate = new Date();
    this.fetchDoctors();
  }

  applySearchFilter(): void {
    if (this.searchQuery.trim() === '') {
      this.filteredDoctors = this.doctors;
    } else {
      this.filteredDoctors = this.doctors.filter(doctor =>
        doctor.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
      console.log(this.filteredDoctors);
    }
  }

  onSearchChange(): void {
    this.applySearchFilter(); // Apply filter when search value changes
  }

  // Function to generate slots based on doctor availability and slot duration
// Function to generate slots based on doctor availability and slot duration
// Function to generate slots based on doctor availability and slot duration
generateDoctorSlots(availableFrom: string, slotDuration: number, bookedSlots: string[], isUnavailableDay: boolean): Slot[] {
  const [availableStart, availableEnd] = availableFrom.split('-').map(this.stringToMinutes);
  const slots: Slot[] = [];

  for (let current = availableStart; current < availableEnd; current += slotDuration) {
    const slotTime = this.minutesToString(current);
    const nextSlotTime = this.minutesToString(current + slotDuration);
    const slotString = `${slotTime}-${nextSlotTime}`;

    let status: Slot['status'] = 'unavailable'; // Default to unavailable

    // If the day is available, mark slots as either booked or available
    if (!isUnavailableDay) {
      console.log('slotString',slotString);
      console.log('bookedSlots',bookedSlots);
      status = bookedSlots.includes(slotString) ? 'booked' : 'available';
    }

    slots.push({
      time: slotString,
      status
    });
  }

  return slots;
}



  // Utility function to convert time in "HH:mm" format to minutes
  stringToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Utility function to convert minutes back to "HH:mm" format
  minutesToString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Utility function to format date to string "yyyy-MM-dd"
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
