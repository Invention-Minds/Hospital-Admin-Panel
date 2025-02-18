import { Component,Input, OnChanges } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import moment from 'moment-timezone';
interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  doctorId:number;
  department: string;
  date: string;
  time: string;
  status: string;
  email: string;
  smsSent?:boolean;
  emailSent?:boolean;
  messageSent?:boolean;
  requestVia?: string; // Optional property
  created_at?: string;
  user?: any;
  prnNumber?:any}
@Component({
  selector: 'app-appointment-complete',
  templateUrl: './appointment-complete.component.html',
  styleUrl: './appointment-complete.component.css'
})
export class AppointmentCompleteComponent {
  completedAppointments: Appointment[] = [];

  constructor(private appointmentService: AppointmentConfirmService) {}
  appointments: Appointment[] = [
    // { id: '0001', patientName: 'Anitha Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Booked', smsSent: true },
  ];

  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction

  selectedValue: string = '';

  selectedDate: Date | null = null;
  filteredServices:any[] = []

  selectedDateRange: Date[] = [];
  filteredList: any;
  isLoading: boolean = false;
  searchValue: string = '';
  activeComponent: string = 'completed'
  today:string = ''

  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    {label: 'PRN', value: 'prnNumber'},
    { label: 'Doctor Name', value: 'doctorName' },
    { label: 'Department', value: 'department' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  // Method to handle sorting by a specific column
  ngOnInit() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;
    // this.appointmentService.completedAppointments$.subscribe(appointments => {
    //   this.completedAppointments = appointments;
    //   this.filteredAppointments = [...this.completedAppointments];
    //   console.log('Confirmed appointments from component:', this.completedAppointments);
    this.isLoading = true; // Start loading indicator
    this.appointmentService.completedAppointments$.subscribe(appointments => {
      this.completedAppointments = appointments;
      this.completedAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredAppointments = [...this.completedAppointments];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to midnight (00:00:00)

      // Filter out appointments that are in the past
      this.filteredAppointments = this.filteredAppointments.filter((appointment: any) => {
        const appointmentDate = new Date(appointment.date); // Convert appointment date to Date object
        // If the appointment date is today or in the future
        return appointmentDate >= today;
      });
      // this.filterAppointmentsByDate(new Date());
      setTimeout(() => {
        // console.log('Setting isLoading to false after delay');
        this.isLoading = false; // Stop loading indicator
      }, 2000); // 2-second delay
    },
    (error) => {
      console.error('Error fetching completed appointments:', error);
      this.isLoading = false; // Stop loading indicator
    }
    );
  
    // Fetch appointments from backend to initialize the data
    this.appointmentService.fetchAppointments();
    // });
  }
   // Method to filter appointments by a specific date
   filterAppointmentsByDate(selectedDate: Date) {
    const formattedSelectedDate = this.formatDate(selectedDate);

    this.filteredAppointments = this.completedAppointments.filter((appointment) => {
      const appointmentDate = appointment.date;
      return appointmentDate === formattedSelectedDate;
    });
    if (this.selectedValue.trim() !== '') {
      this.filterAppointment();
    }

    this.currentPage = 1; // Reset to the first page when the filter changes
  }

  // Method to handle date change (e.g., when the user selects a date from a date picker)
  onDateChange(newDate: Date) {
    this.filterAppointmentsByDate(newDate);
    // console.log('Selected date:', this.selectedDateRange);
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
  filteredAppointments: Appointment[] = [...this.completedAppointments];
  onSearch(): void {
    this.filteredAppointments = [...this.completedAppointments]

    console.log(this.searchValue, this.selectedDateRange)

    this.filteredServices = this.completedAppointments.filter((service) => {
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
          case 'prnNumber':
            const prnNumber = Number(service.prnNumber); // Convert to Number
           
            const searchNumber = Number(this.searchValue); // Convert to Number
            console.log(prnNumber, searchNumber)
    
            // ✅ Check if searchValue is a valid number and matches the prnNumber
            matches = !isNaN(searchNumber) && prnNumber === searchNumber;
            break;
        }

      }
      if (this.selectedDateRange && this.selectedDateRange.length) {
        // ✅ Convert service date to a Date object and remove time component
        const serviceDate = new Date(service.date);
        // serviceDate.setHours(0, 0, 0, 0); // Normalize time to avoid mismatches
    
        // ✅ Ensure selected start date is a Date object
        let startDate = new Date(this.selectedDateRange[0]);
        startDate.setHours(0, 0, 0, 0); // Normalize time
    
        // ✅ Ensure endDate is assigned correctly
        let endDate = this.selectedDateRange[1] ? new Date(this.selectedDateRange[1]) : startDate;
        endDate.setHours(23, 59, 59, 999); // Ensure full-day range

    
        if (startDate=== endDate) {
            // ✅ Single date selected - Exact match
            matches = serviceDate.toISOString().split('T')[0] === startDate.toISOString().split('T')[0];
            console.log(matches)
        } else {
            // ✅ Date range selected - Match within range
            matches = matches && serviceDate.getTime() >= startDate.getTime() && serviceDate.getTime() <= endDate.getTime();
        }
    }
    
    
    
    
    
    
    
    // ✅ Filter by single specific date
    if (this.selectedDate) {
        const singleDate = new Date(this.selectedDate).toISOString().split('T')[0]; // ✅ Extract YYYY-MM-DD only
        console.log(singleDate, "Selected Date (Date Only)");
    
        matches = matches && new Date(service.date).toDateString() === singleDate;
    }
    

      // console.log(matches);
      return matches;
    });

