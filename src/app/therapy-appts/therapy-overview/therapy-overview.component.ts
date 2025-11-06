import { Component } from "@angular/core";
import { TherapyFormComponent } from "../therapy-form/therapy-form.component";

@Component({
  selector: 'app-therapy-overview',
  templateUrl: './therapy-overview.component.html',
  styleUrl: './therapy-overview.component.css',
})
export class TherapyOverviewComponent {
  activeComponent: string = 'form';

  selectedService: any = null; // Store the service data to pass to the form
  selectedAppointment: any = null;
  service: any;
  appointment: any
  role: string = '';
  subAdminType: string = '';
  appointmentTypeMhc:string = 'mhc';


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
  showAnalytics() {
    this.activeComponent = 'analytics';
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
