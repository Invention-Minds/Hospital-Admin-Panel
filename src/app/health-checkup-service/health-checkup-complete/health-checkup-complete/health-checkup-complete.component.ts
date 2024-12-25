import { Component } from '@angular/core';
import { HealthCheckupServiceService } from '../../../services/health-checkup/health-checkup-service.service';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';

export interface Service {
  pnrNumber: string;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  package?: string;
  appointmentDate: string; // Format: YYYY-MM-DD
  appointmentTime: string;
  repeatChecked: boolean;
  daysInterval?: number;
  numberOfTimes?: number;
  requestVia?: string;
  appointmentStatus?: string;
  repeatedDates?: string[]; // Array of repeated date strings
  smsSent?: boolean;
  emailSent?: boolean;
  messageSent?: boolean;
  checkedIn?: boolean;
  packageName?: string;
  packageId?: number;
  repeatedDate?: string; // Array of repeated date strings
  createdAt?: string;
}
@Component({
  selector: 'app-health-checkup-complete',
  templateUrl: './health-checkup-complete.component.html',
  styleUrl: './health-checkup-complete.component.css',
  providers: [MessageService]
})
export class HealthCheckupCompleteComponent {

  constructor(private healthCheckupService: HealthCheckupServiceService, private messageService: MessageService){}
  completedAppointments: Service[] = [];
  filteredAppointments: Service[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Service | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' },
    { label: 'Package Name', value: 'packageName' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  isLoading = false;


  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
ngOnInit(): void {
  this.fetchCompletedAppointments();
  
  
}
fetchCompletedAppointments(): void {
  this.isLoading = true; // Set loading to true before fetching data

  this.healthCheckupService.getAllServices().subscribe({
    next: (services: Service[]) => {
      // Filter and process confirmed appointments
      this.completedAppointments = services.filter(
        (service) =>
          service.appointmentStatus === 'Completed' || service.appointmentStatus === 'complete'
      );

      // Sort appointments by creation date (newest first)
      this.completedAppointments.sort((a, b) => {
        const dateA = new Date(a.createdAt!);
        const dateB = new Date(b.createdAt!);
        return dateB.getTime() - dateA.getTime();
      });

      // Store a copy for filtering
      this.filteredAppointments = [...this.completedAppointments];
      console.log('Confirmed appointments:', this.completedAppointments);
    },
    error: (error) => {
      // Log the error and optionally show a message to the user
      console.error('Error fetching confirmed appointments:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch confirmed appointments. Please try again later.'
      });

      // Reset appointments on error
      this.completedAppointments = [];
      this.filteredAppointments = [];
    },
    complete: () => {
      // Always stop loading when the observable completes
      this.isLoading = false;
      console.log('Finished processing confirmed appointments.');
    }
  });
}

  
onSearch(): void {

  this.filteredAppointments = this.completedAppointments.filter((service) => {
    let matches = true;

    // Filter by search option
    if (this.selectedSearchOption && this.searchValue && service) {
      switch (this.selectedSearchOption) {
        case 'firstName':
          matches = service.firstName
            ?.toLowerCase()
            .includes(this.searchValue.toLowerCase());
          break;
        case 'phoneNumber':
          matches = service.phoneNumber?.includes(this.searchValue);
          break;
        case 'packageName':
          matches = !!service.packageName
            ?.toLowerCase()
            .includes(this.searchValue.toLowerCase());
          break;
      }
      
    }

    // Filter by date range
    if (this.selectedDateRange && this.selectedDateRange.length) {
      const serviceDate = new Date(service.appointmentDate);
      const startDate = new Date(this.selectedDateRange[0]);
      const endDate = this.selectedDateRange[1]
        ? new Date(this.selectedDateRange[1])
        : startDate; // Use the same date for both start and end if it's a single date
    
      // Normalize endDate to include the full day
      const normalizedEndDate = new Date(endDate);
      normalizedEndDate.setHours(23, 59, 59, 999);
    
      if (startDate.getTime() === normalizedEndDate.getTime()) {
        // Single date selected
        matches =
          matches &&
          serviceDate.toDateString() === startDate.toDateString(); // Match only the date part
      } else {
        // Date range selected
        matches =
          matches &&
          serviceDate >= startDate &&
          serviceDate <= normalizedEndDate; // Match within the range
      }
    }
    
    // Filter by specific date
    if (this.selectedDate) {
      const singleDate = new Date(this.selectedDate);
      matches =
        matches &&
        new Date(service.appointmentDate).toDateString() === singleDate.toDateString();
    }
    
    console.log(matches);
    return matches;
    
  });
}
refresh() {
  this.selectedDateRange = [];
  this.filteredAppointments = [...this.completedAppointments];
}
downloadData(): void {
  if (this.filteredAppointments.length === 0) {
    console.warn('No data to download');
    return;
  }
  this.filteredAppointments.forEach((service) => {
    // Check if repeatedDates exists and is an array
    if (Array.isArray(service.repeatedDates)) {
      // Map to extract only the date property and join with commas
      const repeatedDates = service.repeatedDates
        .map((rd: any) => rd.date)
        .join(', ');
      service.repeatedDate = repeatedDates;
    } else {
       service.repeatedDate= ''; // Handle cases where repeatedDates is not available
    }
  });
  const csvContent = this.convertToCSV(this.filteredAppointments);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  FileSaver.saveAs(blob, 'confirmed_appointments.csv');
}

// Utility to Convert JSON to CSV
private convertToCSV(data: Service[]): string {
  const headers = Object.keys(data[0]).join(',');
  const rows = data
    .map((row) =>
      Object.values(row)
        .map((value) => `"${value}"`)
        .join(',')
    )
    .join('\n');

  return `${headers}\n${rows}`;
}

// Method to clear input fields
onClear() {
  this.searchValue = '';
  this.selectedSearchOption = this.searchOptions[0];
  // this.selectedDateRange = [];
}

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
  sortBy(column: keyof Service): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    this.filteredAppointments.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];
    
      // Handle appointmentDate separately
      if (column === 'appointmentDate') {
        const dateA = new Date(valueA as string); // Convert string to Date
        const dateB = new Date(valueB as string);
    
        return this.sortDirection === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
    
      // Sort strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
    
      // Sort numbers
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
    
      return 0; // Default case
    });
    
    this.currentPage = 1; // Reset to the first page after sorting
  }    
  completeAppointment(appointment: Service): void {}
  openAppointmentForm(appointment: Service): void {}
  cancelAppointment(appointment: Service): void {}

}

