import { Component, Output, EventEmitter } from '@angular/core';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';





export interface Service {
  id?: number;
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
  repeatedDate?: string; // Array of repeated date strings
  createdAt?: string;
  fromDate?: string;
  toDate?: string;
  totalAppointments?: number;
  completedVisits?: number;
  pendingVisits?: number;
  repeatDates?: string[];
}
@Component({
  selector: 'app-health-checkup-repeat',
  templateUrl: './health-checkup-repeat.component.html',
  styleUrl: './health-checkup-repeat.component.css'
})
export class HealthCheckupRepeatComponent {

  constructor(private healthCheckupService: HealthCheckupServiceService, private messageService: MessageService, private router: Router, private appointmentService: AppointmentConfirmService) {
  
  }
  repeatedAppointments: any[] = [];
  filteredServices: Service[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Service | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  searchOptions = [
    { label: 'Patient Name', value: 'firstName' },
    { label: 'Phone Number', value: 'phoneNumber' },
    { label: 'Package Name', value: 'packageName' },
  ];
  selectedSearchOption: keyof Service = 'firstName';
  selectedDateRange: Date[] = [];
  isLoading = false;
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  @Output() reschedule = new EventEmitter<any>();
  activeComponent: string = 'confirmed';
  confirmedServices: Service[] = [];
  


  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
ngOnInit(): void {
this.fetchConfirmedAppointments();
this.userId = localStorage.getItem('userid')
  this.activeComponent = 'confirmed';
}

// fetchConfirmedAppointments(): void {
//   this.isLoading = true
//   const today = new Date();
//   this.healthCheckupService.getAllServices().subscribe({
//     next: (services: Service[]) => {
      
//       // Process the services when the API call is successful
//       this.repeatedAppointments = services.filter(
//         (service) => service.repeatChecked === true 
//       );
//       // this.repeatedAppointments = services.filter(
//       //   (service) => {
//       //     const appointmentDate = new Date(service.appointmentDate);
//       //     return (
//       //       (service.appointmentStatus === 'Confirm' || service.appointmentStatus === 'confirmed') &&
//       //       appointmentDate >= today // Filter out past dates
//       //     );
//       //   }
//       // );
//       this.repeatedAppointments.sort((a, b) => {
//         const dateA = new Date(a.createdAt!);
//         const dateB = new Date(b.createdAt!);
//         return dateB.getTime() - dateA.getTime();
//       });
//       this.filteredServices = [...this.repeatedAppointments];
//       console.log('Services processed successfully.');
//     },
//     error: (err) => {
//       // Handle the error if the API call fails
//       console.error('Error fetching services:', err);
//     },
//     complete: () => {
//       this.isLoading=false
//       // Optional: Actions to perform once the API call completes
//       console.log('Service fetching process completed.');
//     }
//   });
  
// }
fetchConfirmedAppointments(): void {
  this.isLoading = true;
  this.healthCheckupService.getAllServices().subscribe({
    next: (services: Service[]) => {
      const allServices = services; // All services fetched from the API

      // Filter only repeated appointments
      this.repeatedAppointments = services.filter(
        (service) => service.repeatChecked === true
      );

      // Enrich the data with additional computed fields
      this.repeatedAppointments = this.repeatedAppointments.map((service) => {
        const repeatedDates = service.repeatedDates || [];
        const repeatDates = [service.appointmentDate, ...repeatedDates.map((entry: any) => entry.date)];

        console.log(repeatDates);
        
        console.log(repeatedDates[repeatedDates.length - 1]);
        const fromDate = service.appointmentDate;
        const toDate = repeatedDates.length > 0
          ? repeatedDates[repeatedDates.length - 1].date
          : fromDate;

        const totalAppointments = repeatedDates.length + 1; // Include initial appointment
        const completedVisits = allServices.filter(
          (otherService) =>
            otherService.pnrNumber === service.pnrNumber && // Match by PNR
            otherService.appointmentStatus === 'complete' &&
            otherService.firstName === service.firstName &&
            otherService.lastName === service.lastName &&
            otherService.phoneNumber === service.phoneNumber &&
            otherService.packageName === service.packageName && 
            repeatDates.includes(otherService.appointmentDate) // Check status
             // Match initial date
        ).length;
        const pendingVisits = totalAppointments - completedVisits;

        return {
          ...service,
          fromDate,
          toDate,
          totalAppointments,
          completedVisits,
          pendingVisits,
          repeatDates
        };
      });

      this.filteredServices = [...this.repeatedAppointments];
      // console.log(this.filteredServices)
      console.log('Services processed successfully.');
    },
    error: (err) => {
      console.error('Error fetching services:', err);
    },
    complete: () => {
      this.isLoading = false;
      console.log('Service fetching process completed.');
    },
  });
}
stopRepeatedAppointments(service: Service): void {
  const today = new Date();
  const stopDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const { id: serviceId  } = service;
  this.isLoading = true;
if(serviceId){
  this.healthCheckupService.stopRepeat(serviceId, stopDate).subscribe({
    next: (response) => {
      console.log('Repeated dates stopped successfully:', response);
      this.messageService.add({
        severity: 'success',
        summary: 'Repeat Stopped',
        detail: response.message,
      });
    },
    error: (err) => {
      console.error('Error stopping repeated dates:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to stop repeated dates. Please try again.',
      });
    },
    complete: () => {
      this.isLoading = false;
    },
  });
}
}
onSearch(): void {

    this.filteredServices = this.repeatedAppointments.filter((service) => {
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
  this.filteredServices = [...this.repeatedAppointments];
}

// downloadLastWeekData(): void {
//   // Implement logic to download last week's data
//   console.log('Downloading last week\'s data...');
// }

// Method to clear input fields
onClear() {
  this.searchValue = '';
  this.selectedSearchOption = 'firstName';
  this.selectedDateRange = [];
  this.filteredServices = [...this.repeatedAppointments];
}

  sortedAppointments() {
    
    if (!this.sortColumn) {
      // console.log(this.filteredServices)
      // If no sorting column is selected, return the appointments as is (unsorted)
      return [...this.filteredServices];
    }


    return [...this.filteredServices].sort((a, b) => {
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
    return Math.ceil(this.repeatedAppointments.length / this.itemsPerPage);
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
    
    this.filteredServices.sort((a, b) => {
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


}
