import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { AppointmentConfirmService } from '../../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import { EstimationService } from '../../../services/estimation/estimation.service';
import { EventService } from '../../../services/event.service';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { Doctor } from '../../../models/doctor.model';
import { ChannelService } from '../../../services/channel/channel.service';
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
  messageSent?:boolean;
  requestVia?: string; // Optional property
  created_at?: string;
  checkedIn?:boolean;
  checkedOut?:boolean;
  user?: any;
  selectedSlot?: boolean;
  endConsultation?: boolean;
  checkedOutTime?: Date;
  checkedInTime?: Date;
  waitingTime?: string;
  postPond?:boolean;
  endConsultationTime?: Date;
  isTransfer?: boolean;
  isCloseOPD?:boolean;
  isCloseOPDTime?: Date;
}

@Component({
  selector: 'app-today-consultations',
  templateUrl: './today-consultations.component.html',
  styleUrl: './today-consultations.component.css'
})
export class TodayConsultationsComponent {
  confirmedAppointments: Appointment[] = [];
  @Output() consultationStarted = new EventEmitter<{ doctorId: number, appointmentId: number }>();

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService,private messageService: MessageService, private cdRef: ChangeDetectorRef,private eventService: EventService, private estimationService: EstimationService, private channelService: ChannelService) { }
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
  allAppointments: Appointment[]=[] 
  today: string = '';
  showEstimationPopup = false; // Control the visibility of the popup
  currentDoctorName: string = ''; // Store the current doctor's name
  estimationText: string = ''; // Store the estimation text
  showCloseOpdPopup = false;
  currentDoctorId: number = 0;
  currentDepartmentId: number = 0;
  doctor: Doctor[] =[]
  showLeaveRequestPopup: boolean = true;
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
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];
  // Method to handle sorting by a specific column
  ngOnInit() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;
    console.log('Setting isLoading to true');
    this.isLoading = true; // Start loading indicator
    this.userId=localStorage.getItem('userid')
  
    // Fetch appointments
    // this.appointmentService.fetchAppointments();
  this.fetchAppointments();
  // setInterval(() => {
  //   this.fetchAppointments();
  //   console.log('interval')
  // }, 60000);
  
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
  
  fetchAppointments(){
    this.appointmentService.getAllAppointments().subscribe({
      next: (appointments) => {
        // console.log('All Appointments received:', appointments);
        this.allAppointments = appointments;
       

          this.doctorService.getAllDoctors().subscribe({
            next: (doctors) => {
              this.confirmedAppointments = appointments.filter(appointment => appointment.status === 'confirmed' && (appointment as any).checkedIn === true);
              this.filteredAppointments = this.confirmedAppointments.filter(appointment => {
                const doctor = doctors.find(doc => doc.id === appointment.doctorId);
                this.doctor = doctor ? [doctor] : [];
                // console.log(doctor)
                // console.log('Doctor:', doctor?.userId,this.userId);
                return doctor && doctor.userId === parseInt(this.userId) && appointment.date === this.today;
              });
              this.completedAppointments = this.filteredAppointments.filter(appointment => !appointment.checkedOut )
              console.log(this.completedAppointments, 'complete')
              this.filteredAppointments.sort((a, b) => {
                const timeA = this.parseTimeToMinutes(a.time);
                const timeB = this.parseTimeToMinutes(b.time);
                return timeA - timeB; // Ascending order
              });
              // console.log(this.filteredAppointments)
              this.isLoading = false; // Stop loading indicator
            },
            error: (error) => {
              console.error('Error fetching doctor details:', error);
              this.isLoading = false; // Stop loading indicator
            }
          });
          
          console.log(this.filteredAppointments);
  
        // this.filteredAppointments = [...this.confirmedAppointments];
        this.filterAppointmentsByDate(new Date());
  
        console.log('Setting isLoading to false');
        // setTimeout(() => {
        //   console.log('Setting isLoading to false after delay');
        //   this.isLoading = false; // Stop loading indicator
        // }, 1000); // 2-second delay
      }
    })
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
  filteredAppointments: any[] =[];
  // filteredAppointments: Appointment[] = this.confirmedAppointments.filter(appointment => !appointment!.completed);

  ngOnChanges(changes: SimpleChanges) {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
    if(this.selectedDateRange && this.selectedDateRange.length === 0){
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
        console.log('Fetched suggestions:', this.estimationSuggestions);
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
    else{
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
    this.currentDoctorId = appointment.doctorId
    this.doctor.filter((doc) => {
      this.currentDepartmentId = doc.departmentId!;
      this.currentDoctorName = doc.name!;
    });
    if (this.currentDepartmentId) {
      this.loadEstimationSuggestions(this.currentDepartmentId);
    }
  }

  closeEstimationPopup(): void {
    this.showEstimationPopup = false;
    this.selectedAppointment = null;
    this.estimationText = '';
    this.estimationPreferedDate = '';
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
    console.log(this.estimationText)
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
      this.messageService.add({severity: 'warn', summary: 'Warning', detail: 'Please enter an estimation.'})
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
        remarks: this.remarks
      };
      this.estimationService.createEstimationDetails(estimationDetails).subscribe({
        next: (response) => {
          console.log('Estimation Details saved:', response);
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
      remarks: this.remarks
    };

    this.doctor.filter((doc) => {
      this.currentDepartmentId = doc.departmentId!;
      this.currentDoctorName = doc.name!;
    });
    console.log('Saving Estimation:', {
      doctorId: this.currentDoctorId,
      departmentId: this.currentDepartmentId,
      estimation: this.estimationText,
      estimationType: this.estimationType
    });

    this.estimationService.createEstimation(  this.currentDoctorId,this.currentDepartmentId,this.estimationText, this.estimationType).subscribe({
      next: (response) => {
        console.log('Estimation saved:', response);
        // alert('Estimation saved successfully.');
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Estimated Saved Successfully'})
        // this.closeEstimationPopup();
        this.estimationService.createEstimationDetails(estimationDetails).subscribe({
          next: (response) => {
            console.log('Estimation Details saved:', response);
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
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Error saving estimation. Please try again.'})
      }
    });

    this.closeEstimationPopup();
  }
  openCloseOpdPopup(): void {
    if (this.filteredAppointments.length > 0) {
      this.filteredAppointments.forEach((appointment) => {
        appointment.checkedIn = false; // Add a `selected` property for checkboxes
      });
      this.showCloseOpdPopup = true;
      console.log('Appointments to close:', this.filteredAppointments);
    } else {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'No Appointments are Scheduled' });
    }
  }

  // Close the Close OPD popup
  closeCloseOpdPopup(): void {
    this.showCloseOpdPopup = false;
  }

  startConsultation(appointment: Appointment): void {
    const ongoingConsultation = this.filteredAppointments.find(
      (appt) => appt.checkedOut === true && appt.endConsultationTime === null
    );
    console.log(ongoingConsultation)
    // If there's an ongoing consultation (previous patient has not finished)
    if (ongoingConsultation) {
      // Update the ongoing consultation (endConsultationTime) for the first patient
      ongoingConsultation.endConsultationTime = new Date();
      ongoingConsultation.endConsultation = true // Set endConsultationTime to the current time // Set checkedOut to false for the previous patient
      // Update the appointment in the backend for the previous patient
      this.appointmentService.updateAppointment(ongoingConsultation);
  
      console.log(`Updated endConsultationTime for patient ID: ${ongoingConsultation.id}`);
    }
    appointment.checkedOut = true;
    appointment.checkedOutTime = new Date()
    if(appointment.checkedInTime){
      const checkedIn = new Date(appointment.checkedInTime).getTime(); // Convert to timestamp
      const checkedOut = new Date(appointment.checkedOutTime).getTime(); // Convert to timestamp
    
      const differenceInMinutes = Math.floor((checkedOut - checkedIn) / 60000); // Difference in minutes
      appointment.waitingTime = differenceInMinutes.toString();
    }
    if(appointment.postPond === true){
      appointment.postPond = false
    }
   
  
    console.log('Waiting time calculated:', appointment.waitingTime);

    // appointment.waitingTime = differenceInMinutes.toString(); // Assuming waitingTime is a string field
    
    this.doctor.filter((doc) => {
      this.currentDepartmentId = doc.departmentId!;
      this.currentDoctorName = doc.name!;
      this.currentDoctorId = doc.id!;
    });
    this.appointmentService.updateAppointment(appointment)
    this.eventService.emitConsultationStarted({
      doctorId: this.currentDoctorId,
      appointmentId: appointment.id!, // Add channelId to appointments in the backend
      channelId: 2,
    });
    console.log(this.currentDoctorId, appointment.id!)
  }
  finishConsultation(appointment: Appointment): void{
    appointment.endConsultation = true;
    appointment.endConsultationTime = new Date()
    this.appointmentService.updateAppointment(appointment)
  }
  transfer(appointment:Appointment): void{
    console.log(appointment)
    appointment.isTransfer = true;
    this.appointmentService.updateAppointment(appointment)
    this.closeCloseOpdPopup()
  }
  openTransferPopup(estimation:any){
    this.selectedAppointment = estimation
    this.showTransferAppointment = true;
  }
  closeTransferPopup(){
    this.showTransferAppointment = false;
  }
  endConsultation(){
   const postPondAppointment = this.filteredAppointments.filter(appointment =>{
      appointment.postPond === true
    })
    this.countOfPending = postPondAppointment.length;
    if(this.countOfPending >= 1){
      this.showCancelPopup = true;
      
    }
    else{
      this.doctor.filter((doc) => {
        this.currentDepartmentId = doc.departmentId!;
        this.currentDoctorName = doc.name!;
        this.currentDoctorId = doc.id!;
      });
      this.channelService.getChannelsByDoctor(this.currentDoctorId).subscribe({
        next:(response) =>{
          const channelId = response.channelId;
          const doctorData = {
            channelId: channelId,
            doctorId: this.currentDoctorId
          }
          this.channelService.removeDoctorFromChannel(doctorData).subscribe({
            next: (response) => {
              console.log('Doctor Removed From the Channel')
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
  cancel(){

  }
  closeCancelPopup(){
    this.showCancelPopup = false;
  }
  postPondAppointment(appointment: Appointment):void{
    appointment.checkedOut = false;
    appointment.checkedOutTime = undefined;
    appointment.postPond = true;
    this.appointmentService.updateAppointment(appointment)
  }

  // Confirm and perform the Close OPD action
  confirmCloseOpd(): void {
    console.log('Closing OPD with the following appointments:', this.filteredAppointments);
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
    const selectedAppointments = this.filteredAppointments
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
    console.log('Selected Appointments:', selectedAppointments);
  
    // Now send the array as the payload to the backend
    this.appointmentService.bulkUpdateAppointments(selectedAppointments).subscribe({
      next: (response) => {
        console.log('Appointments updated successfully:', response);
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
    this.filteredAppointments.forEach((slot) => {
      slot.selectedSlot = true;
    });
  }

  // Unselect all slots
  unselectAllSlots(): void {
    this.filteredAppointments.forEach((slot) => {
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
      this.messageService.add({severity: 'warn', summary: 'Warning', detail: 'Please select both start and end dates.'})
      return;
    }
    this.doctor.filter((doc) => {
      this.currentDepartmentId = doc.departmentId!;
      this.currentDoctorName = doc.name!;
    });
    const isSameDate = this.startDate === this.endDate;

    const leaveRequest = {
      doctorName: this.currentDoctorName,
      startDate: this.startDate,
      endDate: this.endDate,
    };
    const adminPhoneNumber = '919342287945'
    this.appointmentService.sendAdminMessage(this.currentDoctorName, this.startDate, this.endDate, adminPhoneNumber ).subscribe({
      next: (response) => {
        console.log('Leave request submitted:', response);
        // alert('Leave request submitted successfully.');
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Leave Request Submitted Successfully'})
        this.closeLeaveRequestPopup();
      },
      error: (error) => {
        console.error('Error submitting leave request:', error);
        alert('Error submitting leave request. Please try again.');
      }
    });
    console.log('Submitting leave request:', leaveRequest);

  }

}


