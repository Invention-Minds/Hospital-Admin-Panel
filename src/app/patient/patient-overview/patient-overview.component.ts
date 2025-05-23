import { Component, ViewChild } from '@angular/core';

import { HealthCheckupConfirmedComponent } from '../../health-checkup-service/health-checkup-confirmed/health-checkup-confirmed/health-checkup-confirmed.component';
import { PatientDetailsComponent } from "../patient-details/patient-details.component";
import { PatientInfoComponent } from "../patient-info/patient-info.component";

@Component({
  selector: 'app-patient-overview',
  templateUrl: './patient-overview.component.html',
  styleUrl: './patient-overview.component.css',
  

})



export class PatientOverviewComponent {
  activeComponent: string = 'details';

  selectedService: any = null; // Store the service data to pass to the form
  selectedAppointment: any = null;
  service: any;
  appointment: any
  role: string = '';
  subAdminType: string = '';
  appointmentTypeMhc:string = 'mhc';
  selectedPatient:any 


  @ViewChild('healthCheckupConfirmed') healthCheckupConfirmedComponent?: HealthCheckupConfirmedComponent;

  openAppointmentForm(service: any): void {
    this.selectedService = service; // Store the selected service
    console.log(this.selectedService);
    this.service = service
    this.activeComponent = 'form'; // Switch to the form view
  }
  openConsultationForm(service: any): void {
    this.selectedAppointment = service; // Store the selected service
    console.log(this.selectedAppointment);
    this.appointment = service
    this.activeComponent = 'mhcForm'; // Switch to the form view
  }
  ngOnInit() {
    this.role = localStorage.getItem('role') || '';
    this.subAdminType = localStorage.getItem('subAdminType') || '';
  }

  showPatientInfo(patient: any) {
    this.selectedPatient = patient;
    this.activeComponent = 'info';
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
  closeConsultation(): void {
    this.activeComponent = 'mhcToday'; // Switch back to the confirmed view
    this.selectedAppointment = null; // Clear the selected service
    // setTimeout(() => {
    //   if (this.healthCheckupConfirmedComponent) {
    //     this.healthCheckupConfirmedComponent.activeServiceId = this.service?.id || null; // Reset activeServiceId
    //     console.log(this.service.id)
    //     this.healthCheckupConfirmedComponent.unlockService();
    //     console.log("Service unlocked");
    //   } else {
    //     console.log("issues");
    //   }
    // }, 0); // Delay execution to allow component rendering
    console.log("closing", this.activeComponent)
  }
  // Show the Appointment Request component when the "No. of Req Arrived" card is clicked
  showAppointmentRequests() {
    this.activeComponent = 'details';
  }

  // Show the Confirmed Appointments component when the "No. of Confirmed" card is clicked
  showConfirmedAppointments() {
    this.activeComponent = 'info';
  }

  showNewPatient() {
    this.activeComponent = 'new';
  }



}
