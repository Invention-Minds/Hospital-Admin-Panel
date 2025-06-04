import { Component, OnInit } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-doctors-list-overview',
  templateUrl: './doctors-list-overview.component.html',
  styleUrl: './doctors-list-overview.component.css'
})
export class DoctorsListOverviewComponent implements OnInit {
  doctors: any[] = [];
  date: string;

  constructor(
    private doctorService: DoctorServiceService,
    private appointmentService: AppointmentConfirmService
  ) {
    this.date = this.formatDate(new Date());
  }

  ngOnInit(): void {
    this.fetchDoctorsWithAvailability();
  }

  private fetchDoctorsWithAvailability(): void {
    // Step 1: Fetch all doctors from backend
    this.doctorService.getFourDoctor().subscribe({
      next: (doctors) => {
        
        this.doctors = doctors.map((doctor:any) => {
          const isUnavailableByDate = doctor.unavailableDates!.some((unavailable:any) => {
            const unavailableDate = unavailable.date;
            // console.log(unavailableDate)
            const formattedUnavailableDate = unavailableDate.toString().split('T')[0];
            return formattedUnavailableDate === this.date;
          });
    
          if (isUnavailableByDate) {
            return { ...doctor, status: 'Absent' };
          }
    
          // Step 2: Check availability based on slots
          const availableDay = doctor.availability?.find((avail: any) =>
            avail.day.toLowerCase() ===
            new Date(this.date).toLocaleString('en-us', { weekday: 'short' }).toLowerCase()
          );
    
          if (!availableDay) {
            // If the doctor is not available on this day, mark as unavailable
            return { ...doctor, status: 'Absent' };
          }
    
          // Generate all time slots for the day
          const generatedSlots = this.generateTimeSlots(
            availableDay.availableFrom,
            availableDay.slotDuration
          );
          const bookedSlots = doctor.bookedSlots?.filter((slot:any) => !slot.complete);
    
          // Determine available slots
          const nonCompleteBookedSlots = bookedSlots?.map((slot:any) => slot.time) || [];
          const availableSlots = generatedSlots.filter(
            (slot) => !nonCompleteBookedSlots.includes(slot)
          );
    
          // Step 3: Final check for availability based on generated slots
          return {
            ...doctor,
            status: availableSlots.length === 0 ? 'Unavailable' : 'Available',
          };
        });
    
        // Step 4: Sort doctors alphabetically without prefixes
        const prefixesToIgnore = /^(dr\.|ms\.|mr\.|brig\.)\s*/i;
        this.doctors = this.doctors.sort((a, b) => {
          const nameA = a.name.toLowerCase().replace(prefixesToIgnore, '');
          const nameB = b.name.toLowerCase().replace(prefixesToIgnore, '');
          return nameA.localeCompare(nameB);
        });
    
        // Step 5: Slice the first 4 elements
        this.doctors = this.doctors.slice(0, 4);
      },
      error: (err) => {
        console.error('Error fetching doctors:', err)
      }
  });
  }

  private generateTimeSlots(startTime: string, slotDuration: number): string[] {
    const slots = [];
    let [hours, minutes] = startTime.split(':').map(Number);
    const endHours = 24; // End of the day limit

    while (hours < endHours) {
      const nextMinutes = minutes + slotDuration;
      let nextHours = hours + Math.floor(nextMinutes / 60);
      let remainderMinutes = nextMinutes % 60;

      if (nextHours >= endHours) break;

      const slotStart = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const slotEnd = `${nextHours.toString().padStart(2, '0')}:${remainderMinutes.toString().padStart(2, '0')}`;

      slots.push(`${slotStart}-${slotEnd}`);

      // Update the current time to the end of the current slot
      hours = nextHours;
      minutes = remainderMinutes;
    }

    return slots;
  }

  // Utility function to format date to "yyyy-MM-dd"
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