    this.filteredAppointments = this.filteredServices
    console.log(this.filteredAppointments)


  }


  refresh() {
    this.selectedDateRange = [];
    this.filteredAppointments = this.filteredAppointments.filter((appointment:any)=>{
      appointment.date >= new Date()
    })
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

  // Method to clear input fields
  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = 'firstName';
    this.selectedDateRange = [];
    this.filteredAppointments = this.filteredAppointments.filter((appointment:any)=>{
      appointment.date > new Date()
    })
  }
  
  // Method to filter appointments by the selected date
  filterAppointment() {
    // If there's no date range or value to filter, return the unfiltered appointments
    this.filteredList = [...this.completedAppointments];
  
    // Handle filtering by date range if selected
    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // Use endDate if provided, otherwise use startDate
  
      if (startDate && endDate) {
        if(startDate.getTime() !== endDate.getTime()) {
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
    else{
      this.filteredAppointments = []
    }
    }

    else {
          // If no valid range is selected, show all appointments
          this.filteredAppointments = [...this.completedAppointments];
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
    else{
      this.filteredAppointments = [...this.completedAppointments];
    }
  
    // Update the filtered appointments with the final result
    this.filteredAppointments = this.filteredList;
    this.currentPage = 1; // Reset to first page whenever new filters are applied
  }
  ngOnChanges(){
    this.filterAppointment();
    if(this.selectedDateRange && this.selectedDateRange.length === 0){
      this.filterAppointmentsByDate(new Date());
    }
  }
  downloadFilteredData(): void {
    // console.log('Downloading completed appointments data...');
    if (this.filteredList && this.filteredList.length > 0) {
      // console.log('Downloading filtered data...');

      // const selectedFields = this.filteredList.map((appointment: Appointment) => ({
      //   'Patient Name': appointment.patientName,
      //   'Patient Phone Number': appointment.phoneNumber,
      //   'Patient Email': appointment.email,
      //   'Doctor Name': appointment.doctorName,
      //   'Department': appointment.department,
      //   'Appointment Date': appointment.date,
      //   'Appointment Time': appointment.time,
      //   'Appointment Created Time': appointment.created_at,
      //   'Request Via': appointment.requestVia,
      //   'SMS Sent': appointment.smsSent ? 'Yes' : 'No',
      //   'Email Sent': appointment.emailSent ? 'Yes' : 'No',
      //   'Status': appointment.status,
      //   'Appointment Handled By': appointment.user!.username
      // }));
      // Step 1: Convert the filtered data to a worksheet
      const selectedFields = this.filteredList.map((appointment: Appointment) => {
        if(appointment.created_at){
        const createdAt = new Date(appointment?.created_at);
        const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");

        // Store the date and time in two separate variables
        const indianDate = indianTime.format('YYYY-MM-DD');
        const indianTimeOnly = indianTime.format('HH:mm:ss');
        const createdDate = createdAt.toISOString().split('T')[0]; // Extract the date part in YYYY-MM-DD format
        const createdTime = createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // Extract time in HH:mm (24-hour format)
        
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
          'SMS Sent':appointment.messageSent ? 'Yes': 'No',
          'Status': appointment.status,
          'Appointment Handled By': appointment.user!.username,
        };
      
      });
      const worksheet = XLSX.utils.json_to_sheet(selectedFields);
      
      // Step 2: Create a new workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Completed Appointments`);

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
      link.download = 'Completed Appointments.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.warn('No data available to download');
    }
  }
  printAppointmentDetails(): void {
    const selectedFields = this.filteredServices.map((appointment: Appointment) => {
      // console.log('Appointment:', appointment.created_at);
      if(appointment.created_at){
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
            ${selectedFields.map((row:any) => `<tr>${Object.values(row).map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}
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
  completeAppointment(appointment: Appointment) {
    const completed : Appointment = {
      ...appointment,
      status: 'completed',
      smsSent: true,
      emailSent: true,
      messageSent:true,
      requestVia: appointment.requestVia
    };
    this.appointmentService.addCompletedAppointment(completed);
    this.filterAppointment();
  }
  // Method to return the filtered appointments for display
  // getFilteredAppointments() {
  //   return this.filteredAppointments;
  // }
}


