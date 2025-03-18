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
  selectedAppointment: any = null;
  service: any;
  appointment: any
  role: string = '';
  subAdminType: string = '';
  appointmentTypeMhc:string = 'mhc';


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
  openRadiologyForm(service: any): void {
    this.selectedAppointment = service; // Store the selected service
    console.log(this.selectedAppointment);
    this.appointment = service
    this.activeComponent = 'radioForm'; // Switch to the form view
  }
  ngOnInit() {
    this.role = localStorage.getItem('role') || '';
    this.subAdminType = localStorage.getItem('subAdminType') || '';
    this.activeComponent = this.subAdminType === 'MHC Coordinator' ? 'mhcToday' : 'form'
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
  showCompletedAppointments() {
    this.activeComponent = 'completed';
  }
  showRepeatAppointments() {
    this.activeComponent = 'repeated';
  }
  showMhcForm() {
    this.activeComponent = 'mhcForm'
  }
  showMhcToday() {
    this.activeComponent = 'mhcToday'
  }
  showMhcConfirm() {
    this.activeComponent = 'mhcConfirm'
  }
  showMhcReport() {
    this.activeComponent = 'mhcReport'
  }
  showRadioForm(){
    this.activeComponent = 'mhcRadioForm'
  }
  showRadioConfirm(){
    this.activeComponent = 'radioConfirm'
  }


  isNotMHC(): boolean {
    return !(this.role === 'sub_admin' && this.subAdminType === 'MHC Coordinator');
  }
  isMHC(): boolean {
    return (this.role === 'sub_admin' && this.subAdminType === 'MHC Coordinator')
  }
}
