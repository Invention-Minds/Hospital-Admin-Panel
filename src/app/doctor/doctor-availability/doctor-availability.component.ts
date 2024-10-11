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

  // fetchDoctors(): void {
  //   this.doctorService.getDoctors().subscribe((doctors: Doctor[]) => {
  //     this.doctors = doctors.map((doctor) => ({
  //       ...doctor,
  //       slots: this.generateDoctorSlots(doctor.availableFrom, doctor.slotDuration)
  //     }));
  //     this.applySearchFilter();
  //   });
  // }
  fetchDoctors(): void {
    this.doctorService.getDoctors().subscribe((doctors: Doctor[]) => {
      const doctorRequests = doctors
        .filter(doctor => doctor.id !== undefined)
        .map(doctor => this.doctorService.getBookedSlots(doctor.id!, this.formatDate(this.selectedDate)));
  
      forkJoin(doctorRequests).subscribe((bookedSlotsArray: string[][]) => {
        this.doctors = doctors.map((doctor, index) => {
          const bookedSlots = bookedSlotsArray[index];
          return {
            ...doctor,
            slots: this.generateDoctorSlots(doctor.availableFrom, doctor.slotDuration, bookedSlots)
          };
        });
        this.applySearchFilter();
      });
    });
  }
  
  reloadData(): void { // Add this method
    this.fetchDoctors();
    this.selectedDate = new Date();
  }
  onDateChange(event: any): void {
    this.selectedDate = new Date(event.target.value);
    this.fetchDoctors();
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

  // // Function to generate slots based on doctor availability and slot duration
  // generateDoctorSlots(availableFrom: string, slotDuration: number): Slot[] {
  //   const [availableStart, availableEnd] = availableFrom.split('-').map(this.stringToMinutes);
  //   const startTime = this.stringToMinutes(this.opdStartTime);
  //   const endTime = this.stringToMinutes(this.opdEndTime);
  //   const slots: Slot[] = [];

  //   for (let current = startTime; current < endTime; current += slotDuration) {
  //     const slotTime = this.minutesToString(current);
  //     const nextSlotTime = this.minutesToString(current + slotDuration);

  //     let status: Slot['status'] = 'unavailable';

  //     if (current >= availableStart && current < availableEnd) {
  //       status = 'available';
  //       // Assuming you have an array of booked slots from the backend, you can update this logic to mark specific slots as "booked"
  //     }

  //     slots.push({
  //       time: `${slotTime}-${nextSlotTime}`,
  //       status
  //     });
  //   }

  //   return slots;
  // }
  generateDoctorSlots(availableFrom: string, slotDuration: number, bookedSlots: string[]): Slot[] {
    const [availableStart, availableEnd] = availableFrom.split('-').map(this.stringToMinutes);
    // const startTime = this.stringToMinutes(this.opdStartTime);
    // const endTime = this.stringToMinutes(this.opdEndTime);
    const slots: Slot[] = [];
  
    for (let current = availableStart; current < availableEnd; current += slotDuration) {
      const slotTime = this.minutesToString(current);
      const nextSlotTime = this.minutesToString(current + slotDuration);
      const slotString = `${slotTime}-${nextSlotTime}`;
  
      let status: Slot['status'] = 'unavailable';
  
      if (current >= availableStart && current < availableEnd) {
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