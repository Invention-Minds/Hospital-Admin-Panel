import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import {provideNativeDateAdapter} from '@angular/material/core';
import { MessageService } from 'primeng/api';
import { AppointmentConfirmComponent } from '../appointment-confirm/appointment-confirm.component';
import { AppointmentCompleteComponent } from '../appointment-complete/appointment-complete.component';
import { AppointmentCancelComponent } from '../appointment-cancel/appointment-cancel.component';

@Component({
  selector: 'app-appointment-overview',
  templateUrl: './appointment-overview.component.html',
  styleUrl: './appointment-overview.component.css',
  providers: [provideNativeDateAdapter(), MessageService],
})
export class AppointmentOverviewComponent implements AfterViewInit {
  constructor(private router: Router,private messageService: MessageService) {}
 // Options for the dropdown to select search type (Patient ID or Phone Number)
 searchOptions = [
  { label: 'Patient Name', value: 'patientName' },
  { label: 'Phone Number', value: 'phoneNumber' },
  { label: 'Doctor Name', value: 'doctorName' },
];
@ViewChild('appointmentConfirmComponent') appointmentConfirmComponent?: AppointmentConfirmComponent;
@ViewChild('appointmentCompleteComponent') appointmentCompleteComponent?: AppointmentCompleteComponent;
@ViewChild('appointmentCancelComponent') appointmentCancelComponent?: AppointmentCancelComponent;

// Selected option for search type
selectedSearchOption:any = this.searchOptions[0];
selectedDateRange: Date[] = [];

// Value entered by the user (could be Patient ID or Phone Number based on selection)
searchValue: string = '';

// Selected date from calendar
selectedDate: Date | null = null;

showForm: boolean = false;

ngAfterViewInit() {
  // console.log( this.appointmentConfirmComponent)

}
// Method to handle search action
onSearch() {
  if (this.selectedSearchOption && this.searchValue) {
    // Add logic here to search by Patient ID or Phone Number
  } else {
    console.error('Please select a search option and enter a value');
  }
}
downloadData(): void {
  if (this.selectedDateRange && this.selectedDateRange.length > 0 && this.activeComponent === 'confirmed') {
    // Call the download method in the appointment confirm component
    this.appointmentConfirmComponent?.downloadFilteredData();
  } 
  else if(this.activeComponent === 'completed' && this.selectedDateRange && this.selectedDateRange.length > 0) {
    // console.log('Downloading completed appointments data...');
    // console.log(this.appointmentCompleteComponent)
    this.appointmentCompleteComponent?.downloadFilteredData();
  }
  else if(this.activeComponent === 'cancelled' && this.selectedDateRange && this.selectedDateRange.length > 0) {
    // console.log('Downloading cancelled appointments data...');
    this.appointmentCancelComponent?.downloadFilteredData();
  }
  else if(this.selectedDateRange && this.selectedDateRange.length === 0) {
    // Download last week's data if no component is active
    this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Select a date to download the report' });
  }
  
}
// downloadLastWeekData(): void {
//   // Implement logic to download last week's data
//   console.log('Downloading last week\'s data...');
// }

// Method to clear input fields
onClear() {
  this.searchValue = '';
  this.selectedSearchOption = this.searchOptions[0];
  // this.selectedDateRange = [];
}
activeComponent: string = 'request'; // Default to showing the request component

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
    this.activeComponent = 'appointment';
    // this.router.navigate(['/new-appointment']);
    this.showForm = true;
  }
  showCompletedAppointments(){
    this.activeComponent = 'completed';
  }
  closeForm() {
    this.showForm = false;
    this.activeComponent = 'request'; // Reset to allow reopening
  }

    
  
  refresh(){
    this.selectedDateRange = [];
  }
  
  convertDateToISO(dateString: string): string {
    const [month, day, year] = dateString.split('/');
    return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Adjusting for 20XX century dates
  }

}
