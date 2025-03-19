import { Component, Output, EventEmitter } from '@angular/core';
import { HealthCheckupServiceService } from '../../../services/health-checkup/health-checkup-service.service';
import { AppointmentConfirmService } from '../../../services/appointment-confirm.service';
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
  patientType?: string;
  prefix?:string
}
@Component({
  selector: 'app-health-checkup-confirmed',
  templateUrl: './health-checkup-confirmed.component.html',
  styleUrl: './health-checkup-confirmed.component.css',
  providers: [ MessageService],
})
export class HealthCheckupConfirmedComponent {

  constructor(private healthCheckupService: HealthCheckupServiceService, private messageService: MessageService, private router: Router, private appointmentService: AppointmentConfirmService) {
  
  }
  confirmedAppointments: Service[] = [];
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
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  isLoading = false;
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  @Output() reschedule = new EventEmitter<any>();
  activeComponent: string = 'confirmed';
  confirmedServices: Service[] = [];
  today:string = ''


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
  this.healthCheckupService.getAllServices().subscribe({
    next: (services: Service[]) => {
      
      // Process the services when the API call is successful
      this.confirmedAppointments = services.filter(
        (service) => service.appointmentStatus === 'Confirm' || service.appointmentStatus === 'confirmed'
      );
      // this.confirmedAppointments = services.filter(
      //   (service) => {
      //     const appointmentDate = new Date(service.appointmentDate);
      //     return (
      //       (service.appointmentStatus === 'Confirm' || service.appointmentStatus === 'confirmed') &&
      //       appointmentDate >= today // Filter out past dates
      //     );
      //   }
      // );
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
      console.log('Service fetching process completed.');
    }
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

    this.filteredServices = this.confirmedAppointments.filter((service) => {
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
  this.filteredServices = [...this.confirmedAppointments];
}
downloadData(): void {
  if (this.filteredServices.length === 0) {
    console.warn('No data to download');
    return;
  }
  this.filteredServices.forEach((service) => {
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
  const csvContent = this.convertToCSV(this.filteredServices);
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
  completeAppointment(appointment: Service): void {
    const { id: serviceId } = appointment;
    if (appointment.appointmentDate > this.today) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot check-in for future appointments!' });
      return;
    }
    if (appointment.appointmentDate < this.today) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot check-in for past appointments!' });
      return;
    }
    const payload ={
      ...appointment,
      checkedIn: true,
    }
    if (!serviceId) return;

    this.healthCheckupService.updateService(serviceId,payload).subscribe({
      next: (response) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Checked In Successfully!' });
        console.log('Service marked as completed:', response);

        this.fetchConfirmedAppointments()

      }
    })

  // Update UI

  }
  openAppointmentForm(service: Service): void {
    // this.router.navigate(['/reschedule', service.id], {
    //   state: { data: service }, // Passing full service object using state
    // });
    this.lockService(service);
  }
  openAppointmentFormAfterLocked(service: Service): void {
    this.reschedule.emit(service);
  }
  cancelAppointment(service: Service): void {
    if (!service.id) return;

    this.isLoading = true;
    

    this.healthCheckupService.updateServiceStatus(service.id, 'Cancel').subscribe({
      next: (response) => {
        console.log('Appointment Cancelled:', response);
        service.appointmentStatus = 'Cancel'; // Update UI
        this.messageService.add({
          severity: 'success',
          summary: 'Appointment Cancelled',
          detail: `Appointment for ${service.firstName} has been cancelled.`,
        });
        const messagePayload = {
          packageName: service.packageName,
          appointmentDate: service.appointmentDate,
          appointmentTime: service.appointmentTime,
          firstName: service.firstName,
          lastName: service.lastName,
          phoneNumber: service.phoneNumber,
          appointmentStatus: 'Cancelled',
          requestVia: service.requestVia,
          prefix: service.prefix
        }
        const updateService = {...service}
        this.healthCheckupService.sendWhatsappMessageForService(messagePayload).subscribe({
          next: (response) => {
            console.log('Whatsapp message sent successfully:', response);
            // const whatsappPayload ={
            //   ...service,
            //   messageSent: true
            // }
            updateService.messageSent = true;
            this.healthCheckupService.updateServiceMessageStatus(service.id!, {messageSent: true}).subscribe({
              next: (updateResponse) => {
                console.log('Service updated with messageSent status:', updateResponse);
              },
              error: (updateError) => {
                console.error('Error updating messageSent status in service:', updateError);
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
          error: (error) => {
            console.error('Error sending whatsapp message:', error);
            this.healthCheckupService.updateServiceMessageStatus(service.id!, {messageSent: false}).subscribe({
              next: (updateResponse) => {
                console.log('Service updated with messageSent status:', updateResponse);
              },
              error: (updateError) => {
                console.error('Error updating messageSent status in service:', updateError);
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
        });
        const smsPayload = {
          patientName: service.firstName + ' ' + service.lastName,
          date: service.appointmentDate,
          time: service.appointmentTime,
          patientPhoneNumber: service.phoneNumber,
          status: 'Cancelled',
          packageName: service.packageName,
        }
        this.healthCheckupService.sendSmsMessage(smsPayload).subscribe({
          next: (response) => {
            console.log('SMS sent successfully:', response);
            // const smsPayload ={
            //   ...service,
            //   smsSent: true
            // }
            updateService.smsSent = true;
            this.healthCheckupService.updateServiceMessageStatus(service.id!, {smsSent: true}).subscribe({
              next: (updateResponse) => {
                console.log('Service updated with smsSent status:', updateResponse);
              },
              error: (updateError) => {
                console.error('Error updating smsSent status in service:', updateError);
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
          error: (error) => {
            console.error('Error sending SMS:', error);
            this.healthCheckupService.updateServiceMessageStatus(service.id!, {smsSent: false}).subscribe({
              next: (updateResponse) => {
                console.log('Service updated with smsSent status:', updateResponse);
              },
              error: (updateError) => {
                console.error('Error updating smsSent status in service:', updateError);
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
        });
        const appointmentDetails = {
          patientName: service.firstName + ' ' + service.lastName,
          packageName: service.packageName ? service.packageName : null,
          appointmentDate: service.appointmentDate,
          appointmentTime: service?.appointmentTime,
        };
        const status = 'Cancelled';
        const patientEmail = service.email;
        this.appointmentService.sendEmailHealthCheckup(patientEmail!,status,appointmentDetails).subscribe({
          next: (response) => {
            console.log('Email sent successfully:', response);
            // const emailPayload ={
            //   ...service,
            //   emailSent: true
            // }
            updateService.emailSent = true;
            this.healthCheckupService.updateServiceMessageStatus(service.id!, {emailSent: true}).subscribe({
              next: (updateResponse) => {
                console.log('Service updated with emailSent status:', updateResponse);
              },
              error: (updateError) => {
                console.error('Error updating emailSent status in service:', updateError);
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
          error: (error) => {
            console.error('Error sending email:', error);
            this.healthCheckupService.updateServiceMessageStatus(service.id!, {emailSent: false}).subscribe({
              next: (updateResponse) => {
                console.log('Service updated with emailSent status:', updateResponse);
              },
              error: (updateError) => {
                console.error('Error updating emailSent status in service:', updateError);
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
        });
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
  // Lock a service
  lockService(service: Service): void {
    if (!service.id) return;
    this.isLoading = true;
    this.healthCheckupService.lockService(service.id, this.userId).subscribe({
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
  handleLockedDialogClose(){
    this.isLockedDialogVisible = false;
  }
  // Unlock a service
  unlockService(): void {
    console.log('Unlocking service:', this.activeServiceId);
    if (!this.activeServiceId) return;
    this.isLoading = true;
    this.healthCheckupService.unlockService(this.activeServiceId).subscribe({
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
    if(this.activeServiceId && this.activeComponent !== 'form'){ 
      this.unlockService();
    }
  }

}
