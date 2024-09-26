import { Component } from '@angular/core';

@Component({
  selector: 'app-appointment-overview',
  templateUrl: './appointment-overview.component.html',
  styleUrl: './appointment-overview.component.css'
})
export class AppointmentOverviewComponent {
 // Options for the dropdown to select search type (Patient ID or Phone Number)
 searchOptions = [
  { label: 'Patient ID', value: 'id' },
  { label: 'Phone Number', value: 'phone' }
];

// Selected option for search type
selectedSearchOption: { label: string, value: string } | undefined;

// Value entered by the user (could be Patient ID or Phone Number based on selection)
searchValue: string = '';

// Selected date from calendar
selectedDate: Date | undefined;

// Method to handle search action
onSearch() {
  if (this.selectedSearchOption && this.searchValue) {
    console.log('Searching for', this.selectedSearchOption.label, 'with value:', this.searchValue);
    // Add logic here to search by Patient ID or Phone Number
  } else {
    console.error('Please select a search option and enter a value');
  }
}

// Method to clear input fields
onClear() {
  this.searchValue = '';
  this.selectedSearchOption = undefined;
  this.selectedDate = undefined;
}
}
