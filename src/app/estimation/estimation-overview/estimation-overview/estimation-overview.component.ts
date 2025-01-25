import { Component, ViewChild } from '@angular/core';
import { HealthCheckupConfirmedComponent } from "../../../health-checkup-service/health-checkup-confirmed/health-checkup-confirmed/health-checkup-confirmed.component";

@Component({
  selector: 'app-estimation-overview',
  templateUrl: './estimation-overview.component.html',
  styleUrl: './estimation-overview.component.css'
})
export class EstimationOverviewComponent {
  activeComponent: string = 'form';
  selectedEstimation: any = null; // Store the service data to pass to the form
  service: any;
  
  @ViewChild('healthCheckupConfirmed') healthCheckupConfirmedComponent?: HealthCheckupConfirmedComponent;
  
    openAppointmentForm(service: any): void {
      this.selectedEstimation = service; // Store the selected service
      console.log(this.selectedEstimation);
      this.service = service
      this.activeComponent = 'form'; // Switch to the form view
    }
  
  
    closeForm(): void {
      this.activeComponent = 'confirmed'; // Switch back to the confirmed view
      this.selectedEstimation = null; // Clear the selected service
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
  

