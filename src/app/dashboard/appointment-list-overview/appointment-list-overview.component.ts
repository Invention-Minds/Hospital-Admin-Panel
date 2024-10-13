import { Component, OnInit } from '@angular/core';
import { AppointmentConfirmService, Appointment } from '../../services/appointment-confirm.service';

@Component({
  selector: 'app-appointment-list-overview',
  templateUrl: './appointment-list-overview.component.html',
  styleUrl: './appointment-list-overview.component.css'
})
export class AppointmentListOverviewComponent implements OnInit {
  appointments: any[] = [];
  date: string;

  constructor(private appointmentService: AppointmentConfirmService) {
    this.date = this.formatDate(new Date());
  }

  ngOnInit(): void {
    this.fetchPendingAppointments();
  }

  private fetchPendingAppointments(): void {
    this.appointmentService.fetchPendingAppointments().subscribe(
      (appointments: Appointment[]) => {
        // Filter appointments by appointment date and status 'pending'
        const filteredAppointments = appointments.filter(appointment => appointment.date === this.date);

        // Limit to the first 4 appointments
        this.appointments = filteredAppointments.slice(0, 4).map((appointment) => ({
          patientName: appointment.patientName,
          doctorName: appointment.doctorName,
          apptDate: appointment.date,
          apptTime: appointment.time,
          department: appointment.department,
        }));
      },
      (error) => {
        console.error('Error fetching pending appointments:', error);
      }
    );
  }

  // Utility function to format date to "yyyy-MM-dd"
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
