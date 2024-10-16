import { Component } from '@angular/core';

@Component({
  selector: 'app-report-overview',
  templateUrl: './report-overview.component.html',
  styleUrl: './report-overview.component.css'
})
export class ReportOverviewComponent {
  activeComponent: string = 'admin'; 
    // Show the Appointment Request component when the "No. of Req Arrived" card is clicked
    showAdminReport() {
      this.activeComponent = 'admin';
    }
  
    // Show the Confirmed Appointments component when the "No. of Confirmed" card is clicked
    showDoctorReport() {
      this.activeComponent = 'doctor';
    }
}
