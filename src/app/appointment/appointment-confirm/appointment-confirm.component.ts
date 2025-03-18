import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { start } from 'node:repl';
import * as moment from 'moment-timezone';
import { app } from '../../../../server';

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
  requestVia?: string; // Optional property
  created_at?: string;
  checkedIn?: boolean;
  user?: any;
  isEditing?: boolean;
  editedPatientName?: string
  type?: string;
  prnNumber?: any
  checkedInBy?:any;
  checkedInTime?:any;
  prefix?:string

}
@Component({
  selector: 'app-appointment-confirm',
  templateUrl: './appointment-confirm.component.html',
  styleUrl: './appointment-confirm.component.css',
  providers: [MessageService]
})
export class AppointmentConfirmComponent {
  confirmedAppointments: Appointment[] = [];

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService, private cdRef: ChangeDetectorRef) { }
  appointments: any[] = [
    // { id: '0001', patientName: 'Anitha Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Booked', smsSent: true },
  ];

  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction

  selectedValue: string = '';

  completed: boolean = false;
  showAppointmentForm = false;  // Controls the visibility of the modal
  selectedAppointment: Appointment | null = null;
  activeAppointmentId: number | null | undefined = null;
  userId: any = 0;
  isLockedDialogVisible: boolean = false; // To control the visibility of the lock dialog
  cancelledAppointments: Appointment[] = [];
  filteredList: any;
  lastWeekAppointments: any[] = [];
  isLoading: boolean = false;
  today: string = '';
  editedName: string = '';
  isEditing: boolean = false;
  editingAppointmentId: number | null = null;
  showPopup: boolean = false;
  checkinAppointment: any = null;
  appointmentType: string = 'paid'
  searchValue: string = '';
  activeComponent: string = 'confirmed';
  selectedDate: Date | null = null;

  filteredServices: any[] = [];
  username: any

  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'PRN', value: 'prnNumber' },
    { label: 'Doctor Name', value: 'doctorName' },
    { label: 'Department', value: 'department' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  // Method to handle sorting by a specific column
  ngOnInit() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;
    // console.log('Setting isLoading to true');
    this.isLoading = true; // Start loading indicator
    this.userId = localStorage.getItem('userid')
    this.username = localStorage.getItem('username')
    console.log(this.username)

    // Run every 5 minutes (300,000 ms)
    // Fetch appointments
    this.appointmentService.fetchAppointments()

    // Subscribe to confirmed appointments
    this.appointmentService.confirmedAppointments$.subscribe({
      next: (appointments) => {
        // console.log('Appointments received:', appointments);
        this.confirmedAppointments = appointments;
        this.appointments = appointments
        console.log(appointments)
        // this.cancelExpiredAppointments();

        // Sort appointments
        this.confirmedAppointments.sort((a, b) => {
          const dateA = new Date(a.created_at!);
          const dateB = new Date(b.created_at!);
          return dateB.getTime() - dateA.getTime();
        });

        this.filteredAppointments = [...this.confirmedAppointments];
        
        // const today = new Date();
        // today.setHours(0, 0, 0, 0); // Normalize to midnight (00:00:00)

        // // Filter out appointments that are in the past
        // this.filteredAppointments = this.filteredAppointments.filter((appointment: any) => {
        //   const appointmentDate = new Date(appointment.date); // Convert appointment date to Date object
        //   // If the appointment date is today or in the future
        //   return appointmentDate >= today;
        // });
        this.filterAppointmentsByDate(new Date());

        // console.log(this.filteredAppointments)
        // this.filterAppointmentsByDate(new Date());

        // console.log('Setting isLoading to false');
        setTimeout(() => {


          this.isLoading = false; // Stop loading indicator



          // console.log(this.filteredAppointments);

          // console.log(this.filteredAppointments)
        }, 1000); // 2-second delay

      },
      error: (error) => {
        console.error('Error fetching appointments:', error);
        // this.errorMessage = 'Failed to fetch appointments.';
        // console.log('Setting isLoading to false due to error');
        this.isLoading = false; // Stop loading indicator even on error
      },
      complete: () => {
        this.filteredAppointments = this.filteredAppointments.filter((appointment: any) => {
          appointment.date >= today
        })
        // console.log(this.filteredAppointments)
      }
    });
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
    return Math.ceil(this.filteredAppointments?.length / this.itemsPerPage);
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
  filterAppointmentsByDate(selectedDate: Date) {
    const formattedSelectedDate = this.formatDate(selectedDate);

    this.filteredAppointments = this.confirmedAppointments.filter((appointment) => {
      const appointmentDate = appointment.date;
      return appointmentDate >= formattedSelectedDate;
    });
    if (this.selectedValue.trim() !== '') {
      this.filterAppointment();
    }
    this.currentPage = 1; // Reset to the first page when the filter changes
  }
  
  // onSearch(): void {
  //   this.filteredAppointments = [...this.confirmedAppointments]

  //   console.log(this.searchValue, this.selectedDateRange)

  //   this.filteredServices = this.confirmedAppointments.filter((service) => {
  //     let matches = true;

  //     // Filter by search option
  //     if (this.selectedSearchOption && this.searchValue && service) {
  //       switch (this.selectedSearchOption) {
  //         case 'patientName':
  //           matches = service.patientName
  //             ?.toLowerCase()
  //             .includes(this.searchValue.toLowerCase());
  //           break;
  //         case 'doctorName':
  //           matches = !!service.doctorName
  //             ?.toLowerCase()
  //             .includes(this.searchValue.toLowerCase());
  //           break;
  //         case 'departmentName':
  //           matches = !!service.department
  //             ?.toLowerCase()
  //             .includes(this.searchValue.toLowerCase());
  //           break;
  //         case 'prnNumber':
  //           const prnNumber = Number(service.prnNumber); // Convert to Number
           
  //           const searchNumber = Number(this.searchValue); // Convert to Number
  //           console.log(prnNumber, searchNumber)
    
  //           // ✅ Check if searchValue is a valid number and matches the prnNumber
  //           matches = !isNaN(searchNumber) && prnNumber === searchNumber;
  //           break;
  //       }

  //     }
  //     if (this.selectedDateRange && this.selectedDateRange.length) {
  //       // ✅ Convert service date to a Date object and remove time component
  //       const serviceDate = new Date(service.date);
  //       // serviceDate.setHours(0, 0, 0, 0); // Normalize time to avoid mismatches
    
  //       // ✅ Ensure selected start date is a Date object
  //       let startDate = new Date(this.selectedDateRange[0]);
  //       startDate.setHours(0, 0, 0, 0); // Normalize time
    
  //       // ✅ Ensure endDate is assigned correctly
  //       let endDate = this.selectedDateRange[1] ? new Date(this.selectedDateRange[1]) : startDate;
  //       endDate.setHours(23, 59, 59, 999); // Ensure full-day range

    
  //       if (startDate=== endDate) {
  //           // ✅ Single date selected - Exact match
  //           matches = serviceDate.toISOString().split('T')[0] === startDate.toISOString().split('T')[0];
  //           console.log(matches)
  //       } else {
  //           // ✅ Date range selected - Match within range
  //           matches = matches && serviceDate.getTime() >= startDate.getTime() && serviceDate.getTime() <= endDate.getTime();
  //       }
  //   }
    
    
    
    
    
    
    
  //   // ✅ Filter by single specific date
  //   if (this.selectedDate) {
  //       const singleDate = new Date(this.selectedDate).toISOString().split('T')[0]; // ✅ Extract YYYY-MM-DD only
  //       console.log(singleDate, "Selected Date (Date Only)");
    
  //       matches = matches && new Date(service.date).toDateString() === singleDate;
  //   }
    

  //     // console.log(matches);
  //     return matches;
  //   });

  //   this.filteredAppointments = this.filteredServices
  //   console.log(this.filteredAppointments)


  // }
  onSearch(): void {
    this.filteredList = [...this.confirmedAppointments];
    this.filteredAppointments = [...this.confirmedAppointments];
  
    console.log("🔎 Search Value:", this.searchValue);
    console.log("📆 Selected Date Range:", this.selectedDateRange);
  
    // ✅ If selectedDateRange is provided, filter by date range
    if (this.selectedDateRange && this.selectedDateRange.length) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // Use endDate if provided, otherwise use startDate

      if (startDate && endDate) {
        if (startDate.getTime() !== endDate.getTime()) {
          // Filtering appointments by the selected date range
          // console.log('Start date:', startDate, 'End date:', endDate);
          const normalizedEndDate = new Date(endDate);
          normalizedEndDate.setHours(23, 59, 59, 999);  // Set to the last millisecond of the day

          this.filteredList = this.filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);  // Assuming 'date' is in string format like 'YYYY-MM-DD'
            return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
          });
          this.filteredAppointments = this.filteredList
          console.log('Filtered list:', this.filteredList);
        }
        else if (startDate.getTime() === endDate.getTime()) {
          // console.log('Single date selected:');
          const startDate = this.selectedDateRange[0];

          this.filteredList = this.filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate.toDateString() === startDate.toDateString();  // Compare the date portion only
          });
          this.filteredAppointments = this.filteredList
          console.log('Filtered list:', this.filteredList);
        }
      }
      else {
        this.filteredAppointments = [...this.confirmedAppointments]
      }

  
      console.log("✅ Filtered Appointments based on selectedDateRange:", this.filteredAppointments);
    }
  
    // ✅ Apply search filters on top of the date range filtering
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
            console.log(prnNumber, searchNumber);
  
            matches = !isNaN(searchNumber) && prnNumber === searchNumber;
            break;
        }
      }
  
      return matches;
    });
  
    this.filteredAppointments = this.filteredServices;
    console.log("✅ Final Filtered Appointments:", this.filteredAppointments);
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
    console.log(this.filteredServices, csvContent)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    FileSaver.saveAs(blob, 'confirmed_appointments.csv');
  }



  // Method to clear input fields
  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = 'firstName';
    this.selectedDateRange = [];
    this.filteredServices = [...this.confirmedAppointments];
  }
  ngOnChanges(changes: SimpleChanges) {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
    if(this.selectedDateRange && this.selectedDateRange.length === 0){
      this.filterAppointmentsByDate(new Date());
    }

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
  // Method to filter appointments by a specific date
  //  filterAppointmentsByDate(selectedDate: Date) {
  //   const formattedSelectedDate = this.formatDate(selectedDate);

  //   this.filteredAppointments = this.confirmedAppointments.filter((appointment) => {
  //     const appointmentDate = appointment.date;
  //     return appointmentDate >= formattedSelectedDate;
  //   });
  //   if (this.selectedValue.trim() !== '') {
  //     this.filterAppointment();
  //   }
  //   this.currentPage = 1; // Reset to the first page when the filter changes
  // }

  // Method to handle date change (e.g., when the user selects a date from a date picker)
  onDateChange(newDate: Date) {
    this.filterAppointmentsByDate(newDate);
  }


  filterAppointment() {
    // If there's no date range or value to filter, return the unfiltered appointments
    this.filteredList = [...this.confirmedAppointments];

    // Handle filtering by date range if selected
    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // Use endDate if provided, otherwise use startDate

      if (startDate && endDate) {
        if (startDate.getTime() !== endDate.getTime()) {
          // Filtering appointments by the selected date range
          // console.log('Start date:', startDate, 'End date:', endDate);
          const normalizedEndDate = new Date(endDate);
          normalizedEndDate.setHours(23, 59, 59, 999);  // Set to the last millisecond of the day

          this.filteredList = this.filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);  // Assuming 'date' is in string format like 'YYYY-MM-DD'
            return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
          });
          // console.log('Filtered list:', this.filteredList);
        }
        else if (startDate.getTime() === endDate.getTime()) {
          // console.log('Single date selected:');
          const startDate = this.selectedDateRange[0];

          this.filteredList = this.filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate.toDateString() === startDate.toDateString();  // Compare the date portion only
          });
          // console.log('Filtered list:', this.filteredList);
        }
      }
      else {
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
      // console.log('Selected search option:', this.selectedSearchOption);
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
          case 'department':
            match = appointment.department ? appointment.department.toLowerCase().includes(searchLower) : false;
            break;
          default:
            match = true; // No filtering
        }
        return match;
      });
    }
    else {
      this.filteredAppointments = [...this.confirmedAppointments];
    }

    // Update the filtered appointments with the final result
    this.filteredAppointments = this.filteredList;
    this.currentPage = 1; // Reset to first page whenever new filters are applied
  }

  downloadLastWeekData(): void {
    this.loadLastWeekAppointments();
    // console.log('Downloading last week\'s data...',this.lastWeekAppointments);
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
        'Whatsapp Sent': appointment.smsSent ? 'Yes' : 'No',
        'Email Sent': appointment.emailSent ? 'Yes' : 'No',
        'SMS Sent': appointment.messageSent ? 'Yes' : 'No',
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
    if (this.filteredServices && this.filteredServices.length > 0) {

      const selectedFields = this.filteredServices.map((appointment: Appointment) => {
        // console.log('Appointment:', appointment.created_at);
        if (appointment.created_at) {
          const createdAt = new Date(appointment?.created_at);
          const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");

          // Store the date and time in two separate variables
          const indianDate = indianTime.format('YYYY-MM-DD');
          const indianTimeOnly = indianTime.format('HH:mm:ss');
          // const createdDate = createdAt.toISOString().split('T')[0]; // Extract the date part in YYYY-MM-DD format
          // const createdTime = createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // Extract time in HH:mm (24-hour format)


          appointment.created_at = indianDate + ' ' + indianTimeOnly;
          // console.log('Appointment:', appointment.created_at);
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
  printAppointmentDetails(): void {
    console.log(this.filteredServices)
    const selectedFields = this.filteredServices.map((appointment: Appointment) => {
      // console.log('Appointment:', appointment.created_at);
      if (appointment.created_at) {
        const createdAt = new Date(appointment?.created_at);
        const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");

        // Store the date and time in two separate variables
        const indianDate = indianTime.format('YYYY-MM-DD');
        const indianTimeOnly = indianTime.format('HH:mm:ss');
        // const createdDate = createdAt.toISOString().split('T')[0]; // Extract the date part in YYYY-MM-DD format
        // const createdTime = createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // Extract time in HH:mm (24-hour format)


        appointment.created_at = indianDate + ' ' + indianTimeOnly;
        // console.log('Appointment:', appointment.created_at);
      }
      return {
        'Patient Name': appointment.patientName,
        'Patient PhoneNumber':appointment.phoneNumber,
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
  enableEdit(appointment: any) {
    this.editingAppointmentId = appointment.id;
    this.editedName = appointment.patientName // Preserve original name
  }

  cancelEdit() {
    this.editingAppointmentId = null;
  }

  async saveEditedName(appointment: any) {
    if (!this.editedName.trim()) return;

    try {
      // console.log(appointment.editedPatientName)
      appointment.patientName = this.editedName // Update UI
      this.editingAppointmentId = null;
      appointment.nameChangedBy = this.userId
      this.appointmentService.updateAppointment(appointment)
      this.showToast('Patient name updated successfully', 'success'); // Show success message
    } catch (error) {
      console.error('Error updating patient name:', error);
      this.showToast('Failed to update name', 'error'); // Show error message
    }
  }

  showToast(message: string, type: string) {
    this.messageService.add({ severity: type, summary: message });
  }

  openCheckinPopup(appointment: any) {
    this.showPopup = true;
    this.checkinAppointment = appointment
  }
  closePopup() {
    this.showPopup = false;
    this.checkinAppointment = null;
  }

  completeAppointment(appointment: Appointment) {
    // console.log(appointment)
    const appointmentId = appointment.id;
    appointment.type = this.appointmentType;
    appointment.checkedIn = true;
      this.appointmentService.updateAppointment(appointment)
    if (appointment.date > this.today) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot check-in for future appointments!' });
      return;
    }
    if (appointmentId !== undefined) {
      // const username = localStorage.getItem('username')
      this.appointmentService.checkedinAppointment(appointmentId, this.username).subscribe({
        next: (response) => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Checked in successfully!' });
          appointment.checkedIn = true; // Update the UI to reflect the checked-in status
          this.showPopup = false;
          this.checkinAppointment = null;
          // appointment.checkedInBy = this.username;
          // appointment.checkedInTime = new Date()
        
        },
        error: (error) => {
          console.error('Error during check-in:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to check-in' });
        },
      });
    }


    this.saveToLocalStorage();
    // Fetch doctor details to get the slot duration
    // this.doctorService.getDoctorDetails(appointment.doctorId).subscribe(
    //   (doctor) => {

    //     if (doctor && doctor.slotDuration) {

    //       const delayTime = (doctor.slotDuration + 5) * 60 * 1000; // Add 5 minutes to the slot duration and convert to milliseconds
    //       this.appointmentService.scheduleCompletion(appointment.id!, delayTime).subscribe({
    //         next: () => {
    //           // console.log('Appointment completion scheduled successfully');
    //           this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment completion scheduled successfully' });
    //         },
    //         error: (error) => {
    //           console.error('Error scheduling appointment completion:', error);
    //         }
    //       });

    //     } else {
    //       console.error('Slot duration not found for doctor:', doctor);
    //     }
    //   },
    //   (error) => {
    //     console.error('Error fetching doctor details:', error);
    //   }
    // );
  }

  // Method to return the filtered appointments for display
  // getFilteredAppointments() {
  //   return this.filteredAppointments;
  // }
  handleCheckin(appointment: any): void {
    if (appointment.checkedIn) {
      this.messageService.add({ severity: 'warn', summary: 'Already Checked In', detail: 'You have already checked in for this appointment.' });
      return;
    }
  
    if (!this.isCheckInEnabled(appointment)) {
      this.messageService.add({ severity: 'warn', summary: 'Check-in Not Allowed', detail: 'You can check-in only 90 minutes before or 30 minutes after the slot time.' });
      return;
    }
  
    // If within valid time, show check-in popup
    this.showPopup = true;
    this.checkinAppointment = appointment;
  }
  isCheckInEnabled(appointment: any): boolean {
    const currentTime = new Date();

    // Parse the appointment time (e.g., "12:40 PM")
    const [time, period] = appointment.time.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    // Convert to 24-hour format
    const appointmentDate = new Date();
    appointmentDate.setHours(period === 'PM' && hours !== 12 ? hours + 12 : (period === 'AM' && hours === 12 ? 0 : hours));
    appointmentDate.setMinutes(minutes);
    appointmentDate.setSeconds(0);

    // Define the time window (30 mins before and after)
    const startWindow = new Date(appointmentDate.getTime() - 90 * 60000); // 30 mins before
    const endWindow = new Date(appointmentDate.getTime() + 30 * 60000);   // 30 mins after

    // Enable if the current time is within the window
    return currentTime >= startWindow && currentTime <= endWindow;
  }


  // cancelExpiredAppointments() {

  //   const currentTime = new Date();
  //   const expiredAppointments = this.confirmedAppointments.filter((appointment: any) => {
  //     const [time, period] = appointment.time.split(' '); // e.g., "06:00 PM"
  //     const [hours, minutes] = time.split(':').map(Number);

  //     // Convert to 24-hour format
  //     const appointmentDate = new Date();
  //     appointmentDate.setHours(period === 'PM' && hours !== 12 ? hours + 12 : (period === 'AM' && hours === 12 ? 0 : hours));
  //     appointmentDate.setMinutes(minutes);
  //     appointmentDate.setSeconds(0);

  //     // Check if the appointment is 30+ minutes past
  //     return (currentTime.getTime() - appointmentDate.getTime()) > 30 * 60000;
  //   });

  //   if (expiredAppointments.length === 0) {
  //     console.log("✅ No expired appointments to cancel.");
  //     return;
  //   }

  //   console.log("⚠️ Expired Appointments:", expiredAppointments);

  //   // Call API to cancel expired appointments
  //   this.appointmentService.bulkCancel(expiredAppointments).subscribe({
  //     next: () => {
  //       this.isLoading = false;
  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Success',
  //         detail: 'Expired appointments have been canceled successfully!'
  //       });
  //       this.filterAppointment(); // Refresh the list
  //     },
  //     error: (err) => {
  //       this.isLoading = false;
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Error',
  //         detail: 'Failed to cancel expired appointments.'
  //       });
  //       console.error('Error canceling appointments:', err);
  //     }
  //   });
  // }
  cancelExpiredAppointments() {
    const currentTime = new Date();
    const today = currentTime.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // ✅ Filter expired appointments (Only today's and 30 minutes past appointment time)
    const expiredAppointments = this.confirmedAppointments.filter((appointment: any) => {
      // console.log(appointment.checkedIn)
      if (appointment.checkedIn === false && appointment.date) { // Ensure checkedIn is false and date exists
        const appointmentDateStr = appointment.date.split('T')[0]; // Extract YYYY-MM-DD
        console.log(appointmentDateStr)
        if (appointmentDateStr !== today) return false; // Skip if not today's appointment

        if (!appointment.time) return false; // Skip if time is missing

        const [time, period] = appointment.time.split(' '); // e.g., "07:50 PM"
        if (!time || !period) return false; // Skip if time is invalid

        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return false; // Skip if conversion fails

        // ✅ Convert to 24-hour format
        const appointmentDate = new Date();
        appointmentDate.setHours(
          period === 'PM' && hours !== 12 ? hours + 12 :
            period === 'AM' && hours === 12 ? 0 : hours
        );
        appointmentDate.setMinutes(minutes);
        appointmentDate.setSeconds(0);
        console.log(appointmentDate)

        // ✅ Add 30 minutes buffer
        const cancelTime = new Date(appointmentDate.getTime() + 30 * 60000); // Add 30 min

        // ✅ Cancel only if current time is past the cancelTime
        return currentTime.getTime() > cancelTime.getTime();
      }
      return false;
    });

    // ✅ If no expired appointments, exit function
    if (expiredAppointments.length === 0) {
      console.log("✅ No expired appointments to cancel.");
      return;
    }

    console.log("⚠️ Expired Appointments (30+ min past scheduled time):", expiredAppointments);

    // ✅ Call API to cancel expired appointments
    // this.isLoading = true;
    this.appointmentService.bulkCancel(expiredAppointments).subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Expired appointments have been canceled successfully!'
        });
        this.filterAppointment(); // Refresh the list
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to cancel expired appointments.'
        });
        console.error('❌ Error canceling appointments:', err);
      }
    });
  }




  cancelAppointment(appointment: Appointment) {
    console.log('cancel')
    const cancelled: Appointment = {
      ...appointment,
      status: 'cancelled',
      smsSent: true,
      emailSent: true,
      messageSent: true,
      requestVia: appointment.requestVia
    };
    // console.log('Cancelled appointment:', cancelled);
    this.appointmentService.addCancelledAppointment(cancelled);
    this.doctorService.getCancelledSlots(appointment.doctorId, appointment.date, appointment.time).subscribe({
      next: (response) => {
        // console.log('Cancelled slots:', response);
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
          prefix: appointment?.prefix
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
      messageSent: true,
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
            prefix:appointment?.prefix
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
  lockAndAccessAppointment(appointment: Appointment): void {
    const appointmentId = appointment.id!;
    // console.log(this.userId)
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
