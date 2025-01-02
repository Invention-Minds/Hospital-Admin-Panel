import { Component, ViewChild } from '@angular/core';
import { HealthCheckupConfirmedComponent } from "../health-checkup-confirmed/health-checkup-confirmed/health-checkup-confirmed.component";
import { HealthCheckupCancelComponent } from "../health-checkup-cancel/health-checkup-cancel/health-checkup-cancel.component";
import { HealthCheckupRequestComponent } from "../health-checkup-request/health-checkup-request/health-checkup-request.component";
import { HealthCheckupRepeatComponent } from "../health-checkup-repeat/health-checkup-repeat.component";

@Component({
  selector: 'app-health-checkup-overview',
  templateUrl: './health-checkup-overview.component.html',
  styleUrl: './health-checkup-overview.component.css',
  
 
})
export class HealthCheckupOverviewComponent {
activeComponent: string = 'form';
selectedService: any = null; // Store the service data to pass to the form
service: any;

@ViewChild('healthCheckupConfirmed') healthCheckupConfirmedComponent?: HealthCheckupConfirmedComponent;

  openAppointmentForm(service: any): void {
    this.selectedService = service; // Store the selected service
    console.log(this.selectedService);
    this.service = service
    this.activeComponent = 'form'; // Switch to the form view
  }


  closeForm(): void {
    this.activeComponent = 'confirmed'; // Switch back to the confirmed view
    this.selectedService = null; // Clear the selected service
    setTimeout(() => {
      if (this.healthCheckupConfirmedComponent) {
        this.healthCheckupConfirmedComponent.activeServiceId = this.service?.id || null; // Reset activeServiceId
        console.log(this.service.id)
        this.healthCheckupConfirmedComponent.unlockService();
        console.log("Service unlocked");
      } else {
        console.log("issues");
      }
    }, 0); // Delay execution to allow component rendering
    console.log("closing", this.activeComponent)
  }
  // Show the Appointment Request component when the "No. of Req Arrived" card is clicked
  showAppointmentRequests() {
    this.activeComponent = 'request';
  }

  // Show the Confirmed Appointments component when the "No. of Confirmed" card is clicked
  showConfirmedAppointments() {
    this.activeComponent = 'confirmed';
  }

  // Show the Cancelled Appointments component when the "No. of Cancelled" card is clicked
  showCancelledAppointments() {
    this.activeComponent = 'cancelled';
  }
  showNewAppointmentForm() {
    this.activeComponent = 'form';
    // this.router.navigate(['/new-appointment']);
    

  }
  showCompletedAppointments(){
    this.activeComponent = 'completed';
  }
  showRepeatAppointments(){
    this.activeComponent = 'repeated';
  }
}
