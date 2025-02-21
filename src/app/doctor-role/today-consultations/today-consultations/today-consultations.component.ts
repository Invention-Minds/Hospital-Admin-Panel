import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter, HostListener } from '@angular/core';
import { AppointmentConfirmService } from '../../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import { EstimationService } from '../../../services/estimation/estimation.service';
import { EventService } from '../../../services/event.service';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { Doctor } from '../../../models/doctor.model';
import { ChannelService } from '../../../services/channel/channel.service';
import { environment } from '../../../../environment/environment';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { start } from 'node:repl';
import * as moment from 'moment-timezone';
import { app } from '../../../../../server';

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
  expanded?:any;
  extraWaitingTime?:any;
}

@Component({
  selector: 'app-today-consultations',
  templateUrl: './today-consultations.component.html',
  styleUrl: './today-consultations.component.css'
})
export class TodayConsultationsComponent {
  confirmedAppointments: Appointment[] = [];
  @Output() consultationStarted = new EventEmitter<{ doctorId: number, appointmentId: number }>();

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService, private cdRef: ChangeDetectorRef, private eventService: EventService, private estimationService: EstimationService, private channelService: ChannelService) { }
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
  allAppointments: Appointment[] = []
  today: string = '';
  showEstimationPopup = false; // Control the visibility of the popup
  currentDoctorName: string = ''; // Store the current doctor's name
  estimationText: string = ''; // Store the estimation text
  showCloseOpdPopup = false;
  currentDoctorId: number = 0;
  currentDepartmentId: number = 0;
  currentDepartmentName: string = ''
  doctor: any = []
  showLeaveRequestPopup: boolean = false;
  startDate: string | null = null;
  endDate: string | null = null;
  estimationPreferedDate: string = ''
  estimationSuggestions: string[] = []; // Full list of suggestions
  filteredEstimations: any[] = []; // Filtered suggestions for dropdown
  showEstimationSuggestions: boolean = false;
  estimationType: string = 'MM'
  showCancelPopup: boolean = false;
  remarks: string = '';
  completedAppointments: any[] = [];
  showTransferAppointment: boolean = false;
  estimation: any[] = [];
  countOfPending: number = 0;
  surgeryTime: string = '';
  doctorId: number = 0;
  estimationStatus: string = 'planned';
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];
  closeOpdAppointments: Appointment[] = []
  isDesktopView: boolean = true;
  totalStay: number = 0;
  icu: number = 0;
  ward: number = 0;
  surgeryPackage: string = 'single surgery';
  intervalId: any;
  isMonitoringActive: boolean = false;



  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isDesktopView = window.innerWidth > 500; // Use table if screen width > 768px
  }

  private eventSource: EventSource | null = null;
  // Method to handle sorting by a specific column
  ngOnInit() {
    this.checkScreenSize();
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;
    
    // console.log('Setting isLoading to true');
    this.isLoading = true; // Start loading indicator
    this.userId = localStorage.getItem('userid')
    this.appointmentService.leaveRequest$.subscribe(() => {
      this.showLeaveRequestPopup = true; // Open the leave request popup
    });
    this.loadDoctorData()
   
    // this.doctorService.getDoctorByUserId(this.userId).subscribe(
    //   (response) =>{
    //     this.doctor = response;
    //     this.doctorId = response.id
    //     this.fetchAppointments(this.doctorId);
    //     console.log(this.doctor)
    //   }
    // )
    

    // Fetch appointments
    // this.appointmentService.fetchAppointments();
    
    // setInterval(() => {
    //   this.fetchAppointments();
    //   console.log('interval')
    // }, 60000);

    // Subscribe to confirmed appointments
    this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);
    this.eventSource.addEventListener('loadDoctor', (event: any) => {
    const data = JSON.parse(event.data);
    console.log('Reloading appointments for doctor ID:', data);

    // Refresh only the affected doctor's appointments
    if (data === this.doctorId) {
      console.log('🔄 Reloading appointments for Doctor ID:', data);
      this.fetchAppointments(this.doctorId);
    }
    // this.checkWaitingTimes()
    // this.monitorWaitingTimes()
  });

  }
  loadDoctorData() {
    this.doctorService.getDoctorByUserId(this.userId).subscribe(
      (response) => {
        this.doctor = response;
        this.doctorId = response.id;
        this.fetchAppointments(this.doctorId); // Fetch only this doctor's appointments
        console.log(this.isMonitoringActive)
        if (!this.isMonitoringActive) {
          this.monitorWaitingTimes();
        }// Start monitoring only once for this doctor
      }
    );
  }
 // Store interval reference

 monitorWaitingTimes() {
  if (this.isMonitoringActive) {
    console.log("⏳ Waiting time monitoring already running. Skipping...");
    return;
  }

  console.log("✅ Starting waiting time monitoring...");
  this.isMonitoringActive = true; // Set flag to true to prevent duplicates
  console.log(this.doctorId)

  this.intervalId = setInterval(() => {
    if (this.doctorId) {
      console.log(`⏳ Checking waiting times for Doctor ID: ${this.doctorId}`);
      this.checkWaitingTimes();
    }
  }, 60000);
}
  
  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log("⏹️ Stopped monitoring waiting times.");
    }
    this.isMonitoringActive = false;
  }
  
  toggleCard(index: number) {
    this.filteredAppointments[index].expanded = !this.filteredAppointments[index].expanded;
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

  fetchAppointments(doctorId?: number) {
    this.appointmentService.getAppointmentsByDoctor(doctorId!).subscribe(
      (appointments) => {
        console.log(appointments)
        this.confirmedAppointments = appointments.filter(appointment => appointment.status === 'confirmed' && (appointment as any).checkedIn === true && appointment.date === this.today);
        this.filteredAppointments = this.confirmedAppointments;
        // console.log(this.doctor)
        this.completedAppointments = this.filteredAppointments.filter(appointment => !appointment.checkedOut || (!appointment.checkedOut && !appointment.isCloseOPD))
      // this.monitorWaitingTimes()
      // this.checkWaitingTimes()
        // console.log(this.completedAppointments, 'complete')
        this.filteredAppointments.sort((a, b) => {
          const timeA = this.parseTimeToMinutes(a.time);
          const timeB = this.parseTimeToMinutes(b.time);
          return timeA - timeB; // Ascending order
        });
        this.filterAppointmentsByDate(new Date());
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
  filteredAppointments: any[] = [];
  // filteredAppointments: Appointment[] = this.confirmedAppointments.filter(appointment => !appointment!.completed);

  ngOnChanges(changes: SimpleChanges) {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
    if (this.selectedDateRange && this.selectedDateRange.length === 0) {
      this.filterAppointmentsByDate(new Date());
    }


  }
  // loadSugesstionFunction(){
  //   this.doctor.filter((doc) => {
  //     this.currentDepartmentId = doc.departmentId!;
  //     this.currentDoctorName = doc.name!;
  //   });
  //   if (this.currentDepartmentId) {
  //     this.loadEstimationSuggestions(this.currentDepartmentId);
  //   }
  // }
  loadEstimationSuggestions(departmentId: number): void {
    this.estimationService.getEstimationsByDepartment(departmentId, this.estimationType).subscribe(
      (response) => {
        this.estimationSuggestions = response; // Assign the response directly
        // console.log('Fetched suggestions:', this.estimationSuggestions);
      },
      (error) => {
        console.error('Error fetching estimation suggestions:', error);
      }
    );
  }
  // Method to filter appointments by a specific date
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

  // Method to handle date change (e.g., when the user selects a date from a date picker)
  onDateChange(newDate: Date) {
    this.filterAppointmentsByDate(newDate);
  }


  filterAppointment() {
    // If there's no date range or value to filter, return the unfiltered appointments
    this.filteredList = [...this.filteredAppointments];

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


  // Method to download the filtered data as Excel


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


  openEstimationPopup(appointment: any): void {
    this.selectedAppointment = appointment;
    this.currentDoctorName = appointment.doctorName || 'Unknown Doctor';
    this.showEstimationPopup = true;
    this.currentDoctorId = appointment.doctorId;
    this.currentDepartmentName = appointment.departmentName
    // this.doctor.filter((doc:any) => {
    //   this.currentDepartmentId = doc.departmentId!;
    //   this.currentDoctorName = doc.name!;
    // });
    this.currentDepartmentId = this.doctor.departmentId;
    this.currentDoctorName = this.doctor.name
    if (this.currentDepartmentId) {
      this.loadEstimationSuggestions(this.currentDepartmentId);
    }
  }

  closeEstimationPopup(): void {
    this.showEstimationPopup = false;
    this.selectedAppointment = null;
    this.estimationText = '';
    this.estimationPreferedDate = '';
    this.remarks = '';
    this.surgeryTime = '';
    this.totalStay = 0;
    this.icu = 0;
    this.ward = 0
  }

  calculateWardStay(): void {
  

    // Ensure valid input values
    if (this.totalStay >= 0 && this.icu >= 0) {
      // Calculate ward stay
      this.ward = Math.max(0, this.totalStay - this.icu);
    }
  }
  isInvalidInput(): boolean {
    return this.icu > this.totalStay;
  }
  onEstimationInput(): void {
    // Filter suggestions based on the input text

    if (this.estimationText.trim()) {
      this.filteredEstimations = this.estimationSuggestions.filter((estimation) =>
        estimation.toLowerCase().includes(this.estimationText.toLowerCase())
      );
    } else {
      this.filteredEstimations = [];
    }
    this.showEstimationSuggestions = true;
  }
  onEstimationSelect(estimation: string): void {
    this.estimationText = estimation; // Set the selected suggestion in the input field
    this.showEstimationSuggestions = false; // Hide the suggestions dropdown
    // console.log(this.estimationText)
  }

  // // Called when a suggestion is clicked
  // hideSuggestions(): void {
  //   setTimeout(() => {
  //     this.showEstimationSuggestions = false;
  //   }, 200); // Add a delay to allow click events to register
  // }


  saveEstimation(): void {
    if (!this.estimationText) {
      // alert('Please enter an estimation.');
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter an estimation.' })
      return;
    }

    const existingEstimation = this.estimationSuggestions.find(
      (suggestion) => suggestion.toLowerCase() === this.estimationText.toLowerCase()
    );

    if (existingEstimation) {
      // If the estimation exists, don't save it again
      // this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Estimation already exists.' });
      // this.closeEstimationPopup();
      const estimationDetails = {
        prnNumber: this.selectedAppointment?.id,
        patientName: this.selectedAppointment?.patientName,
        phoneNumber: this.selectedAppointment?.phoneNumber,
        estimationName: this.estimationText,
        preferredDate: this.estimationPreferedDate,
        doctorId: this.currentDoctorId,
        doctorName: this.currentDoctorName,
        status: 'pending',
        estimationType: this.estimationType,
        estimationCreatedTime: new Date(),
        remarks: this.remarks,
        surgeryTime: this.surgeryTime,
        estimationStatus: this.estimationStatus,
        totalDaysStay: Number(this.totalStay),
        icuStay: Number(this.icu),
        wardStay: Number(this.ward),
        surgeryPackage: this.surgeryPackage
      };
      // console.log(estimationDetails)
      this.estimationService.createEstimationDetails(estimationDetails).subscribe({
        next: (response) => {
          // console.log('Estimation Details saved:', response);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Estimation Details Saved Successfully' });
          this.closeEstimationPopup();

        },
        error: (error) => {
          console.error('Error saving estimation details:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error saving estimation details. Please try again.' });
        }
      });
      return;
    }
    const estimationDetails = {
      prnNumber: this.selectedAppointment?.id,
      patientName: this.selectedAppointment?.patientName,
      phoneNumber: this.selectedAppointment?.phoneNumber,
      estimationName: this.estimationText,
      preferredDate: this.estimationPreferedDate,
      doctorId: this.currentDoctorId,
      doctorName: this.currentDoctorName,
      status: 'pending',
      estimationType: this.estimationType,
      estimationCreatedTime: new Date(),
      remarks: this.remarks,
      surgeryTime: this.surgeryTime,
      estimationStatus: this.estimationStatus,
      totalDaysStay: Number(this.totalStay),
      icuStay:Number(this.icu),
      wardStay:Number(this.ward),
      surgeryPackage: this.surgeryPackage
    };

    // this.doctor.filter((doc:any) => {
    //   this.currentDepartmentId = doc.departmentId!;
    //   this.currentDoctorName = doc.name!;
    // });
    this.currentDepartmentId = this.doctor.departmentId;
    this.currentDepartmentName = this.doctor.departmentName
    this.currentDoctorName = this.doctor.name
    // console.log('Saving Estimation:', {
    //   doctorId: this.currentDoctorId,
    //   departmentId: this.currentDepartmentId,
    //   estimation: this.estimationText,
    //   estimationType: this.estimationType
    // });
    // console.log(estimationDetails)
    this.estimationService.createEstimation(this.currentDoctorId, this.currentDepartmentId, this.estimationText, this.estimationType).subscribe({
      next: (response) => {
        // console.log('Estimation saved:', response);
        // alert('Estimation saved successfully.');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Estimated Saved Successfully' })
        // this.closeEstimationPopup();
        this.estimationService.createEstimationDetails(estimationDetails).subscribe({
          next: (response) => {
            // console.log('Estimation Details saved:', response);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Estimation Details Saved Successfully' });
            this.closeEstimationPopup();
          },
          error: (error) => {
            console.error('Error saving estimation details:', error);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error saving estimation details. Please try again.' });
          }
        });
      },
      error: (error) => {
        console.error('Error saving estimation:', error);
        // alert('Error saving estimation. Please try again.');
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error saving estimation. Please try again.' })
      }
    });

    this.closeEstimationPopup();
  }
  openCloseOpdPopup(): void {
    if (this.filteredAppointments.length > 0) {
      const pendingAppointments = this.filteredAppointments.some(appointment => appointment.checkedOut && !appointment.endConsultation);

      if (pendingAppointments) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Pending Appointments',
          detail: 'Some appointments are started but not marked as finished. Please finish them before closing the OPD.',
        });
      } else {
        // Proceed with closing OPD if all appointments are either finished or not checked out
        // this.filteredAppointments.forEach((appointment) => {
        //   appointment.checkedOut = false; // Reset checked-in status
        // });
        console.log(this.filteredAppointments)
        this.closeOpdAppointments = this.filteredAppointments.filter(appointment => 
          appointment.checkedOut === false 
        );
        
        console.log(this.closeOpdAppointments)
        this.showCloseOpdPopup = true;
      }
      // console.log('Appointments to close:', this.filteredAppointments);
    }else {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'No Appointments are Scheduled' });
    }
  }

  // Close the Close OPD popup
  closeCloseOpdPopup(): void {
    this.showCloseOpdPopup = false;
  }

  startConsultation(appointment: any): void {
    console.log(appointment)
    const ongoingConsultation = this.filteredAppointments.find(
      (appt) => appt.checkedOut === true && appt.endConsultationTime === null
    );
    // console.log(ongoingConsultation)
    // If there's an ongoing consultation (previous patient has not finished)
    if (ongoingConsultation) {
      // Update the ongoing consultation (endConsultationTime) for the first patient
      ongoingConsultation.endConsultationTime = new Date();
      ongoingConsultation.endConsultation = true // Set endConsultationTime to the current time // Set checkedOut to false for the previous patient
      // Update the appointment in the backend for the previous patient
      console.log(ongoingConsultation)
      const { expanded, ...updatedAppointment } = ongoingConsultation;
      this.appointmentService.updateAppointment(updatedAppointment);

      // console.log(`Updated endConsultationTime for patient ID: ${ongoingConsultation.id}`);
    }
    appointment.checkedOut = true;
    appointment.checkedOutTime = new Date()
    if (appointment.checkedInTime) {
      const checkedIn = new Date(appointment.checkedInTime).getTime(); // Convert to timestamp
      const checkedOut = new Date(appointment.checkedOutTime).getTime(); // Convert to timestamp

      const differenceInMinutes = Math.floor((checkedOut - checkedIn) / 60000); // Difference in minutes
      appointment.waitingTime = differenceInMinutes.toString();
    }
    if (appointment.postPond === true) {
      appointment.postPond = false
    }
    const { expanded, ...updatedAppointment } = appointment;
    this.appointmentService.updateAppointment(updatedAppointment)


    // console.log('Waiting time calculated:', appointment.waitingTime);

    // appointment.waitingTime = differenceInMinutes.toString(); // Assuming waitingTime is a string field

    // this.doctor.filter((doc:any) => {
    //   this.currentDepartmentId = doc.departmentId!;
    //   this.currentDoctorName = doc.name!;
    //   this.currentDoctorId = doc.id!;
    // });
    this.currentDepartmentId = this.doctor.departmentId;
    this.currentDepartmentName = this.doctor.departmentName;
    this.currentDoctorName = this.doctor.name

    this.eventService.emitConsultationStarted({
      doctorId: this.currentDoctorId,
      appointmentId: appointment.id!, // Add channelId to appointments in the backend
      channelId: 2,
    });
    // console.log(this.currentDoctorId, appointment.id!)
  }
  finishConsultation(appointment: Appointment): void {
    console.log('finish')
 
    appointment.endConsultation = true;
    appointment.endConsultationTime = new Date()
    const { expanded, ...updatedAppointment } = appointment;
    this.appointmentService.updateAppointment(updatedAppointment)
  }
  transfer(appointment: Appointment): void {
    // console.log(appointment)
    
    appointment.isTransfer = true;
    const { expanded, ...updatedAppointment } = appointment;
    this.appointmentService.updateAppointment(updatedAppointment)
    this.closeTransferPopup()
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Transferred  successfully.',
    });
  }
  openTransferPopup(estimation: any) {
    this.selectedAppointment = estimation
    this.showTransferAppointment = true;
  }
  closeTransferPopup() {
    this.showTransferAppointment = false;
  }
  endConsultation() {
    const postPondAppointment = this.filteredAppointments.filter(appointment => {
      appointment.postPond === true
    })
    this.countOfPending = postPondAppointment.length;
    if (this.countOfPending >= 1) {
      this.showCancelPopup = true;
    }
    else {
      // this.doctor.filter((doc:any) => {
      //   this.currentDepartmentId = doc.departmentId!;
      //   this.currentDoctorName = doc.name!;
      //   this.currentDoctorId = doc.id!;
      // });
      this.currentDepartmentId = this.doctor.departmentId;
      this.currentDepartmentName = this.doctor.departmentName
      this.currentDoctorName = this.doctor.name
      this.channelService.getChannelsByDoctor(this.currentDoctorId).subscribe({
        next: (response) => {
          const channelId = response.channelId;
          const doctorData = {
            channelId: channelId,
            doctorId: this.currentDoctorId
          }
          this.channelService.removeDoctorFromChannel(doctorData).subscribe({
            next: (response) => {
              // console.log('Doctor Removed From the Channel')
            },
            error: (error) => {
              console.error('Error deleting doctor from channel:', error);
            }
          })
        },
        error: (error) => {
          console.error('Error submitting getting channel:', error);

        }
      })
    }
  }
  cancel() {
    this.showCancelPopup = false
  }
  closeCancelPopup() {
    this.showCancelPopup = false;
  }
  postPondAppointment(appointment: Appointment): void {
    appointment.checkedOut = false;
    appointment.checkedOutTime = undefined;
    appointment.postPond = true;
    const { expanded, ...updatedAppointment } = appointment;
    this.appointmentService.updateAppointment(updatedAppointment)
  }

  // Confirm and perform the Close OPD action
  confirmCloseOpd(): void {
    // console.log('Closing OPD with the following appointments:', this.filteredAppointments);
    // Add your logic to close OPD here
    this.closeCloseOpdPopup();
  }
  // sendSelectedSlots(): void {
  //   const selectedAppointments = this.filteredAppointments
  //   .filter((slot) => slot.selectedSlot) // Filter only selected slots
  //   .map((slot) => ({
  //     id: slot.id,
  //     isCloseOPD: true,
  //     isCloseOPDTime: null, // Set the current date and time
  //   }));
  //   const selectedAppointmentsObject: { [key: string]: { id: number, isCloseOPD: boolean, isCloseOPDTime: Date | null } } = selectedAppointments.reduce((acc, appointment, index) => {
  //     acc[index.toString()] = appointment;  // Use the index as the key ('0', '1', etc.)
  //     return acc;
  //   }, {} as { [key: string]: { id: number, isCloseOPD: boolean, isCloseOPDTime: Date | null } });

  //   console.log('Selected Appointments Object:', selectedAppointmentsObject);
  //   console.log(selectedAppointments)
  //   this.appointmentService.bulkUpdateAppointments(selectedAppointmentsObject).subscribe({
  //     next: (response) => {
  //       console.log('Appointments updated successfully:', response);
  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Success',
  //         detail: 'Appointments updated successfully.',
  //       });
  //       this.closeCloseOpdPopup(); // Close the popup after successful update
  //     },
  //     error: (error) => {
  //       console.error('Error updating appointments:', error);
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Error',
  //         detail: 'Failed to update appointments.',
  //       });
  //     }
  //   });
  // if (selectedAppointments.length === 0) {
  //   this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select at least one slot.' });
  //   return;
  // }

  // console.log('Updating appointments:', selectedAppointments);

  //   // Prepare the payload for the API call

  //   this.closeCloseOpdPopup();
  // }
  sendSelectedSlots(): void {
    const selectedAppointments = this.closeOpdAppointments
      .filter((slot) => slot.selectedSlot) // Filter only selected slots
      .map((slot) => ({
        id: slot.id,
        isCloseOPD: true,
        isCloseOPDTime: new Date(), // Set the current date and time
      }));

    if (selectedAppointments.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select at least one slot.' });
      return;
    }

    // Now we have an array, not an object with numeric keys
    // console.log('Selected Appointments:', selectedAppointments);

    // Now send the array as the payload to the backend
    this.appointmentService.bulkUpdateAppointments(selectedAppointments).subscribe({
      next: (response) => {
        // console.log('Appointments updated successfully:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Appointments updated successfully.',
        });
        this.closeCloseOpdPopup(); // Close the popup after successful update
      },
      error: (error) => {
        console.error('Error updating appointments:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update appointments.',
        });
      }
    });
  }

  selectAllSlots(): void {
    this.closeOpdAppointments.forEach((slot) => {
      slot.selectedSlot = true;
    });
  }

  // Unselect all slots
  unselectAllSlots(): void {
    this.closeOpdAppointments.forEach((slot) => {
      slot.selectedSlot = false;
    });
  }

  openLeaveRequestPopup(doctorName: string): void {
    this.currentDoctorName = doctorName;
    this.showLeaveRequestPopup = true;
  }

  // Method to close the popup
  closeLeaveRequestPopup(): void {
    this.showLeaveRequestPopup = false;
    this.startDate = null;
    this.endDate = null;
  }
  submitLeaveRequest(): void {
    if (!this.startDate || !this.endDate) {
      // alert('Please select both start and end dates.');
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select both start and end dates.' })
      return;
    }
    // this.doctor.filter((doc:any) => {
    //   this.currentDepartmentId = doc.departmentId!;
    //   this.currentDoctorName = doc.name!;
    // });
    this.currentDepartmentId = this.doctor.departmentId;
    this.currentDepartmentName = this.doctor.departmentName
    this.currentDoctorName = this.doctor.name
    const isSameDate = this.startDate === this.endDate;

    const leaveRequest = {
      doctorName: this.currentDoctorName,
      departmentName: this.currentDepartmentName,
      startDate: this.startDate,
      endDate: this.endDate,
    };
    // const adminPhoneNumber = ["919880544866", "916364833988"]
    const adminPhoneNumber = ["919342287945", "919342287945"]
    this.appointmentService.sendAdminMessage(this.currentDoctorName, this.currentDepartmentName ,this.startDate, this.endDate, adminPhoneNumber).subscribe({
      next: (response) => {
        // console.log('Leave request submitted:', response);
        // alert('Leave request submitted successfully.');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Leave Request Submitted Successfully' })
        this.closeLeaveRequestPopup();
      },
      error: (error) => {
        console.error('Error submitting leave request:', error);
        alert('Error submitting leave request. Please try again.');
      }
    });
    // console.log('Submitting leave request:', leaveRequest);

  }
  checkWaitingTimes() {
    // Step 1: Count pending appointments (Checked-in but not checked-out)
    
  //   const pendingAppointments = this.confirmedAppointments.filter(
  //     (appt) => appt.checkedIn === true && appt.checkedOut === false
  //   );
  
  //   const pendingCount = pendingAppointments.length;
  //   console.log(`🚨 Pending Appointments: ${pendingCount}`);
  
  //   // Step 2: Find the ongoing consultation
  //   const ongoingAppointment = this.confirmedAppointments.find(
  //     (appt) => appt.checkedOut === true && appt.endConsultationTime === null
  //   );
  
  //   if (!ongoingAppointment) {
  //     console.log("✅ No ongoing consultation.");
  //     return;
  //   }
  
  //   // Extract appointment details
  //   const { checkedOutTime, doctorId, doctorName, patientName } = ongoingAppointment;
  //   const slotDuration = this.doctor?.slotDuration ?? 20; // Default slot duration of 15 mins
  // if(!checkedOutTime){
  //   return
  // }
  //   // Step 3: Calculate elapsed waiting time
  //   const checkedOutTimestamp = new Date(checkedOutTime)!.getTime();
  //   const currentTime = new Date().getTime();
  //   const elapsedMinutes = Math.floor((currentTime - checkedOutTimestamp) / 60000);
  //   console.log(`⏳ Elapsed Time for ${patientName}: ${elapsedMinutes} mins`);
  
  //   // Step 4: Define alert thresholds
  //   const firstThreshold = slotDuration + 10; // Alert at slot duration + 10 mins
  //   const repeatThreshold = 5; // Repeat alerts every 5 mins
  //   const waitingMultiplier = Math.floor((elapsedMinutes - firstThreshold) / repeatThreshold) + 1;
  //   console.log(waitingMultiplier)

  //   const sortedPendingAppointments = pendingAppointments.sort((a, b) => {
  //     return this.parseTimeToMinutes(a.time) - this.parseTimeToMinutes(b.time);
  //   });
  
  //   // Step 6: Select the next patient in line based on time
  //   const nextAppointment = sortedPendingAppointments.length > 0 ? sortedPendingAppointments[0] : null;
  
  //   if (!nextAppointment) {
  //     console.log("✅ No next appointment found.");
  //     return;
  //   }
  
  //   // Step 5: Trigger alert if time exceeds threshold
  //   if (elapsedMinutes >= firstThreshold && (elapsedMinutes - firstThreshold) % repeatThreshold === 0) {
  //     console.warn(`⚠️ Alert: ${patientName} under Dr. ${doctorName} has exceeded waiting time by ${elapsedMinutes - slotDuration} mins!`);
      
  //     // Step 6: Update extra waiting time for the next appointment
  //     // const nextAppointment = this.confirmedAppointments.find(
  //     //   (appt: any) => appt.status === "Next" && appt.doctorId === doctorId
  //     // );
  
  //     if (nextAppointment) {
  //       nextAppointment.extraWaitingTime = elapsedMinutes - slotDuration;
  //       const extraWaitingTime = nextAppointment.extraWaitingTime;
  
  //       // Update extra waiting time in DB
  //       this.appointmentService.updateExtraWaitingTime(nextAppointment.id!, extraWaitingTime).subscribe(
  //         (response: any) => {
  //           console.log("✅ Extra waiting time updated successfully:", response);
  //         },
  //         (error) => {
  //           console.error("❌ Error updating waiting time:", error);
  //         }
  //       );
  
  //       // Step 7: Send WhatsApp notifications to Admins & Doctor
  //       const adminPhoneNumbers = ['919342287945', '919342287945']; // Admin List
  //       const adminsToSend = Array.isArray(adminPhoneNumbers)
  //         ? adminPhoneNumbers.slice(0, waitingMultiplier) // Send message to more admins based on waiting multiplier
  //         : [];
  
  //       this.appointmentService
  //         .sendWaitingTimeAlert({
  //           adminPhoneNumbers: adminsToSend,
  //           doctorPhoneNumber: this.doctor.phone_number,
  //           noOfPatients: pendingCount,
  //           doctorName: doctorName,
  //          waitingMultiplier, // Include waiting multiplier in the alert
  //         })
  //         .subscribe(
  //           (response) => {
  //             console.log(`✅ WhatsApp alert sent to Dr. ${doctorName} and admins`, response);
  //           },
  //           (error) => {
  //             console.error(`❌ Error sending alert to Dr. ${doctorName}:`, error);
  //           }
  //         );
  //     }
  //   }
  }
  

}


