// import { Component } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
// import { AuthServiceService } from '../../services/auth/auth-service.service';
// import { Subscription } from 'rxjs';
// import { format } from 'path';
// import { app } from '../../../../server';

// interface Appointment {
//   id?: number;
//   patientName: string;
//   phoneNumber: string;
//   doctorName: string;
//   doctorId:number;
//   department: string;
//   date: string;
//   time: string;
//   status: string;
//   email: string;
//   smsSent?:boolean;
//   emailSent?:boolean;
//   requestVia?: string; // Optional property
//   created_at?: string;
//   updated_at?: string;
//   user?: {
//     id: number;
//     username: string;
//     password: string;
//     role: string;
//     createdAt: string;
//   };
// }
// @Component({
//   selector: 'app-admin-report',
//   templateUrl: './admin-report.component.html',
//   styleUrl: './admin-report.component.css'
// })
// export class AdminReportComponent {
//   currentPage = 1;
//   itemsPerPage = 10;
//   filteredAppointments: Appointment[] = [];
//   sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
//   sortDirection: string = 'asc';  // Default sorting direction
//   private userSubscription: Subscription | undefined;
//   usernameFilter: string = '';

//   constructor( private route: ActivatedRoute, private appointmentService: AppointmentConfirmService, private authService: AuthServiceService){}
//   appointments: Appointment[] = [];

//   sortBy(column: keyof Appointment) {
//     if (this.sortColumn === column) {
//       this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; // Toggle direction
//     } else {
//       this.sortColumn = column;
//       this.sortDirection = 'asc'; // Default to ascending when a new column is clicked
//     }
//     if (column === 'date') {
//       this.appointments.sort((a, b) => {
//         const dateA = new Date(a.date);
//         const dateB = new Date(b.date);
//         return this.sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
//       });
//     }
//     this.currentPage = 1; // Reset to the first page when sorting changes
//   }
//   sortedAppointments() {
//     if (!this.sortColumn) {
//       // If no sorting column is selected, return the appointments as is (unsorted)
//       return [...this.filteredAppointments];
//     }
//     console.log("this.appointments",this.appointments);
//     console.log("this.appointments",this.appointments);
//     return [...this.filteredAppointments].sort((a, b) => {
//       const valueA = a[this.sortColumn!]; // Use the non-null assertion operator (!) to tell TypeScript sortColumn is defined
//       const valueB = b[this.sortColumn!]; 

//       if (typeof valueA === 'string' && typeof valueB === 'string') {
//         const comparison = valueA.localeCompare(valueB);
//         return this.sortDirection === 'asc' ? comparison : -comparison;
//       }

//       return 0; // Default to no sorting if types are not strings
//     });
//   }
//     // Method to return paginated appointments after sorting
//     getPaginatedAppointments() {
//       const sorted = this.sortedAppointments();  // First, sort the data (or not)
//       const startIndex = (this.currentPage - 1) * this.itemsPerPage;
//       return sorted.slice(startIndex, startIndex + this.itemsPerPage); // Return paginated data
//     }
  
//     // Method to calculate total pages
//     get totalPages() {
//       return Math.ceil(this.appointments.length / this.itemsPerPage);
//     }
  
//     // Method to go to the previous page
//     prevPage() {
//       if (this.currentPage > 1) {
//         this.currentPage--;
//       }
//     }
  
//     // Method to go to the next page
//     nextPage() {
//       if (this.currentPage < this.totalPages) {
//         this.currentPage++;
//       }
//     }
  
//     // Handle page number change
//     onPageChange() {
//       if (this.currentPage < 1) {
//         this.currentPage = 1;
//       } else if (this.currentPage > this.totalPages) {
//         this.currentPage = this.totalPages;
//       }
//     }
//       // Utility method to format the date in 'dd/mm/yy' format
//   formatDate(date: Date): string {
//     const day = String(date.getDate()).padStart(2, '0');
//     const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
//     const year = date.getFullYear().toString().slice(-4); // Get last two digits of year
//     return `${year}-${month}-${day}`;
//   }

//   ngOnDestroy(): void {
//     if (this.userSubscription) {
//       this.userSubscription.unsubscribe();
//     }
//   }
//   formatDateYear(dateString: string): string {
//     const date = new Date(dateString);
//     return date.toISOString().split('T')[0]; // Returns date in 'YYYY-MM-DD' format
//   }
//   ngOnInit(): void {
//     // const userId = Number(this.route.snapshot.paramMap.get('userId'));
//     // this.loadAppointmentsByUser(userId);
//      // Subscribe to getUser and load appointments based on the user
//     //  const user = this.authService.getUser();
//     //  console.log(user,"from admin report");
//     //   if (user) {
//     //     this.loadAppointmentsByUser(user.id);
//     //   } else {
//     //     console.error('User not found');
//     //     this.authService.initializeUserFromStorage();
//     // const newUser = this.authService.getUser();
//     // if (newUser) {
//     //   this.loadAppointmentsByUser(newUser.id);
//     // }
//     const role = localStorage.getItem('role');
//     const userId = localStorage.getItem('userid');
//     console.log('role',role);

//     if (role) {
//       if (role === 'sub_admin' || role === 'super_admin') {
//         this.loadAllAppointments();
//       } else if (role === 'admin' && userId) {
//         this.loadAppointmentsByUser(parseInt(userId, 10));
//       }
//     }
//         // this.authService.initializeUserFromStorage();
//       }
//       private loadAllAppointments(): void {
//         this.appointmentService.getAllAppointments().subscribe(
//           (appointments) => {
//             console.log('Fetched all appointments for sub_admin or super_admin:', appointments);
//             this.appointments = appointments.map(appointment => {
//               return {
//                 ...appointment,
//                 username: appointment.user?.username ?? 'Unknown',
//                 created_at: this.formatDateYear(appointment.created_at ?? '1970-01-01'),
//           updated_at: this.formatDateYear(appointment.updated_at ?? '1970-01-01'),
//               };
//             });
//           },
//           (error) => {
//             console.error('Error fetching all appointments:', error);
//           }
//         );
//       }
  
