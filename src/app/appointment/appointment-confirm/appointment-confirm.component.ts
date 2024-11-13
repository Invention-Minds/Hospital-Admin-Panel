import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import * as XLSX from 'xlsx';
import { start } from 'node:repl';

interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  doctorId: number;
  department: string;
  date: string;
  time: string;
  status: string;
  email: string;
  smsSent?: boolean;
  emailSent?: boolean;
  requestVia?: string; // Optional property
  created_at?: string;
  checkedIn?:boolean;
  user?: any;
}
@Component({
  selector: 'app-appointment-confirm',
  templateUrl: './appointment-confirm.component.html',
  styleUrl: './appointment-confirm.component.css',
  providers: [MessageService]
})
export class AppointmentConfirmComponent {
  confirmedAppointments: Appointment[] = [];

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService,private messageService: MessageService, private cdRef: ChangeDetectorRef) { }
  appointments: Appointment[] = [
    // { id: '0001', patientName: 'Anitha Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Booked', smsSent: true },
  ];

  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  @Input() selectedDateRange: Date[] | null = null;
  @Input() selectedValue: string = '';
  @Input() selectedSearchOption: string = ''; 
  completed: boolean = false;
  showAppointmentForm = false;  // Controls the visibility of the modal
  selectedAppointment: Appointment | null = null; 
  activeAppointmentId: number | null | undefined = null;
  userId: any = 0;
  isLockedDialogVisible: boolean = false; // To control the visibility of the lock dialog
  cancelledAppointments: Appointment[] = [];
  filteredList: any;
  lastWeekAppointments: any[] = [];  

  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];
  // Method to handle sorting by a specific column
  ngOnInit() {
    // this.appointmentService.confirmedAppointments$.subscribe(appointments => {
    //   this.confirmedAppointments = appointments;
    //   this.filteredAppointments = [...this.confirmedAppointments];
    //   console.log('Confirmed appointments from component:', this.confirmedAppointments);
  //   const savedAppointments = localStorage.getItem('appointments');
  // if (savedAppointments) {
  //   this.appointments = JSON.parse(savedAppointments);
  // } else {
  //   // Fetch appointments from the backend for the first time
  //       // Fetch appointments from backend to initialize the data
  //       this.appointmentService.fetchAppointments();
  // }
  this.appointmentService.fetchAppointments();
    this.appointmentService.confirmedAppointments$.subscribe(appointments => {
      this.confirmedAppointments = appointments;
      this.confirmedAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      // console.log("confirmedAppointments",this.confirmedAppointments);
      this.filteredAppointments = [...this.confirmedAppointments];
      // this.filteredAppointments = this.confirmedAppointments.filter(appointment => !appointment!.completed);

    });


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
  filteredAppointments: Appointment[] = [...this.confirmedAppointments];
  // filteredAppointments: Appointment[] = this.confirmedAppointments.filter(appointment => !appointment!.completed);

  ngOnChanges(changes: SimpleChanges) {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
    // if (changes['selectedDateRange']) {
    //   console.log('Selected date range:', this.selectedDateRange);
    //   this.filterAppointment();
    //   this.cdRef.detectChanges();  // Manually trigger change detection
    // }
  }

  // Method to filter appointments by the selected date
  // filterAppointment() {
  //   this.filteredList = [...this.confirmedAppointments];

  //   // if (this.selectedDateRange) {
  //   //   // const formattedDate = this.formatDate(this.selectedDateRange);
  //   //   // this.filteredList = this.filteredList.filter(confirmedAppointments => confirmedAppointments.date === formattedDate);
  //   //   this.filteredList = this.confirmedAppointments.filter(
  //   //     (appointment) => appointment.date === formattedDate
  //   //   );
  //   // }
  //   console.log('Selected date range:', this.selectedDateRange);
  //   if (this.selectedDateRange && this.selectedDateRange.length === 2) {
  //     const startDate = this.selectedDateRange[0];
  //     const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // If endDate is null, use startDate
  //     console.log('Start date:', startDate, 'End date:', endDate);
  //     console.log(this.selectedDateRange)
  //     if (startDate && endDate) {
  //       console.log('Start date:', startDate, 'End date:', endDate);
  //       if (startDate.getTime() === endDate.getTime()) {
  //         console.log('Single date selected:', startDate);
  //         // Handle the case where a single day is selected (start and end dates are the same)
  //         this.filteredList = this.filteredList.filter((confirmedAppointments: Appointment) => {
  //           const appointmentDate = new Date(confirmedAppointments.date);
  //           return appointmentDate >= startDate && appointmentDate <= endDate;
           
  //         });
  //       } else {
  //         // Handle the case where a date range is selected
  //         this.filteredList = this.filteredList.filter((confirmedAppointments: Appointment) => {
  //           const appointmentDate = new Date(confirmedAppointments.date);
  //           return appointmentDate.toDateString() === startDate.toDateString();
  //         });
  //       }
  //       console.log('Appointment Date:', this.filteredList);
  //     } else {
  //       // If either startDate or endDate is null, set filteredAppointments to an empty array
  //       this.filteredAppointments = [];
  //     }
  //   } else {
  //     // If no valid range is selected, show all appointments
  //     this.filteredAppointments = [...this.confirmedAppointments];
  //   }
  //   if (this.selectedValue.trim() !== '') {
  //     const searchLower = this.selectedValue.toLowerCase();
  //     this.filteredList = this.filteredAppointments.filter((appointment) => {
  //       console.log('Selected search option:', this.selectedSearchOption);
  //       console.log('Selected value:', this.selectedValue);
       
  //       console.log('Search lower:', searchLower);
  //       console.log('Appointment:', appointment);
  //       console.log('Filtered list:', this.filteredList);
      
  //       let match = false;

  //       switch (this.selectedSearchOption) {
  //         case 'patientName':
  //           console.log('Patient Name:', appointment.patientName.toLowerCase());
  //           match = appointment.patientName ? appointment.patientName.toLowerCase().includes(searchLower) : false;
  //           console.log('Match:', match);
  //           break;
  //         case 'phoneNumber':
  //           match = appointment.phoneNumber ? appointment.phoneNumber.toLowerCase().includes(searchLower) : false;
  //           break;
  //         case 'doctorName':
  //           match = appointment.doctorName ? appointment.doctorName.toLowerCase().includes(searchLower) : false;
  //           break;
  //         default:
  //           match = true;
  //       }
  

  //     return match;
  //   });
  
      

  //   }
  //   // else {
  //   //   // If no date is selected, show all appointments
  //   //   this.filteredAppointments = [...this.confirmedAppointments];
  //   //   // console.log('Confirmed appointments:', this.confirmedAppointments);
  //   //   // this.filteredAppointments = this.confirmedAppointments.filter(appointment => !appointment!.completed);
  
  //   // }
  //   this.filteredAppointments = this.filteredList;
  //   this.currentPage = 1;
  // }
  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes.selectedDateRange) {
  //     this.filterAppointment();
  //     this.cdRef.detectChanges();  // Manually trigger change detection
  //   }
  // }
  filterAppointment() {
    // If there's no date range or value to filter, return the unfiltered appointments
    this.filteredList = [...this.confirmedAppointments];
  
    // Handle filtering by date range if selected
    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // Use endDate if provided, otherwise use startDate
  
      if (startDate && endDate) {
        if(startDate.getTime() !== endDate.getTime()) {
        // Filtering appointments by the selected date range
        console.log('Start date:', startDate, 'End date:', endDate);
        const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);  // Set to the last millisecond of the day

        this.filteredList = this.filteredList.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.date);  // Assuming 'date' is in string format like 'YYYY-MM-DD'
          return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
        });
        console.log('Filtered list:', this.filteredList);
      }
      else if (startDate.getTime() === endDate.getTime()) {
        console.log('Single date selected:');
        const startDate = this.selectedDateRange[0];
    
        this.filteredList = this.filteredList.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.date);
          return appointmentDate.toDateString() === startDate.toDateString();  // Compare the date portion only
        });
        console.log('Filtered list:', this.filteredList);
      }
    }
    else{
      this.filteredAppointments = []
    }
    }

    else {
          // If no valid range is selected, show all appointments
          this.filteredAppointments = [...this.confirmedAppointments];
        }
  
    // Handle filtering by a single date if the start and end dates are the same
   
  
    // Handle filtering by the search value (patient name, phone number, or doctor name)
    if (this.selectedValue.trim() !== '') {
      console.log('Selected search option:', this.selectedSearchOption);
      const searchLower = this.selectedValue.toLowerCase();
      this.filteredList = this.filteredList.filter((appointment: Appointment) => {
        let match = false;
        switch (this.selectedSearchOption) {
          case 'patientName':
            match = appointment.patientName ? appointment.patientName.toLowerCase().includes(searchLower) : false;
            break;
          case 'phoneNumber':
            match = appointment.phoneNumber ? appointment.phoneNumber.toLowerCase().includes(searchLower) : false;
            break;
          case 'doctorName':
            match = appointment.doctorName ? appointment.doctorName.toLowerCase().includes(searchLower) : false;
            break;
          default:
            match = true; // No filtering
        }
        return match;
      });
    }
    else{
      this.filteredAppointments = [...this.confirmedAppointments];
    }
  
    // Update the filtered appointments with the final result
    this.filteredAppointments = this.filteredList;
    this.currentPage = 1; // Reset to first page whenever new filters are applied
  }
  
  downloadLastWeekData(): void {
    this.loadLastWeekAppointments();
    console.log('Downloading last week\'s data...',this.lastWeekAppointments);
    if (this.lastWeekAppointments && this.lastWeekAppointments.length > 0) {

      const selectedFields = this.lastWeekAppointments.map((appointment: Appointment) => ({
        'Patient Name': appointment.patientName,
        'Patient Phone Number': appointment.phoneNumber,
        'Patient Email': appointment.email,
        'Doctor Name': appointment.doctorName,
        'Department': appointment.department,
        'Appointment Date': appointment.date,
        'Appointment Time': appointment.time,
        'Appointment Created Time': appointment.created_at,
        'Request Via': appointment.requestVia,
        'SMS Sent': appointment.smsSent ? 'Yes' : 'No',
        'Email Sent': appointment.emailSent ? 'Yes' : 'No',
        'Status': appointment.status,
        'Appointment Handled By': appointment.user!.username
      }));
      // Step 1: Convert the filtered data to a worksheet
      const worksheet = XLSX.utils.json_to_sheet(selectedFields);
      
      // Step 2: Create a new workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Last Week Appointments');

      // Step 3: Write the workbook to a binary string
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      // Step 4: Create a Blob from the binary string
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Step 5: Trigger the download
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = 'filtered_appointments.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.warn('No data available to download');
    }
  }
    // Method to download the filtered data as Excel
    downloadFilteredData(): void {
      if (this.filteredList && this.filteredList.length > 0) {

        const selectedFields = this.filteredList.map((appointment: Appointment) => ({
          'Patient Name': appointment.patientName,
          'Patient Phone Number': appointment.phoneNumber,
          'Patient Email': appointment.email,
          'Doctor Name': appointment.doctorName,
          'Department': appointment.department,
          'Appointment Date': appointment.date,
          'Appointment Time': appointment.time,
          'Appointment Created Time': appointment.created_at,
          'Request Via': appointment.requestVia,
          'SMS Sent': appointment.smsSent ? 'Yes' : 'No',
          'Email Sent': appointment.emailSent ? 'Yes' : 'No',
          'Status': appointment.status,
          'Appointment Handled By': appointment.user!.username
        }));
        // Step 1: Convert the filtered data to a worksheet
        const worksheet = XLSX.utils.json_to_sheet(selectedFields);
        
        // Step 2: Create a new workbook and add the worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Confirmed Appointments`);
  
        // Step 3: Write the workbook to a binary string
        const excelBuffer = XLSX.write(workbook, {
          bookType: 'xlsx',
          type: 'array',
        });
  
        // Step 4: Create a Blob from the binary string
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
  
        // Step 5: Trigger the download
        const link = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = 'Confirmed Appointment.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.warn('No data available to download');
      }
    }
    loadLastWeekAppointments(): void {
      const today = new Date();
      const lastWeek = new Date(today.setDate(today.getDate() - 7));
  
      // Assuming confirmedAppointments is populated from an API with all appointments
      this.lastWeekAppointments = this.confirmedAppointments.filter((appointment) => {
        const appointmentDate = new Date(appointment.date);
        return appointmentDate >= lastWeek && appointmentDate <= new Date();
      });
    }

  // Utility method to format the date in 'dd/mm/yy' format
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear().toString().slice(-4); // Get last two digits of year
    return `${year}-${month}-${day}`;
  }
  saveToLocalStorage(): void {
    localStorage.setItem('appointments', JSON.stringify(this.appointments));
  }
  completeAppointment(appointment: Appointment) {
    const appointmentId = appointment.id;
    if(appointmentId !== undefined){
      this.appointmentService.checkedinAppointment(appointmentId).subscribe({
        next: (response) => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Checked in successfully!' });
          appointment.checkedIn = true; // Update the UI to reflect the checked-in status
        },
        error: (error) => {
          console.error('Error during check-in:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to check-in' });
        },
      });
    }
  

    this.saveToLocalStorage();
    // Fetch doctor details to get the slot duration
    this.doctorService.getDoctorDetails(appointment.doctorId).subscribe(
      (doctor) => {

        if (doctor && doctor.slotDuration) {

          const delayTime = (doctor.slotDuration + 5) * 60 * 1000; // Add 5 minutes to the slot duration and convert to milliseconds
          this.appointmentService.scheduleCompletion(appointment.id!, delayTime).subscribe({
            next: () => {
              // console.log('Appointment completion scheduled successfully');
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment completion scheduled successfully' });
            },
            error: (error) => {
              console.error('Error scheduling appointment completion:', error);
            }
          });
          
        } else {
          console.error('Slot duration not found for doctor:', doctor);
        }
      },
      (error) => {
        console.error('Error fetching doctor details:', error);
      }
    );
  }

  // Method to return the filtered appointments for display
  // getFilteredAppointments() {
  //   return this.filteredAppointments;
  // }
  cancelAppointment(appointment: Appointment) {
    const cancelled: Appointment = {
      ...appointment,
      status: 'cancelled',
      smsSent: true,
      emailSent: true,
      requestVia: appointment.requestVia
    };
    console.log('Cancelled appointment:', cancelled);
    this.appointmentService.addCancelledAppointment(cancelled);
    this.doctorService.getCancelledSlots(appointment.doctorId, appointment.date, appointment.time).subscribe({
      next: (response) => {
        console.log('Cancelled slots:', response);
        // const cancelledSlots = response;
        // if (cancelledSlots.includes(appointment.time)) {
        //   console.log('Slot already cancelled:', appointment.time);
        //   return;
        // }
      },
      error: (error) => {
        console.error('Error fetching cancelled slots:', error);
      }
    });
    this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
      next: (response) =>{
        const doctorPhoneNumber = response?.phone_number;
        const appointmentDetails ={
          patientName: appointment?.patientName,
          doctorName: appointment?.doctorName,
          date: appointment?.date,
          time: appointment?.time,
          doctorPhoneNumber: doctorPhoneNumber,
          patientPhoneNumber: appointment?.phoneNumber,
          status: 'cancelled'
        }
        this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
          next: (response) => {
            // console.log('WhatsApp message sent successfully:', response);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'WhatsApp message sent successfully!' });
          },
          error: (error) => {
            console.error('Error sending WhatsApp message:', error);
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
      },
    });
    this.filterAppointment();
  }
  submitAppointment(appointment: Appointment | null, status: string, requestVia: any) {
    // console.log('Appointment to submit:', appointment);

  
    if (!appointment) {
        console.error('No appointment selected for submission.');
        return; // Early return if appointment is null or undefined
    }
  
    const confirmedAppointment: Appointment = { 
        ...appointment,  // Copy all properties from the original appointment
        smsSent: true,
        emailSent: true,
        requestVia: appointment.requestVia, // Determine requestVia
    };
  
    if (status === 'Confirm') {
        confirmedAppointment.status = 'confirmed'; // Set the status to confirmed
        this.appointmentService.addConfirmedAppointment(confirmedAppointment);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment confirmed successfully!' });
      // Fetch doctor's details to get the doctor's email
      // this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
      //   next: (response) => {
      //     const doctorEmail = response?.email;
      //     const patientEmail = appointment?.email;
  
      //     // Ensure both emails are valid
      //     if (!doctorEmail || !patientEmail) {
      //       console.error('Doctor or patient email is missing.');
      //       return;
      //     }
  
      //     // Prepare appointment details for email
      //     const appointmentDetails = {
      //       patientName: appointment?.patientName,
      //       doctorName: appointment?.doctorName,
      //       date: appointment?.date,
      //       time: appointment?.time,
      //     };
  
      //     const emailStatus = 'rescheduled';
  
      //     // Send email to the doctor
      //     this.appointmentService.sendEmail(doctorEmail, emailStatus, appointmentDetails, 'doctor').subscribe({
      //       next: (response) => {
      //         console.log('Email sent to doctor successfully:', response);
      //       },
      //       error: (error) => {
      //         console.error('Error sending email to doctor:', error);
      //       },
      //     });
  
      //     // Send email to the patient
      //     this.appointmentService.sendEmail(patientEmail, emailStatus, appointmentDetails, 'patient').subscribe({
      //       next: (response) => {
      //         console.log('Email sent to patient successfully:', response);
      //       },
      //       error: (error) => {
      //         console.error('Error sending email to patient:', error);
      //       },
      //     });
      //   },
      //   error: (error) => {
      //     console.error('Error in getting doctor details:', error);
      //   },
      // });
        
    
  
        // Remove the confirmed appointment from the canceled appointments
        this.cancelledAppointments = this.cancelledAppointments.filter(a => a.id !== appointment.id);
        
    } else if (status === 'Cancel') {
        confirmedAppointment.status = 'Cancelled'; // Update the status
        this.appointmentService.addCancelledAppointment(confirmedAppointment);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment cancelled successfully!' });
        this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
          next: (response) =>{
            const doctorPhoneNumber = response?.phone_number;
            const appointmentDetails ={
              patientName: appointment?.patientName,
              doctorName: appointment?.doctorName,
              date: appointment?.date,
              time: appointment?.time,
              doctorPhoneNumber: doctorPhoneNumber,
              patientPhoneNumber: appointment?.phoneNumber,
              status: 'cancelled'
            }
            this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
              next: (response) => {
                console.log('WhatsApp message sent successfully:', response);
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'WhatsApp message sent successfully!' });
              },
              error: (error) => {
                console.error('Error sending WhatsApp message:', error);
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
            console.log('Email sent to patient successfully:', response);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully!' });
          },
          error: (error) => {
            console.error('Error sending email to patient:', error);
          },
        });
    }
  
    // Additional filtering and updates
    this.closeAppointmentForm();
    this.filterAppointment(); // Refresh the filtered appointments
  }
  closeAppointmentForm() {
    this.showAppointmentForm = false;
    if (this.activeAppointmentId !== null) {
      // Call backend to unlock the appointment
      this.appointmentService.unlockAppointment(this.activeAppointmentId!).subscribe({
        next: () => {
  
          this.activeAppointmentId = null;
          this.selectedAppointment = null; // Close the form
        },
        error: (error) => {
          console.error('Error unlocking appointment:', error);
        }
      });
    }
  
  }
  ngOnDestroy(): void {
    if (this.activeAppointmentId !== null) {
      this.closeAppointmentForm();
    }
  }
  openAppointmentForm(appointment: Appointment): void {

    // this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
    // this.showAppointmentForm = true;
    // console.log('Selected appointment:', this.selectedAppointment);
    this.lockAndAccessAppointment(appointment);
  }
  lockAndAccessAppointment(appointment:Appointment): void {
    const appointmentId = appointment.id!;
    this.appointmentService.lockAppointment(appointmentId, this.userId).subscribe({
      next: (response) => {
        // Successfully locked, proceed to open the form
        this.activeAppointmentId = appointmentId;
  
        // Proceed to open the appointment form since the lock was successful
      this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
      this.showAppointmentForm = true;
  
      },
      error: (error) => {
        if (error.status === 409) {
          // Show lock modal if the appointment is locked by another user
          this.isLockedDialogVisible = true;
          console.warn('The appointment is currently locked by another user.');
        } else if (error.status === 401) {
          // If unauthorized, do NOT redirect automatically, show a custom message instead
          console.error('Unauthorized access - maybe the session expired.');
          alert('You are not authorized to access this resource. Please re-authenticate.');
        } else {
          console.error('Error locking the appointment:', error);
        }
      }
  
    });
  }
}
