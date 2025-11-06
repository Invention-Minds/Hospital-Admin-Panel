import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter, HostListener, ViewChildren, ElementRef, QueryList, ViewChild } from '@angular/core';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { AppointmentConfirmService } from '../../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import { EstimationService } from '../../../services/estimation/estimation.service';
import { EventService } from '../../../services/event.service';
import { MessageService } from 'primeng/api';
import NoSleep from "nosleep.js";
import { ChangeDetectorRef } from '@angular/core';
import { Doctor } from '../../../models/doctor.model';
import { ChannelService } from '../../../services/channel/channel.service';
import { environment } from '../../../../environment/environment';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { PrescriptionService } from '../../../services/prescription/prescription.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { forkJoin } from 'rxjs';
import { app } from '../../../../../server';
import { HealthCheckupServiceService } from '../../../services/health-checkup/health-checkup-service.service';

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
  prnNumber?: any;
  overTime?: any;
  elapsedTime?: any;
  referredDeptId?: number;
  referredDept?: string;
  referredDocId?: number;
  referredDoc?: string;
  isReferred?: boolean;
  patientType?: string;
  isfollowup?: boolean;
}

interface DoctorNote {
  id?: number;
  chiefComplaints: string;
  diagnosis: string;
  generalExamination: string;
  clinicalNotes: string;
  advice: string;
  [key: string]: any; // 🔑 allows dynamic access like doctorNoteData[field.key]
}

