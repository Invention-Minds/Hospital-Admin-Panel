import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { utcToIst, getYesterdayDate } from '../functions';

@Component({
  selector: 'app-doctor-login-activity',
  templateUrl: './doctor-login-activity.component.html',
  styleUrl: './doctor-login-activity.component.css'
})
export class DoctorLoginActivityComponent implements OnChanges {

  constructor(
    private doctorsService: DoctorServiceService,
    private appointmentService: AppointmentConfirmService
  ) { }
  isModalOpen = false;
  @Input() selectedDate: any[] = []; // Default to today
  doctorDelays: any[] = [];
  detailedDoctorDelays: any[] = [];
  isLoading: boolean = true

  ngOnInit() {
    const yesterdayDate = getYesterdayDate()
    this.selectedDate = [yesterdayDate]
    this.loadDoctorLoginDelays();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']) {
      this.loadDoctorLoginDelays();
    }
  }

  openModal() {
    this.isModalOpen = true;
    this.loadDoctorLoginDelays(); // Fetch data for detailed view
  }

  closeModal() {
    this.isModalOpen = false;
  }

  loadDoctorLoginDelays(): void {
    ('doctor-login')
    this.doctorsService.getAllDoctors(this.selectedDate[0]).subscribe({

      next: (doctors) => {
        // Filter doctors who are available and not on unavailable list
        const availableDoctors = doctors.filter(doctor => {
          const isUnavailable = (doctor.unavailableDates || []).some((unavailableDate: any) => {
            const formattedUnavailableDate = new Date(unavailableDate.date).toISOString().split('T')[0];
            return formattedUnavailableDate === this.selectedDate[0];  // If this matches, doctor is unavailable
          });
          return !isUnavailable; // We want doctors who are NOT unavailable
        });
        (availableDoctors)
        // Process each doctor's availability
        this.processDoctorsAvailability(availableDoctors);
      },
      error: (error) => {
        console.log(error)
      },
      complete: () => {
        this.isLoading = false
      }
    });
  }

  processDoctorsAvailability(doctors: any[]): void {
    this.appointmentService.getAllAppointments().subscribe((appointments: any[]) => {

      const todayAppointments = appointments.filter(app => app.date === this.selectedDate);

      this.doctorDelays = doctors.map(doctor => {
        const latestAvailability = this.getLatestAvailability(doctor.availability);

        if (!latestAvailability) return null; // Skip if no availability
        (latestAvailability)
        const dayOfWeek = new Date(this.selectedDate[0]).toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
        const availableDay = latestAvailability.find((avail: any) => avail.day.toLowerCase() === dayOfWeek);

        if (!availableDay) {
          (`❌ Doctor is NOT available on ${dayOfWeek}, skipping...`);
          return null;
        }
        (availableDay)
        const availableFrom = availableDay.availableFrom?.split('-')[0]; // Extract start time
        (availableFrom)
        const firstCheckedOutAppointment = this.getFirstCheckedOutAppointment(todayAppointments, doctor.id);

        (firstCheckedOutAppointment)

        if (!firstCheckedOutAppointment) return {
          doctorName: doctor.name,
          opdStartTime: availableFrom,
          delay: '- min',
          // No checked-out appointments, infinite delay
        };

        const checkedOutTime = firstCheckedOutAppointment.checkedOutTime;
        const delay = this.calculateDelay(availableFrom, checkedOutTime);

        return {
          doctorName: doctor.name,
          opdStartTime: availableFrom,
          delay: `${delay} mins`,
          checkedOutTime: checkedOutTime
        };
      }).filter(entry => entry !== null);
    });
  }

  getLatestAvailability(availability: any[]): any {
    const allUpdatedAtNull = availability?.every(avail => !avail.updatedAt);

    // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
    const latestTimestamp = allUpdatedAtNull
      ? null // If all are null, treat it as the "latest"
      : availability?.reduce((latest, curr) => {
        return curr.updatedAt && new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
          ? curr.updatedAt
          : latest;
      }, availability.find(avail => avail.updatedAt)?.updatedAt || '');

    // Step 3: Filter availability data based on the latest timestamp
    return allUpdatedAtNull
      ? availability // If all are null, consider the entire availability as "latest"
      : availability?.filter(avail => avail.updatedAt === latestTimestamp);
  }

  getFirstCheckedOutAppointment(appointments: any[], doctorId: string): any {
    const doctorAppointments = appointments
      .filter(app => app.doctorId === doctorId && app.checkedOutTime)
      .sort((a, b) => new Date(a.checkedOutTime).getTime() - new Date(b.checkedOutTime).getTime()); // Sort by earliest checkedOutTime

    if (doctorAppointments.length === 0) return null;

    const checkedOutTime = utcToIst(new Date(doctorAppointments[0].checkedOutTime));
    return {
      checkedOutTime: checkedOutTime.split(' ')[1].slice(0, 5) // Extract HH:MM format
    };
  }

  calculateDelay(availableFrom: string, checkedOutTime: string): number {
    const availableTime = new Date(`1970-01-01T${availableFrom}:00Z`);
    const checkedOutDate = new Date(`1970-01-01T${checkedOutTime}:00Z`);

    return Math.floor((checkedOutDate.getTime() - availableTime.getTime()) / 60000); // Convert to minutes
  }

  reportData(doctors: any[]): void {
    this.appointmentService.getAllAppointments().subscribe((appointments: any[]) => {

      const todayAppointments = appointments.filter(app => app.date === this.selectedDate);

      this.doctorDelays = doctors.map(doctor => {
        const latestAvailability = this.getLatestAvailability(doctor.availability);

        if (!latestAvailability) return null; // Skip if no availability
        (latestAvailability)
        const dayOfWeek = new Date(this.selectedDate[0]).toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
        const availableDay = latestAvailability.find((avail: any) => avail.day.toLowerCase() === dayOfWeek);

        if (!availableDay) {
          (`❌ Doctor is NOT available on ${dayOfWeek}, skipping...`);
          return null;
        }
        (availableDay)
        const availableFrom = availableDay.availableFrom?.split('-')[0]; // Extract start time
        (availableFrom)
        const firstCheckedOutAppointment = this.getFirstCheckedOutAppointment(todayAppointments, doctor.id);

        (firstCheckedOutAppointment)

        if (!firstCheckedOutAppointment) return {
          doctorName: doctor.name,
          opdStartTime: availableFrom,
          delay: '- min',
          // No checked-out appointments, infinite delay
        };

        const checkedOutTime = firstCheckedOutAppointment.checkedOutTime;
        const delay = this.calculateDelay(availableFrom, checkedOutTime);

        return {
          doctorName: doctor.name,
          opdStartTime: availableFrom,
          delay: `${delay} mins`,
          checkedOutTime: checkedOutTime
        };
      }).filter(entry => entry !== null);
    });
  }
}