import { Component } from '@angular/core';
interface Appointment {
  id: string;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  therapy: string;
  date: string;
  time: string;
  status: string;
  [key: string]: string;  // Add this line to allow indexing by string
}
@Component({
  selector: 'app-appointment-request',
  templateUrl: './appointment-request.component.html',
  styleUrl: './appointment-request.component.css'
})
export class AppointmentRequestComponent {

  appointments : Appointment[] =[
    { id: '0001', patientName: 'Anitha', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Zona', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Nitish MK', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Nitish MK', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Nitish MK', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Nitish MK', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Keerthana M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Keerthana M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Keerthana M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Keerthana M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Keerthana M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Teju M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Teju M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Teju M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0001', patientName: 'Teju M', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested' },
    // ...add more data
  ];
  
  currentPage = 1;
    rowsPerPage = 10;
    itemsPerPage = 10;
    sortColumn: keyof Appointment | undefined = undefined;  // Default sorting column
  sortDirection: string = 'asc';       // Default sorting direction
 // Method to handle sorting by a specific column
 sortBy(column: keyof Appointment) {
  if (this.sortColumn === column) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; // Toggle direction
  } else {
    this.sortColumn = column;
    this.sortDirection = 'asc'; // Default to ascending when a new column is clicked
  }
  this.currentPage = 1; // Reset to the first page when sorting changes
}

// Method to sort appointments based on the selected column and direction
sortedAppointments() {
  if (!this.sortColumn) {
    // If no sorting column is selected, return the appointments as is
    return [...this.appointments];
  }

  return [...this.appointments].sort((a, b) => {
    const valueA = a[this.sortColumn!];
    const valueB = b[this.sortColumn!];

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      const comparison = valueA.localeCompare(valueB);
      return this.sortDirection === 'asc' ? comparison : -comparison;
    }

    return 0; // Default to no sorting if types are not strings
  });
}

// Method to handle pagination by returning the sorted and paginated data
getPaginatedAppointments() {
  const sorted = this.sortedAppointments();  // First, sort the data

  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = startIndex + this.itemsPerPage;
  return sorted.slice(startIndex, endIndex); // Return the paginated data
}

// Method to handle changing the page
onPageChange() {
  if (this.currentPage < 1) {
    this.currentPage = 1;
  } else if (this.currentPage > this.totalPages) {
    this.currentPage = this.totalPages;
  }
}

// Calculate the total number of pages
get totalPages() {
  return Math.ceil(this.appointments.length / this.itemsPerPage);
}

// Navigate to the previous page
prevPage() {
  if (this.currentPage > 1) {
    this.currentPage--;
  }
}

// Navigate to the next page
nextPage() {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
  }
}
  
}