//   loadAppointmentsByUser(userId: number): void {
//     this.appointmentService.getAppointmentsByUser(userId).subscribe((appointments: any[]) => {
//       console.log('Appointments by user:', appointments);
      
//       // Ensure each appointment has the `username` assigned
//       this.appointments = appointments.map(appointment => {

//         if (appointment.user) {
//           return {
//             ...appointment,
//             username: appointment.user.username,
//             created_at: this.formatDateYear(appointment.created_at),
//             updated_at: this.formatDateYear(appointment.updated_at),
//           };
//         } else {
//           return {
//             ...appointment,
//             username: 'Unknown',
//           };
//         }
//       });
//     });
//   }
//     // Filter appointments by username
//     filterAppointments() {
//       if (this.usernameFilter.trim()) {
//         this.filteredAppointments = this.appointments.filter(appointment =>
//           appointment.user?.username?.toLowerCase().includes(this.usernameFilter.trim().toLowerCase())
//         );
//         console.log(this.filteredAppointments)
//       } else {
//         this.filteredAppointments = this.appointments; // Reset to all appointments when the filter is cleared
//       }
//     }
  
// }
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { Subscription } from 'rxjs';

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
  selector: 'app-admin-report',
  templateUrl: './admin-report.component.html',
  styleUrl: './admin-report.component.css'
})
export class AdminReportComponent {
  currentPage = 1;
  itemsPerPage = 10;
  confirmedAppointments: Appointment[] = [];
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  usernameFilter: string = ''; // New filter property for username
  roleFilter: string = ''; // New filter property for role
  private userSubscription: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private appointmentService: AppointmentConfirmService,
    private authService: AuthServiceService
  ) {}

  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = []; // List to hold filtered appointments

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

  formatDateYear(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns date in 'YYYY-MM-DD' format
  }

  ngOnInit(): void {
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userid');

    if (role) {
      if (role === 'sub_admin' || role === 'super_admin') {
        this.loadAllAppointments();
      } else if (role === 'admin' && userId) {
        this.loadAppointmentsByUser(parseInt(userId, 10));
      }
    }
  }

  // private loadAllAppointments(): void {
  //   this.appointmentService.getAllAppointments().subscribe(
  //     (appointments) => {
  //       this.appointments = appointments.map(appointment => ({
  //          const username = appointment.user?.username ? this.extractName(appointment.user.username) : 'Unknown';
  //         ...appointment,
  //         // username: appointment.user?.username ?? 'Unknown',
          
  //         created_at: this.formatDateYear(appointment.created_at ?? '1970-01-01'),
  //         updated_at: this.formatDateYear(appointment.updated_at ?? '1970-01-01'),
  //       }));
  //       this.filteredAppointments = this.appointments; // Initialize filteredAppointments
  //     },
  //     (error) => {
  //       console.error('Error fetching all appointments:', error);
  //     }
  //   );
  // }

  // loadAppointmentsByUser(userId: number): void {
  //   this.appointmentService.getAppointmentsByUser(userId).subscribe((appointments: any[]) => {
  //     this.appointments = appointments.map(appointment => ({
  //        const username = appointment.user?.username ? this.extractName(appointment.user.username) : 'Unknown';
  //       ...appointment,
  //       // username: appointment.user?.username ?? 'Unknown',
        
  //       created_at: this.formatDateYear(appointment.created_at ?? '1970-01-01'),
  //       updated_at: this.formatDateYear(appointment.updated_at ?? '1970-01-01'),
  //     }));
  //     this.filteredAppointments = this.appointments; // Initialize filteredAppointments
  //   });
  // }
  
  // private extractName(username: string): string {
  //   // Extract the part before the first underscore or '@'
  //   return username.split(/[_@]/)[0];
  // }
  private loadAllAppointments(): void {
    this.appointmentService.getAllAppointments().subscribe(
      (appointments) => {
        this.appointments = appointments.map(appointment => {
          // Extract the name from the username
          const username = appointment.user?.username ? this.extractName(appointment.user.username) : 'Unknown';
  
          return {
            ...appointment,
            username,
            created_at: this.formatDateYear(appointment.created_at ?? '1970-01-01'),
            updated_at: this.formatDateYear(appointment.updated_at ?? '1970-01-01'),
          };
        });
        this.filteredAppointments = this.appointments; // Initialize filteredAppointments
        // console.log('Fetched all appointments for sub_admin or super_admin:', this.appointments);
      },
      (error) => {
        console.error('Error fetching all appointments:', error);
      }
    );
  }
  
  private extractName(username: string): string {
    // Extract the part before the first underscore or '@'
    return username.split(/[_@]/)[0];
  }
  
  loadAppointmentsByUser(userId: number): void {
    this.appointmentService.getAppointmentsByUser(userId).subscribe((appointments: any[]) => {
      this.appointments = appointments.map(appointment => {
        // Extract the name from the username
        const username = appointment.user?.username ? this.extractName(appointment.user.username) : 'Unknown';
  
        return {
          ...appointment,
          username,
          created_at: this.formatDateYear(appointment.created_at ?? '1970-01-01'),
          updated_at: this.formatDateYear(appointment.updated_at ?? '1970-01-01'),
        };
      });
      this.filteredAppointments = this.appointments; // Initialize filteredAppointments
    });
  }
  
  
  // Filter appointments by username and role
  filterAppointments() {
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
