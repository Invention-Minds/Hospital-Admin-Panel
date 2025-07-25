import { Component, Input, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service'
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
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
  selector: 'app-arrived-consultation',
  templateUrl: './arrived-consultation.component.html',
  styleUrl: './arrived-consultation.component.css'
})
export class ArrivedConsultationComponent {

  confirmedAppointments: Appointment[] = [];

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService, private cdRef: ChangeDetectorRef) { }
  appointments: Appointment[] = [
    // { id: '0001', patientName: 'Search Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Booked', smsSent: true },
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
  doctor:any[]=[];
  doctorId:number=0;

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

  loadDoctorData() {
    this.doctorService.getDoctorByUserId(this.userId).subscribe(
      (response) => {
        this.doctor = response;
        console.log(this.doctor)
        this.doctorId = response.id;
        this.fetchAppointments(this.doctorId); // Fetch only this doctor's appointments
      }
    );
  }
  fetchAppointments(doctorId?: number) {
    this.appointmentService.getAppointmentsByDoctorToday(doctorId!).subscribe(
      (appointments) => {
        console.log(appointments)
        this.confirmedAppointments = appointments
        this.filteredAppointments = this.confirmedAppointments
        this.futureAppointments = this.filteredAppointments.filter(appointment => !appointment.checkedOut || (!appointment.checkedOut && !appointment.isCloseOPD))
        this.filteredAppointments.sort((a, b) => {
          // 1. Move finished consultations to the bottom
          if (a.endConsultation && !b.endConsultation) return 1;
          if (!a.endConsultation && b.endConsultation) return -1;

          // 2. Sort by appointment time (earliest first)
          const timeA = this.parseTimeToMinutes(a.time);
          const timeB = this.parseTimeToMinutes(b.time);
          return timeA - timeB;
        });
        // this.filterAppointmentsByDate(new Date());
        this.isLoading = false;
        // console.log(`Loaded ${doctor.patients.length} patients for doctor ${doctor.name}`);
      },
      (error) => {
        console.error(`Error fetching appointments for doctor ${doctorId!}:`, error);
        this.isLoading = false
        // Handle error gracefully by assigning an empty array
      }

    );
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
    this.loadDoctorData()

    // Fetch appointments
    // this.appointmentService.fetchAppointments();
    // this.appointmentService.getAllAppointments().subscribe({
    //   next: (appointments) => {
    //     // console.log('All Appointments received:', appointments);
    //     this.allAppointments = appointments;
    //     this.confirmedAppointments = this.allAppointments

    //     this.doctorService.getAllDoctors().subscribe({
    //       next: (doctors) => {
    //         this.futureAppointments = this.confirmedAppointments.filter(appointment => {
    //           const doctor = doctors.find(doc => doc.id === appointment.doctorId);

    //           return doctor && doctor.userId === parseInt(this.userId) && appointment.date === this.today;

    //         });
    //         console.log(this.futureAppointments)
    //         this.filteredAppointments = [...this.futureAppointments];
    //       },
    //       error: (error) => {
    //         console.error('Error fetching doctor details:', error);
    //       }
    //     });
    //     // console.log(this.filteredAppointments)
    //     this.filteredAppointments.sort((a, b) => {
    //       const dateA = new Date(a.created_at!);
    //       const dateB = new Date(b.created_at!);
    //       return dateB.getTime() - dateA.getTime();
    //     });


    //     // this.filteredAppointments = [...this.confirmedAppointments];
    //     // this.filterAppointmentsByDate(new Date());

    //     // console.log('Setting isLoading to false');
    //     setTimeout(() => {
    //       // console.log('Setting isLoading to false after delay');
    //       this.isLoading = false; // Stop loading indicator
    //     }, 1000); // 2-second delay
    //   }
    // })

    // Subscribe to confirmed appointments

  }

  parseTimeToMinutes(time: string): number {
    const [hours, minutesPart] = time.split(':');
    const minutes = parseInt(minutesPart.slice(0, 2), 10); // Extract the numeric minutes
    const isPM = time.toLowerCase().includes('pm');

    let hoursInMinutes = parseInt(hours, 10) * 60;
    if (isPM && parseInt(hours, 10) !== 12) {
      hoursInMinutes += 12 * 60; // Add 12 hours for PM times
    } else if (!isPM && parseInt(hours, 10) === 12) {
      hoursInMinutes -= 12 * 60; // Subtract 12 hours for 12 AM
    }

    return hoursInMinutes + minutes;
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
  filteredAppointments: Appointment[] = [...this.confirmedAppointments];
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
  }
}


