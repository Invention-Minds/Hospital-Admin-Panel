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
import { NotificationRecipientService } from '../../../services/notification-recipient.service';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { PrescriptionService } from '../../../services/prescription/prescription.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { getJmrhPdfBranding, JmrhPdfBranding } from '../../../shared/pdf/jmrh-letterhead';
import { keepHeadingsWithContent, OPD_ASSESSMENT_PDF_STYLES } from '../../../shared/pdf/opd-assessment-pdf';
import { buildSavedVisitSummaryContent, resolveVisitRecords } from '../../../shared/pdf/opd-visit-summary-pdf';
import { forkJoin, Subscription } from 'rxjs';
import { app } from '../../../../../server';
import { HealthCheckupServiceService } from '../../../services/health-checkup/health-checkup-service.service';
import { AlertService } from '../../../services/alert.service';
import {
  FieldDef,
  NoteTemplate,
  NoteTemplateService,
} from '../../../services/note-template.service';

/** Viewport coordinates for a position:fixed suggestion list. */
interface SuggestPos {
  top: number;
  left: number;
  width: number;
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
  // Priority feature (in-memory + SSE — not persisted in appointments table)
  priority?: 'normal' | 'critical' | 'emergency' | 'staff' | 'vip' | 'senior' | 'disabled';
  priorityReason?: string;
  prioritySetBy?: string;
  prioritySetAt?: string;
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

  /** Leave-request admin recipients — DB-managed (today_consultation_admin group);
   *  falls back to the previously-hardcoded list until the recipients table is seeded. */
  adminLeavePhones: string[] = ["919880544866", "919341227264", "918904943673", "918951243004", "919633943037"];

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService, private cdRef: ChangeDetectorRef, private eventService: EventService, private estimationService: EstimationService, private channelService: ChannelService, private fb: FormBuilder, private prescriptionService: PrescriptionService,
    private healthCheckupService: HealthCheckupServiceService,  // Inject NoSleep service
    private noteTemplateService: NoteTemplateService,
    private alertSvc: AlertService,
    private recipientsSvc: NotificationRecipientService,
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
  sendingWhatsapp: boolean = false; // OPD visit-summary WhatsApp send in progress
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

  // ─── Note-template integration (doctor manual notes) ─────────────────
  // Active templates for the current doctor's department, loaded when the
  // notes popup opens. Picking one swaps the legacy fixed sections for the
  // dynamic renderer; backend snapshots the field defs at save-time so the
  // saved row prints identically forever.
  availableNoteTemplates: NoteTemplate[] = [];
  selectedNoteTemplateId = '';
  noteTemplateValues: Record<string, unknown> = {};
  activeNoteTemplateFields: FieldDef[] = [];
  loadingNoteTemplates = false;

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
  /**
   * Clinical Notes (the DoctorNote capture screen) was retired: it collected
   * the same clinical content as the OPD assessment form, with a second set of
   * templates ('opd-doctor' vs 'opd-handwritten') into a second table — two
   * places to write one note. The OPD assessment form is now the single
   * capture surface.
   *
   * NOTHING is deleted. The tab entry below is commented out, the panel markup
   * is kept behind this flag, and every doctor-note method + saved record is
   * untouched — past notes still show in Patient Records, patient-info and the
   * visit-summary PDF. Flip this to true to bring the tab back.
   */
  readonly showLegacyClinicalNotes = false;

  tabs = [
    { key: 'history', label: 'History' },
    // { key: 'clinical', label: 'Clinical Notes' },  // retired — see showLegacyClinicalNotes
    { key: 'prescription', label: 'Prescription' },
    { key: 'investigation', label: 'Investigation' },
  ];

  /**
   * Ophthalmology-only tab. Gated on the department NAME rather than a numeric
   * id so it survives environments where department ids differ.
   */
  get isOphthalmologyDept(): boolean {
    const dept = (this.doctor?.departmentName || this.currentDepartmentName || '')
      .toLowerCase().replace(/[^a-z]/g, '');
    // Accepts "Ophthalmology" and the common "Opthalmology" misspelling.
    return dept.includes('ophthalm') || dept.includes('opthalm');
  }
  showOpdModal = false;
  // Quick-access modals — the same investigation-order grid + prescription
  // capture that live inside the OPD form, opened directly from the row.
  showInvestigationModal = false;
  showPrescriptionModal = false;
  showSignatureModel = false;

