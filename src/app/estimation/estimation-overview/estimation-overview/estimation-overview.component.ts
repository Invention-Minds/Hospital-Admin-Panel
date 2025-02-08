import { Component, ViewChild } from '@angular/core';
import { HealthCheckupConfirmedComponent } from "../../../health-checkup-service/health-checkup-confirmed/health-checkup-confirmed/health-checkup-confirmed.component";
import { EstimationSubmitComponent } from "../../estimation-submit/estimation-submit/estimation-submit.component";
import { EstimationApprovedComponent } from '../../estimation-approved/estimation-approved/estimation-approved.component';


@Component({
  selector: 'app-estimation-overview',
  templateUrl: './estimation-overview.component.html',
  styleUrl: './estimation-overview.component.css',
})
export class EstimationOverviewComponent {
  activeComponent: string = 'form';
  selectedEstimation: any = null; // Store the service data to pass to the form
  service: any;
  role: string = ''
  
  @ViewChild('estimationApproved') EstimationApprovedComponent?: EstimationApprovedComponent;

  ngOnInit(){
    this.role = localStorage.getItem('role')!;
    if(this.role === 'sub_admin'){
      this.activeComponent = 'request'
    }
    else{
      this.activeComponent = 'submitted'
    }
  }
  
    openAppointmentForm(service: any): void {
      this.selectedEstimation = service; // Store the selected service
      console.log(this.selectedEstimation);
      this.service = service
      this.activeComponent = 'form'; // Switch to the form view
    }
  
  
    closeForm(): void {
      this.activeComponent = 'approved'; // Switch back to the confirmed view
      this.selectedEstimation = null; // Clear the selected service
      setTimeout(() => {
        if (this.EstimationApprovedComponent) {
          this.EstimationApprovedComponent.activeServiceId = this.service?.id || null; // Reset activeServiceId
          console.log(this.service.id)
          this.EstimationApprovedComponent.unlockService();
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

    showSubmittedRequest(){
      this.activeComponent = 'submitted'
    }
  
    // Show the Confirmed Appointments component when the "No. of Confirmed" card is clicked
    showConfirmedAppointments() {
      this.activeComponent = 'confirmed';
    }
    showApprovedAppointments(){
      this.activeComponent = 'approved'
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
    showOverDueAppointment(){
      this.activeComponent = 'overdue'
    }
  }
  

