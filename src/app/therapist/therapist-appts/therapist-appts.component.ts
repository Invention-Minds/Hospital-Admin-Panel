import { Component, Output, EventEmitter } from '@angular/core';
import { TherapyService } from '../../services/therapy/therapy.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { TherapyAppointment } from '../../services/therapy/therapy.service';

@Component({
  selector: 'app-therapist-appts',
  templateUrl: './therapist-appts.component.html',
  styleUrl: './therapist-appts.component.css'
})
export class TherapistApptsComponent {
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
    { label: 'PRN', value: 'prn' },
    { label: 'Therapy Name', value: 'therapyName' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  isLoading = false;
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  @Output() reschedule = new EventEmitter<any>();
  activeComponent: string = 'confirmed';
  confirmedServices: any[] = [];
  today:string = '';
  username: string = localStorage.getItem('username') || 'Unknown User';


  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
ngOnInit(): void {
this.fetchConfirmedAppointments();
this.userId = localStorage.getItem('userid')
  this.activeComponent = 'confirmed';
}

fetchConfirmedAppointments(): void {
  this.isLoading = true
  // const today = new Date();
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  this.today = `${year}-${month}-${day}`;
  this.userId = localStorage.getItem('userid')
  this.therapyService.todayCheckedInTherapies(this.userId).subscribe({
    next: (services: TherapyAppointment[]) => {
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
      this.isLoading=false
      // Optional: Actions to perform once the API call completes
      console.log('TherapyAppointment fetching process completed.');
    }
  });
  
}


onSearch(): void {

    this.filteredServices = this.confirmedAppointments.filter((service) => {
      let matches = true;

      // Filter by search option
      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'firstName':
            matches = service.name
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          // case 'prn':
          //   matches = service.prn?.toString().includes(this.searchValue);
          //   break;
          case 'therapyName':
            matches = !!service.therapy.name
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
  this.selectedSearchOption = 'firstName';
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
  completeAppointment(service: any): void {
    const payload = {
      entryDone: true,
      entryDoneBy: this.userId
    };

    this.therapyService.updateTherapyProgress(service.id, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Entry marked successfully!' });
        this.fetchConfirmedAppointments();
      }
    });

  // Update UI

  }
  startTherapy(service: any): void {
    const payload = {
      therapyStarted: true,
      startedBy: this.userId
    };
  
    this.therapyService.updateTherapyProgress(service.id, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Started', detail: 'Therapy started!' });
        this.fetchConfirmedAppointments();
      }
    });
  }
  finishTherapy(service: any): void {
    const payload = {
      therapyFinished: true,
      finishedBy: this.userId
    };
  
    this.therapyService.updateTherapyProgress(service.id, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Completed', detail: 'Therapy finished!' });
        this.fetchConfirmedAppointments();
      }
    });
  }
  cleanRoom(service: any): void {
    const payload = {
      cleanedAfterUse: true,
      cleanedAfterUseAt: new Date()
    };
  
    this.therapyService.updateTherapyProgress(service.id, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Cleaned', detail: 'Room cleaned successfully!' });
        this.fetchConfirmedAppointments();
      }
    });
  }
  postponeTherapy(appointment: any): void {
    const serviceId = appointment.id;
    if (!serviceId || appointment.checkedOut) return;
  
    const payload = {
      postponed: true,
      postponedBy: this.userId,
      entryDone: false,
      therapyStarted: false,
      therapyFinished: false
    };
  
    this.therapyService.updateTherapyProgress(serviceId, payload).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Postponed',
          detail: 'Therapy postponed successfully!',
        });
        console.log('Therapy appointment postponed:', response);
        this.fetchConfirmedAppointments();
      },
      error: (err) => {
        console.error('Error postponing therapy:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to postpone therapy.',
        });
      }
    });
  }
  
      
  cancelAppointment(service: any): void {
    if (!service.id) return;
    if(service.checkedOut){
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot cancel entry done appointments!' });
      return;
    }

    this.isLoading = true;
    

    this.therapyService.cancelTherapyAppointment(service.id, this.username).subscribe({
      next: (response) => {
        console.log('Appointment Cancelled:', response);
        service.status = 'Cancel'; // Update UI
        this.messageService.add({
          severity: 'success',
          summary: 'Appointment Cancelled',
          detail: `Appointment for ${service.firstName} has been cancelled.`,
        });
        const messagePayload = {
          radioServiceName: service.radioServiceName,
          appointmentDate: service.appointmentDate,
          appointmentTime: service.appointmentTime,
          firstName: service.firstName,
          lastName: service.lastName,
          phoneNumber: service.phoneNumber,
          appointmentStatus: 'Cancelled',
          requestVia: service.requestVia
        }
        const updateService = {...service}

        // const smsPayload = {
        //   patientName: service.firstName + ' ' + service.lastName,
        //   date: service.appointmentDate,
        //   time: service.appointmentTime,
        //   patientPhoneNumber: service.phoneNumber,
        //   status: 'Cancelled',
        //   packageName: service.radioServiceName,
        // }
        // this.therapyService.sendSmsMessage(smsPayload).subscribe({
        //   next: (response) => {
        //     console.log('SMS sent successfully:', response);
        //     // const smsPayload ={
        //     //   ...service,
        //     //   smsSent: true
        //     // }
        //     updateService.smsSent = true;
        //     this.therapyService.updateServiceMessageStatus(service.id!, {smsSent: true}).subscribe({
        //       next: (updateResponse) => {
        //         console.log('TherapyAppointment updated with smsSent status:', updateResponse);
        //       },
        //       error: (updateError) => {
        //         console.error('Error updating smsSent status in service:', updateError);
        //       },
        //       complete: () => {
        //         this.isLoading = false;
        //       },
        //     });
        //   },
        //   error: (error) => {
        //     console.error('Error sending SMS:', error);
        //     this.therapyService.updateServiceMessageStatus(service.id!, {smsSent: false}).subscribe({
        //       next: (updateResponse) => {
        //         console.log('TherapyAppointment updated with smsSent status:', updateResponse);
        //       },
        //       error: (updateError) => {
        //         console.error('Error updating smsSent status in service:', updateError);
        //       },
        //       complete: () => {
        //         this.isLoading = false;
        //       },
        //     });
        //   },
        // });
        // const appointmentDetails = {
        //   patientName: service.firstName + ' ' + service.lastName,
        //   packageName: service.radioServiceName ? service.radioServiceName : null,
        //   appointmentDate: service.appointmentDate,
        //   appointmentTime: service?.appointmentTime,
        // };
        // const status = 'Cancelled';
        // const patientEmail = service.email;
        // this.appointmentService.sendEmailHealthCheckup(patientEmail!,status,appointmentDetails).subscribe({
        //   next: (response) => {
        //     console.log('Email sent successfully:', response);
        //     // const emailPayload ={
        //     //   ...service,
        //     //   emailSent: true
        //     // }
        //     updateService.emailSent = true;
        //     this.therapyService.updateServiceMessageStatus(service.id!, {emailSent: true}).subscribe({
        //       next: (updateResponse) => {
        //         console.log('TherapyAppointment updated with emailSent status:', updateResponse);
        //       },
        //       error: (updateError) => {
        //         console.error('Error updating emailSent status in service:', updateError);
        //       },
        //       complete: () => {
        //         this.isLoading = false;
        //       },
        //     });
        //   },
        //   error: (error) => {
        //     console.error('Error sending email:', error);
        //     this.therapyService.updateServiceMessageStatus(service.id!, {emailSent: false}).subscribe({
        //       next: (updateResponse) => {
        //         console.log('TherapyAppointment updated with emailSent status:', updateResponse);
        //       },
        //       error: (updateError) => {
        //         console.error('Error updating emailSent status in service:', updateError);
        //       },
        //       complete: () => {
        //         this.isLoading = false;
        //       },
        //     });
        //   },
        // });
        this.fetchConfirmedAppointments(); // Refresh the list of appointments
      },
      error: (err) => {
        console.error('Error cancelling appointment:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to cancel the appointment. Please try again.',
        });
      },
      complete: () => (this.isLoading = false),
    });
  }


  ngOnDestroy(): void {
    // Unlock the service on component destroy if locked
    console.log('Destroying confirmed component...', this.activeComponent);
    if(this.activeServiceId && this.activeComponent !== 'form'){ 
      // this.unlockService();
    }
  }
 

}
