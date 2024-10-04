import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AppointmentFormComponent } from '../appointment-form/appointment-form.component';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
interface Appointment {
  id: string;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  therapy: string;
  date: string;
  time: string;
  status: string;
  email: string;
  requestVia?: string; // Optional property
  [key: string]: any;  // Add this line to allow indexing by string
}
@Component({
  selector: 'app-appointment-request',
  templateUrl: './appointment-request.component.html',
  styleUrl: './appointment-request.component.css'
})
export class AppointmentRequestComponent {
  @Input() selectedDate: Date | null = null;
  @Input() selectedValue: string = '';
  // showModal: boolean = false;
  // @Input() selectedOption: string = '';
  constructor(public dialog: MatDialog, private appointmentService: AppointmentConfirmService ) { }
  appointments : Appointment[] =[
    { id: '0001', patientName: 'Anitha Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'anitha@gmail.com' },
    { id: '0571', patientName: 'Zona', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com'},
    { id: '0001', patientName: 'Nitish MK', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com' },
    { id: '0001', patientName: 'Nitish MK', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '27/09/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com' },
    { id: '0001', patientName: 'Nitish MK', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com' },
    { id: '0571', patientName: 'Lokesh P', phoneNumber: '987654321', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com' },
    { id: '0001', patientName: 'Nitish MK', phoneNumber: '770859010', doctorName: 'Dr. Nitish', therapy: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com' },
    // ...add more data
  ];
  // Dropdown options for filtering
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];
 
  // selectedSearchOption: string = this.selectedOption; // Default option to search by ID
  showAppointmentForm = false;  // Controls the visibility of the modal
  selectedAppointment: Appointment | null = null; 

  openAppointmentForm(appointment: Appointment) {

    this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
    this.showAppointmentForm = true;
    console.log('Selected appointment:', this.selectedAppointment);
}
  confirmAppointment(appointment: Appointment) {
    appointment.status = 'Confirmed';  // Mark as confirmed
    this.confirmedAppointments.push(appointment);  // Add to confirmed list
    this.closeAppointmentForm();  // Close the form
}
  closeAppointmentForm() {
    this.showAppointmentForm = false;
  }
  confirmedAppointments: Appointment[] = [];  // To hold confirmed appointments
  canceledAppointments: Appointment[] = []; 
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
    return [...this.filteredAppointments];
  }

  return [...this.filteredAppointments].sort((a, b) => {
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

filteredAppointments: Appointment[] = [...this.appointments];

ngOnChanges() {
  // Whenever the selected date changes, this will be triggered
  this.filterAppointment();
}

// Method to filter appointments by the selected date
filterAppointment() {
  let filteredList = [...this.appointments];

  if (this.selectedDate) {
    const formattedDate = this.formatDate(this.selectedDate);
    filteredList = filteredList.filter(appointment => appointment.date === formattedDate);
  }
  if (this.selectedValue.trim() !== '') {
    const searchLower = this.selectedValue.toLowerCase();
    filteredList = this.filteredAppointments.filter(appointment =>
      appointment.patientName.toLowerCase().includes(searchLower) ||
      appointment.phoneNumber.toLowerCase().includes(searchLower)
    );
    
  }
  else {
    // If no date is selected, show all appointments
    this.filteredAppointments = [...this.appointments];
  }
  this.filteredAppointments = filteredList;
  this.currentPage = 1;
}
submitAppointment(appointment: Appointment | null, status: string, requestVia: any) {
  console.log('Submitting appointment:', appointment, 'with status:', status);
  if (!appointment) {
      console.error('No appointment selected for submission.');
      return; // Early return if appointment is null or undefined
  }

  if (status === 'Confirm') {
    if (requestVia === 'Website'){
      requestVia = 'Website';
    }
    else{
      requestVia = 'Call';
    }
    const confirmedAppointment: Appointment = { 
      ...appointment,  // Copy all properties from the original appointment
      status: 'Booked', // Update the status
      smsSent: true,
      requestVia: requestVia         // Optionally add or modify properties as needed
    };
      // const confirmed = this.confirmedAppointments;
      console.log('Appointment status:', this.confirmedAppointments);
      this.appointmentService.addConfirmedAppointment(confirmedAppointment);
  } else if (status === 'Cancel') {
    if (requestVia === 'Website'){
      requestVia = 'Website';
    }
    else{
      requestVia = 'Call';
    }
      // this.canceledAppointments.push({ ...appointment, status: 'Cancelled' });
      const cancelledAppointment: Appointment = { 
        ...appointment,  // Copy all properties from the original appointment
        status: 'Cancelled', // Update the status
        smsSent: true,
        requestVia: requestVia        // Optionally add or modify properties as needed
      };
        // const confirmed = this.confirmedAppointments;
        console.log('Appointment status from cancel:', cancelledAppointment);
        this.appointmentService.addCancelledAppointment(cancelledAppointment);
  }

  // Remove the appointment from the request list based on phone number
  this.appointments = this.appointments.filter(a => a.phoneNumber !== appointment.phoneNumber);
  
  this.closeAppointmentForm();
  this.filterAppointment(); // Refresh the filtered appointments
}

// Utility method to format the date in 'dd/mm/yy' format
formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = date.getFullYear().toString().slice(-2); // Get last two digits of year
  return `${day}/${month}/${year}`;
}

// Method to return the filtered appointments for display
// getFilteredAppointments() {
//   return this.filteredAppointments;
// }
cancelAppointment(appointment: Appointment) {
  const cancel : Appointment = {
    ...appointment,
    status: 'Cancelled',
    smsSent: true,
    requestVia: 'Website'
  };
  this.appointmentService.addCancelledAppointment(cancel);
  this.appointments = this.appointments.filter(a => a.phoneNumber !== appointment.phoneNumber);
  console.log('Appointment status from cancel:', this.appointments);
  this.filterAppointment();
}
  
}
