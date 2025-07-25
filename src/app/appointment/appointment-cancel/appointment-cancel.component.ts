import { Component, Input } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { app } from '../../../../server';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import * as FileSaver from 'file-saver';
import { stat } from 'node:fs';
import * as XLSX from 'xlsx';
import moment from 'moment-timezone';
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
  messageSent?: boolean;
  requestVia?: string;
  [key: string]: any;
  created_at?: string;
  isrescheduled?: boolean;
  user?: any;
  prnNumber?: any;
  prefix?: any;
  patientType?: any;
}
@Component({
  selector: 'app-appointment-cancel',
  templateUrl: './appointment-cancel.component.html',
  styleUrl: './appointment-cancel.component.css'
})
export class AppointmentCancelComponent {
  cancelledAppointments: Appointment[] = [];
  selectedDate: Date | null = null;
  selectedValue: string = '';
  searchValue: string = '';
  selectedDateRange: Date[] = [];
  activeComponent: string = 'cancelled'
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'PRN', value: 'prnNumber' },
    { label: 'Doctor Name', value: 'doctorName' },
    { label: 'Department', value: 'department' },

  ];
  selectedSearchOption: any = this.searchOptions[0];
  filteredList: any;
  showAppointmentForm = false;
  selectedAppointment: Appointment | null = null;
  confirmedAppointments: Appointment[] = [];
  activeAppointmentId: number | null | undefined = null;
  userId: any = 0;
  isLockedDialogVisible: boolean = false;
  isSubmitting: boolean = false;
  isLoading: boolean = false;
  filteredServices: any[] = [];
  today: string = '';
  lockedUser: string = '';
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;
  sortDirection: string = 'asc';


  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService) {
    this.userId = localStorage.getItem('userid')
  }

  ngOnInit() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;
    this.fetchCancelledAppointments();
  }

  fetchCancelledAppointments() {

    this.isLoading = true;
    this.appointmentService.getCancelledAppointments().subscribe(
      (appointments) => {
        this.cancelledAppointments = appointments;

        // Sort the appointments
        this.cancelledAppointments.sort((a, b) => {
          const dateA = new Date(a.created_at!);
          const dateB = new Date(b.created_at!);
          return dateB.getTime() - dateA.getTime();
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.filterAppointmentsByDate(new Date());
        setTimeout(() => {
          this.isLoading = false;
        }, 2000);
      },
      (error) => {
        console.error('Error fetching cancelled appointments:', error);
      },
      () => {
        this.isLoading = false;
      }
    );
  }
  onSearch(): void {
    this.filteredList = [...this.cancelledAppointments];
    this.filteredAppointments = [...this.cancelledAppointments];


    if (this.selectedDateRange && this.selectedDateRange.length) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate;

      if (startDate && endDate) {
        if (startDate.getTime() !== endDate.getTime()) {
          const normalizedEndDate = new Date(endDate);
          normalizedEndDate.setHours(23, 59, 59, 999);

          this.filteredList = this.filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
          });
          this.filteredAppointments = this.filteredList
        }
        else if (startDate.getTime() === endDate.getTime()) {
          const startDate = this.selectedDateRange[0];

          this.filteredList = this.filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate.toDateString() === startDate.toDateString();
          });
          this.filteredAppointments = this.filteredList
        }
      }
      else {
        this.filteredAppointments = [...this.cancelledAppointments]
      }
    }
    this.filteredServices = this.filteredAppointments.filter((service) => {
      let matches = true;

      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'patientName':
            matches = service.patientName?.toLowerCase().includes(this.searchValue.toLowerCase());
            break;
          case 'doctorName':
            matches = !!service.doctorName?.toLowerCase().includes(this.searchValue.toLowerCase());
            break;
          case 'departmentName':
            matches = !!service.department?.toLowerCase().includes(this.searchValue.toLowerCase());
            break;
          case 'prnNumber':
            const prnNumber = Number(service.prnNumber); // Convert to Number
            const searchNumber = Number(this.searchValue); // Convert to Number

            matches = !isNaN(searchNumber) && prnNumber === searchNumber;
            break;
        }
      }

      return matches;
    });

    this.filteredAppointments = this.filteredServices;
  }



  refresh() {
    this.selectedDateRange = [];
    this.filterAppointmentsByDate(new Date());
  }
  downloadData(): void {
    if (this.filteredServices.length === 0) {
      console.warn('No data to download');
      return;
    }
    this.filteredServices.forEach((service) => {
      if (Array.isArray(service.repeatedDates)) {
        const repeatedDates = service.repeatedDates
          .map((rd: any) => rd.date)
          .join(', ');
        service.repeatedDate = repeatedDates;
      } else {
        service.repeatedDate = '';
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

  // Method to clear input fields
  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = 'firstName';
    this.filteredServices = [...this.cancelledAppointments];
  }

  // Method to filter appointments by a specific date
  filterAppointmentsByDate(selectedDate: Date) {
    const formattedSelectedDate = this.formatDate(selectedDate);

    this.filteredAppointments = this.cancelledAppointments.filter((appointment) => {
      const appointmentDate = appointment.date;
      return appointmentDate >= formattedSelectedDate;
    });
    if (this.selectedValue.trim() !== '') {
      this.filterAppointment();
    }
    this.currentPage = 1; // Reset to the first page when the filter changes
  }

  onDateChange(newDate: Date) {
    this.filterAppointmentsByDate(newDate);
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
    this.currentPage = 1; 
  }

  // Method to sort appointments based on the selected column and direction
  sortedAppointments() {
    if (!this.sortColumn) {
      return [...this.filteredAppointments];  // No sorting if the column is undefined
    }

    return [...this.filteredAppointments].sort((a, b) => {
      const valueA = a[this.sortColumn!]; // Using non-null assertion (!) to handle the sort column
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
    const sorted = this.sortedAppointments();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage); // Return paginated data
  }

  // Method to calculate total pages
  get totalPages() {
    return Math.ceil(this.filteredAppointments.length / this.itemsPerPage);
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

  filteredAppointments: Appointment[] = [...this.cancelledAppointments];

  ngOnChanges() {
    this.filterAppointment();
    if (this.selectedDateRange && this.selectedDateRange.length === 0) {
      this.filterAppointmentsByDate(new Date());
    }
  }


  filterAppointment() {
    this.filteredList = [...this.cancelledAppointments];

    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; 

      if (startDate && endDate) {
        if (startDate.getTime() !== endDate.getTime()) {
          const normalizedEndDate = new Date(endDate);
          normalizedEndDate.setHours(23, 59, 59, 999);

          this.filteredList = this.filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date); 
            return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
          });
        }
        else if (startDate.getTime() === endDate.getTime()) {
          const startDate = this.selectedDateRange[0];

          this.filteredList = this.filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate.toDateString() === startDate.toDateString(); 
          });
        }
      }
      else {
        this.filteredAppointments = []
      }
    }
    else {
      this.filteredAppointments = [...this.cancelledAppointments];
    }
    if (this.selectedValue.trim() !== '') {
      const searchLower = this.selectedValue.toLowerCase();


      // );
      this.filteredList = this.filteredAppointments.filter((appointment) => {


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
          case 'department':
            match = appointment.department ? appointment.department.toLowerCase().includes(searchLower) : false;
            break;
          default:
            match = true;
        }


        return match;
      });


    }
    else {
      this.filteredAppointments = [...this.cancelledAppointments];
    }
    this.filteredAppointments = this.filteredList;
    this.currentPage = 1;
  }
  downloadFilteredData(): void {
    if (this.filteredServices && this.filteredServices.length > 0) {
      const selectedFields = this.filteredServices.map((appointment: Appointment) => {
        if (appointment.created_at) {
          const createdAt = new Date(appointment?.created_at);
          const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");

          // Store the date and time in two separate variables
          const indianDate = indianTime.format('YYYY-MM-DD');
          const indianTimeOnly = indianTime.format('HH:mm:ss');

          appointment.created_at = indianDate + ' ' + indianTimeOnly;
        }
        return {
          'Patient Name': appointment.patientName,
          'Patient Phone Number': appointment.phoneNumber,
          'Patient Email': appointment.email,
          'Doctor Name': appointment.doctorName,
          'Department': appointment.department,
          'Appointment Date': appointment.date,
          'Appointment Time': appointment.time,
          'Appointment Created Time': appointment.created_at,
          'Request Via': appointment.requestVia,
          'Whatsapp Sent': appointment.smsSent ? 'Yes' : 'No',
          'Email Sent': appointment.emailSent ? 'Yes' : 'No',
          'SMS Sent': appointment.messageSent ? 'Yes' : 'No',
          'Status': appointment.status,
          'Appointment Handled By': appointment.user!.username,
        };

      });
      // Step 1: Convert the filtered data to a worksheet
      const worksheet = XLSX.utils.json_to_sheet(selectedFields);
      // Step 3: Generate the sheet name with truncation if necessary
      const startDate = this.formatDate(this.selectedDateRange[0]);
      const endDate = this.selectedDateRange[1] ? this.formatDate(this.selectedDateRange[1]) : startDate;
      let sheetName = `Cancelled Appointments`;

      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);  // Ensure name is 31 characters or fewer
      }

      // Step 2: Create a new workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

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
      link.download = `${sheetName}.xlsx`;  // Set the download attribute to the sheet name
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.warn('No data available to download');
    }
  }
  printAppointmentDetails(): void {
    const selectedFields = this.filteredServices.map((appointment: Appointment) => {
      if (appointment.created_at) {
        const createdAt = new Date(appointment?.created_at);
        const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");

        // Store the date and time in two separate variables
        const indianDate = indianTime.format('YYYY-MM-DD');
        const indianTimeOnly = indianTime.format('HH:mm:ss');


        appointment.created_at = indianDate + ' ' + indianTimeOnly;
      }
      return {
        'Patient Name': appointment.patientName,
        'Patient Phone Number': appointment.phoneNumber,
        'Patient Email': appointment.email,
        'Doctor Name': appointment.doctorName,
        'Department': appointment.department,
        'Appointment Date': appointment.date,
        'Appointment Time': appointment.time,
        'Appointment Created Time': appointment.created_at,
        'Request Via': appointment.requestVia,
        'Whatsapp Sent': appointment.smsSent ? 'Yes' : 'No',
        'Email Sent': appointment.emailSent ? 'Yes' : 'No',
        'SMS Sent': appointment.messageSent ? 'Yes' : 'No',
        'Status': appointment.status,
        'Appointment Handled By': appointment.user!.username,
      };

    });
    let printWindow = window.open('', '', 'width=800,height=600');

    let tableHTML = `
      <html>
      <head>
        <title>Appointment Details</title>
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 16px;
            text-align: left;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        <h2>Confirmed Appointment Details</h2>
        <table>
          <thead>
            <tr>
              ${Object.keys(selectedFields[0]).map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${selectedFields.map((row: any) => `<tr>${Object.values(row).map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow!.document.write(tableHTML);
    printWindow!.document.close();
    printWindow!.print();
  }
  // Utility method to format the date in 'dd/mm/yy' format
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear().toString().slice(-4); // Get last two digits of year
    return `${year}-${month}-${day}`;
  }

  // Method to return the filtered appointments for display
  getFilteredAppointments() {
    return this.filteredAppointments;
  }
  openAppointmentForm(appointment: Appointment): void {
    this.lockAndAccessAppointment(appointment);
  }
  lockAndAccessAppointment(appointment: Appointment): void {
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
          this.lockedUser = error.error?.lockedByUsername
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
  handleLockedDialogClose(): void {
    // Hide the locked dialog
    this.isLockedDialogVisible = false;
  }

  // Cleanup: unlock appointment if component is destroyed
  ngOnDestroy(): void {
    if (this.activeAppointmentId !== null) {
      this.closeAppointmentForm();
    }
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
  submitAppointment(appointment: Appointment | null, status: string, requestVia: any) {


    if (!appointment) {
      console.error('No appointment selected for submission.');
      return; // Early return if appointment is null or undefined
    }
    // Check if the form is already submitting
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true; // Set the flag

    const confirmedAppointment: Appointment = {
      ...appointment,
      smsSent: true,
      emailSent: true,
      messageSent: true,
      requestVia: appointment.requestVia, 
      status: 'confirmed'
    };

    if (status === 'rescheduled') {
      appointment.isrescheduled = true;
    }



    if (status === 'Confirm') {
      confirmedAppointment.status = 'confirmed'; // Set the status to confirmed
      this.appointmentService.addConfirmedAppointment(confirmedAppointment);
      // Remove the confirmed appointment from the canceled appointments
      this.cancelledAppointments = this.cancelledAppointments.filter(a => a.id !== appointment.id);

    } else if (status === 'Cancel') {
      confirmedAppointment.status = 'Cancelled'; // Update the status
      this.appointmentService.addCancelledAppointment(confirmedAppointment);
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
          this.appointmentService.sendSmsMessage(appointmentDetails).subscribe({
            next: (response) => {
            },
            error: (error) => {
              console.error('Error sending SMS message:', error);
            }
          });
          this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
            next: (response) => {
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

}
