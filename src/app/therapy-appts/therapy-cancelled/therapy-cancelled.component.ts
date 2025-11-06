import { Component, Output, EventEmitter } from '@angular/core';
import { TherapyService } from '../../services/therapy/therapy.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { TherapyAppointment } from '../../services/therapy/therapy.service';

@Component({
  selector: 'app-therapy-cancelled',
  templateUrl: './therapy-cancelled.component.html',
  styleUrl: './therapy-cancelled.component.css'
})
export class TherapyCancelledComponent {
  constructor(private therapyService: TherapyService, private messageService: MessageService, private router: Router, private appointmentService: AppointmentConfirmService) {

  }
  confirmedAppointments: any[] = [];
  filteredServices: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof TherapyAppointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  searchOptions = [
    { label: 'Patient Name', value: 'name' },
    { label: 'Phone Number', value: 'phone' },
    { label: 'Therapy Name', value: 'therapyName' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  isLoading = false;
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  @Output() reschedule = new EventEmitter<any>();
  activeComponent: string = 'cancelled';
  confirmedServices: any[] = [];
  today: string = '';
  isCheckInLocked: boolean = false; // Flag to check if check-in is locked


  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';
  username: string = localStorage.getItem('username') || '';

  // Selected date from calendar
  selectedDate: Date | null = null;
  ngOnInit(): void {
    this.fetchConfirmedAppointments();
    this.userId = localStorage.getItem('userid');
    this.activeComponent = 'cancelled';
  }

  fetchConfirmedAppointments(): void {
    this.isLoading = true
    // const today = new Date();
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;
    this.therapyService.getCancelledAppointments().subscribe({
      next: (services: any[]) => {

        // Process the services when the API call is successful
        this.confirmedAppointments = services

        this.confirmedAppointments.sort((a, b) => {
          const dateA = new Date(a.createdAt!);
          const dateB = new Date(b.createdAt!);
          return dateB.getTime() - dateA.getTime();
        });
        this.filteredServices = [...this.confirmedAppointments];
        console.log('Services processed successfully.');
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      },
      complete: () => {
        this.isLoading = false
        // Optional: Actions to perform once the API call completes
        console.log('Service fetching process completed.');
      }
    });

  }

  onSearch(): void {

    this.filteredServices = this.confirmedAppointments.filter((service) => {
      let matches = true;

      // Filter by search option
      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'name':
            matches = service.name
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          case 'phone':
            matches = service.phone?.includes(this.searchValue);
            break;
          case 'therapyName':
            matches = !!service.therapyName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
        }

      }

      // Filter by date range
      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(service.date);
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
          new Date(service.date).toDateString() === singleDate.toDateString();
      }

      console.log(matches);
      return matches;

    });
  }


  refresh() {
    this.selectedDateRange = [];
    this.filteredServices = [...this.confirmedAppointments];
  }
  downloadData(): void {
    if (this.filteredServices.length === 0) {
      console.warn('No data to download');
      return;
    }
    const csvContent = this.convertToCSV(this.filteredServices);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    FileSaver.saveAs(blob, 'confirmed_appointments.csv');
  }

  // Utility to Convert JSON to CSV
  private convertToCSV(data: TherapyAppointment[]): string {
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
  // downloadLastWeekData(): void {
  //   // Implement logic to download last week's data
  //   console.log('Downloading last week\'s data...');
  // }

  // Method to clear input fields
  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = 'name';
    this.selectedDateRange = [];
    this.filteredServices = [...this.confirmedAppointments];
  }

  sortedAppointments() {

    if (!this.sortColumn) {
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
    return Math.ceil(this.confirmedAppointments.length / this.itemsPerPage);
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
  sortBy(column: keyof TherapyAppointment): void {
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
      if (column === 'date') {
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
  completeAppointment(appointment: TherapyAppointment): void {
    const { id: serviceId } = appointment;
    if (appointment.date > this.today) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot check-in for future appointments!' });
      return;
    }
    if (appointment.date < this.today) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot check-in for past appointments!' });
      return;
    }


    this.therapyService.checkInTherapyAppointment(serviceId!, this.username).subscribe({
      next: (res: any) => {
        this.messageService.add({
          severity: "success",
          summary: "Checked In",
          detail: res.message,
        });
        appointment.checkedIn = true;

      },
      error: (err) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: err.error.message,
          });
      },
    });

    // Update UI

  }
  openAppointmentForm(service: TherapyAppointment): void {
    // this.router.navigate(['/reschedule', service.id], {
    //   state: { data: service }, // Passing full service object using state
    // });
    this.lockService(service);
    // this.openAppointmentFormAfterLocked(service);
  }
  openAppointmentFormAfterLocked(service: TherapyAppointment): void {
    this.reschedule.emit(service);
  }
  cancelAppointment(service: any): void {
    if (!service.id) return;
  
    this.isLoading = true;
  
    this.therapyService.cancelTherapyAppointment(service.id, this.username).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'info',
          summary: 'Cancelled',
          detail: `Appointment of ${service.name} has been cancelled.`,
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Failed to cancel appointment',
        });
        this.isLoading = false;
      }
    });
  }
  
  // Lock a service
  lockService(service: TherapyAppointment): void {
    if (!service.id) return;
    this.isLoading = true;
    this.therapyService.lockTherapyAppointment(service.id, this.userId).subscribe({
      next: (response) => {
        console.log('Service locked:', response);
        this.activeServiceId = service.id!;
        this.messageService.add({
          severity: 'success',
          summary: 'Locked',
          detail: `Service ID ${service.id} has been locked successfully.`,
        });
        this.openAppointmentFormAfterLocked(service);
        this.activeComponent = 'form';
      },
      error: (error) => {
        if (error.status === 409) {
          this.isLockedDialogVisible = true; // Show dialog if locked by another user
          console.warn('Service is already locked by another user.');
        } else {
          console.error('Error locking service:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to lock the service.',
          });
        }
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
  handleLockedDialogClose() {
    this.isLockedDialogVisible = false;
  }
  // Unlock a service
  unlockService(): void {
    console.log('Unlocking service:', this.activeServiceId);
    if (!this.activeServiceId) return;
    this.isLoading = true;
    this.therapyService.unlockTherapyAppointment(this.activeServiceId).subscribe({
      next: (response) => {
        console.log('Service unlocked:', response);
        this.activeServiceId = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Unlocked',
          detail: 'Service has been unlocked successfully.',
        });
        this.activeComponent = 'confirmed'; // Navigate back to the confirmed appointments
      },
      error: (error) => {
        console.error('Error unlocking service:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to unlock the service.',
        });
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    // Unlock the service on component destroy if locked
    console.log('Destroying confirmed component...', this.activeComponent);
    if (this.activeServiceId && this.activeComponent !== 'form') {
      this.unlockService();
    }
  }
  // checkLockStatus() {
  //   this.therapyService.getLockStatus().subscribe((res) => {
  //     this.isCheckInLocked = res.isActive;
  //   });
  // }
  // unlock(){
  //   this.therapyService.unlock().subscribe({
  //     next: (response) => {
  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Unlocked',
  //         detail: 'Check-in has been unlocked successfully.',
  //       });
  //       this.isCheckInLocked = false;
  //     },
  //     error: (error) => {
  //       console.error('Error unlocking check-in:', error);
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Error',
  //         detail: 'Failed to unlock check-in.',
  //       });
  //     }
  //   });
  // }

}