  deptId: number = 0;

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
  private leaveRequestSub?: Subscription;
  // Method to handle sorting by a specific column
  ngOnInit() {
    this.checkScreenSize();
    this.loadDepartments();
    this.loadDoctors();
    // Leave-request admin recipients from DB (best-effort; needs an auth token).
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      this.recipientsSvc.phones('today_consultation_admin').subscribe({
        next: (res) => { if (res.phones?.length) this.adminLeavePhones = res.phones; },
        error: () => {},
      });
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;

    // console.log('Setting isLoading to true');
    this.isLoading = true; // Start loading indicator
    this.userId = localStorage.getItem('userid') || '0'
    this.leaveRequestSub = this.appointmentService.leaveRequest$.subscribe(() => {
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
    });

    // Priority push from nurses — instant in-place update without refetch
    this.eventSource.addEventListener('priorityUpdate', (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        this.applyPriorityUpdate(payload);
      } catch (e) {
        console.error('priorityUpdate parse failed', e);
      }
    });

  }
  loadDoctorData() {
    this.doctorService.getDoctorByUserId(this.userId).subscribe(
      (response) => {
        this.doctor = response;
        console.log(this.doctor)
        this.doctorId = response.id;
        this.deptId = response.departmentId;
        localStorage.setItem('deptId', this.deptId.toString());
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
    this.eventSource?.close();
    this.eventSource = null;
    this.leaveRequestSub?.unsubscribe();
    Object.values(this.timerIntervals).forEach((id: any) => clearInterval(id));
    this.timerIntervals = {};
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
        this.confirmedAppointments = appointments
        this.filteredAppointments = this.confirmedAppointments;
        console.log(`Fetched ${appointments.length} appointments for doctor ID ${doctorId}`);
        this.startTimers();
        this.completedAppointments = this.filteredAppointments.filter(appointment => !appointment.checkedOut || (!appointment.checkedOut && !appointment.isCloseOPD))
        this.applySortWithPriority();
        this.filterAppointmentsByDate(new Date());
        this.mergeTodayPriorities();   // overlay any in-memory priorities
        this.isLoading = false;
      },
      (error) => {
        console.error(`Error fetching appointments for doctor ${doctorId!}:`, error);
        this.isLoading = false
      }
    );
  }

  // Priority order — lower number means higher priority (sorts first)
  private readonly priorityRank: { [k: string]: number } = {
    critical: 1, emergency: 2, vip: 3, staff: 4, senior: 5, disabled: 6, normal: 9
  };

  private applySortWithPriority(): void {
    this.filteredAppointments.sort((a, b) => {
      // 1. Finished consultations → bottom
      if (a.endConsultation && !b.endConsultation) return 1;
      if (!a.endConsultation && b.endConsultation) return -1;

      // 2. Priority patients rise to top (critical first)
      const rA = this.priorityRank[a.priority || 'normal'] ?? 9;
      const rB = this.priorityRank[b.priority || 'normal'] ?? 9;
      if (rA !== rB) return rA - rB;

      // 3. Sort by appointment time
      return this.parseTimeToMinutes(a.time) - this.parseTimeToMinutes(b.time);
    });
  }

  private mergeTodayPriorities(): void {
    this.appointmentService.getTodayPriorities().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        const map = new Map<number, any>();
        list.forEach((p: any) => map.set(p.appointmentId, p));
        this.confirmedAppointments.forEach(a => {
          const p = map.get(a.id!);
          if (p) {
            a.priority = p.priority;
            a.priorityReason = p.reason;
            a.prioritySetBy = p.setBy;
            a.prioritySetAt = p.setAt;
          }
        });
        this.applySortWithPriority();
      },
      error: () => { /* priorities are optional — silent fail is fine */ }
    });
  }

  // Called when a priority SSE event arrives
  applyPriorityUpdate(payload: { appointmentId: number; priority: string; reason?: string; setBy?: string; setAt?: string }): void {
    const appt = this.confirmedAppointments.find(a => a.id === payload.appointmentId);
    if (!appt) return;
    const wasNormal = !appt.priority || appt.priority === 'normal';
    appt.priority = payload.priority as any;
    appt.priorityReason = payload.reason;
    appt.prioritySetBy = payload.setBy;
    appt.prioritySetAt = payload.setAt;
    this.applySortWithPriority();
    if (wasNormal && payload.priority !== 'normal') {
      this.playPriorityAlert(payload.priority);
      this.messageService.add({
        severity: payload.priority === 'critical' ? 'error' : 'warn',
        summary: `${payload.priority.toUpperCase()} — ${appt.patientName}`,
        detail: payload.reason || 'New priority patient — please review',
        life: 8000
      });
    }
  }

  private priorityAudio: HTMLAudioElement | null = null;
  private playPriorityAlert(priority: string): void {
    try {
      if (!this.priorityAudio) {
        this.priorityAudio = new Audio('/assets/sounds/priority-alert.mp3');
        this.priorityAudio.volume = 0.6;
      }
      this.priorityAudio.currentTime = 0;
      this.priorityAudio.play().catch(() => { /* autoplay blocked — fine */ });
    } catch { /* ignore audio errors */ }
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

    // Clear priority badge once doctor starts consultation
    if (appointment.priority && appointment.priority !== 'normal' && appointment.id) {
      this.appointmentService.clearAppointmentPriority(appointment.id).subscribe({
        next: () => {
          appointment.priority = 'normal';
          appointment.priorityReason = undefined;
          appointment.prioritySetBy = undefined;
          appointment.prioritySetAt = undefined;
          this.applySortWithPriority();
        },
        error: (err) => console.error('Failed to clear priority', err)
      });
    }

    // Broadcast cross-browser so TVs on separate devices announce next patient.
    // No channelId passed — each TV checks its own doctor list to decide if it should announce.
    // (A doctor can be assigned to multiple channels via DoctorAssignment table.)
    if (appointment.id && this.doctorId) {
      this.appointmentService.notifyConsultationStart({
        doctorId: this.doctorId,
        appointmentId: appointment.id,
        patientName: appointment.patientName,
        doctorName: this.doctor?.name
      }).subscribe({
        next: () => console.log('📡 Consultation start broadcast sent'),
        error: (err: any) => console.error('Broadcast failed', err)
      });
    }

    if (appointment.postPond === true) {
      appointment.postPond = false
    }
    if (
      appointment.patientType === 'New' &&
      !(appointment.type === 'followUp') &&
      !appointment.isfollowup
    ) {
      this.followUp(appointment)
    }
    const { expanded, ...updatedAppointment } = appointment;
    this.appointmentService.updateAppointment(updatedAppointment);

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
    this.appointmentService.sendFollowUpMessage({
      patientName: appointment.patientName,
      prefix: appointment.prefix,
      phoneNumber: appointment.phoneNumber,
      doctorName: appointment.doctorName
    }).subscribe({
      next: () => console.log('Follow-up WhatsApp sent'),
      error: (err) => console.error('WhatsApp failed', err)
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
    // Old hardcoded recipients (kept for reference; now DB-managed via today_consultation_admin):
    // const adminPhoneNumber = ["919880544866", "919341227264", "918904943673", "918951243004", "919633943037"];
    const adminPhoneNumber = this.adminLeavePhones;
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
        this.alertSvc.show('Error submitting leave request. Please try again.', { severity: 'danger', title: 'Error' });
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
      isFavorite: [false], // <-- add this
      freqCustom: [false], durCustom: [false], // UI-only: custom freq/duration toggle
    }));

    this.filteredBrandOptions.push([]);
    // Ensure per-row filtered suggestion state
    console.log(this.brandOptions);
    this.brandOptions = this.allTablets.map((b: any) => b.brandName)
    this.filteredBrandNames.push([...this.brandOptions]); // default to full list
  }

  // ─── Quantity auto-calc + custom frequency/duration ─────────────────────
  // Quantity = (doses/day summed from the frequency pattern) × (days from the
  // duration). Non-numeric patterns (Stat / SOS / Daily …) can't be quantified,
  // so quantity is left for manual entry there.

  /** "1-0-1"→2, "1/2-0-1/2"→1, "5ml-5ml-5ml"→15; null if any token is non-numeric. */
  private parseFrequencyPerDay(freq: any): number | null {
    if (freq == null) return null;
    const f = String(freq).trim().toLowerCase();
    if (!f) return null;
    let total = 0;
    let counted = 0;
    for (const raw of f.split('-')) {
      const p = raw.replace(/\b(ml|tab|tabs|tsp|cap|caps|drops?|units?|puffs?)\b/gi, '').trim();
      if (p === '') continue;
      let val: number;
      if (p.includes('/')) {
        const [n, d] = p.split('/').map((x) => Number(x));
        if (!isFinite(n) || !isFinite(d) || d === 0) return null;
        val = n / d;
      } else {
        val = Number(p);
        if (!isFinite(val)) return null;
      }
      total += val;
      counted++;
    }
    return counted > 0 ? total : null;
  }

  /** First number in the duration ("3 days"→3, "7"→7, "Daily"→null). */
  private parseDurationDays(dur: any): number | null {
    if (dur == null) return null;
    const m = String(dur).match(/\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }

  /** Recompute a row's quantity from frequency × duration, when both parse. */
  computeQuantity(index: number): void {
    const row = this.tablets.at(index);
    if (!row) return;
    const perDay = this.parseFrequencyPerDay(row.get('frequency')?.value);
    const days = this.parseDurationDays(row.get('duration')?.value);
    if (perDay != null && days != null) {
      row.get('quantity')?.setValue(Math.round(perDay * days * 100) / 100);
    }
  }

  onFrequencyChange(index: number): void {
    const row = this.tablets.at(index);
    if (row.get('frequency')?.value === '__custom__') {
      row.get('freqCustom')?.setValue(true);
      row.get('frequency')?.setValue('');
      return;
    }
    this.computeQuantity(index);
  }
  revertFrequency(index: number): void {
    const row = this.tablets.at(index);
    row.get('freqCustom')?.setValue(false);
    row.get('frequency')?.setValue('');
    this.computeQuantity(index);
  }

  onDurationChange(index: number): void {
    const row = this.tablets.at(index);
    if (row.get('duration')?.value === '__custom__') {
      row.get('durCustom')?.setValue(true);
      row.get('duration')?.setValue('');
      return;
    }
    this.computeQuantity(index);
    this.relabelPhases(index); // day ranges of a taper shift with the durations
  }
  revertDuration(index: number): void {
    const row = this.tablets.at(index);
    row.get('durCustom')?.setValue(false);
    row.get('duration')?.setValue('');
    this.computeQuantity(index);
    this.relabelPhases(index);
  }

  /** Custom-typed duration: recompute quantity and the taper day ranges. */
  onCustomDurationInput(index: number): void {
    this.computeQuantity(index);
    this.relabelPhases(index);
  }

  removeTablet(index: number) {
    this.tablets.removeAt(index);               // Remove the tablet form control
    this.filteredBrandOptions.splice(index, 1); // Remove the corresponding brand options
    this.filteredBrandNames.splice(index, 1);
    this.showBrandSuggestions.splice(index, 1);
    this.highlightedBrandIndex.splice(index, 1);
    this.brandPopupPos.splice(index, 1);
    this.dropGenericSuggestionState('tablets', index);
    // The removed row may have been mid-taper — relabel what's left.
    if (index > 0) this.relabelPhases(Math.min(index - 1, this.tablets.length - 1));
  }

  // ─── Phased / tapering regimens ──────────────────────────────────────────
  // Psychiatry (and steroid/benzo tapers generally) prescribe the same drug in
  // consecutive stages: 1-0-1 for a week, then 0-0-1 for a week, and so on.
  // Each stage is its own drug row — the schema already allows the same drug
  // more than once in a prescription — and the day range is written into the
  // Instruction column so it prints, dispenses and reads correctly with no
  // schema change. Rows of one regimen are kept adjacent; the labels are
  // recomputed whenever a duration in the block changes.

  /** Indices of the contiguous run of rows sharing this row's generic+brand. */
  private phaseBlock(index: number): number[] {
    const keyAt = (i: number) => {
      const row = this.tablets.at(i);
      const generic = String(row?.get('genericName')?.value ?? '').trim().toLowerCase();
      const brand = String(row?.get('brandName')?.value ?? '').trim().toLowerCase();
      return `${generic}|${brand}`;
    };
    if (index < 0 || index >= this.tablets.length) return [];
    const key = keyAt(index);
    let start = index;
    while (start > 0 && keyAt(start - 1) === key) start--;
    let end = index;
    while (end < this.tablets.length - 1 && keyAt(end + 1) === key) end++;
    const block: number[] = [];
    for (let i = start; i <= end; i++) block.push(i);
    return block;
  }

  /** Matches a label this code wrote, so relabelling stays idempotent. */
  private static readonly PHASE_LABEL = /^(?:then\s+)?(?:days?\s+\d+(?:\s*[–-]\s*\d+)?|phase\s+\d+)\s*(?:·\s*)?/i;

  private stripPhaseLabel(value: any): string {
    return String(value ?? '').replace(TodayConsultationsComponent.PHASE_LABEL, '').trim();
  }

  /** Add the next stage of the drug on `index`, directly below its block. */
  addPhase(index: number): void {
    const source = this.tablets.at(index);
    if (!source) return;
    const genericName = source.get('genericName')?.value;
    const brandName = source.get('brandName')?.value;
    if (!genericName && !brandName) {
      this.messageService.add({
        severity: 'warn', summary: 'Pick a drug first',
        detail: 'Choose the generic or brand on this row before adding a phase.',
      });
      return;
    }
    const block = this.phaseBlock(index);
    const insertAt = (block.length ? block[block.length - 1] : index) + 1;
    this.tablets.insert(insertAt, this.fb.group({
      genericName: [genericName],
      brandName: [brandName],
      frequency: [''],
      duration: [''],
      instructions: [''],
      quantity: [''],
      isFavorite: [false],
      freqCustom: [false],
      durCustom: [false],
    }));
    // Keep the per-row UI state lined up with the new row.
    this.filteredBrandOptions.splice(insertAt, 0, this.filteredBrandOptions[index] ?? []);
    this.filteredBrandNames.splice(insertAt, 0, []);
    this.showBrandSuggestions.splice(insertAt, 0, false);
    this.highlightedBrandIndex.splice(insertAt, 0, -1);
    this.brandPopupPos.splice(insertAt, 0, { top: 0, left: 0, width: 0 });
    this.insertGenericSuggestionState('tablets', insertAt);
    this.relabelPhases(insertAt);
  }

  /** Rewrite the day-range labels for the whole regimen `index` belongs to.
   *  Day ranges are used when every stage has a numeric duration; otherwise the
   *  stages fall back to "Phase n" so a "Till Review"/"SOS" stage still reads
   *  in order. Doctor-typed text after the label is preserved. */
  private relabelPhases(index: number): void {
    const block = this.phaseBlock(index);
    if (!block.length) return;
    const instructionOf = (i: number) => this.tablets.at(i)?.get('instructions');
    // A lone row isn't a regimen — drop any label left over from a removal.
    if (block.length < 2) {
      const control = instructionOf(block[0]);
      control?.setValue(this.stripPhaseLabel(control.value), { emitEvent: false });
      return;
    }
    const spans = block.map((i) => this.parseDurationDays(this.tablets.at(i)?.get('duration')?.value));
    const useDayRanges = spans.every((d) => d != null && d > 0);
    let day = 1;
    block.forEach((rowIndex, stage) => {
      const control = instructionOf(rowIndex);
      if (!control) return;
      const rest = this.stripPhaseLabel(control.value);
      let label: string;
      if (useDayRanges) {
        const span = spans[stage] as number;
        const from = day;
        const to = day + span - 1;
        day = to + 1;
        label = from === to ? `Day ${from}` : `Days ${from}–${to}`;
      } else {
        label = `Phase ${stage + 1}`;
      }
      if (stage > 0) label = `then ${label}`;
      control.setValue(rest ? `${label} · ${rest}` : label, { emitEvent: false });
    });
  }

  /** True when this row continues the regimen of the row above it. */
  isPhaseContinuation(index: number): boolean {
    const block = this.phaseBlock(index);
    return block.length > 1 && block[0] !== index;
  }


  /** Keep the generic-search state aligned with the rows after a removal. */
  private dropGenericSuggestionState(list: string, index: number): void {
    this.filteredGenericNames[list].splice(index, 1);
    this.showGenericSuggestions[list].splice(index, 1);
    this.highlightedGenericIndex[list].splice(index, 1);
  }

  save() {
    // Strip UI-only flags (freqCustom/durCustom drive the custom text toggle).
    const rawForm = this.form.value;
    const payload = {
      ...rawForm,
      tablets: (rawForm.tablets || []).map((t: any) => {
        const { freqCustom, durCustom, ...rest } = t;
        return rest;
      }),
    };
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
    this.insertGenericSuggestionState('favorites', 0); // rows are inserted at the top
  }

  /** Rows inserted mid-list shift the generic-search state along with them. */
  private insertGenericSuggestionState(list: string, index: number): void {
    this.filteredGenericNames[list].splice(index, 0, []);
    this.showGenericSuggestions[list].splice(index, 0, false);
    this.highlightedGenericIndex[list].splice(index, 0, -1);
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
            this.filteredFavBrandNames.splice(index, 1)
            this.dropGenericSuggestionState('favorites', index);
            this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Favorite removed from DB' });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete favorite' });
          }
        });
      } else {
        this.favorites.removeAt(index); // fallback
        this.filteredBrandOptionsFavorites.splice(index, 1); // keep it in sync
        this.filteredFavBrandNames.splice(index, 1)
        this.dropGenericSuggestionState('favorites', index);
        // this.filteredBrandOptions.splice(index, 1); // keep it in sync
      }

    } else {
      // New entry not saved yet, just remove from the form
      this.favorites.removeAt(index);
      this.filteredBrandOptionsFavorites.splice(index, 1); // keep it in sync
      this.filteredFavBrandNames.splice(index, 1);
      this.dropGenericSuggestionState('favorites', index);
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
      this.resetGenericSuggestionState('favorites');

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
      this.resetGenericSuggestionState('allergies');
    });
  }

  /** Wipe the generic-search state when a list is rebuilt from scratch. */
  private resetGenericSuggestionState(list: string): void {
    this.filteredGenericNames[list] = [];
    this.showGenericSuggestions[list] = [];
    this.highlightedGenericIndex[list] = [];
  }

  addAllergy() {
    this.allergies.insert(0, this.fb.group({
      genericName: ['']
    }));
    this.insertGenericSuggestionState('allergies', 0);
  }


  removeAllergies(index: number) {
    const allergy = this.allergies.at(index).value;
    if (allergy?.id) {
      this.prescriptionService.deleteAllergy(allergy.id).subscribe(() => {
        this.messageService.add({ severity: 'info', summary: 'Deleted', detail: 'Allergy removed' });
        this.allergies.removeAt(index);
        this.dropGenericSuggestionState('allergies', index);
      });
    } else {
      this.allergies.removeAt(index);
      this.dropGenericSuggestionState('allergies', index);
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
      isFavorite: [values.isFavorite],
      freqCustom: [false], durCustom: [false],
    }));
    this.computeQuantity(this.tablets.length - 1);
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
      isFavorite: [true],
      freqCustom: [false], durCustom: [false],
    }));
    // Get the index of the new tablet just added
    const tabletIndex = this.tablets.length - 1;
    this.computeQuantity(tabletIndex);

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

      // Filter everything by appointment date
      this.selectedVisit = this.doctorNotes.find(d => d.date === date) || {};
      this.selectedVitals = this.bloodGroupAppointments.find((appt: any) => appt.date === date);
      this.selectedServicePrint = this.serviceAppointments.filter((appt: any) => appt.appointmentDate === date);

      // Same document the patient receives on WhatsApp.
      this.buildVisitSummaryDocDefinition(data, res).then((docDefinition) => {
        pdfMake.createPdf(docDefinition).open(); // or .download() or .print()
      });
    });
  }

  /**
   * The OPD visit-summary PDF for one appointment — shared by the Print icon
   * and the WhatsApp send, so the patient receives exactly what the doctor
   * prints. `res` is the getDetailsByPRN response for the visit's patient.
   *
   * A visit with an OPD assessment (the form doctors use now) is built by the
   * shared saved-visit builder, the same body as the patient module's
   * "Print Full OPD Summary". Older doctor-note-only visits keep the legacy
   * layout — otherwise their notes would print blank. Both go on the
   * visit-summary letterhead.
   */
  private async buildVisitSummaryDocDefinition(data: any, res: any): Promise<any> {
    const { date } = data;
    const brand = await getJmrhPdfBranding();

    // Keyed on the appointment id so two same-day visits in different
    // departments don't pick up each other's assessment.
    const { assessment, eyeRecord } = resolveVisitRecords({
      assessments: res?.opdAssessments ?? [],
      eyeRecords: res?.ophthalmologyPrescriptions ?? [],
      date,
      appointmentId: data?.id ?? null,
    });
    const prescriptions = (res?.prescriptionData ?? []).filter((p: any) => p.prescribedDate === date);
    const investigationOrders = (res?.investigationOrders ?? []).filter((o: any) => o.date === date);

    if (assessment) {
      return {
        pageSize: 'A4',
        pageMargins: brand.pageMargins,
        background: brand.background,
        images: brand.images,
        footer: brand.footer,
        content: buildSavedVisitSummaryContent({
          assessment,
          eyeRecord,
          prescriptions,
          investigationOrders,
          fallbackPatientName: res?.patientData?.name || data?.patientName,
        }),
        styles: OPD_ASSESSMENT_PDF_STYLES,
        pageBreakBefore: keepHeadingsWithContent,
      };
    }

    return this.generatePdfWithPatient(
      res?.patientData,
      (res?.appointments ?? []).find((a: any) => a.date === date),
      (res?.doctorNotes ?? []).find((d: any) => d.date === date) || {},
      (res?.historyData ?? []).find((h: any) => h.date === date) || {},
      prescriptions,
      investigationOrders,
      brand,
    );
  }

  /**
   * Send the visit summary to the patient on WhatsApp — the same PDF as the
   * Print icon (buildVisitSummaryDocDefinition). Only the visit is sent to the
   * backend; it picks the recipient from the registered patient record, so the
   * doctor can't mistype or redirect the number.
   */
  sendVisitSummaryWhatsApp(data: any): void {
    if (this.sendingWhatsapp) return;
    const { id, date, prnNumber } = data || {};
    if (!id || !prnNumber || !date) {
      this.messageService.add({ severity: 'warn', summary: 'Missing info', detail: 'PRN or visit date not found.' });
      return;
    }

    const fail = (detail: string, err?: unknown) => {
      this.sendingWhatsapp = false;
      if (err) console.error('send visit summary error', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    };

    this.sendingWhatsapp = true;
    this.appointmentService.getDetailsByPRN(prnNumber).subscribe({
      next: (res: any) => {
        this.buildVisitSummaryDocDefinition(data, res)
          .then((docDefinition) => {
            pdfMake.createPdf(docDefinition).getBase64((base64: string) => {
              this.appointmentService.sendVisitSummaryWhatsApp({ appointmentId: id, pdfBase64: base64 }).subscribe({
                next: (resp: any) => {
                  this.sendingWhatsapp = false;
                  const to = resp?.sentTo ? ` to ${resp.sentTo}` : '';
                  this.messageService.add({ severity: 'success', summary: 'Sent', detail: `Visit summary sent${to} on WhatsApp.` });
                },
                error: (err: any) => fail(err?.error?.error || 'Failed to send on WhatsApp.', err),
              });
            });
          })
          .catch((err) => fail('Failed to build the visit summary.', err));
      },
      error: (err: any) => fail('Failed to load visit details.', err),
    });
  }


  /** Build a labelled OPD-notes block for the PDF, skipping any empty field.
   *  Returns [] when nothing is filled, so the whole section (incl. header)
   *  is omitted from the document. */
  private buildNotesSection(header: string, pairs: [string, any][]): any[] {
    const filled = pairs.filter(([, v]) => v != null && String(v).trim() !== '' && String(v).trim() !== '-');
    if (!filled.length) return [];
    const out: any[] = [{ text: header, style: 'section', decoration: 'underline' }];
    for (const [label, val] of filled) {
      out.push({ text: label, style: 'section' });
      out.push({ text: String(val), margin: [0, 0, 0, 6] });
    }
    return out;
  }

  /** Vitals table for the PDF — omitted entirely when no vital is recorded. */
  private buildVitalsSection(vitals: any): any[] {
    if (!vitals) return [];
    const anyVital = [
      vitals.height, vitals.BPs, vitals.BPd, vitals.weight, vitals.spo2, vitals.temp,
      vitals.hb, vitals.pulse, vitals.sFerritin, vitals.RR, vitals.bloodGroupName,
    ].some((v) => v != null && String(v).trim() !== '');
    if (!anyVital) return [];
    return [
      { text: 'Vitals', style: 'section', decoration: 'underline' },
      {
        table: {
          widths: ['auto', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'Height:', bold: true }, `${vitals?.height || '-'} cm`, { text: 'BP:', bold: true }, `${vitals?.BPs || '-'} / ${vitals?.BPd || '-'}`],
            [{ text: 'Weight:', bold: true }, `${vitals?.weight || '-'} kg`, { text: 'SpO2:', bold: true }, `${vitals?.spo2 || '-'}%`],
            [{ text: 'Temp:', bold: true }, `${vitals?.temp || '-'} °F`, { text: 'Hb:', bold: true }, `${vitals?.hb || '-'}`],
            [{ text: 'Pulse:', bold: true }, `${vitals?.pulse || '-'}`, { text: 'Serum Ferritin:', bold: true }, `${vitals?.sFerritin || '-'}`],
            [{ text: 'RR:', bold: true }, `${vitals?.RR || '-'}`, { text: 'Blood Group', bold: true }, `${vitals?.bloodGroupName || '-'}`],
          ],
        },
        margin: [0, 5, 0, 8],
      },
    ];
  }

  /**
   * Legacy visit-summary layout for doctor-note-only visits (recorded before
   * the OPD assessment form). Drawn on the visit-summary letterhead, which
   * supplies the hospital name, logo and contact footer — so the header here
   * is only the patient strip, placed just below the letterhead band.
   */
  generatePdfWithPatient(patient: any, vitals: any, visit: any, history: any, prescriptions: any[], filteredInvestigationOrders: any[], brand: JmrhPdfBranding) {
    const patientInfo = patient;
    // Doctor + department for the top-of-document and footer identity lines.
    const doctorName = this.doctor?.name || this.currentDoctorName || patient?.doctorName || '';
    const departmentName = this.doctor?.departmentName || this.currentDepartmentName || '';
    const doctorQualification = this.doctor?.qualification || '';
    const docLine = `Doctor: ${doctorName || '-'}${departmentName ? '   |   Department: ' + departmentName : ''}`;
    const docDefinition: any = {
      pageSize: 'A4',
      // Letterhead header band ends ~82pt; the patient strip sits at 88pt, so
      // content starts below both. Bottom margin matches the letterhead footer.
      pageMargins: [40, 125, 40, brand.pageMargins[3]],
      background: brand.background,
      images: brand.images,

      header: function () {
        return {
          margin: [40, 88, 40, 0],
          stack: [
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

      // Same timestamp + page line as the assessment-based summary; the
      // hospital address/phone are on the letterhead footer band below it.
      footer: brand.footer,


      content: [
        { text: 'OPD Visit Summary:', style: 'title' },
        { text: docLine, bold: true, fontSize: 11, margin: [0, 0, 0, 8] },

        // Vitals — omitted entirely when no vital is recorded.
        ...this.buildVitalsSection(vitals),

        // OPD Notes — only the filled fields are printed (empty ones skipped).
        ...this.buildNotesSection('OPD Notes:', [
          ['Chief Complaints', visit?.chiefComplaints],
          ['Diagnosis', visit?.diagnosis],
          ['General Examination', visit?.generalExamination],
          ['Clinical Notes', visit?.clinicalNotes],
          ['CVS', visit?.cvs],
          ['RS', visit?.rs],
          ['CNS', visit?.cns],
          ['P/A', visit?.pa],
        ]),

        // OPD History — only filled fields; whole block skipped if all empty.
        ...this.buildNotesSection('OPD History Notes:', [
          ['Medical/ Surgical History', history?.medicalHistory],
          ['Family History', history?.familyHistory],
          ['Social History', history?.socialHistory],
        ]),

        // Investigation Requisition — header shown only when there are orders.
        ...((filteredInvestigationOrders && filteredInvestigationOrders.length)
          ? [{ text: 'Investigation Requisition', style: 'section', decoration: 'underline', margin: [0, 5, 0, 10] }]
          : []),

        ...(filteredInvestigationOrders || []).map((order: any) => {
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

        ...((prescriptions && prescriptions.length)
          ? [{ text: 'Prescriptions', style: 'section', decoration: 'underline' }]
          : []),
        ...(prescriptions || []).map((p: any) => ([
          { text: `Prescription ID: ${p.prescriptionId} | Date: ${new Date(p.prescribedDate).toLocaleDateString()}`, margin: [0, 10, 0, 5] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', '20%', '20%', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: [
                ['Doctor', 'Generic', 'Brand', 'Type', 'Freq', 'Duration', 'Instruction', 'Qty', 'Route'],
                // Every stage of a taper prints its own drug name; the sequence
                // is carried by the "Days 1–3" / "then Days 4–8" labels in the
                // Instruction column.
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


        ])).flat(),

        // Signature — collected at the end of the visit summary (doctor signs here).
        {
          margin: [0, 45, 0, 6],
          columns: [
            { width: '*', text: '' },
            {
              width: 200,
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.7 }] },
                { text: doctorName || '-', bold: true, fontSize: 11, margin: [0, 5, 0, 0] },
                ...(doctorQualification ? [{ text: doctorQualification, fontSize: 10 }] : []),
                ...(departmentName ? [{ text: departmentName, fontSize: 10 }] : []),
                { text: 'Doctor Signature', fontSize: 9, color: '#555', margin: [0, 2, 0, 0] },
              ],
            },
          ],
        }
      ],

      styles: {
        header: { fontSize: 16, bold: true },
        title: { fontSize: 16, bold: true, margin: [0, 4, 0, 6] },
        section: { fontSize: 12, bold: true, margin: [0, 6, 0, 2] },
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
        // Adopt any saved templated path on this note.
        this.adoptDoctorNoteTemplate(res);
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
        this.resetDoctorNoteTemplate();
      }
    });

    // Load active templates for this doctor's department (independent of
    // whether the note already exists — the picker should always be available).
    this.loadDoctorNoteTemplates();
  }

  // ─── Note-template helpers (doctor manual notes) ────────────────────

  /** Pull the active 'opd-doctor' templates for the doctor's department. */
  loadDoctorNoteTemplates(): void {
    const dept = this.department;
    if (!dept) return;
    this.loadingNoteTemplates = true;
    this.noteTemplateService.getForDoctor(dept, 'opd-doctor').subscribe({
      next: (rows) => {
        this.availableNoteTemplates = rows ?? [];
        this.loadingNoteTemplates = false;
        if (!this.selectedNoteTemplateId && this.availableNoteTemplates.length > 0) {
          const def = this.availableNoteTemplates.find((t) => t.isDefault);
          if (def) this.applyDoctorNoteTemplate(def.id);
        }
      },
      error: () => { this.loadingNoteTemplates = false; },
    });
  }

  /** Hydrate template state from a loaded DoctorNote row, if present. */
  private adoptDoctorNoteTemplate(note: { noteTemplateId?: string; templatedValues?: string } | null | undefined): void {
    if (!note) { this.resetDoctorNoteTemplate(); return; }
    if (note.noteTemplateId) this.selectedNoteTemplateId = note.noteTemplateId;
    if (typeof note.templatedValues === 'string' && note.templatedValues.length > 0) {
      try {
        const parsed = JSON.parse(note.templatedValues) as { _schema?: FieldDef[]; _values?: Record<string, unknown> };
        if (parsed?._values) this.noteTemplateValues = parsed._values;
        if (Array.isArray(parsed?._schema) && parsed._schema.length > 0) {
          this.activeNoteTemplateFields = parsed._schema;
        }
      } catch { /* ignore — leave defaults */ }
    }
  }

  private resetDoctorNoteTemplate(): void {
    this.selectedNoteTemplateId = '';
    this.noteTemplateValues = {};
    this.activeNoteTemplateFields = [];
  }

  /** Picker change handler. */
  onDoctorNoteTemplateSelected(templateId: string): void {
    this.applyDoctorNoteTemplate(templateId);
  }

  private applyDoctorNoteTemplate(templateId: string): void {
    this.selectedNoteTemplateId = templateId;
    if (!templateId) { this.activeNoteTemplateFields = []; return; }
    const tpl = this.availableNoteTemplates.find((t) => t.id === templateId);
    if (tpl) {
      this.activeNoteTemplateFields = tpl.fields ?? [];
      const seeded: Record<string, unknown> = { ...this.noteTemplateValues };
      for (const f of this.activeNoteTemplateFields) {
        if (!(f.key in seeded)) {
          seeded[f.key] = f.type === 'multiselect' ? [] : f.type === 'checkbox' ? false : '';
        }
      }
      this.noteTemplateValues = seeded;
    }
  }

  onDoctorNoteTemplateValuesChange(values: Record<string, unknown>): void {
    this.noteTemplateValues = values;
  }

  get isDoctorNoteTemplated(): boolean {
    return !!this.selectedNoteTemplateId && this.activeNoteTemplateFields.length > 0;
  }

  // Submit notes
  submitDoctorNotes(): void {
    this.isButtonLoading = true;
    const payload: Record<string, unknown> = {
      prn: Number(this.selectedService.prnNumber),
      date: this.selectedService.date,
      createdBy: this.historyData.createdBy ? this.historyData.createdBy : this.doctor.id.toString(),
      updatedBy: this.doctor.id.toString(),
      ...this.doctorNoteData
    };
    // Templated path — backend snapshots the field defs at save-time.
    if (this.isDoctorNoteTemplated) {
      payload['noteTemplateId'] = this.selectedNoteTemplateId;
      payload['templatedValueMap'] = this.noteTemplateValues;
    }

    if (this.doctorNoteData?.id) {
      // Merge templated keys into the body the service sends, so they reach
      // the backend regardless of whether the doctor used a template.
      const updateBody: Record<string, unknown> = { ...this.doctorNoteData };
      if (this.isDoctorNoteTemplated) {
        updateBody['noteTemplateId'] = this.selectedNoteTemplateId;
        updateBody['templatedValueMap'] = this.noteTemplateValues;
      }
      this.appointmentService.saveDoctorNote(payload['prn'] as number, payload['date'] as string, payload['updatedBy'] as string, updateBody).subscribe({
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
      createdBy: this.historyData.createdBy ? this.historyData.createdBy : this.doctor.id.toString(),
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
  onBrandInput(index: number, event?: Event): void {
    if (event) this.brandPopupPos[index] = this.popupPosFrom(event.target);
    const control = this.tablets.at(index);
    const typed = control.get('brandName')?.value?.toLowerCase();

    this.filteredBrandNames[index] = typed
      ? this.brandOptions.filter(name => name.toLowerCase().includes(typed))
      : [...this.brandOptions]; // full list
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
  onFavBrandInput(index: number, event?: Event): void {
    if (event) this.favBrandPopupPos[index] = this.popupPosFrom(event.target);
    const control = this.favorites.at(index);
    const typed = control.get('brandName')?.value?.toLowerCase();

    this.filteredFavBrandNames[index] = typed
      ? this.brandOptions.filter(name => name.toLowerCase().includes(typed))
      : [...this.brandOptions]; // full list
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

  // ─── Generic-name search (type-to-filter) ────────────────────────────────
  // The generic column used to be a plain <select> over the whole drug master,
  // so picking a drug meant scrolling hundreds of entries. These mirror the
  // brand-name typeahead above so both columns are searchable. State is kept
  // per list + row: 'tablets' = prescription rows, 'favorites' / 'allergies' =
  // the matching modals (each has its own generic column).
  filteredGenericNames: { [list: string]: string[][] } = { tablets: [], favorites: [], allergies: [] };
  showGenericSuggestions: { [list: string]: boolean[] } = { tablets: [], favorites: [], allergies: [] };
  highlightedGenericIndex: { [list: string]: number[] } = { tablets: [], favorites: [], allergies: [] };

  // The drug rows sit in a fixed-height scrolling container, which clipped the
  // absolutely-positioned suggestion lists down to a few pixels. The lists are
  // position:fixed instead and take their coordinates from the input's own rect
  // when they open, so they escape the scroll container entirely.
  genericPopupPos: { [list: string]: SuggestPos[] } = { tablets: [], favorites: [], allergies: [] };
  brandPopupPos: SuggestPos[] = [];
  favBrandPopupPos: SuggestPos[] = [];

  private popupPosFrom(target: EventTarget | null | undefined): SuggestPos {
    const el = target as HTMLElement | null;
    if (!el || typeof el.getBoundingClientRect !== 'function') return { top: 0, left: 0, width: 0 };
    const rect = el.getBoundingClientRect();
    return { top: rect.bottom + 2, left: rect.left, width: rect.width };
  }

  private genericList(list: string): FormArray {
    if (list === 'favorites') return this.favorites;
    if (list === 'allergies') return this.allergies;
    return this.tablets;
  }

  onGenericInput(list: string, index: number, event?: Event): void {
    if (event) this.genericPopupPos[list][index] = this.popupPosFrom(event.target);
    const typed = String(this.genericList(list).at(index)?.get('genericName')?.value ?? '').trim().toLowerCase();
    this.filteredGenericNames[list][index] = typed
      ? this.genericOptions.filter((name: string) => (name || '').toLowerCase().includes(typed))
      : [...this.genericOptions];
    this.showGenericSuggestions[list][index] = true;
    this.highlightedGenericIndex[list][index] = -1;
  }

  onGenericSelect(list: string, index: number, generic: string): void {
    this.genericList(list).at(index).patchValue({ genericName: generic });
    this.filteredGenericNames[list][index] = [];
    this.showGenericSuggestions[list][index] = false;
    this.highlightedGenericIndex[list][index] = -1;
    this.syncBrandsForGeneric(list, index, generic);
  }

  /** Re-derive a row's brand list once its generic settles. A brand that no
   *  longer belongs to the chosen generic is cleared (old <select> behaviour);
   *  one that still fits is kept, so merely tabbing through the generic box
   *  doesn't wipe a brand the doctor already picked. Allergy rows have no
   *  brand column. */
  private syncBrandsForGeneric(list: string, index: number, generic: string): void {
    if (list === 'allergies') return;
    const brand = String(this.genericList(list).at(index)?.get('brandName')?.value ?? '').trim();
    const fits = !!brand && this.allTablets.some((t: any) => t.genericName === generic && t.brandName === brand);
    if (!fits) {
      this.onGenericChange(index); // clears brand + tabletId, narrows the list
      return;
    }
    this.selectedGeneric = generic;
    this.brandOptions = this.allTablets.filter((t: any) => t.genericName === generic).map((t: any) => t.brandName);
    this.filteredBrandOptions[index] = this.brandOptions;
    this.filteredBrandNames[index] = this.brandOptions;
    this.filteredFavBrandNames[index] = this.brandOptions;
  }

  // Delay hiding so a mousedown on a suggestion registers before the list closes.
  hideGenericSuggestionsWithDelay(list: string, index: number): void {
    setTimeout(() => {
      this.showGenericSuggestions[list][index] = false;
      this.filteredGenericNames[list][index] = [];
      this.commitTypedGeneric(list, index);
    }, 200);
  }

  /** Snap free-typed text onto the catalog entry when it matches (case-insensitive). */
  private commitTypedGeneric(list: string, index: number): void {
    const row = this.genericList(list).at(index);
    const typed = String(row?.get('genericName')?.value ?? '').trim();
    if (!typed) return;
    const match = this.genericOptions.find((g: string) => (g || '').toLowerCase() === typed.toLowerCase());
    if (!match) return;
    if (match !== typed) row.patchValue({ genericName: match });
    this.syncBrandsForGeneric(list, index, match);
  }

  onGenericKeydown(event: KeyboardEvent, list: string, index: number): void {
    const options = this.filteredGenericNames[list][index] || [];
    if (!options.length) return;
    if (this.highlightedGenericIndex[list][index] === undefined) {
      this.highlightedGenericIndex[list][index] = -1;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedGenericIndex[list][index] =
          (this.highlightedGenericIndex[list][index] + 1) % options.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedGenericIndex[list][index] =
          (this.highlightedGenericIndex[list][index] - 1 + options.length) % options.length;
        break;
      case 'Enter': {
        event.preventDefault();
        const highlighted = this.highlightedGenericIndex[list][index];
        if (highlighted >= 0 && highlighted < options.length) {
          this.onGenericSelect(list, index, options[highlighted]);
        }
        break;
      }
      case 'Escape':
        this.showGenericSuggestions[list][index] = false;
        this.highlightedGenericIndex[list][index] = -1;
        break;
    }
    setTimeout(() => {
      const el = document.getElementById(
        `generic-option-${list}-${index}-${this.highlightedGenericIndex[list][index]}`,
      );
      if (el) el.scrollIntoView({ block: 'nearest' });
    });
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

  openSignatureModal() {
    this.showSignatureModel = true;
  }
}
