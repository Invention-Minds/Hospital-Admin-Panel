import { Component, Input } from '@angular/core';
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
  created_at?: string;
}
@Component({
  selector: 'app-appointment-cancel',
  templateUrl: './appointment-cancel.component.html',
  styleUrl: './appointment-cancel.component.css'
})
export class AppointmentCancelComponent {
  cancelledAppointments: Appointment[] = [];
  constructor(private appointmentService: AppointmentConfirmService) {}
  // appointments: Appointment[] = [
  //   { id: '0001', patientName: 'Nitish MK', phoneNumber: '7708699010', doctorName: 'Dr. Nithish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Cancelled' },
  //   { id: '0002', patientName: 'Lokesh P', phoneNumber: '9876543211', doctorName: 'Dr. Nithish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Cancelled' },
  //   // Add more appointments here...
  // ];
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];

  showAppointmentForm = false;  // Controls the visibility of the modal
  selectedAppointment: Appointment | null = null; 
  confirmedAppointments: Appointment[] = []; 
  ngOnInit() {
    
    this.appointmentService.canceledAppointments$.subscribe(appointments => {
      if(appointments.some(appointment => appointment.status === 'confirmed')) {
        this.confirmedAppointments = appointments.filter(appointment => appointment.status !== 'confirmed');
      }
      this.cancelledAppointments = appointments;
      this.cancelledAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredAppointments = [...this.cancelledAppointments];
      console.log('Cancelled appointments from component in filtered:', this.filteredAppointments);
      console.log('Cancelled appointments from component:', this.cancelledAppointments);
    });
  }
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  @Input() selectedDate: Date | null = null;
  @Input() selectedValue: string = '';

  // Method to handle sorting by a specific column
  sortBy(column: keyof Appointment) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; // Toggle direction
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc'; // Default to ascending when a new column is clicked
    }
    if (column === 'date') {
      this.filteredAppointments.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return this.sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
    }
    this.currentPage = 1; // Reset to the first page when sorting changes
  }

  // Method to sort appointments based on the selected column and direction
  sortedAppointments() {
    if (!this.sortColumn) {
      return [...this.filteredAppointments];  // No sorting if the column is undefined
    }
console.log("sort", this.filteredAppointments)
    return [...this.filteredAppointments].sort((a, b) => {
      const valueA = a[this.sortColumn!]; // Using non-null assertion (!) to handle the sort column
      const valueB = b[this.sortColumn!];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0; // Default to no sorting if types are not strings
    });
  }

  // Method to return paginated appointments after sorting
  getPaginatedAppointments() {
    const sorted = this.sortedAppointments();
    console.log("sorted",sorted);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage); // Return paginated data
  }

  // Method to calculate total pages
  get totalPages() {
    return Math.ceil(this.cancelledAppointments.length / this.itemsPerPage);
  }

  // Method to go to the previous page
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Method to go to the next page
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Handle page number change
  onPageChange() {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  // Method to confirm appointment (changes status)
  // confirmAppointment(appointment: Appointment) {
  //   const index = this.cancelledAppointments.findIndex(a => a.id === appointment.id);
  //   if (index !== -1) {
  //     this.cancelledAppointments[index].status = 'Confirmed'; // Change status to confirmed
  //   }
  // }
  filteredAppointments: Appointment[] = [...this.cancelledAppointments];

  ngOnChanges() {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
  }
  
  // Method to filter appointments by the selected date
  filterAppointment() {
    let filteredList = [...this.cancelledAppointments];
    console.log('Filtered appointments in filter:', filteredList);
  
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
      this.filteredAppointments = [...this.cancelledAppointments];
    }
    this.filteredAppointments = filteredList;
    this.currentPage = 1;
  }

  // Utility method to format the date in 'dd/mm/yy' format
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear().toString().slice(-4); // Get last two digits of year
    return `${year}-${month}-${day}`;
  }

  // Method to return the filtered appointments for display
  getFilteredAppointments() {
    return this.filteredAppointments;
  }
  openAppointmentForm(appointment: Appointment) {

    this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
    this.showAppointmentForm = true;
    console.log('Selected appointment:', this.selectedAppointment);
}  
closeAppointmentForm() {
  this.showAppointmentForm = false;
}
submitAppointment(appointment: Appointment | null, status: string, requestVia: any) {
  console.log('Submitting appointment:', appointment, 'with status:', status);
  
  if (!appointment) {
      console.error('No appointment selected for submission.');
      return; // Early return if appointment is null or undefined
  }

  const confirmedAppointment: Appointment = { 
      ...appointment,  // Copy all properties from the original appointment
      smsSent: true,
      requestVia: requestVia === 'Website' ? 'Website' : 'Call', // Determine requestVia
  };

  if (status === 'Confirm') {
      confirmedAppointment.status = 'confirmed'; // Set the status to confirmed
      this.appointmentService.addConfirmedAppointment(confirmedAppointment);

      // Remove the confirmed appointment from the canceled appointments
      this.cancelledAppointments = this.cancelledAppointments.filter(a => a.phoneNumber !== appointment.phoneNumber);
      
  } else if (status === 'Cancel') {
      confirmedAppointment.status = 'Cancelled'; // Update the status
      this.appointmentService.addCancelledAppointment(confirmedAppointment);
  }

  // Additional filtering and updates
  this.closeAppointmentForm();
  this.filterAppointment(); // Refresh the filtered appointments
}

}
