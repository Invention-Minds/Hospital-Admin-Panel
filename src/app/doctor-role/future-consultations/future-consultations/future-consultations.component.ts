import { Component, Input, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { AppointmentConfirmService } from '../../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import * as XLSX from 'xlsx';
import { start } from 'node:repl';
import * as moment from 'moment-timezone';

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
  checkedOut?: boolean;
  user?: any;
  selectedSlot?: boolean;
  endConsultation?: boolean;
  checkedOutTime?: Date;
  checkedInTime?: Date;
  waitingTime?: string;
  postPond?: boolean;
  endConsultationTime?: Date;
  isTransfer?: boolean;
  isCloseOPD?: boolean;
  isCloseOPDTime?: Date;
  expanded?: any;
  extraWaitingTime?: any;
  prnNumber?:any
}

@Component({
  selector: 'app-future-consultations',
  templateUrl: './future-consultations.component.html',
  styleUrl: './future-consultations.component.css'
})
export class FutureConsultationsComponent {
  confirmedAppointments: Appointment[] = [];

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService, private cdRef: ChangeDetectorRef) { }
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
  isLoading: boolean = false;
  allAppointments: Appointment[] = [];
  today: string = '';
  futureAppointments: Appointment[] = [];
  isDesktopView: boolean = true;

  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isDesktopView = window.innerWidth > 500; // Use table if screen width > 768px
  }
  toggleCard(index: number, event: Event): void {
    const targetElement = event.target as HTMLElement;
  
    // Check if the clicked element is a button or inside a button
    if (targetElement.tagName === 'BUTTON' || targetElement.closest('button')) {
      event.stopPropagation(); // ✅ Prevent the click from propagating to the card
      return;
    }
  
    // Toggle card expansion
    this.filteredAppointments[index].expanded = !this.filteredAppointments[index].expanded;
  }
  
  // Method to handle sorting by a specific column
  ngOnInit() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;
    this.checkScreenSize()
    // console.log('Setting isLoading to true');
    this.isLoading = true; // Start loading indicator
    this.userId = localStorage.getItem('userid')

    // Fetch appointments
    this.appointmentService.fetchAppointments();
    this.appointmentService.getAllAppointments().subscribe({
      next: (appointments) => {
        // console.log('All Appointments received:', appointments);
        this.allAppointments = appointments;
        this.confirmedAppointments = appointments.filter(appointment => appointment.status === 'confirmed');

        this.doctorService.getAllDoctors().subscribe({
          next: (doctors) => {
            this.futureAppointments = this.confirmedAppointments.filter(appointment => {
              const doctor = doctors.find(doc => doc.id === appointment.doctorId);
              // console.log('Doctor:', doctor?.userId,this.userId);
              return doctor && doctor.userId === parseInt(this.userId) && appointment.date > this.today;

            });
            console.log(this.futureAppointments)
            this.filteredAppointments = [...this.futureAppointments];
            this.filteredAppointments.sort((a, b) => {
              const today = new Date().setHours(0, 0, 0, 0); // ✅ Normalize today’s date (remove time)
              const dateA = new Date(a.date!).setHours(0, 0, 0, 0);
              const dateB = new Date(b.date!).setHours(0, 0, 0, 0);
            
              if (dateA < today && dateB >= today) return 1;  // ✅ Push past dates below future dates
              if (dateA >= today && dateB < today) return -1; // ✅ Push future dates above past dates
            
              return dateA - dateB; // ✅ Sort from today to future dates in ascending order
            });
          },
          error: (error) => {
            console.error('Error fetching doctor details:', error);
          }
        });
        // console.log(this.filteredAppointments)
        // this.filteredAppointments.sort((a, b) => {
        //   const dateA = new Date(a.date!);
        //   const dateB = new Date(b.date!);
        //   return dateB.getTime() - dateA.getTime();
        // });
        
        console.log(this.filteredAppointments)        


        // this.filteredAppointments = [...this.confirmedAppointments];
        // this.filterAppointmentsByDate(new Date());

        // console.log('Setting isLoading to false');
        setTimeout(() => {
          // console.log('Setting isLoading to false after delay');
          this.isLoading = false; // Stop loading indicator
        }, 1000); // 2-second delay
      }
    })

    // Subscribe to confirmed appointments

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
  filteredAppointments: Appointment[] = [...this.futureAppointments];
  // filteredAppointments: Appointment[] = this.confirmedAppointments.filter(appointment => !appointment!.completed);

  // ngOnChanges(changes: SimpleChanges) {
  //   // Whenever the selected date changes, this will be triggered
  //   this.filterAppointment();
  //   if(this.selectedDateRange && this.selectedDateRange.length === 0){
  //     this.filterAppointmentsByDate(new Date());
  //   }

  // }

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
  // onDateChange(newDate: Date) {
  //   this.filterAppointmentsByDate(newDate);
  // }


  // filterAppointment() {
  //   // If there's no date range or value to filter, return the unfiltered appointments
  //   this.filteredList = [...this.filteredAppointments];

  //   // Handle filtering by date range if selected
  //   if (this.selectedDateRange && this.selectedDateRange.length === 2) {
  //     const startDate = this.selectedDateRange[0];
  //     const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // Use endDate if provided, otherwise use startDate

  //     if (startDate && endDate) {
  //       if(startDate.getTime() !== endDate.getTime()) {
  //       // Filtering appointments by the selected date range
  //       // console.log('Start date:', startDate, 'End date:', endDate);
  //       const normalizedEndDate = new Date(endDate);
  //   normalizedEndDate.setHours(23, 59, 59, 999);  // Set to the last millisecond of the day

  //       this.filteredList = this.filteredList.filter((appointment: Appointment) => {
  //         const appointmentDate = new Date(appointment.date);  // Assuming 'date' is in string format like 'YYYY-MM-DD'
  //         return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
  //       });
  //       // console.log('Filtered list:', this.filteredList);
  //     }
  //     else if (startDate.getTime() === endDate.getTime()) {
  //       // console.log('Single date selected:');
  //       const startDate = this.selectedDateRange[0];

  //       this.filteredList = this.filteredList.filter((appointment: Appointment) => {
  //         const appointmentDate = new Date(appointment.date);
  //         return appointmentDate.toDateString() === startDate.toDateString();  // Compare the date portion only
  //       });
  //       // console.log('Filtered list:', this.filteredList);
  //     }
  //   }
  //   else{
  //     this.filteredAppointments = []
  //   }
  //   }

  //   else {
  //         // If no valid range is selected, show all appointments
  //         this.filteredAppointments = [...this.filteredAppointments];
  //       }


  //   // Update the filtered appointments with the final result
  //   this.filteredAppointments = this.filteredList;
  //   this.currentPage = 1; // Reset to first page whenever new filters are applied
  // }





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


  // Method to return the filtered appointments for display
  // getFilteredAppointments() {
  //   return this.filteredAppointments;
  // }






  onSearch() {
    this.filteredList = [...this.filteredAppointments];
    // console.log('Search value:', this.filteredList);

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

          this.filteredList = this.futureAppointments.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);  // Assuming 'date' is in string format like 'YYYY-MM-DD'
            return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
          });
          // console.log('Filtered list:', this.filteredList);
          this.filteredAppointments = this.filteredList
        }
        else if (startDate.getTime() === endDate.getTime()) {
          // console.log('Single date selected:');
          const startDate = this.selectedDateRange[0];
          // console.log(startDate);
          this.filteredList = this.futureAppointments.filter((appointment: Appointment) => {
            const appointmentDate = new Date(appointment.date);
            // console.log(appointmentDate, startDate, appointmentDate.toDateString(), startDate.toDateString());
            return appointmentDate.toDateString() === startDate.toDateString();  // Compare the date portion only
          });
          // console.log('Filtered list:', this.filteredList);
          this.filteredAppointments = this.filteredList;
        }
      }
      else {
        this.filteredAppointments = []
      }
    }

    else {
      // If no valid range is selected, show all appointments
      this.filteredAppointments = [...this.futureAppointments];
    }
  }
  refresh() {
    this.selectedDateRange = [];
    this.filteredAppointments = [...this.futureAppointments];
    this.filteredAppointments.sort((a, b) => {
      const today = new Date().setHours(0, 0, 0, 0); // ✅ Normalize today’s date (remove time)
      const dateA = new Date(a.date!).setHours(0, 0, 0, 0);
      const dateB = new Date(b.date!).setHours(0, 0, 0, 0);
    
      if (dateA < today && dateB >= today) return 1;  // ✅ Push past dates below future dates
      if (dateA >= today && dateB < today) return -1; // ✅ Push future dates above past dates
    
      return dateA - dateB; // ✅ Sort from today to future dates in ascending order
    });
  }
}