@Component({
  selector: 'app-today-consultations',
  templateUrl: './today-consultations.component.html',
  styleUrl: './today-consultations.component.css',
  animations: [
    trigger('sortAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
      ]),
      transition('* => *', [
        query('tr', [
          style({ transform: 'translateY(-10px)', opacity: 0 }),
          stagger('100ms', [
            animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})

export class TodayConsultationsComponent {



  @ViewChild('printSection') printSection!: ElementRef;
  @ViewChild('labInput') labInput!: ElementRef;
  @ViewChild('radiologyInput') radiologyInput!: ElementRef;
  @ViewChildren('labOption') labOptions!: QueryList<ElementRef>;
  @ViewChildren('radiologyOption') radiologyOptions!: QueryList<ElementRef>;

  confirmedAppointments: Appointment[] = [];
  @Output() consultationStarted = new EventEmitter<{ doctorId: number, appointmentId: number }>();

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService, private cdRef: ChangeDetectorRef, private eventService: EventService, private estimationService: EstimationService, private channelService: ChannelService, private fb: FormBuilder, private prescriptionService: PrescriptionService,
    private healthCheckupService: HealthCheckupServiceService  // Inject NoSleep service
  ) {
    this.form = this.fb.group({
      prescribedBy: [''],
      prn: [''],
      patientName: [''],
      remarks: [''],
      prescribedDate: [''],
      prescribedById: [''],
      prescribedByKMC: [''],
      tablets: this.fb.array([]),
    });
    this.favoritesForm = this.fb.group({
      favorites: this.fb.array([]),
    });
    this.addTablet();
  }
  appointments: Appointment[] = [
    // { id: '0001', patientName: 'Search Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Booked', smsSent: true },
  ];
  timerIntervals: any = {};

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
  surgeryTime: string = 'No Level';
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
  isEndConsultation: boolean = false;
  isButtonLoading: boolean = false;
  departments: any = [];
  allDoctors: any = [];
  filteredDoctors: any = [];
  selectedDepartment: any = null;
  selectedDoctor: any = null;
  isPopupOpen: boolean = false;
  isButtonClicked: boolean = false;
  triggerAnimation: boolean = false;
  minDate: string = '';
  @Output() viewPatient = new EventEmitter<any>();
  showPrescription: boolean = false;
  username: string = '';
  showFavorite: boolean = false; // Flag to control the visibility of the favorite button
  allTablets: any[] = [];
  allFavorites: any[] = [];
  allergyForm!: FormGroup;
  showAllergy = false;
  selectedPrn: string = '';
  allergicGenerics: string[] = [];
  showPreviousRx = false; // Flag to control the visibility of the previous Rx button
  showPastRx = false; // Flag to control the visibility of the past Rx button
  pastPrescriptions: any[] = [];
  selectedPrescriptionId: string | null = null;
  selectedPrescription: any = null;
  selectPrescriptionPrint: any[] = [];
  selectedGeneric: string = '';
  saved: boolean = false; // Flag to control the visibility of the save button;
  selectedPrint: any = null; // Variable to store the selected print option
  prescribedBy: string = ''; // Variable to store the name of the doctor who prescribed the medication
  doctorNotes: any[] = [];
  bloodGroupAppointments: any[] = []
  services: any[] = [];
  serviceAppointments: any[] = [];
  transfusionAppointments: any[] = [];
  prescription: any[] = [];
  selectedTransfusion: any[] = [];
  patientData: any;
  selectedVisit: any;
  selectedServices: any[] = [];
  selectedVitals: any = null;
  selectedServicePrint: any[] = [];
  form: FormGroup;
  favoritesForm: FormGroup;
  previousTablet: any[] = [];
  previousPrescription: any = '';
  prescribedByKMC: string = ''; // Variable to store the KMC number of the doctor who prescribed the medication
  showModal = false; // Flag to control the visibility of the modal
  activeTab: string = 'history';
  investigationRemarks: string = ''
  activeInvestigationTab: 'lab' | 'radiology' | 'package' = 'lab';

  allLabTests: any[] = [];
  allRadiologyTests: any[] = [];
  allPackages: any[] = [];

  addedLabTests: any[] = [];
  addedRadiologyTests: any[] = [];
  addedPackages: any[] = [];

  selectedLabId: number | null = null;
  selectedRadiologyId: number | null = null;
  selectedPackageId: number | null = null;

  search = '';
  department = '';
  // Show/hide suggestion flags
  showBrandSuggestions: boolean[] = [];
  filteredBrandNames: string[][] = []; // List of filtered suggestions per input
  showFavBrandSuggestions: boolean[] = [];
  filteredFavBrandNames: string[][] = []; // List of filtered suggestions per input
  tabs = [
    { key: 'history', label: 'History' },
    { key: 'clinical', label: 'Clinical Notes' },
    { key: 'prescription', label: 'Prescription' },
    { key: 'investigation', label: 'Investigation' },
  ];
  showOpdModal = false;
  showSignatureModel = false;

openOpdForm(appointment: any) {
  this.selectedAppointment = appointment;
  this.showOpdModal = true;
}

onAssessmentSaved(savedData: any) {
  console.log('✅ OPD assessment saved/updated:', savedData);
  this.showOpdModal = false;
  // Optionally refresh appointment list
  this.fetchAppointments(this.doctorId);
}
  


  get tablets(): FormArray {
    return this.form.get('tablets') as FormArray;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isDesktopView = window.innerWidth > 500; // Use table if screen width > 768px
  }

  @ViewChildren('row') rows!: QueryList<ElementRef>;
  rowPositions: { [key: number]: number } = {};
  rowTransforms: { [key: number]: string } = {};
  rowTransitions: { [key: number]: string } = {};
  genericOptions: any[] = [];
  brandOptions: any[] = [];
  tabletsMap: Record<string, string[]> = {}; // { 'Paracetamol': ['Calpol', 'Crocin'] }
  filteredBrandOptions: string[][] = []; // brand list per row
  filteredBrandOptionsFavorites: string[][] = []; // brand list per row
  frequencyOptions = [
    '1-1-1',
    '1-0-1',
    '1-1-0',
    '0-1-1',
    '1-0-0',
    '0-0-1',
    '0-1-0',
    '2-2-2',
    '1/2-1/2-1/2',
    '1/2-0-1/2',
    '1/2-1/2-0',
    '1-1-1-1',
    '2-2-2-2',
    '5ml-5ml-5ml',
    'Stat',
    'Till Review',
    'SOS',
    'Daily'
  ];

  durationOptions = ['Daily', '3 days', '5 days', '7 days', '10 days'];

  private eventSource: EventSource | null = null;
  // Method to handle sorting by a specific column
  ngOnInit() {
    this.checkScreenSize();
    this.loadDepartments();
    this.loadDoctors();

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
    this.loadTabletOptions();
    this.allergyForm = this.fb.group({
      allergies: this.fb.array([])
    });
    this.showBrandSuggestions.push(false);
    this.filteredBrandNames.push([]);
    this.showFavBrandSuggestions.push(false);
    this.filteredFavBrandNames.push([]);


    this.appointmentService.getLabTests().subscribe(data => this.allLabTests = data);
    this.appointmentService.getRadiologyTests().subscribe(data => this.allRadiologyTests = data);
    this.healthCheckupService.getPackages().subscribe(data => this.allPackages = data);
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
        console.log(this.doctor)
        this.doctorId = response.id;
        this.fetchAppointments(this.doctorId); // Fetch only this doctor's appointments
      }
    );
  }
  // Store interval reference

  // monitorWaitingTimes() {
  //   if (this.isMonitoringActive) {
  //     console.log("⏳ Waiting time monitoring already running. Skipping...");
  //     return;
  //   }

  //   console.log("✅ Starting waiting time monitoring...");
  //   this.isMonitoringActive = true; // Set flag to true to prevent duplicates
  //   console.log(this.doctorId)

  //   this.intervalId = setInterval(() => {
  //     if (this.doctorId) {
  //       console.log(`⏳ Checking waiting times for Doctor ID: ${this.doctorId}`);
  //       this.checkWaitingTimes();
  //     }
  //   }, 60000);
  // }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log("⏹️ Stopped monitoring waiting times.");
    }
    this.isMonitoringActive = false;
  }

  // toggleCard(index: number) {
  //   this.filteredAppointments[index].expanded = !this.filteredAppointments[index].expanded;
  // }
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
        this.confirmedAppointments = appointments
        this.filteredAppointments = this.confirmedAppointments;
        this.startTimers();
        this.completedAppointments = this.filteredAppointments.filter(appointment => !appointment.checkedOut || (!appointment.checkedOut && !appointment.isCloseOPD))
        this.filteredAppointments.sort((a, b) => {
          // 1. Move finished consultations to the bottom
          if (a.endConsultation && !b.endConsultation) return 1;
          if (!a.endConsultation && b.endConsultation) return -1;

          // 2. Sort by appointment time (earliest first)
          const timeA = this.parseTimeToMinutes(a.time);
          const timeB = this.parseTimeToMinutes(b.time);
          return timeA - timeB;
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
  todayDate() {
    this.estimationPreferedDate = this.formatDate(new Date())
  }
  chooseDate() {
    this.estimationPreferedDate = ''
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
    this.surgeryTime = 'No Level';
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
    this.isButtonLoading = true;
    this.isButtonClicked = true;
    if (!this.estimationText) {
      // alert('Please enter an estimation.');
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter an estimation.' })
      this.isButtonLoading = false;
      this.isButtonClicked = false;
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
        prnNumber: this.selectedAppointment?.prnNumber,
        patientName: this.selectedAppointment?.patientName,
        phoneNumber: this.selectedAppointment?.phoneNumber,
        patientEmail: this.selectedAppointment?.email,
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
          this.isButtonLoading = false;
          this.isButtonClicked = false;

        },
        error: (error) => {
          console.error('Error saving estimation details:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error saving estimation details. Please try again.' });
          this.isButtonLoading = false;
          this.isButtonClicked = false;

        }
      });
      return;
    }
    const estimationDetails = {
      prnNumber: this.selectedAppointment?.prnNumber,
      patientName: this.selectedAppointment?.patientName,
      phoneNumber: this.selectedAppointment?.phoneNumber,
      patientEmail: this.selectedAppointment?.email,
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
            this.isButtonLoading = false;
            this.isButtonClicked = false;
          },
          error: (error) => {
            console.error('Error saving estimation details:', error);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error saving estimation details. Please try again.' });
            this.isButtonLoading = false;
            this.isButtonClicked = false;
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
    } else {
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
      const { expanded, overTime, elapsedTime, user, ...updatedAppointment } = ongoingConsultation;
      updatedAppointment.checkedOutTime = new Date(Number(updatedAppointment.checkedOutTime))
      this.appointmentService.updateAppointment(updatedAppointment);
      this.sortAppointments();



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
    this.startCounter(appointment);


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
    // this.loadDoctorData()
    // console.log(this.currentDoctorId, appointment.id!)
  }
  finishConsultation(appointment: Appointment): void {
    console.log('finish')

    appointment.endConsultation = true;
    appointment.endConsultationTime = new Date()
    appointment.checkedOutTime = new Date(Number(appointment.checkedOutTime))
    if (this.timerIntervals[appointment.prnNumber]) {
      clearInterval(this.timerIntervals[appointment.prnNumber]);
      delete this.timerIntervals[appointment.prnNumber]; // Remove reference to prevent memory leaks
    }

    // Remove blinking effect
    appointment.overTime = null;
    appointment.elapsedTime = 0; // Reset elapsed time

    const { expanded, overTime, elapsedTime, user, ...updatedAppointment } = appointment;
    updatedAppointment.checkedOutTime = new Date(Number(updatedAppointment.checkedOutTime))
    this.appointmentService.updateAppointment(updatedAppointment)
    this.sortAppointments();
  }
  // sortAppointments(): void {
  //   this.filteredAppointments.sort((a, b) => {
  //     // Move finished consultations to the bottom
  //     if (a.endConsultation && !b.endConsultation) return 1;
  //     if (!a.endConsultation && b.endConsultation) return -1;
  //     return 0; // Keep existing order for others
  //   });
  // }
  // sortAppointments(): void {
  //   this.filteredAppointments.sort((a, b) => {
  //     // 1. Move finished consultations to the bottom
  //     if (a.endConsultation && !b.endConsultation) return 1;
  //     if (!a.endConsultation && b.endConsultation) return -1;

  //     // 2. Sort by appointment time (earliest first)
  //     const timeA = this.parseTimeToMinutes(a.time);
  //     const timeB = this.parseTimeToMinutes(b.time);
  //     return timeA - timeB;
  //   });
  //   this.cdRef.detectChanges();
  // }
  sortAppointments(): void {
    // Step 1: Record current positions
    this.rows.forEach((rowRef, index) => {
      const id = this.getPaginatedAppointments()[index].id;
      this.rowPositions[id] = rowRef.nativeElement.offsetTop;
    });

    // Step 2: Sort the data
    this.filteredAppointments = [...this.filteredAppointments].sort((a, b) => {
      if (a.endConsultation && !b.endConsultation) return 1;
      if (!a.endConsultation && b.endConsultation) return -1;

      const timeA = this.parseTimeToMinutes(a.time);
      const timeB = this.parseTimeToMinutes(b.time);
      return timeA - timeB;
    });

    // Step 3: Wait for DOM update, then calculate new positions
    setTimeout(() => {
      const newPositions: { [key: number]: number } = {};
      const transforms: { [key: number]: string } = {};
      const transitions: { [key: number]: string } = {};

      this.rows.forEach((rowRef, index) => {
        const appointment = this.getPaginatedAppointments()[index];
        const newY = rowRef.nativeElement.offsetTop;
        const prevY = this.rowPositions[appointment.id] ?? newY;

        const deltaY = prevY - newY;
        if (deltaY !== 0) {
          transforms[appointment.id] = `translateY(${deltaY}px)`;
          transitions[appointment.id] = 'transform 0s';
        }

        newPositions[appointment.id] = newY;
      });

      this.rowTransforms = transforms;
      this.rowTransitions = transitions;

      // Step 4: Animate to new position
      setTimeout(() => {
        for (let id in this.rowTransforms) {
          this.rowTransforms[id] = 'translateY(0)';
          this.rowTransitions[id] = 'transform 700ms ease';
        }
      });
    });
  }
  trackById(index: number, appointment: any): number {
    return appointment.id; // Ensure that each row has a unique ID
  }

  transfer(appointment: Appointment): void {
    // console.log(appointment)

    appointment.isTransfer = true;
    const { expanded, overTime, elapsedTime, user, ...updatedAppointment } = appointment;
    updatedAppointment.checkedOutTime = new Date(Number(updatedAppointment.checkedOutTime))
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
  openReferralPopup(appointment: any) {
    this.isPopupOpen = true
    this.selectedAppointment = appointment
  }
  followUp(appointment: any) {
    appointment.isfollowup = true
    appointment.isFollowupTime = new Date();
    const { expanded, overTime, elapsedTime, user, ...updatedAppointment } = appointment;
    this.appointmentService.updateAppointment(updatedAppointment)
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Followup added successfully.',
    });
  }
  loadDepartments(): void {
    this.doctorService.getDepartments().subscribe(
      (departments) => {
        this.departments = departments;
      },
      (error) => {
        console.error('Error fetching departments:', error);
      }
    );
  }
  loadDoctors(): void {
    this.doctorService.getActiveDoctors().subscribe(
      (doctors) => {
        this.allDoctors = doctors;
      },
      (error) => {
        console.error('Error fetching doctors:', error);
      }
    );
  }
  closeForm() {
    this.isPopupOpen = false;
    this.selectedDepartment = null
    this.selectedDoctor = ''
  }

  filterDoctors() {
    const todayDate = new Date().toISOString().split('T')[0]; // Today's date
    const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5)); // Current time in minutes

    // Filter doctors based on availability and assignment
    this.filteredDoctors = this.allDoctors.filter((doctor: any) => {
      return (
        doctor.departmentName === this.selectedDepartment.name
      );
    });
    console.log('Filtered Doctors:', this.filteredDoctors);

  }
  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  saveDoctor() {
    if (this.selectedDoctor && this.selectedDepartment && this.selectedAppointment) {
      this.selectedAppointment.referredDeptId = this.selectedDepartment.id;
      this.selectedAppointment.referredDept = this.selectedDepartment.name;
      this.selectedAppointment.referredDocId = this.selectedDoctor.id;
      this.selectedAppointment.referredDoc = this.selectedDoctor.name;
      this.selectedAppointment.isReferred = true;

      console.log("Appointment Data:", this.selectedAppointment);
      const { expanded, overTime, elapsedTime, user, ...updatedAppointment } = this.selectedAppointment;
      updatedAppointment.checkedOutTime = new Date(Number(updatedAppointment.checkedOutTime))
      this.appointmentService.updateAppointment(updatedAppointment);
      this.isPopupOpen = false

    } else {
      console.error("Please select both department and doctor.");
    }
  }

  closeTransferPopup() {
    this.showTransferAppointment = false;
  }
  async endConsultation() {
    console.log('end')
    await this.loadDoctorData()
    if (this.completedAppointments.length > 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'This action can’t be done right now as there are patients for consultation.',
      });
      return;
    }
    this.isEndConsultation = true;
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
      this.currentDoctorId = this.doctorId
      this.channelService.getChannelsByDoctor(this.currentDoctorId).subscribe({
        next: (response) => {
          console.log(response)
          const channelId = response.channelId;
          const doctorData = {
            channelId: channelId,
            doctorId: this.currentDoctorId
          }
          this.channelService.removeDoctorFromChannel(doctorData).subscribe({
            next: (response) => {
              // console.log('Doctor Removed From the Channel')
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Thank you, you have completed all your consultations for today',
              });
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
    const { expanded, overTime, elapsedTime, user, ...updatedAppointment } = appointment;
    updatedAppointment.checkedOutTime = new Date(Number(updatedAppointment.checkedOutTime))
    this.appointmentService.updateAppointment(updatedAppointment)
  }



  // Confirm and perform the Close OPD action
  confirmCloseOpd(): void {
    // console.log('Closing OPD with the following appointments:', this.filteredAppointments);
    // Add your logic to close OPD here
    this.closeCloseOpdPopup();
  }

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
    this.isButtonLoading = true;
    if (!this.startDate || !this.endDate) {
      // alert('Please select both start and end dates.');
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select both start and end dates.' })
      this.isButtonLoading = false;
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
    // const adminPhoneNumber = ["919880544866","919341227264","918904943673","918951243004","919633943037"]
    const adminPhoneNumber = ["919342287945", "919342287945"]
    this.appointmentService.sendAdminMessage(this.currentDoctorName, this.currentDepartmentName, this.startDate, this.endDate, adminPhoneNumber).subscribe({
      next: (response) => {
        // console.log('Leave request submitted:', response);
        // alert('Leave request submitted successfully.');
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Leave Request Submitted Successfully' })
        this.closeLeaveRequestPopup();
        this.isButtonLoading = false;
      },
      error: (error) => {
        console.error('Error submitting leave request:', error);
        alert('Error submitting leave request. Please try again.');
        this.isButtonLoading = false;
      }
    });
    // console.log('Submitting leave request:', leaveRequest);

  }
  checkWaitingTimes() {
  }
  startTimers() {
    console.log(this.confirmedAppointments)
    this.confirmedAppointments.forEach((appointment) => {
      // console.log(appointment)
      if (appointment.checkedOut && (appointment.endConsultation === false || appointment.endConsultation === null)) {
        this.startCounter(appointment);
        // console.log('logging')
      }
    });
  }
  startCounter(appointment: any) {
    if (!appointment.checkedOutTime) {
      appointment.checkedOutTime = new Date().getTime(); // If missing, set current timestamp
    } else {
      // Convert ISO string to timestamp
      appointment.checkedOutTime = new Date(appointment.checkedOutTime).getTime();
    }

    // Clear any existing interval before starting a new one
    if (this.timerIntervals[appointment.prnNumber]) {
      clearInterval(this.timerIntervals[appointment.prnNumber]);
    }

    // Start counting elapsed time
    this.timerIntervals[appointment.prnNumber] = setInterval(() => {
      const currentTime = new Date().getTime();

      if (appointment.checkedOutTime) {
        appointment.elapsedTime = Math.floor((currentTime - appointment.checkedOutTime) / 1000); // Convert to seconds
        if (appointment.endConsultation === true) {
          clearInterval(this.timerIntervals[appointment.prnNumber]); // Stop counting
          appointment.overTime = null; // Remove blinking class
          return; // Exit function
        }
        if (appointment.elapsedTime > (appointment.doctor.slotDuration * 60 + 600)) {
          appointment.overTime = true; // Mark as overtime
        } else {
          appointment.overTime = false;
        }
      } else {
        appointment.elapsedTime = 0; // Ensure a valid default value
      }
    }, 1000);

    console.log(appointment.overTime)
  }


  formatTime(seconds: number): string {
    if (!seconds || seconds < 0) {
      return '0m 0s';
    }
    const minutes = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${minutes}m ${sec}s`;
  }
  loadTabletOptions() {

    this.prescriptionService.getAllTablets().subscribe((tablets) => {
      this.allTablets = tablets;
      const generics = tablets.map((t: any) => t.genericName);
      const brands = tablets.map((t: any) => t.brandName);

      // Remove duplicates
      this.genericOptions = [...new Set(generics)];
      this.brandOptions = [...new Set(brands)];
    });


  }


  onGenericChange(index: number): void {
    setTimeout(() => {
      console.log(index)
      const isFavorites = this.showFavorite;

      const array = isFavorites ? this.favorites : this.tablets;
      const selectedGeneric = array.at(index).get('genericName')?.value;
      this.selectedGeneric = selectedGeneric;
      console.log(this.selectedGeneric)

      if (this.allergicGenerics.includes(selectedGeneric)) {
        this.confirmAllergyAlert(selectedGeneric);
      }
      const matchingTablets = this.allTablets.filter(tab => tab.genericName === selectedGeneric);
      this.brandOptions = matchingTablets.map(tab => tab.brandName);
      this.filteredBrandOptions[index] = this.brandOptions;
      this.filteredFavBrandNames[index] = this.brandOptions;
      this.filteredBrandOptionsFavorites[index] = this.brandOptions;
      this.filteredFavBrandNames[index] = this.brandOptions
      console.log(this.filteredBrandOptions)

      // Reset brand and tabletId if generic changes
      array.at(index).patchValue({
        brandName: '',
        tabletId: null
      });
    });
  }
  onBrandChange(index: number): void {
    const brandName = this.tablets.at(index).get('brandName')?.value;
    // const selectedGeneric = this.tablets.at(index).get('genericName')?.value;

    const selectedGeneric = this.tablets.at(index).get('genericName')?.value;
    console.log(this.selectedGeneric)
    const brandObj = this.allTablets.find(tab =>
      tab.genericName === this.selectedGeneric && tab.brandName === brandName
    );

    if (brandObj) {
      this.tablets.at(index).patchValue({ tabletId: brandObj.id });
    }
  }

  confirmAllergyAlert(genericName: string) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Allergy Alert',
      detail: `⚠️ ${genericName} is listed as an allergy for this patient.`,
      life: 5000
    });
  }

  view(patient: any): void {
    console.log('View patient:', patient);
    this.viewPatient.emit(patient);
  }
  openPrescriptionPopup(appointment: any) {
    this.selectedAppointment = appointment;
    // this.showPrescription = true;
    console.log(this.selectedAppointment)
    console.log(this.doctor.id, this.doctor.kmcNumber)
    this.form.patchValue({
      prescribedBy: this.doctor.name,
      prn: appointment.prnNumber.toString(),
      patientName: appointment.patientName,
      prescribedDate: this.today,
      prescribedById: this.doctor.id.toString(),
      prescribedByKMC: this.doctor.kmcNumber,
    });


    if (this.tablets.length === 0) {
      this.addTablet();
    }
    if (this.favorites.length === 0) {
      this.addFavorite();
    }
    this.prescriptionService.getAllergies(this.selectedAppointment?.prnNumber).subscribe((allergies) => {
      this.allergicGenerics = allergies.map((a: any) => a.genericName);
      console.log(this.allergicGenerics)
    })
  }
  addTablet() {
    const last = this.tablets.at(this.tablets.length - 1);
    if (last && !last.get('genericName')?.value && !last.get('brandName')?.value) {
      return; // prevent adding duplicate empty rows
    }
    const tabletsForm = this.form.get('tablets') as FormArray;
    tabletsForm.push(this.fb.group({
      genericName: [''],
      brandName: [''],
      frequency: [''],
      duration: [''],
      instructions: [''],
      quantity: [''],
      isFavorite: [false] // <-- add this
    }));

    this.filteredBrandOptions.push([]);
    // Ensure per-row filtered suggestion state
    console.log(this.brandOptions);
    this.brandOptions = this.allTablets.map((b: any) => b.brandName)
    this.filteredBrandNames.push([...this.brandOptions]); // default to full list
  }

  removeTablet(index: number) {
    this.tablets.removeAt(index);               // Remove the tablet form control
    this.filteredBrandOptions.splice(index, 1); // Remove the corresponding brand options
    this.filteredBrandNames.splice(index, 1);
    this.showBrandSuggestions.splice(index, 1);
  }

  save() {
    const payload = this.form.value;
    console.log(payload)
    this.isButtonLoading = true;
    this.prescriptionService.createPrescription(payload).subscribe({
      next: (response) => {
        console.log('Prescription created:', response);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Prescription saved successfully!' });
        this.selectPrescriptionPrint = [(response as any).data];
        this.prescribedBy = this.selectPrescriptionPrint[0].prescribedBy;
        this.prescribedByKMC = this.selectPrescriptionPrint[0].prescribedByKMC;
        this.selectedPrint = (response as any).data;
        console.log(this.selectedPrint)
        this.isButtonLoading = false;

        this.saved = true;
        const favoriteTablets = this.form.value.tablets
          .map((tablet: any, index: number) => ({ ...tablet, index }))
          .filter((tablet: any) => this.favoriteSet.has(tablet.index));
        console.log(favoriteTablets)
        const favPayload = favoriteTablets.map((t: any) => {
          let matched = this.allTablets.find(
            (tab) => tab.genericName === t.genericName && tab.brandName === t.brandName
          );
          // Fallback: try match only brand
          if (!matched) {
            matched = this.allTablets.find(tab => tab.brandName === t.brandName);
          }

          return matched ? {
            tabletId: matched.id, userId: this.username, frequency: t.frequency,
            duration: t.duration,
            instructions: t.instructions
          } : null;
        }).filter((f: any) => f !== null);

        console.log(favPayload)

        if (favPayload.length) {
          this.prescriptionService.saveFavoriteTablet(favPayload).subscribe({
            next: () => {
              this.messageService.add({ severity: 'info', summary: 'Favorites Saved', detail: 'Favorite tablets saved.' });
            },
            error: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save favorites.' });
            }
          });
        }
        // this.form.reset();
      },
      error: (error) => {
        console.error('Error creating prescription:', error);
        this.saved = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save prescription!' });
        this.isButtonLoading = false;
      }
    });
  }
  onBrandBlur(index: number): void {
    console.log('blurinng0', index)
    const array = this.showFavorite ? this.favorites : this.tablets;
    const brandName = array.at(index).get('brandName')?.value?.trim();
    let genericName = array.at(index).get('genericName')?.value?.trim();

    if (!brandName) return;

    // Check if this brand exists in your allTablets or allTabletMasters
    const existingTablet = this.allTablets.find(t => t.brandName === brandName);
    console.log(existingTablet)

    if (existingTablet) {
      // Use existing brand
      array.at(index).patchValue({
        tabletId: existingTablet.id,
        genericName: existingTablet.genericName,
      });
      return;
    }

    // If brand not found, create a new TabletMaster entry
    const type = 'default'; // or let user input/select type
    const description = ''; // optional

    this.prescriptionService.createTablet({
      brandName,
      genericName: genericName || brandName, // fallback if no generic selected
      type,
      description,
      doctorId: this.doctor.id.toString() // Pass the doctor ID if needed
    }).subscribe((newTablet: any) => {
      // Save the new tablet ID
      array.at(index).patchValue({
        tabletId: newTablet.id,
        genericName: newTablet.genericName,
      });

      // Add to local tablet cache
      this.allTablets.push(newTablet);
      this.brandOptions.push(newTablet.brandName);
    });
  }
  onFavBrandBlur(index: number): void {
    console.log('blurinng0', index)
    const array = this.showFavorite ? this.favorites : this.tablets;
    const brandName = array.at(index).get('brandName')?.value?.trim();
    let genericName = array.at(index).get('genericName')?.value?.trim();

    if (!brandName) return;

    // Check if this brand exists in your allTablets or allTabletMasters
    const existingTablet = this.allTablets.find(t => t.brandName === brandName);
    console.log(existingTablet)

    if (existingTablet) {
      // Use existing brand
      array.at(index).patchValue({
        tabletId: existingTablet.id,
        genericName: existingTablet.genericName,
      });
      return;
    }

    // If brand not found, create a new TabletMaster entry
    const type = 'default'; // or let user input/select type
    const description = ''; // optional

    this.prescriptionService.createTablet({
      brandName,
      genericName: genericName || brandName, // fallback if no generic selected
      type,
      description,
      doctorId: this.doctor.id.toString() // Pass the doctor ID if needed
    }).subscribe((newTablet: any) => {
      // Save the new tablet ID
      array.at(index).patchValue({
        tabletId: newTablet.id,
        genericName: newTablet.genericName,
      });

      // Add to local tablet cache
      this.allTablets.push(newTablet);
      this.brandOptions.push(newTablet.brandName);
    });
  }

  print() {
    console.log(this.selectPrescriptionPrint)
    if (!this.selectedAppointment || !this.selectPrescriptionPrint) {
      console.error('Print data is not ready');
      return;
    }

    if (!this.printSection) {
      console.error('printSection is not available in the DOM');
      return;
    }
    const printContents = this.printSection.nativeElement.innerHTML;
    const popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
    if (popupWin) {
      popupWin.document.open();
      popupWin.document.write(`
        <html>
          <head>
            <title>Prescription</title>
            <style>
              /* Add any print-specific styles here */
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                padding: 10px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
              }
              .prescription-block {
                margin-bottom: 30px;
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body onload="window.print();window.close()">
            ${printContents}
          </body>
        </html>
      `);
      popupWin.document.close();
    } else {
      console.error('Unable to open print window');
    }
  }
  favoriteSet = new Set<number>();

  // toggleFavorite(index: number) {
  //   if (this.favoriteSet.has(index)) {
  //     this.favoriteSet.delete(index);
  //   } else {
  //     this.favoriteSet.add(index);
  //   }
  // }

  // isFavorite(index: number): boolean {
  //   return this.favoriteSet.has(index);
  // }
  toggleFavorite(index: number) {
    const control = this.tablets.at(index);
    const currentState = this.favoriteSet.has(index);

    if (currentState) {
      this.favoriteSet.delete(index);
    } else {
      this.favoriteSet.add(index);
    }

    // Optionally reflect this in the form if you're keeping isFavorite
    control.get('isFavorite')?.setValue(!currentState);
  }


  isFavorite(i: number): boolean {
    return this.tablets.at(i).get('isFavorite')?.value;
  }

  get favorites(): FormArray {
    return this.favoritesForm.get('favorites') as FormArray;
  }

  addFavorite() {
    const group = this.fb.group({
      genericName: [''],
      brandName: [''],
      frequency: [''],
      duration: [''],
      instructions: [''],
      isExisting: [false]
    });
    this.favorites.insert(0, group);
    // this.filteredBrandOptions.splice(0, 0, []); // Add a new entry to the filteredBrandOptions array
    this.filteredBrandOptionsFavorites.splice(0, 0, []); // Add a new entry to the filteredBrandOptions array
    // this.filteredFavBrandNames.splice(0,0, []);
    this.brandOptions = this.allTablets.map((b: any) => b.brandName)
    this.filteredBrandNames.push([...this.brandOptions]); // default to full list
  }


  // removeFavorite(index: number) {
  //   this.favorites.removeAt(index);
  // }
  removeFavorite(index: number) {
    const control = this.favorites.at(index);

    // If it’s an existing favorite (read-only)
    if (control.get('isExisting')?.value) {
      const genericName = control.get('genericName')?.value;
      const brandName = control.get('brandName')?.value;

      const matchingFav = this.allFavorites.find(fav =>
        fav.tablet.genericName === genericName &&
        fav.tablet.brandName === brandName
      );

      if (matchingFav) {
        this.prescriptionService.removeFavoriteTablet(matchingFav.id).subscribe({
          next: () => {
            this.favorites.removeAt(index);
            // this.filteredBrandOptions.splice(index, 1); // keep it in sync
            this.filteredBrandOptionsFavorites.splice(index, 1); // keep it in sync
            this.filteredFavBrandNames.splice(index,1)
            this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Favorite removed from DB' });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete favorite' });
          }
        });
      } else {
        this.favorites.removeAt(index); // fallback
        this.filteredBrandOptionsFavorites.splice(index, 1); // keep it in sync
        this.filteredFavBrandNames.splice(index,1)
        // this.filteredBrandOptions.splice(index, 1); // keep it in sync
      }

    } else {
      // New entry not saved yet, just remove from the form
      this.favorites.removeAt(index);
      this.filteredBrandOptionsFavorites.splice(index, 1); // keep it in sync
      this.filteredFavBrandNames.splice(index,1);
      // this.filteredBrandOptions.splice(index, 1); // keep it in sync
    }
  }


  saveFavorites() {
    console.log(this.favorites)
    const favoritesPayload = this.favorites.value.filter(
      (item: any) => item.genericName && item.brandName
    );

    if (!favoritesPayload.length) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill at least one entry!' });
      return;
    }
    console.log(favoritesPayload)
    const mappedFavorites = favoritesPayload.map((fav: any) => {
      const matchingTablet = this.allTablets.find(t =>
        t.genericName === fav.genericName && t.brandName === fav.brandName
      );
      console.log(matchingTablet)

      return matchingTablet ? {
        tabletId: matchingTablet.id,
        userId: this.username,
        frequency: fav.frequency,
        duration: fav.duration,
        instructions: fav.instructions
      } : null;
    }).filter(Boolean);

    console.log(mappedFavorites)
    if (!mappedFavorites.length) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No matching tablets found!' });
      return;
    }

    this.prescriptionService.saveFavoriteTablet(mappedFavorites).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Favorites saved successfully!' });
        this.closeFavorites();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save favorites!' });
      }
    });

  }

  closeFavorites() {
    this.favorites.reset();
    this.favoriteSet.clear();
    this.showFavorite = false;
  }
  openFavorite() {
    this.prescriptionService.getAllFavorites().subscribe((favs) => {
      this.allFavorites = favs;
      this.favorites.clear();
      // this.filteredBrandOptions = [];
      this.filteredBrandOptionsFavorites = [];
      this.filteredFavBrandNames = []

      favs.forEach((fav: any) => {
        this.favorites.push(this.fb.group({
          genericName: [{ value: fav.tablet.genericName, disabled: false }],
          brandName: [{ value: fav.tablet.brandName, disabled: false }],
          frequency: [fav.frequency],
          duration: [fav.duration],
          instructions: [fav.instructions],
          isExisting: [true]
        }));

        const brandOptions = this.allTablets
          .filter((tab: any) => tab.genericName === fav.tablet.genericName)
          .map((tab: any) => tab.brandName);
        console.log(brandOptions)
        const brands = this.tabletsMap[fav.tablet.genericName] || [];
        // this.filteredBrandOptions.push(brandOptions);
        this.filteredBrandOptionsFavorites.push(brandOptions);
        this.filteredFavBrandNames.push(brandOptions);
        console.log(this.filteredFavBrandNames)
      });

      this.showFavorite = true;
    });
  }


  get allergies(): FormArray {
    return this.allergyForm.get('allergies') as FormArray;
  }

  openAllergyPopup() {
    this.showAllergy = true;
    console.log(this.selectedAppointment)
    this.selectedPrn = this.selectedAppointment?.prnNumber;

    this.prescriptionService.getAllergies(this.selectedPrn).subscribe((data: any[]) => {
      this.allergicGenerics = data.map(a => a.genericName);
      const formGroups = data.map((a) =>
        this.fb.group({
          id: [a.id],
          genericName: [{ value: a.genericName, disabled: false }]
        })
      );
      this.allergyForm.setControl('allergies', this.fb.array(formGroups));
    });
  }

  addAllergy() {
    this.allergies.insert(0, this.fb.group({
      genericName: ['']
    }));
  }


  removeAllergies(index: number) {
    const allergy = this.allergies.at(index).value;
    if (allergy?.id) {
      this.prescriptionService.deleteAllergy(allergy.id).subscribe(() => {
        this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Allergy removed' });
        this.allergies.removeAt(index);
      });
    } else {
      this.allergies.removeAt(index);
    }
  }

  saveAllergies() {
    const payload = this.allergies.controls
      .filter(ctrl =>
        (!ctrl.get('id') || ctrl.get('id')?.value == null) &&
        ctrl.get('genericName')?.value
      )
      .map(ctrl => ({
        prn: this.selectedAppointment?.prnNumber,
        genericName: ctrl.get('genericName')?.value
      }));

    console.log(payload)

    if (payload.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'No New Allergies', detail: 'Nothing to save.' });
      return;
    }

    this.prescriptionService.saveAllergies(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Allergies saved successfully' });
        this.closeAllergies();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not save allergies' });
      }
    });
  }


  closeAllergies() {
    this.showAllergy = false;
    this.allergies.clear();
  }
  onFavoriteSelect(fav: any) {
    this.addTabletWithValues({
      genericName: fav.tablet.genericName,
      brandName: fav.tablet.brandName,
      frequency: fav.frequency,
      duration: fav.duration,
      instructions: fav.instructions,
      isFavorite: true
    });
  }

  addTabletWithValues(values: any) {
    this.tablets.push(this.fb.group({
      genericName: [values.genericName],
      brandName: [values.brandName],
      frequency: [values.frequency],
      duration: [values.duration],
      instructions: [values.instructions],
      quantity: [''],
      isFavorite: [values.isFavorite]
    }));
  }
  addFavoriteToPrescription(index: number) {
    // const fav = this.favorites.at(index).getRawValue();
    const fav = JSON.parse(JSON.stringify(this.favorites.at(index).getRawValue()));


    if (!fav.genericName || !fav.brandName) {
      this.messageService.add({ severity: 'warn', summary: 'Incomplete Favorite', detail: 'Please select generic and brand.' });
      return;
    }
    console.log(fav)
    this.tablets.push(this.fb.group({
      genericName: [fav.genericName],
      brandName: [fav.brandName],
      frequency: [fav.frequency || ''],
      duration: [fav.duration || ''],
      instructions: [fav.instructions || ''],
      quantity: [''], // let user fill this
      isFavorite: [true]
    }));
    // Get the index of the new tablet just added
    const tabletIndex = this.tablets.length - 1;

    const brands = this.allTablets
      .filter(t => t.genericName === fav.genericName)
      .map(t => t.brandName);

    // Make sure the selected brand is in the list
    if (!brands.includes(fav.brandName)) {
      brands.unshift(fav.brandName);
    }

    this.filteredBrandOptions[tabletIndex] = brands; // ✅ Use correct index

    console.log(this.filteredBrandOptions, tabletIndex);

    this.messageService.add({ severity: 'info', summary: 'Added', detail: 'Favorite added to prescription.' });
  }

  openPreviousRx() {
    const prn = this.selectedAppointment?.prnNumber;

    this.prescriptionService.getPrescriptionsByPrn(prn).subscribe({
      next: (data: any[]) => {
        if (!data || data.length === 0) {
          this.messageService.add({ severity: 'info', summary: 'No Record', detail: 'No previous prescriptions found.' });
          return;
        }

        // Sort by date descending and get the latest
        const sorted = data.sort((a, b) => new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime());
        const lastPrescription = sorted[0];

        this.previousPrescription = lastPrescription;
        console.log(this.previousPrescription)

        this.showPreviousRx = true;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch previous prescription.' });
      }
    });
  }
  openPastRx() {
    const prn = this.selectedAppointment?.prnNumber;

    this.prescriptionService.getPrescriptionsByPrn(prn).subscribe({
      next: (data: any[]) => {
        if (!data || data.length === 0) {
          this.messageService.add({ severity: 'info', summary: 'No Record', detail: 'No previous prescriptions found.' });
          return;
        }

        // Sort by date descending and get the latest
        this.pastPrescriptions = data.sort((a, b) => new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime());;

        // Clear existing controls
        this.form.setControl('tablets', this.fb.array([]));
        this.selectedPrescriptionId = null;
        this.selectedPrescription = null;
        this.showPastRx = true;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch previous prescription.' });
      }
    });
  }
  selectPrescription(prescription: any) {
    this.selectedPrescriptionId = prescription.prescriptionId;
    this.selectedPrescription = prescription;

    // Move the selected one to the top of the list
    this.pastPrescriptions = [
      prescription,
      ...this.pastPrescriptions.filter(p => p.prescriptionId !== prescription.prescriptionId)
    ];
  }
  closePrescription() {
    this.showPrescription = false;
    this.form.reset();
    this.tablets.clear();
    this.filteredBrandOptions = [];
    this.favoriteSet.clear();
    this.showPreviousRx = false;
    this.showPastRx = false;
    this.selectedPrescriptionId = null;
    this.selectedPrescription = null;
    this.saved = false;
  }


  printVisitSummary(data: any) {
    console.log(data)
    const { date, prnNumber } = data;

    // const first$ = this.appointmentService.getDetailsByPRN(pnrNumber);
    // const second$ = this.secondService.getDetailsByPRN(pnrNumber);

    // forkJoin([first$, second$]).subscribe(([res1, res2]) => {
    //   const { bloodGroupAppointments, doctorNotes, patientData, transfusionData, prescriptionData } = res1;
    //   const { services, serviceAppointments } = res2;

    //   // Store for use in filtering
    //   this.patientData = patientData;
    //   this.bloodGroupAppointments = bloodGroupAppointments;
    //   this.transfusionAppointments = transfusionData;
    //   this.doctorNotes = doctorNotes;
    //   this.prescription = prescriptionData;
    //   this.services = services;
    //   this.serviceAppointments = serviceAppointments;

    //   // Filter everything by appointment date
    //   this.selectedVisit = this.doctorNotes.find(d => d.date === appointmentDate) || {};
    //   this.selectedVitals = this.bloodGroupAppointments.find((appt: any) => appt.appointmentDate === appointmentDate);
    //   this.selectedServicePrint = this.serviceAppointments.filter((appt: any) => appt.appointmentDate === appointmentDate);
    //   const filteredPrescription = this.prescription.filter((appt: any) => appt.prescribedDate === appointmentDate);
    //   const filteredTransfusion = this.transfusionAppointments.filter((appt: any) => appt.appointmentDate === appointmentDate);

    //   const docDefinition = this.generatePdfWithPatient(
    //     this.patientData,
    //     this.selectedVitals,
    //     this.selectedVisit,
    //     this.selectedServicePrint,
    //     filteredPrescription,
    //     filteredTransfusion
    //   );

    //   pdfMake.createPdf(docDefinition).open(); // Or .download() or .print()
    // });
    this.appointmentService.getDetailsByPRN(prnNumber).subscribe(res => {
      const {
        appointments,
        doctorNotes,
        patientData,
        transfusionData,
        prescriptionData,
        services,
        serviceAppointments,
        investigationOrders,
        historyData
      } = res;

      // Store for use in filtering
      this.patientData = patientData;
      this.bloodGroupAppointments = appointments;
      // this.transfusionAppointments = transfusionData;
      this.doctorNotes = doctorNotes;
      this.prescription = prescriptionData;
      this.services = investigationOrders;
      this.serviceAppointments = serviceAppointments;
      const history = historyData;

      // Filter everything by appointment date
      this.selectedVisit = this.doctorNotes.find(d => d.date === date) || {};
      this.selectedVitals = this.bloodGroupAppointments.find((appt: any) => appt.date === date);
      this.selectedServicePrint = this.serviceAppointments.filter((appt: any) => appt.appointmentDate === date);
      const filteredPrescription = this.prescription.filter((appt: any) => appt.prescribedDate === date);
      const filteredInvestigationOrders = this.services.filter((appt: any) => appt.date === date);
      const filteredHistory = history.find((appt: any) => appt.date === date) || {};

      const docDefinition = this.generatePdfWithPatient(
        this.patientData,
        this.selectedVitals,
        this.selectedVisit,
        filteredHistory,
        filteredPrescription,
        filteredInvestigationOrders
      );

      pdfMake.createPdf(docDefinition).open(); // or .download() or .print()
    });

  }


  generatePdfWithPatient(patient: any, vitals: any, visit: any, history: any, prescriptions: any[], filteredInvestigationOrders: any[]) {
    console.log('Generating PDF with patient data:', patient, vitals, visit, history, prescriptions);
    const patientInfo = patient;
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 100, 40, 60],

      header: function () {
        return {
          margin: [40, 20, 40, 2],
          stack: [
            {
              columns: [
                {
                  image: 'logo',
                  width: 100
                },
                {
                  width: '*',
                  alignment: 'center',
                  stack: [
                    { text: 'Rashtrotthana Hospital', fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
                    { text: 'RajaRajeshwari Nagar, Bengaluru – 560 098', fontSize: 10, margin: [0, 0, 0, 2] },
                    { text: 'Phone: 080 6923 9999', fontSize: 10, margin: [0, 0, 0, 2] },
                  ]
                }
              ]
            },
            {



              table: {
                widths: ['25%', '25%', '25%', '25%'],
                body: [
                  [
                    { text: `Name: ${patient?.name || '-'}`, fontSize: 10, margin: [5, 4], border: [true, true, true, true] },
                    { text: `PRN: ${patient?.prn || '-'}`, fontSize: 10, margin: [5, 4], border: [true, true, true, true] },
                    { text: `Age/Sex: ${patient?.age || '-'} / ${patient?.gender || '-'}`, fontSize: 10, margin: [5, 4], border: [true, true, true, true] },
                    { text: `Blood Group: ${patient?.bloodGroup || '-'}`, fontSize: 10, margin: [5, 4], border: [true, true, true, true] }
                  ]
                ]
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#aaa',
                vLineColor: () => '#aaa'
              },
              margin: [0, 5, 0, 5]


            }
          ]
        };
      },

      footer: function (currentPage: number, pageCount: number) {
        const printedDate = new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        return {
          margin: [40, 10, 40, 0],
          stack: [
            {
              text: `${currentPage} `,
              alignment: 'center',
              fontSize: 9,
              margin: [0, 0, 0, 5]
            },
            {
              canvas: [ // Draw a horizontal line
                {
                  type: 'line',
                  x1: 0,
                  y1: 0,
                  x2: 515, // full page width (adjust if needed)
                  y2: 0,
                  lineWidth: 1
                }
              ]
            },
            {
              columns: [
                {
                  text: `Printed on: ${printedDate}`,
                  alignment: 'left',
                  fontSize: 9,
                  margin: [0, 5, 0, 0]
                },
                {
                  text: `Rashtrotthana Hospital | 080 6923 9999 | RajaRajeshwari Nagar, Bengaluru – 560 098`,
                  alignment: 'right',
                  fontSize: 9,
                  margin: [0, 5, 0, 0]
                }
              ]
            }
          ]
        };
      },


      content: [
        { text: 'OPD Visit Summary:', style: 'title' },


        {
          text: 'Vitals',
          style: 'section',
          decoration: 'underline',
        },
        {
          table: {
            widths: ['auto', 'auto', 'auto', 'auto'],  // Adjust based on layout
            body: [
              [
                { text: 'Height:', bold: true }, `${vitals?.height || '-'} cm`,
                { text: 'BP:', bold: true }, `${vitals?.BPs || '-'} / ${vitals?.BPd || '-'}`
              ],
              [
                { text: 'Weight:', bold: true }, `${vitals?.weight || '-'} kg`,
                { text: 'SpO2:', bold: true }, `${vitals?.spo2 || '-'}%`
              ],
              [
                { text: 'Temp:', bold: true }, `${vitals?.temp || '-'} °F`,
                { text: 'Hb:', bold: true }, `${vitals?.hb || '-'}`
              ],
              [
                { text: 'Pulse:', bold: true }, `${vitals?.pulse || '-'}`,
                { text: 'Serum Ferritin:', bold: true }, `${vitals?.sFerritin || '-'}`
              ],
              [
                { text: 'RR:', bold: true }, `${vitals?.RR || '-'}`,
                { text: 'Blood Group', bold: true }, `${vitals?.bloodGroupName || '-'}`  // Leave the second half blank if not needed
              ]
            ]
          },
          // layout: 'noBorders',
          margin: [0, 5, 0, 10]
        },

        {
          text: 'OPD Notes:',
          style: 'section',
          decoration: 'underline',
        },
        { text: 'Chief Complaints', style: 'section' },
        { text: visit?.chiefComplaints || '-', margin: [0, 0, 0, 10] },

        { text: 'Diagnosis', style: 'section' },
        { text: visit?.diagnosis || '-', margin: [0, 0, 0, 10] },

        { text: 'General Examination', style: 'section' },
        { text: visit?.generalExamination || '-', margin: [0, 0, 0, 10] },

        { text: 'Clinical Notes', style: 'section' },
        { text: visit?.clinicalNotes || '-', margin: [0, 0, 0, 10] },

        { text: 'CVS', style: 'section' },
        { text: visit?.cvs || '-', margin: [0, 0, 0, 10] },

        { text: 'RS', style: 'section' },
        { text: visit?.rs || '-', margin: [0, 0, 0, 10] },

        { text: 'CNS', style: 'section' },
        { text: visit?.cns || '-', margin: [0, 0, 0, 10] },

        { text: 'P/A', style: 'section' },
        { text: visit?.pa || '-', margin: [0, 0, 0, 10] },


        {
          text: 'OPD History Notes:',
          style: 'section',
          decoration: 'underline',
        },
        { text: 'Medical/ Surgical History', style: 'section' },
        { text: history?.medicalHistory || '-', margin: [0, 0, 0, 10] },

        { text: 'Family History', style: 'section' },
        { text: history?.familyHistory || '-', margin: [0, 0, 0, 10] },

        { text: 'Social History', style: 'section' },
        { text: history?.socialHistory || '-', margin: [0, 0, 0, 10] },

        { text: 'Investigation Requisition', style: 'section', decoration: 'underline', margin: [0, 5, 0, 10] },

        ...filteredInvestigationOrders.map((order: any) => {
          const rows: any[] = [];

          // Add Lab Tests
          order.labTests.forEach((lab: any) => {
            rows.push(['Lab', lab.description]);
          });

          // Add Radiology Tests
          order.radiologyTests.forEach((r: any) => {
            rows.push(['Radiology', r.description]);
          });

          // Add Packages
          // order.packages.forEach((p: any) => {
          //   rows.push(['Package', p.name]);
          // });

          return [
            {
              text: `Order ID: ${order.id} | Date: ${new Date(order.date).toLocaleDateString()} | Doctor: ${order.doctorName}`,
              margin: [0, 5, 0, 5]
            },
            {
              table: {
                headerRows: 1,
                widths: ['auto', '*'],
                body: [
                  ['Type', 'Test / Package'],
                  ...rows
                ]
              },
              margin: [0, 0, 0, 10]
            }
          ];
        }).flat(),

        { text: 'Prescriptions', style: 'section', decoration: 'underline' },
        ...prescriptions.map((p: any) => ([
          { text: `Prescription ID: ${p.prescriptionId} | Date: ${new Date(p.prescribedDate).toLocaleDateString()}`, margin: [0, 10, 0, 5] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', '20%', '20%', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: [
                ['Doctor', 'Generic', 'Brand', 'Type', 'Freq', 'Duration', 'Instruction', 'Qty', 'Route'],
                ...p.tablets.map((tab: any) => [
                  p.prescribedBy,
                  tab.genericName,
                  tab.brandName,
                  tab.type || 'N/A',
                  tab.frequency,
                  tab.duration,
                  tab.instructions,
                  tab.quantity,
                  tab.route || 'N/A'
                ])
              ]
            }
          },
          {
            text: 'Prescribed By: ' + p.prescribedBy + ' | ' + p.prescribedDate + ' | ' + 'KMC#' + p.prescribedByKMC,
            margin: [0, 5, 0, 10],
            alignment: 'right',
            fontSize: 10,
          },


        ])).flat()
      ],

      images: {
        logo: 'data:image/png;base64,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O66Gxf64QEc95z6MW76xA3B4unmF9PNyg51bvdIioDvighxT0xayw66zrfW14Z6DiIiIiIiINNcCH+CAXjfm23S2tZa7p3wRmFHD6RsBtw5y/MuA9TvbWqenm86jp8tIf+fOwi3dmNLS3vEtXG0OgPNa2jvOrWMat+IeS3/+lx73QMF8XscVT92+s621XAvjcmp8PLiOMhsBv6nh2JOAIzP//k167ls1jiUiIiIiIiLzCWOtShOMVmm2yd1A1NnWOrOlvWNNYC1ca9UjgR8CH0uzVERERERERETmW8rgGMXSbJP7gGtb2jsuAt7ubGv9Ja6w5urA2zShhayIiIiIiIjISKMMjvlAS3vHwcBkYBngZWBZXNeQ49IaHyIiIiIiIiLzNQU45hMt7R0GWBgYA5SADxpRBFVERERERERkNFCAQ0RERERERERGPdXgEBEREREREZFRTwEOERERERERERn1FOAQERERERERkVFPAQ4RERERERERGfUU4BARERERERGRUU8BDhEREREREREZ9RTgEBEREREREZFRTwEOERERERERERn1FOAQERERERERkVFPAQ4RERERERERGfUU4BARERERERGRUU8BDhEREREREREZ9RTgEBEREREREZFRTwEOERERERERERn1FOAQERERERERkVFPAQ4RERERERERGfUU4BARERERERGRUU8BDhEREREREREZ9f4fDI3ZC/fwODcAAAAASUVORK5CYII='
      },

      styles: {
        header: { fontSize: 16, bold: true },
        title: { fontSize: 18, bold: true, margin: [0, 20, 0, 10] },
        section: { fontSize: 14, bold: true, margin: [0, 15, 0, 5] },
        patientInfo: { margin: [0, 10, 0, 10] }
      }
    };

    return docDefinition;
  }
  doctorNoteData: DoctorNote = {
    chiefComplaints: '',
    diagnosis: '',
    generalExamination: '',
    clinicalNotes: '',
    advice: '',
    cvs: '',
    cns: '',
    rs: '',
    pa: '',
  };

  historyData: any = {
    medicalHistory: '',
    familyHistory: '',
    socialHistory: ''
  };


  selectedService: any = null;
  showNotesPopup = false;

  noteSections = [
    { key: 'chiefComplaints', label: 'Chief Complaints' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'generalExamination', label: 'General Examination' },
    { key: 'clinicalNotes', label: 'Clinical Notes' },
    { key: 'advice', label: 'Advice' },
    { key: 'cvs', label: 'CVS' },
    { key: 'cns', label: 'CNS' },
    { key: 'rs', label: 'RS' },
    { key: 'pa', label: 'P/A' },

  ];
  historySections = [
    { key: 'medicalHistory', label: 'Medical/Surgical History' },
    { key: 'familyHistory', label: 'Family History' },
    { key: 'socialHistory', label: 'Social History' },
  ];

  // Trigger popup
  openDoctorNotes(service: any): void {
    this.selectedService = service;
    // this.showNotesPopup = true;

    // Optionally pre-fill
    this.appointmentService.getDoctorNoteByPRNAndDate(Number(service.prnNumber), service.date).subscribe({
      next: (res) => {
        this.doctorNoteData = res || {};  // If note exists, prefill
        console.log('Doctor note data:', this.doctorNoteData);
      },
      error: () => {
        this.doctorNoteData = {
          chiefComplaints: '',
          diagnosis: '',
          generalExamination: '',
          clinicalNotes: '',
          advice: '',
          cvs: '',
          cns: '',
          rs: '',
          pa: '',
        };

      }
    });
  }

  // Submit notes
  submitDoctorNotes(): void {
    this.isButtonLoading = true;
    const payload = {
      prn: Number(this.selectedService.prnNumber),
      date: this.selectedService.date,
      createdBy: this.historyData.createdBy? this.historyData.createdBy: this.doctor.id.toString(),
      updatedBy: this.doctor.id.toString(),
      ...this.doctorNoteData
    };

    if (this.doctorNoteData?.id) {
      this.appointmentService.saveDoctorNote(payload.prn, payload.date,payload.updatedBy, this.doctorNoteData).subscribe({
        next: () => {
          this.showNotesPopup = false;
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Doctor note updated successfully' });
          this.isButtonLoading = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update doctor note' });
          this.isButtonLoading = false;
        }
      });
    } else {
      // Create a new note
      this.appointmentService.createNote(payload).subscribe({
        next: () => {
          this.showNotesPopup = false;
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Doctor note created successfully' });
          this.isButtonLoading = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save doctor note' });
          this.isButtonLoading = false;
        }
      });
    }
  }

  closeNotesPopup(): void {
    // this.showNotesPopup = false;
    this.doctorNoteData = {
      chiefComplaints: '',
      diagnosis: '',
      generalExamination: '',
      clinicalNotes: '',
      advice: '',
      cvs: '',
      cns: '',
      rs: '',
      pa: '',
    };
  }
  closeHistoryPopup(): void {
    // this.showNotesPopup = false;
    this.historyData = {
      medicalHistory: '',
      familyHistory: '',
      socialHistory: ''
    };
  }
  hasAnyNotesFilled(): boolean {
    return Object.values(this.doctorNoteData).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      return !!value; // handles numbers, booleans, etc.
    });
  }
  hasAnyHistoryNotesFilled(): boolean {
    return Object.values(this.historyData).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      return !!value; // handles numbers, booleans, etc.
    });
  }
  openModal(tab: string = 'history', appointment: any) {
    this.selectedService = appointment;
    this.activeTab = tab;
    this.showModal = true;
    if (tab == 'clinical') {
      this.openDoctorNotes(this.selectedService);
    }
    if (tab == 'history') {
      this.openHistoryNotes(this.selectedService);
    }

  }

  closeModal() {
    this.showModal = false;
    this.closePrescription();
    this.addedLabTests = [];
    this.addedRadiologyTests = [];
    this.labSearchText = '';
    this.radiologySearchText = '';
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    console.log(this.activeTab)
    if (tab == 'clinical') {
      this.openDoctorNotes(this.selectedService);
      console.log(this.selectedService)
    }
    if (tab == 'history') {
      this.openHistoryNotes(this.selectedService);
    }
    if (tab == 'prescription') {
      this.openPrescriptionPopup(this.selectedService);
    }
  }
  submitHistoryNotes(): void {
    this.isButtonLoading = true;
    const payload = {
      prn: Number(this.selectedService.prnNumber),
      date: this.selectedService.date,
      createdBy: this.historyData.createdBy? this.historyData.createdBy: this.doctor.id.toString(),
      updatedBy: this.doctor.id.toString(),
      ...this.historyData
    };

    if (this.historyData?.id) {
      this.appointmentService.saveHistoryNote(payload.prn, payload.date, payload.updatedBy, this.historyData).subscribe({
        next: () => {
          this.showNotesPopup = false;
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'History updated successfully' });
          this.isButtonLoading = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update history' });
          this.isButtonLoading = false;
        }
      });
    } else {
      // Create a new note
      this.appointmentService.createHistoryNote(payload).subscribe({
        next: () => {
          this.showNotesPopup = false;
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'History created successfully' });
          this.isButtonLoading = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save history' });
          this.isButtonLoading = false;
        }
      });
    }
  }
  openHistoryNotes(service: any): void {
    this.selectedService = service;
    // this.showNotesPopup = true;

    // Optionally pre-fill
    this.appointmentService.getHistoryNoteByPRNAndDate(Number(service.prnNumber), service.date).subscribe({
      next: (res) => {
        this.historyData = res || {};  // If note exists, prefill
        console.log('Doctor note data:', this.historyData);
      },
      error: () => {
        this.historyData = {
          medicalHistory: '',
          familyHistory: '',
          socialHistory: ''
        };

      }
    });
  }
  get filteredTests() {
    const source =
      this.activeInvestigationTab === 'lab'
        ? this.allLabTests
        : this.activeInvestigationTab === 'radiology'
          ? this.allRadiologyTests
          : this.allPackages;

    return source.filter(test =>
      test.description.toLowerCase().includes(this.search.toLowerCase()) &&
      test.department?.toLowerCase().includes(this.department.toLowerCase())
    );
  }

  addTest(test: any): void {
    const list =
      this.activeInvestigationTab === 'lab'
        ? this.addedLabTests
        : this.activeInvestigationTab === 'radiology'
          ? this.addedRadiologyTests
          : this.addedPackages;

    if (!list.find((item: any) => item.id === test.id)) {
      list.push(test);
    }
  }

  saveInvestigation(): void {
    this.isButtonLoading = true;
    const payload = {
      prn: this.selectedService.prnNumber.toString(),
      doctorId: this.doctor.id,
      doctorName: this.doctor.name,
      remarks: this.investigationRemarks,
      labTests: this.addedLabTests.map(t => t.id),
      radiologyTests: this.addedRadiologyTests.map(t => t.id),
      packages: this.addedPackages.map(t => t.id),
      date: this.selectedService.date
    };

    console.log('Submit payload:', payload);
    this.appointmentService.createOrder(payload).subscribe({
      next: (res) => {
        console.log('Order saved:', res);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Investigation order saved successfully' });
        this.addedLabTests = []
        this.addedRadiologyTests = []
        this.addedPackages = []
        this.investigationRemarks = ''
        this.isButtonLoading = false;
      },
      error: (err) => {
        console.error('Error saving order:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save investigation order' });
        this.isButtonLoading = false;
      }
    });
    // Call API here...
  }
  addSelected(): void {
    if (this.activeInvestigationTab === 'lab' && this.selectedLabId !== null) {
      const lab = this.allLabTests.find(l => l.id == this.selectedLabId);
      if (lab && !this.addedLabTests.some(item => item.id == lab.id)) {
        this.addedLabTests.push(lab);
        console.log(this.addedLabTests)
      }
      this.selectedLabId = null; // 👈 reset the dropdown
      this.labSearchText = ''
    }

    if (this.activeInvestigationTab === 'radiology' && this.selectedRadiologyId !== null) {
      const rad = this.allRadiologyTests.find(r => r.id == this.selectedRadiologyId);
      if (rad && !this.addedRadiologyTests.some(item => item.id == rad.id)) {
        this.addedRadiologyTests.push(rad);
      }
      this.selectedRadiologyId = null; // 👈 reset the dropdown
      this.radiologySearchText = ''
    }

    if (this.activeInvestigationTab === 'package' && this.selectedPackageId !== null) {
      const pack = this.allPackages.find(p => p.id == this.selectedPackageId);
      if (pack && !this.addedPackages.some(item => item.id == pack.id)) {
        this.addedPackages.push(pack);
      }
      this.selectedPackageId = null; // 👈 reset the dropdown
    }
    setTimeout(() => {
      if (this.activeInvestigationTab === 'lab' && this.labInput) {
        this.labInput.nativeElement.focus();
      } else if (this.activeInvestigationTab === 'radiology' && this.radiologyInput) {
        this.radiologyInput.nativeElement.focus();
      }
    });
  }
  removeItem(item: any, type: 'lab' | 'radiology' | 'package') {
    if (type === 'lab') {
      this.addedLabTests = this.addedLabTests.filter(i => i.id !== item.id);
    } else if (type === 'radiology') {
      this.addedRadiologyTests = this.addedRadiologyTests.filter(i => i.id !== item.id);
    } else if (type === 'package') {
      this.addedPackages = this.addedPackages.filter(i => i.id !== item.id);
    }
  }

  get selectedLabDepartment(): string {
    const lab = this.allLabTests.find(l => l.id == this.selectedLabId);
    return lab?.department || '';
  }
  get selectedRadiologyDepartment(): string {
    const rad = this.allRadiologyTests.find(r => r.id == this.selectedRadiologyId);
    return rad?.department || '';
  }
  get isInvestigationEmpty(): boolean {
    return (
      this.addedLabTests.length === 0 &&
      this.addedRadiologyTests.length === 0 &&
      this.addedPackages.length === 0
    );
  }
  // Called on input
  onBrandInput(index: number): void {
    const control = this.tablets.at(index);
    const typed = control.get('brandName')?.value?.toLowerCase();

    this.filteredBrandNames[index] = typed
      ? this.brandOptions.filter(name => name.toLowerCase().includes(typed))
      : [...this.brandOptions]; // full list
    console.log(this.filteredBrandNames)
  }

  // Called when user selects a suggestion
  onBrandSelect(index: number, brand: string): void {
    this.tablets.at(index).patchValue({ brandName: brand });
    this.filteredBrandNames[index] = [];
    this.showBrandSuggestions[index] = false;
    this.onBrandBlur(index); // existing logic to fetch/create tablet
  }

  // Optionally delay hiding so mousedown can register
  hideBrandSuggestionsWithDelay(index: number): void {
    setTimeout(() => {
      this.showBrandSuggestions[index] = false;
      this.filteredBrandNames[index] = [];
      this.onBrandBlur(index);
    }, 200);
  }
  onBrandEnter(index: number): void {
    this.showBrandSuggestions[index] = false;
    this.onBrandBlur(index);
  }
  onFavBrandInput(index: number): void {
    const control = this.favorites.at(index);
    const typed = control.get('brandName')?.value?.toLowerCase();

    this.filteredFavBrandNames[index] = typed
      ? this.brandOptions.filter(name => name.toLowerCase().includes(typed))
      : [...this.brandOptions]; // full list
    console.log(this.filteredFavBrandNames)
  }

  // Called when user selects a suggestion
  onFavBrandSelect(index: number, brand: string): void {
    this.favorites.at(index).patchValue({ brandName: brand });
    this.filteredFavBrandNames[index] = [];
    this.showFavBrandSuggestions[index] = false;
    this.onFavBrandBlur(index);
  }

  // Optionally delay hiding so mousedown can register
  hideFavBrandSuggestionsWithDelay(index: number): void {
    setTimeout(() => {
      this.showFavBrandSuggestions[index] = false;
      this.filteredFavBrandNames[index] = [];
      this.onFavBrandBlur(index);
    }, 200);
  }
  onFavBrandEnter(index: number): void {
    this.showFavBrandSuggestions[index] = false;
    this.onFavBrandBlur(index);
  }
  // Lab
labSearchText = '';
showLabSuggestions = false;
filteredLabTests: any[] = [];

onLabSearchChange() {
  this.filteredLabTests = this.allLabTests.filter(t =>
    t.description.toLowerCase().includes(this.labSearchText.toLowerCase())
  );
}

hideLabSuggestionsWithDelay() {
  setTimeout(() => this.showLabSuggestions = false, 200);
}

selectLabTest(test: any) {
  this.selectedLabId = test.id;
  this.labSearchText = test.description;
  // this.selectedLabDepartment = test.department || '';
  this.showLabSuggestions = false;
}


// Radiology
radiologySearchText = '';
showRadiologySuggestions = false;
filteredRadiologyTests: any[] = [];
// selectedRadiologyId: number | null = null;
// selectedRadiologyDepartment = '';

onRadiologySearchChange() {
  this.filteredRadiologyTests = this.allRadiologyTests.filter(t =>
    t.description.toLowerCase().includes(this.radiologySearchText.toLowerCase())
  );
}

hideRadiologySuggestionsWithDelay() {
  setTimeout(() => this.showRadiologySuggestions = false, 200);
}

selectRadiologyTest(test: any) {
  this.selectedRadiologyId = test.id;
  this.radiologySearchText = test.description;
  // this.selectedRadiologyDepartment = test.department || '';
  this.showRadiologySuggestions = false;
}


handleLabBlur(): void {
  setTimeout(() => {
    this.showLabSuggestions = false;

    const existing = this.allLabTests.find(t =>
      t.description.toLowerCase() === this.labSearchText.toLowerCase()
    );

    if (existing) {
      this.selectLabTest(existing);
    } else if (this.labSearchText.trim()) {
      const payload = {
        description: this.labSearchText.trim(),
        department: this.selectedLabDepartment,
        type: this.activeInvestigationTab as 'lab' | 'radiology'
      };
      this.appointmentService.addLabTest(payload).subscribe(newTest => {
        this.allLabTests.push(newTest);
        this.selectLabTest(newTest);
      });
    }
  }, 200);
}
handleRadiologyBlur(): void {
  setTimeout(() => {
    this.showRadiologySuggestions = false;

    const existing = this.allRadiologyTests.find(t =>
      t.description.toLowerCase() === this.radiologySearchText.toLowerCase()
    );

    if (existing) {
      this.selectRadiologyTest(existing);
    } else if (this.radiologySearchText.trim()) {
      const payload = {
        description: this.radiologySearchText.trim(),
        department: this.selectedRadiologyDepartment,
        type: this.activeInvestigationTab as 'lab' | 'radiology'
      };
      this.appointmentService.addRadiologyTest(payload).subscribe(newTest => {
        this.allRadiologyTests.push(newTest);
        this.selectRadiologyTest(newTest);
      });
    }
  }, 200);
}
highlightedLabIndex = -1;

handleLabKeydown(event: KeyboardEvent) {
  const length = this.filteredLabTests.length;

  if (!length) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      this.highlightedLabIndex = (this.highlightedLabIndex + 1) % length;
      break;

    case 'ArrowUp':
      event.preventDefault();
      this.highlightedLabIndex =
        (this.highlightedLabIndex - 1 + length) % length;
      break;

    case 'Enter':
      event.preventDefault();
      if (this.highlightedLabIndex >= 0 && this.highlightedLabIndex < length) {
        const selected = this.filteredLabTests[this.highlightedLabIndex];
        this.selectLabTest(selected);
        this.highlightedLabIndex = -1;
        this.showLabSuggestions = false;
      }
      break;

    case 'Escape':
      this.showLabSuggestions = false;
      this.highlightedLabIndex = -1;
      break;
  }
}
ngAfterViewChecked() {
  this.scrollHighlightedIntoView();
}

scrollHighlightedIntoView() {
  if (this.labOptions && this.highlightedLabIndex >= 0) {
    const el = this.labOptions.toArray()[this.highlightedLabIndex];
    if (el) {
      el.nativeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}
highlightedRadiologyIndex = -1;

handleRadiologyKeydown(event: KeyboardEvent) {
  const length = this.filteredRadiologyTests.length;

  if (!length) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      this.highlightedRadiologyIndex = (this.highlightedRadiologyIndex + 1) % length;
      break;

    case 'ArrowUp':
      event.preventDefault();
      this.highlightedRadiologyIndex =
        (this.highlightedRadiologyIndex - 1 + length) % length;
      break;

    case 'Enter':
      event.preventDefault();
      if (this.highlightedRadiologyIndex >= 0 && this.highlightedRadiologyIndex < length) {
        const selected = this.filteredRadiologyTests[this.highlightedRadiologyIndex];
        this.selectRadiologyTest(selected);
        this.highlightedRadiologyIndex = -1;
        this.showRadiologySuggestions = false;
      }
      break;

    case 'Escape':
      this.showRadiologySuggestions = false;
      this.highlightedRadiologyIndex = -1;
      break;
  }

  // Scroll the item into view
  setTimeout(() => this.scrollRadiologyHighlightedIntoView(), 0);
}

scrollRadiologyHighlightedIntoView() {
  if (this.radiologyOptions && this.highlightedRadiologyIndex >= 0) {
    const el = this.radiologyOptions.toArray()[this.highlightedRadiologyIndex];
    if (el) {
      el.nativeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}
onQuantityKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Tab' && index === this.tablets.length - 1) {
    // Prevent default tab to manually handle focus
    event.preventDefault();
    this.addTablet();

    // Wait a tick for the form array to render the new row
    setTimeout(() => {
      const nextGenericInput = document.querySelector(`#generic-${this.tablets.length - 1}`) as HTMLElement;
      if (nextGenericInput) {
        nextGenericInput.focus();
      }
    });
  }
}
highlightedBrandIndex: number[] = [];

