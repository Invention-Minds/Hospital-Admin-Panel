import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AppointmentFormComponent } from '../appointment-form/appointment-form.component';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { app } from '../../../../server';
interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  doctorId:number;
  department: string;
  date: string;
  time: string;
  status: string;
  email: string;
  smsSent?:boolean;
  requestVia?: string; // Optional property
  [key: string]: any;  // Add this line to allow indexing by string
}
@Component({
  selector: 'app-appointment-request',
  templateUrl: './appointment-request.component.html',
  styleUrl: './appointment-request.component.css'
})
export class AppointmentRequestComponent implements OnInit {
  @Input() selectedDate: Date | null = null;
  @Input() selectedValue: string = '';
  pendingAppointments: Appointment[] = [];

  // showModal: boolean = false;
  // @Input() selectedOption: string = '';
  constructor(public dialog: MatDialog, private appointmentService: AppointmentConfirmService ) { }

  ngOnInit(): void {
    this.fetchPendingAppointments();  // Fetch pending appointments on initialization
  }
  // appointments : Appointment[] =[
  //   { id: 1, patientName: 'Anitha Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/04/24', time: '9:00 - 9:15', status: 'Requested', email:'anitha@gmail.com',doctorId:1,smsSent:false},
  //   { id: 2, patientName: 'Zona', phoneNumber: '1234567890', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/04/24', time: '9:00 - 9:15', status: 'Requested', email:'nithish@gmail.com',doctorId:1,smsSent:false },
  //   { id: 3, patientName: 'Nithish', phoneNumber: '0123456789', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com',doctorId:1,smsSent:false  },
  //   { id: 4, patientName: 'Rithish', phoneNumber: '2345678901', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com',doctorId:1,smsSent:false  },
  //   { id: 5, patientName: 'Aaron', phoneNumber: '3456789012', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com',doctorId:1,smsSent:false  },
  //   { id: 6, patientName: 'Teju', phoneNumber: '4567890123', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '27/09/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com' ,doctorId:1,smsSent:false },
  //   { id: 7, patientName: 'Sandeep', phoneNumber: '5678901234', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com',doctorId:1,smsSent:false  },
  //   { id: 8, patientName: 'Vihan', phoneNumber: '6789012345', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com',doctorId:1,smsSent:false  },
  //   { id: 9, patientName: 'Ruhanshee', phoneNumber: '7890123456', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Requested', email:'nithish@gmail.com',doctorId:1,smsSent:false  },
  //   // ...add more data
  // ];
  fetchPendingAppointments(): void {
    this.appointmentService.fetchPendingAppointments().subscribe((appointments) => {
      this.pendingAppointments = appointments;
      console.log('Pending appointments:', this.pendingAppointments);
      this.filteredAppointments = [...this.pendingAppointments];
    });
  }
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
    appointment.status = 'confirmed';  // Mark as confirmed
    // this.confirmedAppointments.push(appointment);  // Add to confirmed list
    // this.closeAppointmentForm();  // Close the form
    this.pendingAppointments = this.pendingAppointments.filter(a => a.id !== appointment.id);  // Remove from pending list
    this.appointmentService.addConfirmedAppointment(appointment);  // Add to the confirmed appointments
    this.closeAppointmentForm();
    this.filterAppointment();  // Refresh the filtered appointments
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
  return Math.ceil(this.pendingAppointments.length / this.itemsPerPage);
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

filteredAppointments: Appointment[] = [...this.pendingAppointments];

ngOnChanges() {
  // Whenever the selected date changes, this will be triggered
  this.filterAppointment();
}

// Method to filter appointments by the selected date
filterAppointment() {
  let filteredList = [...this.pendingAppointments];

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
    this.filteredAppointments = [...this.pendingAppointments];
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
      status: 'confirmed', // Update the status
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
        status: 'cancelled', // Update the status
        smsSent: true,
        requestVia: requestVia        // Optionally add or modify properties as needed
      };
        // const confirmed = this.confirmedAppointments;
        console.log('Appointment status from cancel:', cancelledAppointment);
        this.appointmentService.addCancelledAppointment(cancelledAppointment);
  }

  // Remove the appointment from the request list based on phone number
  this.pendingAppointments = this.pendingAppointments.filter(a => a.phoneNumber !== appointment.phoneNumber);
  
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
// convertDateToISO(dateString: string): string {
//   const [month, day, year] = dateString.split('/');
//   return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Adjusting for 20XX century dates
// }
cancelAppointment(appointment: Appointment) {
  // appointment.date = this.convertDateToISO(appointment.date);
  const cancel : Appointment = {
    ...appointment,
    status: 'cancelled',
    smsSent: true,
    requestVia: 'Website'
  };
  console.log('Appointment status from cancel:', cancel);
  this.appointmentService.addCancelledAppointment(cancel);
  this.pendingAppointments = this.pendingAppointments.filter(a => a.phoneNumber !== appointment.phoneNumber);
  console.log('Appointment status from cancel:', this.pendingAppointments);
  this.filterAppointment();
}
  
}
