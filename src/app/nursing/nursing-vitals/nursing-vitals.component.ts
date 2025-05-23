import { Component, Input, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  prefix?:string;
  patientType?:string;
  arrived?:boolean;

}
@Component({
  selector: 'app-nursing-vitals',
  templateUrl: './nursing-vitals.component.html',
  styleUrl: './nursing-vitals.component.css',
  providers: [MessageService],
})
export class NursingVitalsComponent {
  confirmedAppointments: Appointment[] = [];

  constructor(
    private appointmentService: AppointmentConfirmService,
     private doctorService: DoctorServiceService,
     private messageService: MessageService,
     private cdRef: ChangeDetectorRef,
     private route: ActivatedRoute,) { }
  appointments: any[] = [
    // { id: '0001', patientName: 'Search Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Booked', smsSent: true },
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
  username: any;
  showPrnPopup = false;
  enteredPrn = '';
  lockedUser: string = ''

  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'PRN', value: 'prnNumber' },
    { label: 'Doctor Name', value: 'doctorName' },
    { label: 'Department', value: 'department' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  showVitalsPopup = false;
  isButtonLoading:boolean= false;
  blockId:string = '';
  employeeId:string = '';
  name:string = '';
  isDesktopView: boolean = true;


  vitalsData: any = {
    height: '',
    weight: '',
    temp: '',
    pulse: '',
    RR: '',
    BPs: '',
    BPd: '',
    spo2: '',
    bloodGroup: '',
  };

  vitalsFields = [
    { key: 'height', label: 'Height (cm)' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'temp', label: 'Temperature (F)' },
    { key: 'pulse', label: 'Pulse (P/M)' },
    { key: 'RR', label: 'Respiratory Rate (P/M)' },
    { key: 'BPs', label: 'BP Systolic (Hg)' },
    { key: 'BPd', label: 'BP Diastolic (Hg)' },
    { key: 'spo2', label: 'SpO2 (%)' },
    { key: 'bloodGroup', label: 'Blood Group' },
  ];
  allVitalsFilled(): boolean {
    return this.vitalsFields.every(field => {
      const value = this.vitalsData[field.key];
      return value !== null && value !== undefined && String(value).trim() !== '';
    });
  }
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isDesktopView = window.innerWidth > 500; // Use table if screen width > 768px
  }

  // Method to handle sorting by a specific column
  ngOnInit() {
    const token = localStorage.getItem('token');
    const nurseId = localStorage.getItem('nurseId');
    this.showPopup = nurseId ? false : true;
    console.log(nurseId,this.showPopup)

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
    this.blockId =  this.route.snapshot.paramMap.get('blockId') || '0';
    this.employeeId = localStorage.getItem('nurseId') || '0';


    // Subscribe to confirmed appointments
    this.appointmentService.getTodayCheckin(this.today).subscribe({
      next: (appointments) => {

        this.confirmedAppointments = appointments;
        this.appointments = appointments
        console.log(appointments)
        this.confirmedAppointments.sort((a, b) => {
          const dateA = new Date(a.created_at!);
          const dateB = new Date(b.created_at!);
          return dateB.getTime() - dateA.getTime();
        });

        this.filteredAppointments = [...this.confirmedAppointments];
        
        this.filterAppointmentsByDate(new Date());

        setTimeout(() => {
          this.isLoading = false; // Stop loading indicator
        }, 1000); // 2-second delay

      },
      error: (error) => {
        console.error('Error fetching appointments:', error);
        // this.errorMessage = 'Failed to fetch appointments.';
        // console.log('Setting isLoading to false due to error');
        this.isLoading = false; // Stop loading indicator even on error
      },
      complete: () => {
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
  completeAppointment(appointment: any): void {
    this.selectedAppointment = appointment;
    this.showVitalsPopup = true;
  }
  cancelVitals(): void {
    this.showVitalsPopup = false;
    this.vitalsData = {};
  }

  submitVitals(): void {
    if (!this.allVitalsFilled()) return;

    this.isButtonLoading = true;
    const updatedVitals = {
      ...this.selectedAppointment,
      ...this.vitalsData,
      arrived: true,
      arrivedBy: this.employeeId,
      arrivedTime: new Date(),
      blockId: this.blockId 
    };
    console.log('Updated Vitals:', updatedVitals);
    const prn = this.selectedAppointment?.prnNumber;
    this.appointmentService.updateAppointment(updatedVitals)
        this.appointmentService.updatePatientByPRN(prn, this.vitalsData).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Vitals updated and patient checked in.' });
            this.showVitalsPopup = false;
            this.isButtonLoading = false;
            this.vitalsFields = []
            this.filterAppointment();
          },
          error: (err) => {
            console.error('Error updating patient vitals:', err);
            this.isButtonLoading = false;
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Checked-in but patient data not updated.' });
          }
        });
      
  }
  updateDetails(){
    this.isButtonLoading = true;
    localStorage.setItem('name', this.name)
    localStorage.setItem('blockId', this.blockId)
    localStorage.setItem('nurseId', this.employeeId)
    this.showPopup = false;
    this.isButtonLoading = false;
  }
}
