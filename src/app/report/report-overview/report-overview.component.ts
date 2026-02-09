import { Component } from '@angular/core';

@Component({
  selector: 'app-report-overview',
  templateUrl: './report-overview.component.html',
  styleUrl: './report-overview.component.css'
})
export class ReportOverviewComponent {
  role: string = '';
  activeComponent: string = 'sub_admin'; 
    // Show the Appointment Request component when the "No. of Req Arrived" card is clicked
    showAdminReport() {
      if(this.role != 'doctor') {
      this.activeComponent = 'sub_admin';
    }
  }
    // Show the Confirmed Appointments component when the "No. of Confirmed" card is clicked
    showDoctorReport() {
        this.activeComponent = 'doctor';
    }
    // Show the Check-in Report component when the "No. of Check-ins" card is clicked
    showCheckinReport() {
        this.activeComponent = 'checkin';
    }
    ngOnInit(): void {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Fetch role from localStorage or the authentication service
        this.role = localStorage.getItem('role') || '';
        // console.log('User role:', this.role);
            // Automatically set the active component to the doctor's report if the role is 'doctor'
    if (this.role === 'doctor') {
      this.activeComponent = 'doctor';
    } else {
      this.activeComponent = 'sub_admin';
    }

      } else {
        console.log('localStorage is not available');
      }
    }
}
