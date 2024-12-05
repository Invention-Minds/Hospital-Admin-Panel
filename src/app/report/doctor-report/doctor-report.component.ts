import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { forkJoin } from 'rxjs';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Subscription } from 'rxjs';
import { Doctor } from '../../models/doctor.model';
import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';
import * as FileSaver from 'file-saver';

interface AppointmentSummary {
  username: string;
  role: string;
  totalHandled: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  userId:number;
}
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
  messageSent?:boolean;
  requestVia?: string; // Optional property
  created_at?: string;
  updated_at?: string;
  username?: string;
  doctor?: {
    id: number;
    name: string;
    department: string;
    doctorType: string;
  };
  user?: {
    id: number;
    username: string;
    password: string;
    role: string;
    createdAt: string;
  };
  userId?:number;
  doctorType?: string;  
}
@Component({
  selector: 'app-doctor-report',
  templateUrl: './doctor-report.component.html',
  styleUrl: './doctor-report.component.css'
})
export class DoctorReportComponent {
  currentPage = 1;
  itemsPerPage = 10;
  confirmedAppointments: Appointment[] = [];
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  usernameFilter: string = ''; // New filter property for username
  roleFilter: string = ''; // New filter property for role
  selectedDateRange: Date[] = [];
  private userSubscription: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private appointmentService: AppointmentConfirmService,
    private authService: AuthServiceService,
    private doctorService: DoctorServiceService
  ) { }

  appointments: Appointment[] = [];
  filteredAppointments: any[] = []; // List to hold filtered appointments

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

  // Function to filter appointments based on user ID
  // filterAppointmentsByUser(userId: number | string): Appointment[] {
  //   console.log('Filtering appointments for user ID:', userId, this.appointments);
  //   return this.appointments.filter(appointment => appointment.userId === userId);
  // }
   // Function to filter appointments based on user ID and date range
   filterAppointmentsByUser(userId: number | string): Appointment[] {
    let filteredList = this.appointments.filter(appointment => appointment.doctorId === userId);

    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate;

      if (startDate && endDate) {
        if (startDate.getTime() !== endDate.getTime()) {
          // Filtering by range
          const normalizedEndDate = new Date(endDate);
          normalizedEndDate.setHours(23, 59, 59, 999); // Set to the last millisecond of the day

          filteredList = filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
          });
        } else {
          // Filtering by single date
          filteredList = filteredList.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate.toDateString() === startDate.toDateString();
          });
        }
      }
    }
    console.log('Filtered list:', filteredList);
    return filteredList;
  }


  sortedAppointments() {
    if (!this.sortColumn) {
      return [...this.filteredAppointments];
    }
    return [...this.filteredAppointments].sort((a, b) => {
      const valueA = this.stripTitle(a[this.sortColumn!]);
      const valueB = this.stripTitle(b[this.sortColumn!]);

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0; // Default to no sorting if types are not strings
    });
  }

  
  refresh(){
    this.selectedDateRange = [];
    this.loadAllAppointments();
  }
  getPaginatedAppointments() {
    const sorted = this.sortedAppointments();  // First, sort the data (or not)
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage); // Return paginated data
  }

  get totalPages() {
    return Math.ceil(this.filteredAppointments.length / this.itemsPerPage);
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  onPageChange() {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  formatDateYear(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns date in 'YYYY-MM-DD' format
  }

  ngOnInit(): void {
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userid');

    if (role) {
      if (role === 'sub_admin' || role === 'super_admin') {
        console.log('Loading all appointments...');
        this.loadAllAppointments();
      }
    }
  }
  filterAppointments(): void {
    this.filteredAppointments = this.appointments.filter(appointment => {
      const matchesUsername = this.usernameFilter.trim()
        ? appointment.username?.toLowerCase().includes(this.usernameFilter.trim().toLowerCase())
        : true;
  
      const matchesRole = this.roleFilter
        ? appointment.user?.role === this.roleFilter
        : true;
  
      return matchesUsername && matchesRole;
    });
  }
  stripTitle(name: string): string {
    return name.replace(/^(Mr\.?|Ms\.?|Dr\.?|Brig\.?)\s*/i, '').trim();
  }

  loadAllAppointments(): void {
    this.appointmentService.getAllAppointments().subscribe(
      (appointments) => {
        this.appointments = appointments;
  
        // Extract unique doctor IDs from the appointments
        const uniqueDoctorIds = Array.from(new Set(appointments.map(appointment => appointment.doctorId)));
  
        // Create an observable array to fetch all unique doctor details
        const doctorDetailsObservables = uniqueDoctorIds.map(doctorId =>
          this.doctorService.getDoctorDetails(doctorId)
        );
  
        // Iterate through the doctor details observables to fetch the doctorType
        doctorDetailsObservables.forEach((observable) => {
          observable.subscribe({
            next: (doctor) => {
              // Update the appointments with doctorType
              this.appointments.forEach(appointment => {
                if (appointment.doctorId === doctor.id) {
                  appointment.doctorType = doctor.doctorType; // Add doctorType from response
                }
              });
  
              // After updating the appointments, summarize the doctor-wise data
              this.createDoctorSummary();
            },
            error: (error) => {
              console.error('Error fetching doctor details:', error);
            }
          });
        });
      },
      (error) => {
        console.error('Error fetching all appointments:', error);
      }
    );
  }
  
  // Function to create a summary of doctor-wise appointment data
  private createDoctorSummary(): void {
    let filteredAppointments: Appointment[] = this.appointments;
    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // Use endDate if provided, otherwise use startDate
  
      if (startDate && endDate) {
        if(startDate.getTime() !== endDate.getTime()) {
        // Filtering appointments by the selected date range
        // console.log('Start date:', startDate, 'End date:', endDate);
        const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);  // Set to the last millisecond of the day

        filteredAppointments = filteredAppointments.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.date);  // Assuming 'date' is in string format like 'YYYY-MM-DD'
          return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
        });
        // console.log('Filtered list:', filteredAppointments);
      }
      else if (startDate.getTime() === endDate.getTime()) {
        console.log('Single date selected:');
        const startDate = this.selectedDateRange[0];
    
        filteredAppointments = filteredAppointments.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.date);
          return appointmentDate.toDateString() === startDate.toDateString();  // Compare the date portion only
        });
        // console.log('Filtered list:', this.filteredList);
      }
    }
    else{
      filteredAppointments = []
    }
    }

    else {
      console.log('No valid date range selected');
          // If no valid range is selected, show all appointments
          filteredAppointments = this.appointments
        }
    // Aggregate appointment data doctor-wise
    const doctorSummary: { [key: string]: any } = {};
  
    filteredAppointments.forEach((appointment) => {
      const doctorId = appointment.doctorId;
      if (!doctorSummary[doctorId]) {
        doctorSummary[doctorId] = {
          doctorName: appointment.doctorName || 'Unknown',
          department: appointment.department.toLowerCase() || 'Unknown',
          availabilityType: appointment.doctorType || 'Removed Doctor',
          totalHandled: 0,
          confirmed: 0,
          attended: 0,
          cancelled: 0,
          doctorId: doctorId,
        };
      }
  
      // Update appointment counts
      doctorSummary[doctorId].totalHandled++;
      if (appointment.status === 'confirmed') {
        doctorSummary[doctorId].confirmed++;
      } else if (appointment.status === 'completed') {
        doctorSummary[doctorId].attended++;
      }
      else if (appointment.status === 'cancelled') {
        doctorSummary[doctorId].cancelled++;
      }
    });
  
    // Convert the summary object to an array for display
    this.filteredAppointments = Object.values(doctorSummary);
    console.log('Fetched doctor-wise appointments:', this.filteredAppointments);
  }
  

  
  

  
  // Function to download the filtered appointments as an Excel file
  downloadAppointments(userId: number | string): void {
    const userAppointments = this.filterAppointmentsByUser(userId);
    console.log('Downloading appointments for user ID:', userId);
  
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Appointments');
  
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Patient Name', key: 'patientName', width: 20 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Doctor Name', key: 'doctorName', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
    ];
  
    // Add rows to the worksheet
    userAppointments.forEach((appointment, index) => {
      worksheet.addRow({
        no: index + 1,
        patientName: appointment.patientName,
        phoneNumber: appointment.phoneNumber,
        doctorName: appointment.doctorName,
        department: appointment.department,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
      });
    });
  
    // Generate the Excel file and download it
    workbook.xlsx.writeBuffer().then((buffer) => {
      FileSaver.saveAs(new Blob([buffer]), `Appointments_${userId}.xlsx`);
    });
  }

  // Function to print the filtered appointments
  printAppointments(userId: number | string): void {
    const userAppointments = this.filterAppointmentsByUser(userId);
    console.log('Printing appointments for user ID:', userId);
  
    let printContents = `
      <h1>Appointments Report for User ID: ${userId}</h1>
      <table border="1">
        <thead>
          <tr>
            <th>No</th>
            <th>Patient Name</th>
            <th>Phone Number</th>
            <th>Doctor Name</th>
            <th>Department</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;
  
    userAppointments.forEach((appointment, index) => {
      printContents += `
        <tr>
          <td>${index + 1}</td>
          <td>${appointment.patientName}</td>
          <td>${appointment.phoneNumber}</td>
          <td>${appointment.doctorName}</td>
          <td>${appointment.department}</td>
          <td>${appointment.date}</td>
          <td>${appointment.time}</td>
          <td>${appointment.status}</td>
        </tr>
      `;
    });
  
    printContents += `
        </tbody>
      </table>
    `;
  
    const popupWin = window.open('', '_blank', 'width=800,height=600');
    popupWin?.document.open();
    popupWin?.document.write(`
      <html>
        <head>
          <title>Print Appointments</title>
        </head>
        <body onload="window.print()">
          ${printContents}
        </body>
      </html>
    `);
    popupWin?.document.close();
  }

  private extractName(username: string): string {
    // Extract the part before the first underscore or '@'
    return username.split(/[_@]/)[0];
  }
}
