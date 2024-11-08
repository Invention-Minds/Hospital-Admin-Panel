import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {provideNativeDateAdapter} from '@angular/material/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-appointment-overview',
  templateUrl: './appointment-overview.component.html',
  styleUrl: './appointment-overview.component.css',
  providers: [provideNativeDateAdapter(), MessageService],
})
export class AppointmentOverviewComponent {
  constructor(private router: Router,private messageService: MessageService) {}
 // Options for the dropdown to select search type (Patient ID or Phone Number)
 searchOptions = [
  { label: 'Patient Name', value: 'patientName' },
  { label: 'Phone Number', value: 'phoneNumber' }
];

// Selected option for search type
selectedSearchOption: { label: string, value: string } = this.searchOptions[0];

// Value entered by the user (could be Patient ID or Phone Number based on selection)
searchValue: string = '';

// Selected date from calendar
selectedDate: Date | null = null;

showForm: boolean = false;

// Method to handle search action
onSearch() {
  if (this.selectedSearchOption && this.searchValue) {
    // Add logic here to search by Patient ID or Phone Number
  } else {
    console.error('Please select a search option and enter a value');
  }
}

// Method to clear input fields
onClear() {
  this.searchValue = '';
  this.selectedSearchOption = this.searchOptions[0];
  this.selectedDate = null;
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
    this.activeComponent = 'appointment'; // Reset to allow reopening
  }

    
  
  refresh(){
    this.selectedDate = null;
  }
  
  convertDateToISO(dateString: string): string {
    const [month, day, year] = dateString.split('/');
    return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Adjusting for 20XX century dates
  }

}
