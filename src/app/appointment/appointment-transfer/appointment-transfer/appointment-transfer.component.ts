import { Component, Output, EventEmitter } from '@angular/core';
import { HealthCheckupServiceService } from '../../../services/health-checkup/health-checkup-service.service';
import { AppointmentConfirmService } from '../../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';


@Component({
  selector: 'app-appointment-transfer',
  templateUrl: './appointment-transfer.component.html',
  styleUrl: './appointment-transfer.component.css'
})
export class AppointmentTransferComponent {

  constructor(private healthCheckupService: HealthCheckupServiceService, private messageService: MessageService, private router: Router, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService) {

  }
  confirmedAppointments: any[] = [];
  filteredServices: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof any | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Doctor Name', value: 'doctorName' },
    { label: 'Department', value: 'department' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  isLoading = false;
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  @Output() reschedule = new EventEmitter<any>();
  activeComponent: string = 'transfer';
  confirmedServices: any[] = [];


  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
  ngOnInit(): void {
    this.fetchConfirmedAppointments();
    this.userId = localStorage.getItem('userid')
    this.activeComponent = 'appointments';
  }

  fetchConfirmedAppointments(): void {
    this.isLoading = true
    const today = new Date();
    this.appointmentService.getAllAppointments().subscribe({
      next: (services: any[]) => {

        // Process the services when the API call is successful
        this.confirmedAppointments = services.filter(
          (service) => service.status === 'confirmed' && service.isTransfer === true
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
        // console.log('Services processed successfully.');
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      },
      complete: () => {
        this.isLoading = false
        // Optional: Actions to perform once the API call completes
        // console.log('Service fetching process completed.');
      }
    });

  }

  onSearch(): void {

    this.filteredServices = this.confirmedAppointments.filter((service) => {
      let matches = true;

      // Filter by search option
      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'patientName':
            matches = service.patientName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          case 'doctorName':
            matches = !!service.doctorName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          case 'departmentName':
            matches = !!service.department
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
        }

      }
      console.log(this.selectedDateRange)
      // Filter by date range
      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(service.date);
        const startDate = new Date(this.selectedDateRange[0]);
        const endDate = this.selectedDateRange[1]
          ? new Date(this.selectedDateRange[1])
          : startDate; // Use the same date for both start and end if it's a single date

        // Normalize endDate to include the full day
        const normalizedEndDate = new Date(endDate);
        console.log(endDate)
        normalizedEndDate.setHours(23, 59, 59, 999);

        if (startDate.getTime() === normalizedEndDate.getTime()) {
          console.log('start',startDate)
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
        console.log(singleDate)
        matches =
          matches &&
          new Date(service.date).toDateString() === singleDate.toDateString();
      }

      // console.log(matches);
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
        service.repeatedDate = ''; // Handle cases where repeatedDates is not available
      }
    });
    const csvContent = this.convertToCSV(this.filteredServices);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    FileSaver.saveAs(blob, 'confirmed_appointments.csv');
  }

  // Utility to Convert JSON to CSV
  private convertToCSV(data: any[]): string {
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
  sortBy(column: keyof any): void {
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
  completeAppointment(appointment: any): void {
    const { id: serviceId } = appointment;
    const payload = {
      ...appointment,
      status: 'completed',
    }
    if (!serviceId) return;

    this.appointmentService.individualComplete(payload).subscribe({
      next: (response) => {
        console.log('WhatsApp message sent successfully:', response);
        this.fetchConfirmedAppointments()
      },
      error: (error) => {
        console.error('Error sending WhatsApp message:', error);
      }
    });



    // Update UI

  }
  openAppointmentForm(service: any): void {
    // this.router.navigate(['/reschedule', service.id], {
    //   state: { data: service }, // Passing full service object using state
    // });
    this.lockService(service);
  }
  openAppointmentFormAfterLocked(service: any): void {
    this.reschedule.emit(service);
  }
  cancelAppointment(appointment: any) {
    // appointment.date = this.convertDateToISO(appointment.date);
    const cancel: any = {
      ...appointment,
      status: 'cancelled',
      requestVia: appointment.requestVia
    };

    this.appointmentService.addCancelledAppointment(cancel);
    // this.appointmentService.sendWhatsAppMessage(cancel).subscribe({
    //   next: (response) => {
    //     console.log('WhatsApp message sent successfully:', response);
    //   },
    //   error: (error) => {
    //     console.error('Error sending WhatsApp message:', error);
    //   }
    // });
    this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
      next: (response) => {
        const doctorPhoneNumber = response?.phone_number;
        const appointmentDetails = {
          patientName: appointment?.patientName,
          doctorName: appointment?.doctorName,
          date: appointment?.date,
          time: appointment?.time,
          doctorPhoneNumber: doctorPhoneNumber,
          patientPhoneNumber: appointment?.phoneNumber,
          status: 'cancelled'
        }

        this.appointmentService.sendSmsMessage(appointmentDetails).subscribe({
          next: (response) => {
            // console.log('SMS message sent successfully:', response);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMS message sent successfully!' });
          },
          error: (error) => {
            console.error('Error sending SMS message:', error);
          }
        });
        this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
          next: (response) => {
            // console.log('WhatsApp message sent successfully:', response);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'WhatsApp message sent successfully!' });
          },
          error: (error) => {
            console.error('Error sending WhatsApp message:', error);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending WhatsApp message!' });
          }
        });
      }

    });
    const appointmentDetails = {
      patientName: appointment?.patientName,
      doctorName: appointment?.doctorName,
      date: appointment?.date,
      time: appointment?.time,
    };
    const patientEmail = appointment.email;

    const emailStatus = 'cancelled';
    this.appointmentService.sendEmail(patientEmail, emailStatus, appointmentDetails, 'patient').subscribe({
      next: (response) => {
        // console.log('Email sent to patient successfully:', response);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully!' });
      },
      error: (error) => {
        console.error('Error sending email to patient:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to patient!' });
      },
    });
    this.fetchConfirmedAppointments()

  }
  // Lock a service
  lockService(service: any): void {
    if (!service.id) return;
    this.isLoading = true;
    this.healthCheckupService.lockService(service.id, this.userId).subscribe({
      next: (response) => {
        // console.log('Service locked:', response);
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
    // console.log('Unlocking service:', this.activeServiceId);
    if (!this.activeServiceId) return;
    this.isLoading = true;
    this.healthCheckupService.unlockService(this.activeServiceId).subscribe({
      next: (response) => {
        // console.log('Service unlocked:', response);
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
    // console.log('Destroying confirmed component...', this.activeComponent);
    if (this.activeServiceId && this.activeComponent !== 'form') {
      this.unlockService();
    }
  }

}