
import { Component, Output, EventEmitter } from '@angular/core';
import { EstimationService } from '../../services/estimation/estimation.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-estimation-cancel',
  templateUrl: './estimation-cancel.component.html',
  styleUrl: './estimation-cancel.component.css'
})
export class EstimationCancelComponent {


  constructor(private estimationService: EstimationService, private messageService: MessageService,private router: Router) { }
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
    { label: 'PRN', value: 'patientUHID'}
  ];
  isLoading = false;
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  activeComponent: string = 'cancelled'; // Default to the cancelled appointments view
  messageSent: boolean = false;

  @Output() reschedule = new EventEmitter<any>();
  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
  ngOnInit(): void {
    this.userId = localStorage.getItem('userid')
  this.activeComponent = 'request';

this.fetchPendingEstimations();
  }
  fetchPendingEstimations(): void {
    this.isLoading = true
    this.estimationService.getAllEstimation().subscribe({
      next: (estimation: any[]) => {
        console.log(estimation)
        
        // Process the services when the API call is successful
        this.pendingEstimations = estimation.filter(
          (estimation) => estimation.statusOfEstimation === 'cancelled'
        );
        console.log(this.pendingEstimations)
        this.pendingEstimations.sort((a, b) => {
          const dateA = new Date(a.cancellationDateAndTime!);
          const dateB = new Date(b.cancellationDateAndTime!);
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
        this.isLoading=false
        // Optional: Actions to perform once the API call completes
        console.log('Service fetching process completed.');
      }
    });
    
  }
  print(estimation: any): void {
    if (estimation.pdfLink) {
      const pdfWindow = window.open(estimation.pdfLink, '_blank'); // Open the PDF in a new tab
      if (pdfWindow) {
        pdfWindow.onload = () => {
          pdfWindow.print(); // Automatically triggers the print dialog
        };
      }
    } else {
      console.error("No PDF link available for this estimation.");
    }
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
          case 'patientUHID':
              const prnNumber = Number(service.patientUHID); // Convert to Number
              const searchNumber = Number(this.searchValue); // Convert to Number
              console.log(prnNumber, searchNumber);
    
              matches = !isNaN(searchNumber) && prnNumber === searchNumber;
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
  completeAppointment(appointment: any): void { }
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
  handleLockedDialogClose(){
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
    if(this.activeServiceId && this.activeComponent !== 'form'){ 
      this.unlockService();
    }
  }
   cancelAppointment(service: any): void {
    if (!service.id) return;

    this.isLoading = true;

    // this.healthCheckupService.updateServiceStatus(service.id, 'Cancel').subscribe({
    //   next: (response) => {
    //     console.log('Appointment Cancelled:', response);
    //     service.appointmentStatus = 'Cancel'; // Update UI
    //     this.messageService.add({
    //       severity: 'success',
    //       summary: 'Appointment Cancelled',
    //       detail: `Appointment for ${service.firstName} has been cancelled.`,
    //     });
    //     const updatedService = {...service}
    //     const messagePayload = {
    //       packageName: service.packageName,
    //       appointmentDate: service.appointmentDate,
    //       appointmentTime: service.appointmentTime,
    //       firstName: service.firstName,
    //       lastName: service.lastName,
    //       phoneNumber: service.phoneNumber,
    //       appointmentStatus: 'Cancelled',
    //       requestVia: service.requestVia
    //     }
    //     this.healthCheckupService.sendWhatsappMessageForService(messagePayload).subscribe({
    //       next: (response) => {
    //         console.log('Whatsapp message sent successfully:', response);
    //         // const whatsappPayload ={
    //         //   ...service,
    //         //   messageSent: true
    //         // }
    //         updatedService.messageSent = true;
    //         this.healthCheckupService.updateServiceMessageStatus(service.id!, {messageSent: true}).subscribe({
    //           next: (updateResponse) => {
    //             console.log('Service updated with messageSent status:', updateResponse);
    //             if(updateResponse.messageSent){
    //               this.messageSent = true;
    //             }
    //           },
    //           error: (updateError) => {
    //             console.error('Error updating messageSent status in service:', updateError);
    //           },
    //           complete: () => {
    //             this.isLoading = false;
    //           },
    //         });
    //       },
    //       error: (error) => {
    //         console.error('Error sending whatsapp message:', error);
    //         this.healthCheckupService.updateServiceMessageStatus(service.id!, {messageSent: false}).subscribe({
    //           next: (updateResponse) => {
    //             console.log('Service updated with messageSent status:', updateResponse);
    //           },
    //           error: (updateError) => {
    //             console.error('Error updating messageSent status in service:', updateError);
    //           },
    //           complete: () => {
    //             this.isLoading = false;
    //           },
    //         });
    //       },
    //     });
    //     const smsPayload = {
    //       patientName: service.firstName + ' ' + service.lastName,
    //       date: service.appointmentDate,
    //       time: service.appointmentTime,
    //       patientPhoneNumber: service.phoneNumber,
    //       status: 'Cancelled',
    //       packageName: service.packageName,
    //     }
    //     this.healthCheckupService.sendSmsMessage(smsPayload).subscribe({
    //       next: (response) => {
    //         console.log('SMS sent successfully:', response);
    //         // const smsPayload ={
    //         //   ...service,
    //         //   messageSent: this.messageSent,
    //         //   smsSent: true
    //         // }
    //         updatedService.smsSent = true;
    //         this.healthCheckupService.updateServiceMessageStatus(service.id!, {smsSent: true}).subscribe({
    //           next: (updateResponse) => {
    //             console.log('Service updated with smsSent status:', updateResponse);
    //           },
    //           error: (updateError) => {
    //             console.error('Error updating smsSent status in service:', updateError);
    //           },
    //           complete: () => {
    //             this.isLoading = false;
    //           },
    //         });
    //       },
    //       error: (error) => {
    //         console.error('Error sending SMS:', error);
    //         this.healthCheckupService.updateServiceMessageStatus(service.id!, {smsSent: false}).subscribe({
    //           next: (updateResponse) => {
    //             console.log('Service updated with smsSent status:', updateResponse);
    //           },
    //           error: (updateError) => {
    //             console.error('Error updating smsSent status in service:', updateError);
    //           },
    //           complete: () => {
    //             this.isLoading = false;
    //           },
    //         });
    //       },
    //     });
    //     const appointmentDetails = {
    //       patientName: service.firstName + ' ' + service.lastName,
    //       packageName: service.packageName ? service.packageName : null,
    //       appointmentDate: service.appointmentDate,
    //       appointmentTime: service?.appointmentTime,
    //     };
    //     const status = 'Cancelled';
    //     const patientEmail = service.email;
    //     this.appointmentService.sendEmailHealthCheckup(patientEmail!,status,appointmentDetails).subscribe({
    //       next: (response) => {
    //         console.log('Email sent successfully:', response);
    //         // const emailPayload ={
    //         //   ...service,
    //         //   emailSent: true
    //         // }
    //         updatedService.emailSent = true;
    //         this.healthCheckupService.updateServiceMessageStatus(service.id!, {emailSent: true}).subscribe({
    //           next: (updateResponse) => {
    //             console.log('Service updated with emailSent status:', updateResponse);
    //           },
    //           error: (updateError) => {
    //             console.error('Error updating emailSent status in service:', updateError);
    //           },
    //           complete: () => {
    //             this.isLoading = false;
    //           },
    //         });
    //       },
    //       error: (error) => {
    //         console.error('Error sending email:', error);
    //         this.healthCheckupService.updateServiceMessageStatus(service.id!, {emailSent: false}).subscribe({
    //           next: (updateResponse) => {
    //             console.log('Service updated with emailSent status:', updateResponse);
    //           },
    //           error: (updateError) => {
    //             console.error('Error updating emailSent status in service:', updateError);
    //           },
    //           complete: () => {
    //             this.isLoading = false;
    //           },
    //         });
    //       },
    //     });
    //     this.fetchPendingEstimations(); // Refresh the list of appointments
    //   },
    //   error: (err) => {
    //     console.error('Error cancelling appointment:', err);
    //     this.messageService.add({
    //       severity: 'error',
    //       summary: 'Error',
    //       detail: 'Failed to cancel the appointment. Please try again.',
    //     });
    //   },
    //   complete: () => (this.isLoading = false),
    // });
  }

}
