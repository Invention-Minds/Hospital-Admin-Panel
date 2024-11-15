import { Component,Input } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
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
}
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
  @Input() selectedDateRange: Date[] | null = null;
  @Input() selectedValue: string = '';
  @Input() selectedSearchOption: string = ''; 
  filteredList: any;

  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];
  // Method to handle sorting by a specific column
  ngOnInit() {
    // this.appointmentService.completedAppointments$.subscribe(appointments => {
    //   this.completedAppointments = appointments;
    //   this.filteredAppointments = [...this.completedAppointments];
    //   console.log('Confirmed appointments from component:', this.completedAppointments);
    this.appointmentService.completedAppointments$.subscribe(appointments => {
      this.completedAppointments = appointments;
      this.completedAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredAppointments = [...this.completedAppointments];
    });
  
    // Fetch appointments from backend to initialize the data
    this.appointmentService.fetchAppointments();
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
    return Math.ceil(this.completedAppointments.length / this.itemsPerPage);
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

  ngOnChanges() {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
  }
  
  // Method to filter appointments by the selected date
  filterAppointment() {
    this.filteredList = [...this.completedAppointments];
  
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
    if (this.selectedValue.trim() !== '') {
      const searchLower = this.selectedValue.toLowerCase();
      // filteredList = this.filteredAppointments.filter(completedAppointments =>
      //   completedAppointments.patientName.toLowerCase().includes(searchLower) ||
      //   completedAppointments.phoneNumber.toLowerCase().includes(searchLower)

      // );
      this.filteredList = this.filteredAppointments.filter((appointment) => {
        // console.log('Selected search option:', this.selectedSearchOption);
        // console.log('Selected value:', this.selectedValue);
       
        // console.log('Search lower:', searchLower);
        // console.log('Appointment:', appointment);
        // console.log('Filtered list:', this.filteredList);
      
        let match = false;

        switch (this.selectedSearchOption) {
          case 'patientName':
            // console.log('Patient Name:', appointment.patientName.toLowerCase());
            match = appointment.patientName ? appointment.patientName.toLowerCase().includes(searchLower) : false;
            // console.log('Match:', match);
            break;
          case 'phoneNumber':
            match = appointment.phoneNumber ? appointment.phoneNumber.toLowerCase().includes(searchLower) : false;
            break;
          case 'doctorName':
            match = appointment.doctorName ? appointment.doctorName.toLowerCase().includes(searchLower) : false;
            break;
          default:
            match = true;
        }
  

      return match;
    });
  

    }
    else {
      // If no date is selected, show all appointments
      this.filteredAppointments = [...this.completedAppointments];
    }
    this.filteredAppointments = this.filteredList;
    this.currentPage = 1;
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