onBrandKeydown(event: KeyboardEvent, rowIndex: number) {
  const list = this.filteredBrandNames[rowIndex] || [];
  const length = list.length;

  if (!length) return;

  // Initialize if undefined
  if (this.highlightedBrandIndex[rowIndex] === undefined) {
    this.highlightedBrandIndex[rowIndex] = -1;
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      this.highlightedBrandIndex[rowIndex] = (this.highlightedBrandIndex[rowIndex] + 1) % length;
      break;

    case 'ArrowUp':
      event.preventDefault();
      this.highlightedBrandIndex[rowIndex] = (this.highlightedBrandIndex[rowIndex] - 1 + length) % length;
      break;

    case 'Enter':
      event.preventDefault();
      const index = this.highlightedBrandIndex[rowIndex];
      if (index >= 0 && index < list.length) {
        this.onBrandSelect(rowIndex, list[index]);
        this.highlightedBrandIndex[rowIndex] = -1;
        this.showBrandSuggestions[rowIndex] = false;
      }
      break;

    case 'Escape':
      this.showBrandSuggestions[rowIndex] = false;
      this.highlightedBrandIndex[rowIndex] = -1;
      break;
  }

  // Optional: Scroll the selected item into view
  setTimeout(() => this.scrollBrandItemIntoView(rowIndex), 0);
}
@ViewChildren('brandOption', { read: ElementRef }) brandOptionElements!: QueryList<ElementRef>;


