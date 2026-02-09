
import { Component, Output, EventEmitter } from '@angular/core';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { RadiologyService } from '../../services/radiology/radiology.service';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { MhcFormComponent } from "../mhc-form/mhc-form.component";

@Component({
  selector: 'app-mhc-today-consul',
  templateUrl: './mhc-today-consul.component.html',
  styleUrl: './mhc-today-consul.component.css',

})
export class MhcTodayConsulComponent {



  constructor(private healthCheckupService: HealthCheckupServiceService, private messageService: MessageService, private router: Router, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private radiologyService: RadiologyService) {

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
  @Output() radiology = new EventEmitter<any>();
  activeComponent: string = 'confirmed';
  confirmedServices: any[] = [];
  today: any = new Date().toLocaleDateString('en-CA');
  selectedAppointment: any;
  showForm: boolean = false;
  showLabPopup: boolean = false;


  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
  isCheckedIn: boolean = false; // ✅ Tracks whether Checked In has been clicked
  isReportDone: boolean = false; // ✅ Tracks whether Report Done has been clicked

  // ✅ Stores entry and report times
  radiologyTimes: any = {
    chestXRayEntryTime: null,
    chestXRayTime: null,
    ultrasoundEntryTime: null,
    ultrasoundTime: null,
    boneDensitometryEntryTime: null,
    boneDensitometryTime: null,
    mammographyEntryTime: null,
    mammographyTime: null,
    ecgEntryTime: null,
    ecgTime: null,
    echoTMTEntryTime: null,
    echoTMTTime: null,
  };
  ngOnInit(): void {
    this.fetchConfirmedAppointments();
    this.userId = localStorage.getItem('userid')
    this.activeComponent = 'appointments';
    const today = new Date().toLocaleDateString('en-CA');
    // const year = today.getFullYear();
    // const month = (today.getMonth() + 1).toString().padStart(2, '0');
    // const day = today.getDate().toString().padStart(2, '0');
    // this.today = `${year}-${month}-${day}`;
  }

  // fetchConfirmedAppointments(): void {
  //   this.isLoading = true
  //   const today = new Date();
  //   this.healthCheckupService.getAllServices().subscribe({
  //     next: (services: any[]) => {

  //       // Process the services when the API call is successful
  //       this.confirmedAppointments = services
  //       .filter(
  //         (service) =>
  //           service.appointmentStatus === 'Confirm' &&
  //           service.checkedIn === true &&
  //           service.appointmentDate === today.toLocaleDateString('en-CA')
  //       )
  //       .map((service) => ({
  //         ...service,
  //         consultationCount: service.package.deptIds
  //           ? service.package.deptIds.split(',').length
  //           : 0, // Count the number of department IDs
  //         radiologyCount: service.package.radioIds?
  //           service.package.radioIds.split(',').length:0
  //       }));
  //       console.log(this.confirmedAppointments)
  //       // this.confirmedAppointments = services.filter(
  //       //   (service) => {
  //       //     const appointmentDate = new Date(service.appointmentDate);
  //       //     return (
  //       //       (service.appointmentStatus === 'Confirm' || service.appointmentStatus === 'confirmed') &&
  //       //       appointmentDate >= today // Filter out past dates
  //       //     );
  //       //   }
  //       // );
  //       this.confirmedAppointments.sort((a, b) => {
  //         const dateA = new Date(a.createdAt!);
  //         const dateB = new Date(b.createdAt!);
  //         return dateB.getTime() - dateA.getTime();
  //       });
  //       this.filteredServices = [...this.confirmedAppointments];
  //       // console.log('Services processed successfully.');
  //     },
  //     error: (err) => {
  //       // Handle the error if the API call fails
  //       console.error('Error fetching services:', err);
  //     },
  //     complete: () => {
  //       this.isLoading = false
  //       // Optional: Actions to perform once the API call completes
  //       // console.log('Service fetching process completed.');
  //     }
  //   });

  // }
  fetchConfirmedAppointments(): void {
    this.isLoading = true;
    const today = new Date();
    this.healthCheckupService.getConfirmedAppointments().subscribe({
      next: (services: any[]) => {
        this.confirmedAppointments = services.filter(service =>
          service.checkedIn === true &&
          service.appointmentDate === today.toLocaleDateString('en-CA')
        )
        .map(service => {
          const consultationCount = service.package?.deptIds
            ? service.package.deptIds.split(',').length
            : 0; // Count the number of department IDs

          const radiologyCount = service.package?.radioIds
            ? service.package.radioIds.split(',').length
            : 0; // Count the number of radiology IDs
          return {
            ...service,
            consultationCount,
            radiologyCount,
          };
        });
      this.confirmedAppointments.sort((a, b) => {
        const dateA = new Date(a.createdAt!).getTime();
        const dateB = new Date(b.createdAt!).getTime();
        return dateB - dateA;
      });
      this.filteredServices = [...this.confirmedAppointments];

      console.log("Final Confirmed Appointments:", this.confirmedAppointments);
      },
      error: (err) => {
        console.error("Error fetching services:", err);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
  openForm(service: any): void {
    this.selectedAppointment = service; // Store selected service
    this.showForm = true; // Show the form modal
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
  // completeAppointment(appointment: any): void {

  //   const { id: serviceId, consultationDetails, radiologyDetails, consultationCount, radiologyCount, ...rest } = appointment;

  //   // Check if service ID exists
  //   if (!serviceId) return;

  //   // Extract lengths of details
  //   const consultationDetailsCount = consultationDetails ? consultationDetails.length : 0;
  //   const radiologyDetailsCount = radiologyDetails ? radiologyDetails.length : 0;

  //   console.log(consultationCount, consultationDetailsCount, radiologyDetailsCount, radiologyCount)

  //   // Compare with expected counts
  //   if (consultationDetailsCount < consultationCount || radiologyDetailsCount < radiologyCount) {
  //     // Show popup if details are missing
  //     this.showPopup = true;
  //     return; // Stop execution
  //   }

  //   // Proceed with API call if conditions are met
  //   const payload = {
  //    rest,
  //     status: 'completed',
  //   };

  //   this.healthCheckupService.individualComplete(payload).subscribe({
  //     next: (response) => {
  //       console.log('WhatsApp message sent successfully:', response);
  //       this.fetchConfirmedAppointments();
  //     },
  //     error: (error) => {
  //       console.error('Error sending WhatsApp message:', error);
  //     }
  //   });

  //   console.log(appointment)


  //   // Update UI

  // }
pendingAppointment: any = null; // Stores the appointment for confirmation

completeAppointment(appointment: any, forceComplete: boolean = false): void {
  const { consultationDetails, radiologyDetails, consultationCount, radiologyCount,total,radioServiceId,consultationTime, radiologyTime, labTime, ...rest } = appointment;

  // Check if service ID exists
  if (!appointment.id) return;

  // Extract lengths of details
  const consultationDetailsCount = consultationDetails ? consultationDetails.length : 0;
  const radiologyDetailsCount = radiologyDetails ? radiologyDetails.length : 0;

  console.log(consultationCount, consultationDetailsCount, radiologyDetailsCount, radiologyCount);

  // If not forcing completion, check details
  if (!forceComplete && (consultationDetailsCount < consultationCount || radiologyDetailsCount < radiologyCount)) {
    // Store appointment & Show popup
    this.pendingAppointment = appointment;
    this.showPopup = true;
    return;
  }

  // Proceed with API call if conditions are met or forced
  const payload = {
    ...rest, // Corrected object spread
    status: 'completed',
  };

  this.healthCheckupService.individualComplete(payload).subscribe({
    next: (response) => {
      console.log('WhatsApp message sent successfully:', response);
      this.fetchConfirmedAppointments();
    },
    error: (error) => {
      console.error('Error sending WhatsApp message:', error);
    }
  });

  // Close the popup after completion
  this.showPopup = false;
  this.pendingAppointment = null;

  console.log(appointment);
}

// Function to confirm completion from popup
confirmCompletion(): void {
  if (this.pendingAppointment) {
    this.completeAppointment(this.pendingAppointment, true);
  }
}



  labTime(): void {
    const { id, package: packageDate, packageId, consultationCount,consultationDetails,radiologyDetails,radiologyCount,total,radioServiceId,consultationTime, radiologyTime, labTime, ...withoutServiceId } = this.selectedService;

    const payload = {
      ...withoutServiceId,
      isLab: true,
      isLabTime: new Date(),
    }
    if (!id) return;
    const messagePayload = {
      firstName: this.selectedService.firstName,
      lastName: this.selectedService.lastName,
      phoneNumber: this.selectedService.phoneNumber,
      prefix: this.selectedService.prefix,
    }
    this.healthCheckupService.updateService(id, payload).subscribe({
      next: (response) => {
        console.log('Service marked as completed:', response);
        this.fetchConfirmedAppointments()
        this.showLabPopup = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Lab is updated successfully!' });
        this.radiologyService.sendLabDone(messagePayload).subscribe({
          next: (response) =>{
            console.log('Whatsapp message sent successfully:', response);
          }
        })

      }
    })
  }
  labEntryTime(): void {
    const { id, package: packageDate, packageId, consultationCount,consultationDetails,radiologyDetails,radiologyCount,total,radioServiceId,consultationTime, radiologyTime, labTime, ...withoutServiceId } = this.selectedService;

    const payload = {
      ...withoutServiceId,
      isLabEntryTime: new Date(),
    }
    if (!id) return;
    this.healthCheckupService.updateService(id, payload).subscribe({
      next: (response) => {
        console.log('Service marked as completed:', response);
        this.fetchConfirmedAppointments()
        this.showLabPopup = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Lab is updated successfully!' });

      }
    })
  }
  openAppointmentForm(service: any): void {
    // this.router.navigate(['/reschedule', service.id], {
    //   state: { data: service }, // Passing full service object using state
    // });
    this.lockService(service);
  }
  openRadiologyForm(service: any): void {
    this.radiology.emit(service);
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
          status: 'cancelled',
          prefix: appointment.prefix
        }

        // this.appointmentService.sendSmsMessage(appointmentDetails).subscribe({
        //   next: (response) => {
        //     // console.log('SMS message sent successfully:', response);
        //     this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMS message sent successfully!' });
        //   },
        //   error: (error) => {
        //     console.error('Error sending SMS message:', error);
        //   }
        // });
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
        console.log(service)
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
  showPopup: boolean = false;
  selectedService: any = null;

  // Radiology test states (each service will have its own)
  chestXRay: boolean = false;
  ultrasound: boolean = false;
  boneDensitometry: boolean = false;
  mammography: boolean = false;
  ecg: boolean = false;
  echoTMT: boolean = false;
  // usgEcho: boolean = false;

  // Timestamps
  chestXRayTime: any | null = null;
  ultrasoundTime: any | null = null;
  boneDensitometryTime: any | null = null;
  mammographyTime: any | null = null;
  ecgTime: any | null = null;
  echoTMTTime: any | null = null;
  // usgEchoTime: string | null = null;



  /** Open popup for the selected service */
  openPopup(service: any) {
    this.selectedService = service;
    this.showPopup = true;

    // ✅ Load previously selected values if the service was updated before
    this.chestXRay = service.chestXRay || false;
    this.ultrasound = service.ultrasound || false;
    this.boneDensitometry = service.boneDensitometry || false;
    this.mammography = service.mammography || false;
    this.ecg = service.ecg || false;
    this.echoTMT = service.echoTMT || false;
    // this.usgEcho = service.usgEcho || false;

    this.chestXRayTime = service.chestXRayTime || null;
    this.ultrasoundTime = service.ultrasoundTime || null;
    this.boneDensitometryTime = service.boneDensitometryTime || null;
    this.mammographyTime = service.mammographyTime || null;
    this.ecgTime = service.ecgTime || null;
    this.echoTMTTime = service.echoTMTTime || null;
    // this.usgEchoTime = service.usgEchoTime || null;
  }
  openLabPopup(service: any) {
    this.selectedService = service;
    this.showLabPopup = true;
  }

  /** Close the popup */
  closePopup() {
    this.showPopup = false;
  }

  closeLabPopup() {
    this.showLabPopup = false;
    this.selectedService = null;
  }

  /** Submit the selected radiology tests */
  submitSelection() {
    if (!this.selectedService) return;

    const currentTime = new Date().toLocaleString(); // Capture timestamp

    // ✅ Set timestamps only for newly selected tests
    if (this.chestXRay && !this.chestXRayTime) this.chestXRayTime = new Date();
    if (this.ultrasound && !this.ultrasoundTime) this.ultrasoundTime = new Date();
    if (this.boneDensitometry && !this.boneDensitometryTime) this.boneDensitometryTime = new Date();
    if (this.mammography && !this.mammographyTime) this.mammographyTime = new Date();
    if (this.ecg && !this.ecgTime) this.ecgTime = new Date();
    if (this.echoTMT && !this.echoTMTTime) this.echoTMTTime = new Date();
    // if (this.usgEcho && !this.usgEchoTime) this.usgEchoTime = currentTime;

    const { id: serviceId } = this.selectedService;
    if (!serviceId) return;
    const { id, package: packageDate, packageId, consultationCount, ...withoutServiceId } = this.selectedService;
    const payload = {
      ...withoutServiceId,
      chestXRay: this.chestXRay,
      ultrasound: this.ultrasound,
      boneDensitometry: this.boneDensitometry,
      mammography: this.mammography,
      ecg: this.ecg,
      echoTMT: this.echoTMT,
      // usgEcho: this.usgEcho,
      chestXRayTime: this.chestXRayTime,
      ultrasoundTime: this.ultrasoundTime,
      boneDensitometryTime: this.boneDensitometryTime,
      mammographyTime: this.mammographyTime,
      ecgTime: this.ecgTime,
      echoTMTTime: this.echoTMTTime,
      // usgEchoTime: this.usgEchoTime
    };

    // ✅ Update service via API
    this.healthCheckupService.updateService(serviceId, payload).subscribe({
      next: (response) => {
        console.log('Service updated:', response);
        this.closePopup(); // Close popup after update
        this.fetchConfirmedAppointments()
      }
    });
  }
  // markCheckedIn() {
  //   if (!this.isCheckedIn) {
  //     const currentTime = new Date().toISOString();

  //     // ✅ Set all "EntryTime" fields with current time
  //     Object.keys(this.radiologyTimes).forEach((key) => {
  //       if (key.includes("EntryTime") && !this.radiologyTimes[key]) {
  //         this.radiologyTimes[key] = currentTime;
  //       }
  //     });

  //     this.isCheckedIn = true; // ✅ Disable Checked In button
  //     console.log("Checked In at:", this.radiologyTimes);

  //   }
  // }

  // // ✅ Function for Report Done
  // markReportDone() {
  //   if (this.isCheckedIn && !this.isReportDone) {
  //     const currentTime = new Date().toISOString();

  //     // ✅ Set all "Time" fields with current time
  //     Object.keys(this.radiologyTimes).forEach((key) => {
  //       if (key.includes("Time") && !this.radiologyTimes[key]) {
  //         this.radiologyTimes[key] = currentTime;
  //       }
  //     });

  //     this.isReportDone = true; // ✅ Disable Report Done button
  //     console.log("Report Done at:", this.radiologyTimes);
  //   }
  // }
  markCheckedIn() {
    if (!this.isCheckedIn) {
      const currentTime = new Date().toISOString();

      // ✅ Create a copy of the service object to preserve all fields
      let payload: any = { ...this.selectedService };

      // ✅ Update all "EntryTime" fields
      Object.keys(payload).forEach((key) => {
        if (key.includes("EntryTime") && !payload[key]) {
          payload[key] = currentTime;
        }
      });
      payload.chestXRayEntryTime = currentTime
      payload.ultrasoundEntryTime = currentTime
      payload.boneDensitometryEntryTime = currentTime
      payload.mammographyEntryTime = currentTime
      payload.ecgEntryTime = currentTime
      payload.echoTMTEntryTime = currentTime
      payload.usgEchoEntryTime = currentTime

      // payload.checkedIn = true; // ✅ Mark service as checked in
      // payload.checkedInTime = currentTime; // ✅ Set general checked-in time

      console.log("Checked In Payload:", payload);
      const { id, package: packageDate, packageId, consultationCount,consultationDetails,radiologyDetails,radiologyCount, ...withoutServiceId } = payload;

      // ✅ Update Service in Backend
      this.healthCheckupService.updateService(this.selectedService.id, withoutServiceId).subscribe({
        next: (response) => {
          console.log('Service Updated:', response);
          this.closePopup(); // ✅ Close popup after update
          this.fetchConfirmedAppointments(); // ✅ Refresh data
        },
        error: (error) => {
          console.error('Error updating service:', error);
        }
      });

      this.isCheckedIn = true; // ✅ Disable Checked In button
    }
  }

  markReportDone() {
    console.log(this.selectedService)
    if (this.selectedService.chestXRayEntryTime && this.selectedService.chestXRayTime === null) {
      const currentTime = new Date().toISOString();

      // ✅ Create a copy of the service object to preserve all fields
      let payload: any = { ...this.selectedService };

      // ✅ Update all "Time" fields
      // Object.keys(payload).forEach((key) => {
      //   // ✅ Update only if the key ends exactly with "Time" (e.g., chestXRayTime, ultrasoundTime)
      //   if (key.endsWith("Time") && typeof payload[key] === "string" && !payload[key]) {
      //     payload[key] = currentTime;
      //   }
      // });
      payload.chestXRayTime = currentTime
      payload.ultrasoundTime = currentTime
      payload.boneDensitometryTime = currentTime
      payload.mammographyTime = currentTime
      payload.ecgTime = currentTime
      payload.echoTMTTime = currentTime
      payload.usgEchoTime = currentTime


      console.log("Report Done Payload:", payload);
      const { id, package: packageDate, packageId, consultationCount,consultationDetails,radiologyDetails,radiologyCount, ...withoutServiceId } = payload;

      // ✅ Update Service in Backend
      this.healthCheckupService.updateService(this.selectedService.id, withoutServiceId).subscribe({
        next: (response) => {
          console.log('Service Updated:', response);
          this.closePopup(); // ✅ Close popup after update
          this.fetchConfirmedAppointments(); // ✅ Refresh data
        },
        error: (error) => {
          console.error('Error updating service:', error);
        }
      });

      this.isReportDone = true; // ✅ Disable Report Done button
    }
  }


}
