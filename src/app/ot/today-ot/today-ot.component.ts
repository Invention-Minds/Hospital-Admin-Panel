import { Component, Output, EventEmitter } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { EstimationService } from '../../services/estimation/estimation.service';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environment/environment.prod';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';


@Component({
  selector: 'app-today-ot',
  templateUrl: './today-ot.component.html',
  styleUrl: './today-ot.component.css'
})
export class TodayOtComponent {
  constructor(private estimationService: EstimationService, private messageService: MessageService, private doctorService: DoctorServiceService, private appointmentService: AppointmentConfirmService) { }
  confirmedAppointments: any[] = [];
  filteredServices: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof any | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  searchOptions = [
    { label: 'Patient Name', value: 'firstName' },
    { label: 'PRN', value: 'prn' },
    { label: 'Service Name', value: 'packageName' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  isLoading = false;
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  @Output() reschedule = new EventEmitter<any>();
  activeComponent: string = 'confirmed';
  confirmedServices: any[] = [];
  today: string = '';
  showPopup: boolean = false; // Control visibility of the popup
  estimationType: string = 'SM';
  patientName: string = ''; // Name of the patient for the popup
  surgeryDate: string = ''; // Date of the surgery for the popup
  surgeryType: string = 'single surgery'; // Type of the surgery for the popup
  surgeryName: string = ''; // Name of the surgery for the popup
  surgeryLevel: string = ''; // Level of the surgery for the popup
  isButtonClicked: boolean = false; // Track if the button was clicked
  isButtonLoading: boolean = false; // Track loading state of the button
  roomNo: string = ''; // Room number for the popup
  filteredDoctors: any[] = []; // Filtered list of doctors
  selectedDoctorId: number = 0; // ID of the selected doctor
  selectedDoctorName: string = ''; // Name of the selected doctor;
  showUpdateDetails: boolean = false; // Control visibility of the update details popup
  multipleSurgeryDoctor: string = ''; // Store multiple doctor IDs for multiple surgeries
  primarySurgeonId: string = '';
  primarySurgeonName: string = '';
  amountPaid: boolean = false; // Track if amount is paid
  estimationId: string = ''; // ID of the estimation to be updated
  prn: string = ''; // PRN number for the patient, if needed
  surgeries: string[] = [];
  selectedDoctors: string[] = []; // Stores doctor IDs for each surgery
  eventSource: EventSource | null = null; // EventSource for real-time updates
  uhidSuggestions: boolean = false;
  filteredUHIDPatients: any[] = []; 
  patients: any[] = []; // List of patients to filter UHID suggestions





  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
  ngOnInit(): void {
    this.fetchConfirmedAppointments();
    this.userId = localStorage.getItem('userid')
    this.activeComponent = 'confirmed';
    this.loadDoctors();
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;
    this.surgeryDate = this.today;
    this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);
    this.eventSource.addEventListener('loadOtTv', (event: MessageEvent) => {
      const type = JSON.parse(event.data);
      this.callEstimations()
    });
  }



  fetchConfirmedAppointments(): void {
    this.isLoading = true
    // const today = new Date();
    this.estimationService.getConfirmedEstimations().subscribe({
      next: (services: any[]) => {
        this.confirmedAppointments = services
        this.confirmedAppointments.sort((a, b) => {
          const dateA = new Date(a.createdAt!);
          const dateB = new Date(b.createdAt!);
          return dateB.getTime() - dateA.getTime();
        });
        this.filteredServices = [...this.confirmedAppointments];
        console.log('Services processed successfully.');
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      },
      complete: () => {
        this.isLoading = false
      }
    });

  }
  callEstimations(): void {

    this.estimationService.getConfirmedEstimations().subscribe({
      next: (services: any[]) => {
        this.confirmedAppointments = services
        this.confirmedAppointments.sort((a, b) => {
          const dateA = new Date(a.createdAt!);
          const dateB = new Date(b.createdAt!);
          return dateB.getTime() - dateA.getTime();
        });
        this.filteredServices = [...this.confirmedAppointments];
        console.log('Services processed successfully.');
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      },

    });

  }

  onSearch(): void {

    this.filteredServices = this.confirmedAppointments.filter((service) => {
      let matches = true;

      // Filter by search option
      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'firstName':
            matches = service.firstName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          case 'prn':
            matches = service.pnrNumber?.includes(this.searchValue);
            break;
          case 'packageName':
            matches = !!service.radioServiceName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
        }

      }

      // Filter by date range
      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(service.appointmentDate);
        const startDate = new Date(this.selectedDateRange[0]);
        const endDate = this.selectedDateRange[1]
          ? new Date(this.selectedDateRange[1])
          : startDate; // Use the same date for both start and end if it's a single date

        // Normalize endDate to include the full day
        const normalizedEndDate = new Date(endDate);
        normalizedEndDate.setHours(23, 59, 59, 999);

        if (startDate.getTime() === normalizedEndDate.getTime()) {
          // Single date selected
          matches =
            matches &&
            serviceDate.toDateString() === startDate.toDateString(); // Match only the date part
        } else {
          // Date range selected
          matches =
            matches &&
            serviceDate >= startDate &&
            serviceDate <= normalizedEndDate; // Match within the range
        }
      }

      // Filter by specific date
      if (this.selectedDate) {
        const singleDate = new Date(this.selectedDate);
        matches =
          matches &&
          new Date(service.appointmentDate).toDateString() === singleDate.toDateString();
      }

      console.log(matches);
      return matches;

    });
  }


  refresh() {
    this.selectedDateRange = [];
    this.filteredServices = [...this.confirmedAppointments];
  }

  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = 'firstName';
    this.selectedDateRange = [];
    this.filteredServices = [...this.confirmedAppointments];
  }

  sortedAppointments() {

    if (!this.sortColumn) {
      return [...this.filteredServices];
    }


    return [...this.filteredServices].sort((a, b) => {
      const valueA = a[this.sortColumn!];
      const valueB = b[this.sortColumn!];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0;
    });
  }

  getPaginatedAppointments() {
    const sorted = this.sortedAppointments();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Method to calculate total pages
  get totalPages() {
    return Math.ceil(this.confirmedAppointments.length / this.itemsPerPage);
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
  sortBy(column: keyof any): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredServices.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      // Handle appointmentDate separately
      if (column === 'appointmentDate') {
        const dateA = new Date(valueA as string); // Convert string to Date
        const dateB = new Date(valueB as string);

        return this.sortDirection === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      // Sort strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // Sort numbers
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      return 0; // Default case
    });

    this.currentPage = 1; // Reset to the first page after sorting
  }
  completeAppointment(estimation: any) {
    const payload = estimation.estimationId 
    ? { otId: estimation.OTDetails?.[0]?.id, action: 'start' }
    : { otId: estimation.id, action: 'start' }; // emergency OT
    this.estimationService.updateOTStartFinish(payload).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'OT started successfully!' });
        this.callEstimations()
      },
      error: (err) => {
        if(err.status === 404) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Kindly fill the OT Details' });
          return;
        }
        console.error('Error finishing OT:', err)
      }
    });
  }
  reportDoneAppointment(estimation: any) {
    const payload = estimation.estimationId 
    ? { otId: estimation.OTDetails?.[0]?.id, action: 'end' }
    : { otId: estimation.id, action: 'end' };
    this.estimationService.updateOTStartFinish(payload).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'OT finished successfully!' });
        this.callEstimations(); // Refresh the appointment list
      },
      error: (err) => {
        if(err.status === 404) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Kindly fill the OT Details' });
          return;
        }
        console.error('Error finishing OT:', err)
      }
    });
  }
  


  updateEstimation(): void {
    const payload = {
      estimationId: this.estimationId, // must be available in your formData
      roomNo: this.roomNo,
      primarySurgeonName: this.primarySurgeonName,
      coordinatorId: this.userId, // assuming logged-in user's ID
      paid: this.amountPaid,      // true or false
    };

    this.isButtonClicked = true;
    this.isButtonLoading = true;

    this.estimationService.updateOTDetails(payload).subscribe({
      next: (res) => {
        console.log('OT Details updated:', res);
        this.isButtonClicked = false;
        this.isButtonLoading = false;
        this.showUpdateDetails = false; // close modal
        this.fetchConfirmedAppointments()
      },
      error: (err) => {
        console.error('Error updating OT details:', err);
        this.isButtonClicked = false;
        this.isButtonLoading = false;
      }
    });
  }

  loadDoctors() {
    this.doctorService.getActiveDoctors().subscribe({
      next: (doctors: any[]) => {
        this.filteredDoctors = doctors;
        console.log('Doctors loaded:', doctors);
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
      }
    });
  }
  doctorsForMultipleSurgery: { id: string; name: string }[] = [];

  loadDoctorsForMultipleSurgery() {
    if (!this.multipleSurgeryDoctor) return;

    const ids = this.multipleSurgeryDoctor.split(',').map(id => id.trim());

    this.doctorsForMultipleSurgery = ids
      .map(id => {
        const doctor = this.filteredDoctors.find(doc => doc.id.toString() === id);
        return doctor ? { id: doctor.id.toString(), name: doctor.name } : null;
      })
      .filter(d => d !== null) as { id: string; name: string }[];

    console.log('Doctors for multiple surgery:', this.doctorsForMultipleSurgery);
  }
  // When a doctor is selected, store doctor ID in formData and set name
  updateSelectedDoctorName(doctorId: any): void {

    console.log('Selected doctor ID:', doctorId, this.filteredDoctors);
    const selectedDoctor = this.filteredDoctors.find(doc => doc.id === doctorId);

    console.log(selectedDoctor)
    if (selectedDoctor) {
      this.selectedDoctorName = selectedDoctor.name;
      this.selectedDoctorId = selectedDoctor.id;
      this.primarySurgeonName = selectedDoctor.name; // Set primary surgeon name
      this.primarySurgeonId = selectedDoctor.id; // Set primary surgeon ID
    }
  }
  saveEstimation(): void {
    this.isButtonClicked = true;
    this.isButtonLoading = true;
    const payload = {
      roomNo: this.roomNo,
      handledBy: this.primarySurgeonName, // or ID if you use handledBy as ID
      multipleSurgeryDoctor: this.multipleSurgeryDoctor || this.primarySurgeonId.toString(),
      patientName: this.patientName,
      prn: parseInt(this.prn, 10) || null, // Ensure PRN is a number or null
      surgeryDate: this.surgeryDate,
      surgeryLevel: this.surgeryLevel,
      surgeryName: this.surgeryName,
      surgeryType: this.surgeryType,
      paid: this.amountPaid,
      coordinatorId: this.userId, // assuming logged-in user's ID
    };
  
    this.estimationService.createOTDetails(payload).subscribe({
      next: (res) => {
        console.log('OT Details created:', res);
        // Show success toast or reset form
        this.showPopup = false; // Close the popup
        this.roomNo = ''; // Reset room number
        this.primarySurgeonName = ''; // Reset primary surgeon name
        this.primarySurgeonId = ''; // Reset primary surgeon ID
        this.patientName = ''; // Reset patient name
        this.surgeryDate = this.today; // Reset surgery date
        this.surgeryType = 'single surgery'; // Reset surgery type
        this.surgeryName = ''; // Reset surgery name
        this.surgeryLevel = ''; // Reset surgery level
        this.amountPaid = false; // Reset amount paid status
        this.multipleSurgeryDoctor = ''; // Reset multiple surgery doctor
        this.selectedDoctors = []; // Reset selected doctors
        this.fetchConfirmedAppointments(); // Refresh the appointment list
        this.isButtonClicked = false;
        this.isButtonLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'New OT Details created successfully!' });
      },
      error: (err) => {
        console.error('Failed to create OT Details:', err);
        this.isButtonClicked = false;
        this.isButtonLoading = false;
      }
    });
  }
  setPrimarySurgeon(doctor: { id: string, name: string }) {
    this.primarySurgeonId = doctor.id;
    this.primarySurgeonName = doctor.name;
    console.log(this.primarySurgeonId, this.primarySurgeonName);
  }

  showUpdateDetailsPopup(appointment: any): void {
    this.showUpdateDetails = true; // Show the update details popup
    this.patientName = appointment.patientName || '';
    this.surgeryDate = appointment.appointmentDate;
    this.surgeryType = appointment.radioServiceName;
    this.surgeryLevel = appointment.surgeryLevel;
    this.surgeryName = appointment.surgeryName ;
    this.estimationId = appointment.estimationId || ''; // Ensure estimationId is available
    const otDetail = (appointment.OTDetails && appointment.OTDetails.length > 0)
      ? appointment.OTDetails[0]
      : null;

    this.roomNo = otDetail?.roomNo || appointment.roomNo || '';
    this.amountPaid = (otDetail?.paid ?? appointment.paid) ?? false;
    this.isButtonClicked = false; // Reset button click state
    this.isButtonLoading = false; // Reset button loading state
    this.multipleSurgeryDoctor = appointment.multipleSurgeryDoctor || '';
    this.loadDoctorsForMultipleSurgery();
    this.primarySurgeonName = otDetail?.handledBy || appointment.handledBy || '';
    console.log('Primary Surgeon Name:', this.doctorsForMultipleSurgery, this.primarySurgeonName);
    this.primarySurgeonId = this.doctorsForMultipleSurgery.find(
      d => d.name === this.primarySurgeonName
    )?.id || '';

    console.log('Primary Surgeon:', this.primarySurgeonName, this.primarySurgeonId);
    console.log('Appointment details:', this.showUpdateDetails);
  }
  handleSurgeryNamesChange() {
    this.surgeries = this.surgeryName
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    console.log(this.surgeries);

    this.surgeryType = this.surgeries.length > 1 ? 'multiple surgeries' : 'single surgery';
  
    // Initialize selected doctors array
    this.selectedDoctors = this.surgeries.map((_, index) => this.selectedDoctors[index] || '');
    
    this.updateDoctorIdsString();
  }
  updateMultipleDoctor(index: number) {
    // Whenever a doctor is selected, update the joined string
    this.updateDoctorIdsString();
  }
  updateDoctorIdsString() {
    this.multipleSurgeryDoctor = this.selectedDoctors
      .filter(id => id)
      .join(',');
  }
  setPrimarySurgeonName() {
    const doctor = this.filteredDoctors.find(d => d.id === this.primarySurgeonId);
    this.primarySurgeonName = doctor ? doctor.name : '';
  }
    
  closePopup(): void {
    this.showUpdateDetails = false; // Close the popup
    this.patientName = ''; // Reset patient name
    this.surgeryDate = this.today; // Reset surgery date
    this.surgeryType = 'single surgery'; // Reset surgery type
    this.surgeryName = ''; // Reset surgery name
    this.surgeryLevel = ''; // Reset surgery level
    this.amountPaid = false; // Reset amount paid status
    this.multipleSurgeryDoctor = ''; // Reset multiple surgery doctor
    this.selectedDoctors = []; // Reset selected doctors
    this.roomNo = ''; // Reset room number
    this.primarySurgeonName = ''; // Reset primary surgeon name
    this.primarySurgeonId = ''; // Reset primary surgeon ID
  }

  openPopup(){
    this.appointmentService.getAllPatients().subscribe({
      next: (patients: any[]) => {
        this.patients = patients;
        console.log('Patients loaded:', patients);
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      }
    });
    this.showPopup = true; // Show the popup
    this.patientName = ''; // Reset patient name
    this.surgeryDate = this.today; // Reset surgery date
    this.surgeryType = 'single surgery'; // Reset surgery type
    this.surgeryName = ''; // Reset surgery name
    this.surgeryLevel = ''; // Reset surgery level
    this.amountPaid = false; // Reset amount paid status
    this.multipleSurgeryDoctor = ''; // Reset multiple surgery doctor
    this.selectedDoctors = []; // Reset selected doctors
    this.roomNo = ''; // Reset room number
    this.primarySurgeonName = ''; // Reset primary surgeon name
    this.primarySurgeonId = ''; // Reset primary surgeon ID
    this.prn=''
  }


  onUHIDChange(): void {
    if (!this.prn) {
      this.patientName = '';
      this.uhidSuggestions = false;
      return;
    }

    this.filteredUHIDPatients = this.patients.filter(patient =>
      String(patient.prn).toLowerCase().includes(this.prn.toLowerCase())
    );

    this.uhidSuggestions = this.filteredUHIDPatients.length > 0;
  }

  selectUHID(selectedPatient: any): void {
    if (!selectedPatient) return;
    this.patientName = selectedPatient.name;
    this.uhidSuggestions = false;
  }
}
