import { Component, OnInit } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { forkJoin } from 'rxjs';


@Component({
  selector: 'app-total-overview',
  templateUrl: './total-overview.component.html',
  styleUrl: './total-overview.component.css'
})
export class TotalOverviewComponent implements OnInit {
  totalAppointmentsToday: number = 0;
  pendingRequestsToday: number = 0;
  availableDoctorsToday: number = 0;
  doctors: any[] = [];
  date: string ='';


  constructor(
    private appointmentService: AppointmentConfirmService,
    private doctorService: DoctorServiceService
  ) {}
  ngOnInit(): void {
    this.fetchStatistics();
    this.fetchDoctorsWithAvailability();
  }
  private fetchStatistics(): void {
    const currentDate = this.formatDate(new Date());
    this.date = this.formatDate(new Date());

    // Fetch total appointments and pending requests count for today, and available doctors count for today.
    const totalAppointments$ = this.appointmentService.getTotalAppointmentsCountForToday(currentDate);
    const pendingAppointments$ = this.appointmentService.getPendingAppointmentsCountForToday(currentDate);


    forkJoin([totalAppointments$, pendingAppointments$]).subscribe(
      ([totalAppointments, pendingRequests]) => {
        // Total number of appointments today
        this.totalAppointmentsToday = totalAppointments.count;

        // Number of pending requests today
        this.pendingRequestsToday = pendingRequests.count;

        // Total number of doctors available today
      },
      error => {
        console.error('Error fetching statistics:', error);
      }
    );
  }
  private fetchDoctorsWithAvailability(): void {
    // Step 1: Fetch all doctors from backend
    this.doctorService.getDoctors().subscribe(
      (doctors) => {
        // Step 2: Get unavailable dates and booked slots for each doctor
        const bookedSlotsObservables = doctors.map(doctor => 
          this.appointmentService.getBookedSlots(doctor.id, this.date)
        );
        const unavailableDatesObservables = doctors.map(doctor => 
          this.doctorService.getUnavailableDates(doctor.id)
        );

        forkJoin([forkJoin(bookedSlotsObservables), forkJoin(unavailableDatesObservables)]).subscribe(
          ([bookedSlotsList, unavailableDatesList]) => {
            this.doctors = doctors.map((doctor, index) => {
              // Step 3: Check for unavailable dates
              const unavailableDates = unavailableDatesList[index].map((d: any) => new Date(d.date).toISOString().split('T')[0]);
              const isUnavailableByDate = unavailableDates.includes(this.date);

              if (isUnavailableByDate) {
                return { ...doctor, status: 'Unavailable' };
              }

              // Step 4: Check for availability based on slots
              const availableDay = doctor.availability?.find((avail: any) =>
                avail.day.toLowerCase() === new Date(this.date).toLocaleString('en-us', { weekday: 'short' }).toLowerCase()
              );
              

              if (!availableDay) {
                // If the doctor is not available on this day, mark as unavailable
                return { ...doctor, status: 'Unavailable' };
              }

              // Generate all time slots for the day
              const generatedSlots = this.generateTimeSlots(availableDay.availableFrom, availableDay.slotDuration);
              const bookedSlots = bookedSlotsList[index];

              // Determine if there are any available slots left
              const availableSlots = generatedSlots.filter(slot => !bookedSlots.includes(slot));

              // Step 5: Final check for availability based on generated slots
              return {
                ...doctor,
                status: availableSlots.length === 0 ? 'Unavailable' : 'Available',
              };
            });
            this.availableDoctorsToday = this.doctors.filter(doctor => doctor.status === 'Available').length;

          },
          error => console.error('Error fetching booked slots or unavailable dates:', error)
        );
      },
      error => console.error('Error fetching doctors:', error)
    );
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
