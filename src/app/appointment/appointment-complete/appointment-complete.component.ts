import { Component,Input } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
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
  emailSent?:boolean;
  requestVia?: string; // Optional property
  created_at?: string;
}
@Component({
  selector: 'app-appointment-complete',
  templateUrl: './appointment-complete.component.html',
  styleUrl: './appointment-complete.component.css'
})
export class AppointmentCompleteComponent {
  completedAppointments: Appointment[] = [];

  constructor(private appointmentService: AppointmentConfirmService) {}
  appointments: Appointment[] = [
    // { id: '0001', patientName: 'Anitha Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Booked', smsSent: true },
  ];

  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  @Input() selectedDate: Date | null = null;
  @Input() selectedValue: string = '';

  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];
  // Method to handle sorting by a specific column
  ngOnInit() {
    // this.appointmentService.completedAppointments$.subscribe(appointments => {
    //   this.completedAppointments = appointments;
    //   this.filteredAppointments = [...this.completedAppointments];
    //   console.log('Confirmed appointments from component:', this.completedAppointments);
    this.appointmentService.completedAppointments$.subscribe(appointments => {
      this.completedAppointments = appointments;
      this.completedAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredAppointments = [...this.completedAppointments];
    });
  
    // Fetch appointments from backend to initialize the data
    this.appointmentService.fetchAppointments();
    // });
  }
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
      // If no sorting column is selected, return the appointments as is (unsorted)
      return [...this.filteredAppointments];
    }

    return [...this.filteredAppointments].sort((a, b) => {
      const valueA = a[this.sortColumn!]; // Use the non-null assertion operator (!) to tell TypeScript sortColumn is defined
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
    const sorted = this.sortedAppointments();  // First, sort the data (or not)
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage); // Return paginated data
  }

  // Method to calculate total pages
  get totalPages() {
    return Math.ceil(this.completedAppointments.length / this.itemsPerPage);
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
  filteredAppointments: Appointment[] = [...this.completedAppointments];

  ngOnChanges() {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
  }
  
  // Method to filter appointments by the selected date
  filterAppointment() {
    let filteredList = [...this.completedAppointments];
  
    if (this.selectedDate) {
      const formattedDate = this.formatDate(this.selectedDate);
      filteredList = filteredList.filter(completedAppointments => completedAppointments.date === formattedDate);
    }
    if (this.selectedValue.trim() !== '') {
      const searchLower = this.selectedValue.toLowerCase();
      filteredList = this.filteredAppointments.filter(completedAppointments =>
        completedAppointments.patientName.toLowerCase().includes(searchLower) ||
        completedAppointments.phoneNumber.toLowerCase().includes(searchLower)
      );

    }
    else {
      // If no date is selected, show all appointments
      this.filteredAppointments = [...this.completedAppointments];
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
  completeAppointment(appointment: Appointment) {
    const completed : Appointment = {
      ...appointment,
      status: 'completed',
      smsSent: true,
      emailSent: true,
      requestVia: appointment.requestVia
    };
    this.appointmentService.addCompletedAppointment(completed);
    this.filterAppointment();
  }
  // Method to return the filtered appointments for display
  // getFilteredAppointments() {
  //   return this.filteredAppointments;
  // }
}