scrollBrandItemIntoView(rowIndex: number) {
  const index = this.highlightedBrandIndex[rowIndex];
  const element = document.getElementById(`brand-option-${rowIndex}-${index}`);
  if (element) {
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
selectedFile: File | null = null;
previewUrl: string | ArrayBuffer | null = null;

onFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) {
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.previewUrl = e.target?.result ?? null; // 👈 Safe null fallback
    };
    reader.readAsDataURL(file);
  }
}


uploadSignature(): void {
  if (!this.selectedFile) {
    this.messageService.add({ severity: 'warn', summary: 'No File', detail: 'Please select an image to upload.' });
    return;
  }

  const doctorId = this.doctor.id; // or from selectedDoctor if editing

  this.doctorService.uploadDoctorSignature(doctorId, this.selectedFile).subscribe({
    next: (response) => {
      this.messageService.add({ severity: 'success', summary: 'Uploaded', detail: 'Signature uploaded successfully!' });
      console.log('✅ Upload response:', response);
      this.doctor.signUrl = response.fileUrl; // Update model if needed
      this.previewUrl = response.fileUrl;
      this.showSignatureModel = false;
    },
    error: (err) => {
      console.error('❌ Upload failed:', err);
      this.messageService.add({ severity: 'error', summary: 'Upload Failed', detail: 'Something went wrong during upload.' });
    }
  });
}

openSignatureModal(){
  this.showSignatureModel = true;
}
}
