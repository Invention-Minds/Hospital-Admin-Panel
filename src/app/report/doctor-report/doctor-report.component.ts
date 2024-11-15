import { Component } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';

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
  user?: {
    id: number;
    username: string;
    password: string;
    role: string;
    createdAt: string;
  };
}
@Component({
  selector: 'app-doctor-report',
  templateUrl: './doctor-report.component.html',
  styleUrl: './doctor-report.component.css'
})
export class DoctorReportComponent {
appointments: Appointment[] = [];
filteredAppointments: Appointment[] = [];
currentPage = 1;
itemsPerPage = 10;
// confirmedAppointments: Appointment[] = [];
sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
sortDirection: string = 'asc';  // Default sorting direction
doctorName: string = ''; // New filter property for username
roleFilter: string = ''; // New filter property for role


  constructor(private appointmentService: AppointmentConfirmService, private authService: AuthServiceService) {}

  ngOnInit(): void {
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userid');

    // if (role) {
    //   if (role === 'sub_admin' || role === 'super_admin') {
    //     this.loadAllAppointments();
    //   } else if (role === 'admin' && userId) {
    //     this.loadAppointmentsByUser(parseInt(userId, 10));
    //   }
    // }
    this.loadAllAppointments();
  }
  formatDateYear(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns date in 'YYYY-MM-DD' format
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

  sortedAppointments() {
    if (!this.sortColumn) {
      return [...this.filteredAppointments];
    }
    return [...this.filteredAppointments].sort((a, b) => {
      const valueA = a[this.sortColumn!];
      const valueB = b[this.sortColumn!];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0; // Default to no sorting if types are not strings
    });
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
  private loadAllAppointments(): void {
    this.appointmentService.getAllAppointments().subscribe(
      (appointments) => {
        this.appointments = appointments.map(appointment => ({
          ...appointment,
          username: appointment.user?.username ?? 'Unknown',
          created_at: this.formatDateYear(appointment.created_at ?? '1970-01-01'),
          updated_at: this.formatDateYear(appointment.updated_at ?? '1970-01-01'),
        }));
        this.filteredAppointments = this.appointments; // Initialize filteredAppointments
      },
      (error) => {
        console.error('Error fetching all appointments:', error);
      }
    );
  }
    // Filter appointments by username and role
    filterAppointments() {
      this.filteredAppointments = this.appointments.filter(appointment => {
        const matchesUsername = this.doctorName.trim()
          ? appointment.doctorName?.toLowerCase().includes(this.doctorName.trim().toLowerCase())
          : true;
  
        const matchesRole = this.roleFilter
          ? appointment.user?.role === this.roleFilter
          : true;
  
        return matchesUsername && matchesRole;
      });
    }
    getStatusClass(status: string): string {
      switch (status.toLowerCase()) {
        case 'cancelled':
          return 'status-cancelled';
        case 'confirmed':
          return 'status-confirmed';
        case 'completed':
          return 'status-completed';
        default:
          return 'status-default'; // You can add a default class if needed
      }
    }
}
