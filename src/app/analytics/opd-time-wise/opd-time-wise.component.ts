import { Component } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

@Component({
  selector: 'app-opd-time-wise',
  templateUrl: './opd-time-wise.component.html',
  styleUrl: './opd-time-wise.component.css'
})
export class OpdTimeWiseComponent {
constructor(private appointmentService: AppointmentConfirmService){}

selectedDate : string = '2025-02-12';
selectedAppointments: any[] = [];
before1PM: number = 0;
after1PM: number = 0;
ngOnInit(){
  this.loadAppointments()
}

loadAppointments() {
  this.appointmentService.getAllAppointments().subscribe((appointments: any[]) => {
    // Filter appointments for the selected date
    this.selectedAppointments = appointments.filter((appointment: any) => 
      appointment.date === this.selectedDate
    );
    // console.log(this.selectedAppointments)

    // Initialize counters
    let before1PMCount = 0;
    let after1PMCount = 0;

    // Segregate and count appointments
    this.selectedAppointments.forEach(appointment => {
      const appointmentTime = this.convertTo24HourFormat(appointment.time); // Convert to 24-hour format
      // console.log(appointmentTime)
      const cutoffTime = 13 * 60; // 1 PM in minutes

      if (appointmentTime < cutoffTime) {
        before1PMCount++;
      } else {
        after1PMCount++;
      }
    });

    // Store counts
    this.before1PM = before1PMCount;
    this.after1PM = after1PMCount;

    console.log("Appointments before 1 PM:", this.before1PM);
    console.log("Appointments after 1 PM:", this.after1PM);
  });
}
convertTo24HourFormat(time12h: string): number {
  const [time, modifier] = time12h.split(" "); // Split time and AM/PM
  let [hours, minutes] = time.split(":").map(Number); // Split hours & minutes

  if (modifier === "PM" && hours !== 12) {
    hours += 12; // Convert PM hours to 24-hour format
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0; // Convert 12 AM to 00 hours
  }

  return hours * 60 + minutes; // Convert to minutes for easy comparison
}

}
