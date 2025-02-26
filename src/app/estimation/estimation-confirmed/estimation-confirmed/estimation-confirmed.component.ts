import { Component, Output, EventEmitter } from '@angular/core';
import { EstimationService } from '../../../services/estimation/estimation.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-estimation-confirmed',
  templateUrl: './estimation-confirmed.component.html',
  styleUrl: './estimation-confirmed.component.css'
})
export class EstimationConfirmedComponent {


  constructor(private estimationService: EstimationService, private messageService: MessageService, private router: Router) { }
  pendingEstimations: any[] = [];
  filteredEstimations: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof any | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Estimation ID', value: 'estimationId' },
    { label: 'Doctor Name', value: 'consultantName' },
  ];
  isLoading = false;
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  activeComponent: string = 'cancelled'; // Default to the cancelled appointments view
  messageSent: boolean = false;
  selectedEstimation: any = []
  showCancelFeedback: boolean = false;
  feedback: string = '';
  cancellerId: string = '';
  cancellerName: string = '';
  role: string = '';
  adminType: string = '';
  receiptNumber: string = '';
  advanceAmount: string = '';
  showAdvancePopup: boolean = false

  @Output() reschedule = new EventEmitter<any>();
  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
  ngOnInit(): void {
    this.userId = localStorage.getItem('userid');
    this.adminType = localStorage.getItem('adminType') || ''
    this.activeComponent = 'request';
    this.cancellerId = localStorage.getItem('employeeId') || ''
    // this.cancellerName = localStorage.getItem('username') || '';
    this.role = localStorage.getItem('role') || '';
     this.role = this.role.replace(/_/g, ''); // Removes all underscores)
    this.cancellerName = localStorage.getItem('username')|| ''
    console.log(this.cancellerName.split(`_${this.role}`)[0])
    this.cancellerName = this.cancellerName.split(`_${this.role}`)[0];

    this.fetchPendingEstimations();
  }
  fetchPendingEstimations(): void {
    this.isLoading = true
    this.estimationService.getAllEstimation().subscribe({
      next: (estimation: any[]) => {
        console.log(estimation)

        // Process the services when the API call is successful
        this.pendingEstimations = estimation.filter(
          (estimation) => estimation.statusOfEstimation === 'confirmed'
        );
        console.log(this.pendingEstimations)
        this.pendingEstimations.sort((a, b) => {
          const dateA = new Date(a.estimationCreatedTime!);
          const dateB = new Date(b.estimationCreatedTime!);
          return dateA.getTime() - dateB.getTime();
        });
        this.filteredEstimations = [...this.pendingEstimations];
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

    this.filteredEstimations = this.pendingEstimations.filter((service) => {
      console.log(service)
      let matches = true;
      console.log(this.searchValue, this.selectedSearchOption)

      // Filter by search option
      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'patientName':
            matches = service.patientName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          case 'estimationId':
            matches = service.estimationId?.toLowerCase().includes(this.searchValue.toLowerCase());
            break;
          case 'consultantName':
            matches = !!service.consultantName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
        }

      }

      // Filter by date range
      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(service.estimatedDate);
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
          new Date(service.estimationDate).toDateString() === singleDate.toDateString();
      }

      console.log(matches);
      return matches;

    });
  }
  refresh() {
    this.selectedDateRange = []
    this.filteredEstimations = [...this.pendingEstimations]
  }
  downloadData(): void {
    // if (this.selectedDateRange && this.selectedDateRange.length > 0 && this.activeComponent === 'confirmed') {
    //   // Call the download method in the appointment confirm component
    //   this.appointmentConfirmComponent?.downloadFilteredData();
    // } 
    // else if(this.selectedDateRange && this.selectedDateRange.length > 0) {
    //   // console.log('Downloading completed appointments data...');
    //   // console.log(this.appointmentCompleteComponent)
    //   this.appointmentCompleteComponent?.downloadFilteredData();
    // }
    // else if(this.activeComponent === 'cancelled' && this.selectedDateRange && this.selectedDateRange.length > 0) {
    //   // console.log('Downloading cancelled appointments data...');
    //   this.appointmentCancelComponent?.downloadFilteredData();
    // }
    // else if(this.selectedDateRange && this.selectedDateRange.length === 0) {
    //   // Download last week's data if no component is active
    //   this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Select a date to download the report' });
    // }

  }
  // downloadLastWeekData(): void {
  //   // Implement logic to download last week's data
  //   console.log('Downloading last week\'s data...');
  // }

  // Method to clear input fields
  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = this.searchOptions[0];
    // this.selectedDateRange = [];
  }

  sortedAppointments() {

    if (!this.sortColumn) {
      // If no sorting column is selected, return the appointments as is (unsorted)
      return [...this.filteredEstimations];
    }


    return [...this.filteredEstimations].sort((a, b) => {
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
    return Math.ceil(this.pendingEstimations.length / this.itemsPerPage);
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
  sortBy(column: keyof any): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredEstimations.sort((a, b) => {
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
  completeAppointment(estimation: any): void {
    if(!estimation.pacDone && estimation.estimationType === 'SM'){
      this.messageService.add({
              severity: 'warn',
              summary: 'Need to do PAC',
              detail: `Kindly Do PAC`,
            });
      return
    }
    this.selectedEstimation = estimation;
    const estimationData = {
      estimationId: this.selectedEstimation.estimationId,
      updateFields: {
        statusOfEstimation: 'completed'
      }

    }
    this.estimationService.markComplete(estimationData.estimationId, estimationData).subscribe(
      (response) => {
        console.log('Estimation updated successfully:', response);
        this.fetchPendingEstimations()
      },
      (error) => {
        console.error('Error updating estimation:', error);
      }
    );

  }
  savePAC(estimation: any){
    this.selectedEstimation = estimation;
    const estimationData = {
      estimationId: this.selectedEstimation.estimationId,
      updateFields: {
        pacDone: true,
        pacAmountPaid: this.advanceAmount,
        pacReceiptNumber: this.receiptNumber
      }

    }
    this.estimationService.updateEstimationPacDone(estimationData.estimationId, estimationData).subscribe(
      (response) => {
        console.log('Estimation updated successfully:', response);
        this.fetchPendingEstimations();
        this.closeAdvancePopup()
      },
      (error) => {
        console.error('Error updating estimation:', error);
      }
    );
  }
  openAppointmentForm(service: any): void {
    // this.router.navigate(['/reschedule', service.id], {
    //   state: { data: service }, // Passing full service object using state
    // });
    // this.lockService(service);
    this.openAppointmentFormAfterLocked(service)
  }
  openAppointmentFormAfterLocked(service: any): void {
    this.reschedule.emit(service);
    console.log('Opening appointment form:', service);
  }

  openCancelFeedback(estimation: any) {
    if (this.adminType !== 'Senior Manager') {
      return;  // Do nothing if the user is not a Senior Manager
    }
  
    this.showCancelFeedback = true;
    this.selectedEstimation = estimation
  }
  closeCancelFeedback() {
    this.showCancelFeedback = false;
    this.feedback = '';
  }
  saveFeedback() {
    if (!this.selectedEstimation || !this.feedback.trim()) {
      return;
    }
    const estimationId = this.selectedEstimation.estimationId;
    const data = {
      statusOfEstimation: 'cancelled',
      cancellerId: this.cancellerId, // Replace with dynamic user ID if available
      cancellerName: this.cancellerName, // Replace with dynamic user name if available
      feedback: this.feedback,
    };
    this.estimationService.updateEstimationFeedback(estimationId, data).subscribe(
      (response) => {
        this.closeCancelFeedback();
        this.fetchPendingEstimations()
      },
      (error) => {
        console.error('Error saving feedback:', error);
      }
    );
  }

      openAdvancePopup(estimation: any): void {
      this.selectedEstimation = estimation
      this.showAdvancePopup = true;
    }
  
    closeAdvancePopup(): void {
      this.showAdvancePopup = false;
      this.advanceAmount = '',
      this.receiptNumber = ''

    }
  lockService(service: any): void {
    if (!service.id) return;

    // this.healthCheckupService.lockService(service.id, this.userId).subscribe({
    //   next: (response) => {
    //     console.log('Service locked:', response);
    //     this.activeServiceId = service.id!;
    //     this.messageService.add({
    //       severity: 'success',
    //       summary: 'Locked',
    //       detail: `Service ID ${service.id} has been locked successfully.`,
    //     });
    //     this.openAppointmentFormAfterLocked(service);
    //     this.activeComponent = 'form';
    //   },
    //   error: (error) => {
    //     if (error.status === 409) {
    //       this.isLockedDialogVisible = true; // Show dialog if locked by another user
    //       console.warn('Service is already locked by another user.');
    //     } else {
    //       console.error('Error locking service:', error);
    //       this.messageService.add({
    //         severity: 'error',
    //         summary: 'Error',
    //         detail: 'Failed to lock the service.',
    //       });
    //     }
    //   },
    // });
  }
  handleLockedDialogClose() {
    this.isLockedDialogVisible = false;
  }
  // Unlock a service
  unlockService(): void {
    console.log('Unlocking service:', this.activeServiceId);
    if (!this.activeServiceId) return;

    // this.healthCheckupService.unlockService(this.activeServiceId).subscribe({
    //   next: (response) => {
    //     console.log('Service unlocked:', response);
    //     this.activeServiceId = null;
    //     this.messageService.add({
    //       severity: 'success',
    //       summary: 'Unlocked',
    //       detail: 'Service has been unlocked successfully.',
    //     });
    //     this.activeComponent = 'confirmed'; // Navigate back to the confirmed appointments
    //   },
    //   error: (error) => {
    //     console.error('Error unlocking service:', error);
    //     this.messageService.add({
    //       severity: 'error',
    //       summary: 'Error',
    //       detail: 'Failed to unlock the service.',
    //     });
    //   },
    // });
  }
  ngOnDestroy(): void {
    // Unlock the service on component destroy if locked
    console.log('Destroying confirmed component...', this.activeComponent);
    if (this.activeServiceId && this.activeComponent !== 'form') {
      this.unlockService();
    }
  }
  cancelAppointment(appointment: any): void {


  }

}
