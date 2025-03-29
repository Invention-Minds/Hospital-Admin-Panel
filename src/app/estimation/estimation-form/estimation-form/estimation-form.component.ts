import { Component, ViewChild, ElementRef, Input, ChangeDetectorRef, AfterViewInit, Output, EventEmitter, HostListener } from '@angular/core';
import SignaturePad from 'signature_pad';
import { EstimationService } from '../../../services/estimation/estimation.service';
import { HealthCheckupServiceService } from '../../../services/health-checkup/health-checkup-service.service';
import { MessageService } from 'primeng/api';
import { NgForm } from '@angular/forms';
import { AppointmentConfirmService } from '../../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';


type InclusionsType = {
  wardICUStay: boolean;
  primaryConsultant: boolean;
  crossConsultation: boolean;
  implants: boolean;
  laboratoryImaging: boolean;
  instrumentEquipment: boolean;
  diet: boolean;
  nursing: boolean;
  surgeonOTAnesthesia: boolean;
  bedsideProcedure: boolean;
  otDrugs: boolean;
  drugsConsumables: boolean;
  cSection: boolean;
};

@Component({
  selector: 'app-estimation-form',
  templateUrl: './estimation-form.component.html',
  styleUrl: './estimation-form.component.css'
})

export class EstimationFormComponent {
  // @ViewChild('patientSignatureCanvas', { static: true }) patientSignatureCanvas!: ElementRef<HTMLCanvasElement>;
  // @ViewChild('staffSignatureCanvas', { static: true }) staffSignatureCanvas!: ElementRef<HTMLCanvasElement>;
  // @ViewChild('approverSignatureCanvas', { static: true }) approverSignatureCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('patientSignatureCanvas') patientCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('staffSignatureCanvas') staffCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('approverSignatureCanvas') approverCanvasRef!: ElementRef<HTMLCanvasElement>;


  @Input() estimationData: any = null;

  public patientSignaturePad!: SignaturePad;
  public staffSignaturePad!: SignaturePad;
  public approverSignaturePad!: SignaturePad;
  // private signaturePad!: SignaturePad;
  nursing: boolean = true;
  role: string = '';
  employeeId: string = '';
  selectedDoctorName: string = '';
  filteredDoctors: any[] = [];
  doctors: any[] = [];
  @Output() closeForm = new EventEmitter<void>();
  @ViewChild('estimationForm') estimationForm!: NgForm; // Get form reference
  selectedDepartmentId: number | null = null;
  filteredSurgeryNames: string[] = [];
  selectedEstimationType: string = 'MM';
  allEstimations: any[] = [];
  selectedRooms: { name: string; cost: number }[] = [];
  filteredRooms: { name: string; cost: number }[] = [];
  dropdownOpen: boolean = false;
  estimationCosts: number[] = [];
  selectedSurgeryPackage: string = 'single surgery';
  showEstimationSuggestions: boolean = false;
  estimationSuggestions: string[] = [];
  selectedRoomType: any[] = [];
  surgeries: any[] = []
  selectedRoomCost: string = '';
  selectedRoom: { name: string; cost: number } | null = null;  // Stores room as "General - ₹5000"
  patients: any[] = [];
  lastAddedCost: number = 0;
  employeeName: string = ''
  approverName: string = '';
  showRejectReasonPopup = false;
rejectionReason = '';
roomCost: number =0;



  constructor(private estimationService: EstimationService, private cdr: ChangeDetectorRef, private messageService: MessageService, private doctorService: DoctorServiceService, private appointmentService: AppointmentConfirmService,private eRef: ElementRef) {
    this.filteredRooms = [...this.availableRooms];
    this.availableRooms = [
      { name: 'General', cost: 1600 },
      { name: 'Semi-Private', cost: 3500 },
      { name: 'Private/ICU', cost: 5000 },
      { name: 'Deluxe', cost: 6000 },
      { name: 'VIP Suite', cost: 10000 },
      { name: 'Presidential Suite', cost: 12000 }
    ];

  }
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const targetElement = event.target as HTMLElement;

    // Check if the clicked element is inside the PRN suggestion dropdown
    if (!targetElement.closest('.prn-suggestions') && !targetElement.closest('#patientUHID')) {
      this.uhidSuggestions = false;
    }
    if (
      targetElement.closest('.dropdown-content') || // ✅ Keeps dropdown open when clicking inside
      targetElement.closest('#roomButton') // ✅ Keeps dropdown open when clicking the button
    ) {
      return;
    }
    this.dropdownOpen = false
    if (
      targetElement.closest('.dropdown-content-1') || // ✅ Keeps dropdown open when clicking inside
      targetElement.closest('.dropdown-btn') // ✅ Keeps dropdown open when clicking the button
    ) {
      return;
    }
    this.isDropdownOpen = false

  }

  ngAfterViewInit(): void {
    this.patientSignaturePad = new SignaturePad(this.patientCanvasRef.nativeElement);
    this.staffSignaturePad = new SignaturePad(this.staffCanvasRef.nativeElement);
    this.approverSignaturePad = new SignaturePad(this.approverCanvasRef.nativeElement);
    this.cdr.detectChanges();
    if (this.formData.patientSign) {
      this.loadSignatureToCanvas(this.patientCanvasRef, this.formData.patientSign, this.patientSignaturePad);
    }
    if (this.formData.employeeSign) {
      this.loadSignatureToCanvas(this.staffCanvasRef, this.formData.employeeSign,this.staffSignaturePad);
    }
    if (this.formData.approverSign) {
      console.log(this.formData.approverSign)
      console.log(this.formData.approverSign, this.approverCanvasRef)

      this.loadSignatureToCanvas(this.approverCanvasRef, this.formData.approverSign, this.approverSignaturePad);
    }
    this.disableSignaturePadsBasedOnStatus(this.formData.statusOfEstimation);
    if(this.estimationData === null){
      this.patientSignaturePad.off();
      this.approverSignaturePad.off();
    }
    if(this.role === "sub_admin" && this.formData.statusOfEstimation === 'submitted'){
      this.staffSignaturePad.on();
      this.approverSignaturePad.off();
    }

    
  }
  disableSignaturePadsBasedOnStatus(status: string): void {
    // Enable all first (reset state)
    this.patientSignaturePad.on();
    this.staffSignaturePad.on();
    this.approverSignaturePad.on();
  
    switch (status) {
      case 'accepted':
      case 'cancelled':
      case 'confirmed':
      case 'overdue':
        this.patientSignaturePad.off();
        this.staffSignaturePad.off();
        this.approverSignaturePad.off();
        break;
  
      case 'submitted':
        this.patientSignaturePad.off();
        this.staffSignaturePad.off();
        break;
  
      case 'pending':
        this.patientSignaturePad.off();
        this.approverSignaturePad.off();
        break;
  
      case 'approved':
        this.staffSignaturePad.off();
        this.approverSignaturePad.off();
        break;
  
      default:
        // Optionally handle unknown status
        console.warn(`Unknown status: ${status}`);
        break;
    }
  }
  isApproverReadonly(): boolean {
    return ['accepted', 'confirmed', 'approved'].includes(this.formData.statusOfEstimation);
  }
  
  availableRooms = [
    { name: 'General', cost: 1600 },
    { name: 'Semi-Private', cost: 3500 },
    { name: 'Private/ICU', cost: 5000 },
    { name: 'Deluxe', cost: 6000 },
    { name: 'VIP Suite', cost: 10000 },
    { name: 'Presidential Suite', cost: 12000 }
  ];
  get sortedSelectedRooms(): { name: string; cost: number }[] {
    return this.availableRooms.filter(room =>
      this.selectedRooms.some(selected => selected.name === room.name)
    );
  }
  mapRoomNameToCostKey(roomName: string): string {
    let roomMapping = {
      "General": "costForGeneral",
      "Semi-Private": "costForSemiPrivate",
      "Private/ICU": "costForPrivate",  // Fix the mismatch
      "Deluxe": "costForDeluxe",
      "VIP Suite": "costForVip",
      "Presidential Suite": "costForPresidential"
    };

    return (roomMapping as any)[roomName] || ''; // Default empty if not found
  }


  // Filtered rooms (for search functionality)
  toggleDropdown(event: Event): void {
    event?.stopPropagation()
    event.preventDefault()
    this.dropdownOpen = !this.dropdownOpen;
  }

  filterRooms(event: any): void {
    const searchText = event.target.value.toLowerCase();
    this.filteredRooms = this.availableRooms.filter(room =>
      room.name.toLowerCase().includes(searchText)
    );
  }

  toggleSelection(room: { name: string; cost: number }) {
    const index = this.selectedRooms.findIndex(r => r.name === room.name);

    if (index > -1) {
      // Remove room if already selected
      this.selectedRooms.splice(index, 1);
    } else {
      // Add room if not selected
      this.selectedRooms.push(room);
    }

    // Store room names & costs in formData.roomType
    this.formData.roomType = this.selectedRooms.map(r => `${r.name} - ₹${r.cost}`).join(', ');
    this.selectedRoomType = this.selectedRooms.map(room => room.name);


    // ✅ Force validation check
    if (this.estimationForm.controls['roomType']) {
      this.estimationForm.controls['roomType'].updateValueAndValidity();
    }
    this.surgeries = this.formData.estimationName
      ? this.formData.estimationName.split(',').map(s => s.trim())
      : [];

    // Initialize cost strings for each room type
    this.formData.costForGeneral = '';
    this.formData.costForSemiPrivate = '';
    this.formData.costForPrivate = '';
    this.formData.costForVip = '';

    // Map costs to each room type
    this.selectedRooms.forEach(room => {
      let costVariable = `costFor${room.name.replace(/\s/g, '')}`; // Format variable name
      (this.formData as any)[costVariable] = this.surgeries.map(() => '').join(','); // Empty cost string
    });
    console.log(this.selectedRooms)
  }


  removeRoom(room: { name: string; cost: number }): void {
    this.selectedRooms = this.selectedRooms.filter(selected => selected.name !== room.name);
    this.updateRoomTypeField();
  }

  isSelected(roomName: string): boolean {
    return this.selectedRooms.some(room => room.name === roomName);
  }

  getRoomCost(roomName: string): number {
    const room = this.availableRooms.find(room => room.name === roomName);
    return room ? room.cost : 0;
  }

  updateRoomTypeField(): void {
    this.formData.roomType = this.selectedRooms
      .map(room => `${room.name} - ${room.cost}`)
      .join(', ');
    console.log(this.formData.roomType)
  }

  // Stores the selected room types


  // saveAllSignatures(): void {
  //   // Save signatures to formData
  //   //   if (this.approverSignaturePad.isEmpty()) {
  //   //     console.error("Approver Signature is empty. Skipping save.");
  //   //     return;
  //   // }
  //   this.formData.patientSign = this.patientSignaturePad.toDataURL();
  //   this.formData.employeeSign = this.staffSignaturePad.toDataURL();
  //   this.formData.approverSign = this.approverSignaturePad.toDataURL();

  //   console.log('Form Data with Signatures:', this.formData);
  //   console.log("Patient Signature Base64:", this.formData.patientSign.substring(0, 100));
  //   console.log("Employee Signature Base64:", this.formData.employeeSign.substring(0, 100));
  //   console.log("Approver Signature Base64:", this.formData.approverSign.substring(0, 100));
  //   console.log(this.approverCanvasRef, this.formData.approverSign)
  // }
  saveAllSignatures(): void {
    if (!this.patientSignaturePad.isEmpty()) {
      this.formData.patientSign = this.patientSignaturePad.toDataURL();
    }
  
    if (!this.staffSignaturePad.isEmpty()) {
      this.formData.employeeSign = this.staffSignaturePad.toDataURL();
    }
  
    if (!this.approverSignaturePad.isEmpty()) {
      this.formData.approverSign = this.approverSignaturePad.toDataURL();
    }
  
    console.log('Form Data with Signatures:', this.formData);
    console.log("Patient Signature Base64:", this.formData.patientSign?.substring(0, 100));
    console.log("Employee Signature Base64:", this.formData.employeeSign?.substring(0, 100));
    console.log("Approver Signature Base64:", this.formData.approverSign?.substring(0, 100));
  }
  
  clearAllSignatures(): void {
    // Clear all signature pads and reset their corresponding formData properties
    this.patientSignaturePad?.clear();
    this.staffSignaturePad?.clear();
    this.approverSignaturePad?.clear();

    this.formData.patientSign = '';
    this.formData.employeeSign = '';
    this.formData.approverSign = '';
  }

  clearPatientSign() {
    this.patientSignaturePad.clear()
    this.formData.patientSign = ''
    this.estimationForm.controls['patientSign'].markAsPristine();
    this.estimationForm.controls['patientSign'].markAsUntouched();
  }
  clearStaffSign() {
    this.staffSignaturePad.clear()
    this.formData.employeeSign = ''
    this.estimationForm.controls['employeeSign'].markAsPristine();
    this.estimationForm.controls['employeeSign'].markAsUntouched();
  }
  clearApproverSign() {
    this.approverSignaturePad.clear()
    this.formData.approverSign = ''
    this.estimationForm.controls['approverSign'].markAsPristine();
    this.estimationForm.controls['approverSign'].markAsUntouched();
  }


  formData = {
    patientUHID: '',
    patientName: '',
    ageOfPatient: 0,
    genderOfPatient: '',
    consultantName: '',
    consultantId: 0,
    estimationPreferredDate: '',
    icuStay: 0,
    wardStay: 0,
    totalDaysStay: 0,
    estimationCost: 0,
    estimationName: '',
    remarks: '',
    roomType: '',
    estimatedDate: '',
    estimationId: '',
    discountPercentage: 0,
    totalEstimationAmount: 0,
    estimationType: this.selectedEstimationType,
    roomEstimation: [],
    patientPhoneNumber: '',
    signatureOf: 'patient',
    employeeName: '',
    approverName: '',
    attenderName: '',
    patientSign: '',
    employeeSign: '',
    approverSign: '',
    employeeId: '',
    approverId: '',
    surgeryTime: 'No Level',
    statusOfEstimation: '',
    staffRemarks: '',
    patientRemarks: '',
    implants: '',
    instrumentals: '',
    procedures: '',
    multipleEstimationCost: '',
    surgeryPackage: '',
    costForGeneral: '',
    costForSemiPrivate: '',
    costForPrivate: '',
    costForVip: '',
    costForDeluxe: '',
    costForPresidential: '',
    patientEmail:'',
    selectedRoomCost: this.selectedRoomCost,
    rejectReason:'',
    includedItems: {
      wardICUStay: false,
      primaryConsultant: false,
      crossConsultation: false,
      implants: false,
      laboratoryImaging: false,
      instrumentEquipment: false,
      diet: false,
      nursing: false,
      surgeonOTAnesthesia: false,
      bedsideProcedure: false,
      otDrugs: false,
      drugsConsumables: false,
      cSection: false
    } as InclusionsType,
    exclusions: [] as string[],
    inclusions: [] as string[],

  };

  /**
   * Handles form submission and validates required fields.
   */

  signaturePadOptions: Object = {
    minWidth: 1,
    canvasWidth: 500,
    canvasHeight: 300,
  };

  fetchPendingEstimations(): void {
    this.estimationService.getAllEstimation().subscribe({
      next: (estimation: any[]) => {
        // Process the services when the API call is successful
        this.allEstimations = estimation
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      }
    });

  }
  // onUHIDChange(): void {
  //   console.log(this.formData.patientUHID)
  //   if (!this.formData.patientUHID) {
  //     // Reset fields if UHID is empty
  //     this.formData.patientName = '';
  //     this.formData.ageOfPatient = null;
  //     this.formData.genderOfPatient = '';
  //     this.formData.patientPhoneNumber = ''
  //     return;
  //   }
  //   console.log(this.allEstimations)
  //   const matchingEstimation = this.patients.find(
  //     (estimation) => String(estimation.prn) === String(this.formData.patientUHID)
  //   );
  //   console.log("🔍 Matching Estimation:", matchingEstimation);

  //   console.log(matchingEstimation)
  //   if (matchingEstimation) {
  //     this.formData.patientName = matchingEstimation.name;
  //     this.formData.ageOfPatient = matchingEstimation.age;
  //     this.formData.genderOfPatient = matchingEstimation.gender;
  //     this.formData.patientPhoneNumber = matchingEstimation.mobileNumber;
  //   } else {
  //     // Reset if no match found
  //     this.formData.patientName = '';
  //     this.formData.ageOfPatient = null;
  //     this.formData.genderOfPatient = '';
  //     this.formData.patientPhoneNumber = ''
  //   }
  // }
  uhidSuggestions: boolean = false;
  filteredUHIDPatients: any[] = []; // Filtered UHID/MRD suggestions

  onUHIDChange(): void {
    console.log(this.formData.patientUHID);
    if (!this.formData.patientUHID) {
      // Reset fields if UHID is empty
      this.formData.patientName = '';
      this.formData.ageOfPatient = 0;
      this.formData.genderOfPatient = '';
      this.formData.patientPhoneNumber = '';
      this.uhidSuggestions = false;
      return;
    }

    // Filter patients matching UHID
    this.filteredUHIDPatients = this.patients.filter(patient =>
      String(patient.prn).toLowerCase().includes(this.formData.patientUHID.toLowerCase())
    );

    this.uhidSuggestions = this.filteredUHIDPatients.length > 0;
  }

  // Function to handle UHID selection
  selectUHID(selectedPatient: any): void {
    if (!selectedPatient) return;
    let cleanedAge = selectedPatient.age ? selectedPatient.age.replace(/\D/g, '') : '';
    // Update formData with selected patient's details
    this.formData.patientUHID = selectedPatient.prn || '';
    this.formData.patientName = selectedPatient.name;
    this.formData.ageOfPatient = selectedPatient.age 
  ? Number(selectedPatient.age.replace(/\D/g, '')) 
  : 0;  // ✅ Ensure it's assigned null when no age is available

    this.formData.genderOfPatient = selectedPatient.gender;
    this.formData.patientPhoneNumber = selectedPatient.mobileNo.toString();
    this.formData.patientEmail = selectedPatient.email

    console.log("UHID Selected:", selectedPatient, this.formData);
    

    // Hide suggestions after selection
    this.uhidSuggestions = false;
  }

  public loadDoctors(): void {
    this.doctorService.getDoctors().subscribe(
      (doctors) => {
        this.doctors = doctors;
        this.filteredDoctors = this.doctors.slice().sort((a, b) => {
          const nameA = a.name.toLowerCase().replace(/^dr\.\s*/, '');
          const nameB = b.name.toLowerCase().replace(/^dr\.\s*/, '');
          return nameA.localeCompare(nameB);
        });

        // Set consultant name if an ID exists
        this.setSelectedDoctorName();
      },
      (error) => {
        console.error('Error loading doctors:', error);
      }
    );
  }

  // When a doctor is selected, store doctor ID in formData and set name
  updateSelectedDoctorName(event: Event): void {
    const target = event.target as HTMLSelectElement; // 
    const doctorId = target.value;

    const selectedDoctor = this.filteredDoctors.find(doc => doc.id.toString() === doctorId);

    console.log(selectedDoctor)
    if (selectedDoctor) {
      this.selectedDoctorName = selectedDoctor.name;
      this.formData.consultantId = selectedDoctor.id;
      this.selectedDepartmentId = selectedDoctor.departmentId
      this.formData.consultantName = this.selectedDoctorName;
      console.log(this.formData)
      this.loadSurgeryNames()
    }
  }

  loadSurgeryNames(): void {
    if (!this.selectedEstimationType) return;

    this.estimationService.getEstimationsByType(this.selectedEstimationType).subscribe(
      (surgeryNames) => {
        this.estimationSuggestions = surgeryNames;
      },
      (error) => {
        console.error('Error fetching surgery names:', error);
      }
    );
  }

  // If consultantId is already set, retrieve and display the doctor's name
  setSelectedDoctorName(): void {
    if (this.formData.consultantId) {
      const selectedDoctor = this.filteredDoctors.find(doc => doc.id === this.formData.consultantId);
      if (selectedDoctor) {
        this.selectedDoctorName = selectedDoctor.name;
      }
    }
  }
  ngOnInit(): void {
    this.loadDoctors();
    this.setSelectedDoctorName(); // If consultantId exists, get doctor name
    this.fetchPendingEstimations();
    this.loadSurgeryNames();
    this.initializeEstimationInputs()
    this.availableRooms = [
      { name: 'General', cost: 1600 },
      { name: 'Semi-Private', cost: 3500 },
      { name: 'Private/ICU', cost: 5000 },
      { name: 'Deluxe', cost: 6000 },
      { name: 'VIP Suite', cost: 10000 },
      { name: 'Presidential Suite', cost: 12000 }
    ];
    this.appointmentService.getAllPatients().subscribe(
      (patients => {
        this.patients = patients;
        // console.log(this.patients)
      })
    )


    console.log(this.estimationData)
    // this.formData = this.estimationData
    if (this.estimationData) {
      const includedItemsFromEstimation = (this.estimationData.inclusions || []).reduce((acc: any, inclusion: any) => {
        acc[inclusion.description] = true;
        return acc;
      }, {});
      this.formData = {
        ...this.formData, // Use the default formData structure
        ...this.estimationData, // Override with estimationData values
        includedItems: {
          ...this.formData.includedItems, // Ensure default structure for includedItems
          ...includedItemsFromEstimation, // Map inclusions to includedItems
        },
        inclusions: this.estimationData.inclusions?.map((inclusion: any) => inclusion.description) || [],
        exclusions: this.estimationData.exclusions?.map((exclusion: any) => exclusion.description) || [],
      };
      this.formData.rejectReason = this.estimationData.rejectReason
      console.log(this.formData.rejectReason)
      this.initializeEstimationInputs()
      if (this.formData.patientPhoneNumber.startsWith('91') && this.formData.patientPhoneNumber.length === 12) {
        this.formData.patientPhoneNumber = this.formData.patientPhoneNumber.slice(2); // Remove '91' prefix
      } else {
        this.formData.patientPhoneNumber = this.formData.patientPhoneNumber; // Keep as is
      }
      
      console.log(this.estimationData.roomType, this.availableRooms)
      if (this.estimationData.roomType) {
        this.selectedRooms = this.estimationData.roomType.split(',')
          .map((room: string) => {
            const trimmedRoom = room.trim();
            const roomNameOnly = trimmedRoom.split(' - ')[0].trim(); // Extract only the name part
            const matchedRoom = this.availableRooms.find((r) => r.name === roomNameOnly);
            return matchedRoom ? { name: matchedRoom.name, cost: matchedRoom.cost } : null;
          })
          .filter((room: any): room is { name: string; cost: number } => room !== null); // ✅ Ensures only valid objects

        console.log('Selected Rooms:', this.selectedRooms);
      } else {
        this.selectedRooms = [];
      }
      //   this.availableRooms.forEach(room => {
      //     let costVariable = `costFor${room.name.replace(/\s|-/g, '')}`;
      //     if (this.estimationData[costVariable]) {
      //         (this.formData as any)[costVariable] = this.estimationData[costVariable];
      //     } else {
      //         (this.formData as any)[costVariable] = ''; // Ensure it's initialized
      //     }
      // });
      this.availableRooms.forEach(room => {
        let costVariable = this.mapRoomNameToCostKey(room.name);
        console.log(costVariable)
        if (this.estimationData?.[costVariable]) {
          (this.formData as any)[costVariable] = this.estimationData?.[costVariable];
          console.log(this.formData)
        } else {
          (this.formData as any)[costVariable] = this.surgeries.map(() => '').join('');
        }
      });
      // ✅ Assign a string to `selectedRoomType`
      this.selectedRoomType = this.selectedRooms.map(room => room.name);


      //   // ✅ If a room was selected in the estimationData, update `selectedRoomCost`
      if (this.selectedRooms.length > 0 && this.estimationData.selectedRoomCost) {
        // Extract the room name from `selectedRoomCost`
        let selectedRoomName = this.estimationData.selectedRoomCost.split(' - ')[0].trim();

        // Find the matching room object in `selectedRooms`
        this.selectedRoom = this.selectedRooms.find(room => room.name === selectedRoomName) || null;
        console.log(this.selectedRoom)

        if (this.selectedRoom) {
          console.log("Selected Room Found:", this.selectedRoom);
          this.selectRoom(this.selectedRoom); // Update UI with selected room
        } else {
          console.warn("No matching room found for:", selectedRoomName);
        }
      }

      this.selectedRoomCost = this.estimationData.selectedRoomCost

      this.selectedItems = {
        implants: this.parseExistingData(this.estimationData.implants),
        procedures: this.parseExistingData(this.estimationData.procedures),
        instrumentals: this.parseExistingData(this.estimationData.instrumentals),
      };
      this.selectedCategories = Object.keys(this.selectedItems)
        .filter((category) => this.selectedItems[category as keyof typeof this.selectedItems].length > 0)
        .map((category) => category as "implants" | "procedures" | "instrumentals");
      console.log(this.selectedItems)
      // if(this.formData.estimationName){
      //   this.updateEstimationCosts();
      // }
      if (this.formData.multipleEstimationCost) {
        this.estimationCosts = this.formData.multipleEstimationCost.split(',').map(cost => parseInt(cost.trim(), 10) || 0);
        console.log(this.estimationCosts, this.formData.multipleEstimationCost)
      } else {
        this.estimationCosts = [];
      }


      this.selectedEstimationType = this.estimationData.estimationType;
      this.selectedSurgeryPackage = this.estimationData.surgeryPackage;



      this.cdr.detectChanges();
      console.log(this.formData)
      // Manually mark surgeryTime as touched if it has a value

    }
    else {
      this.clearForm()
    }
    this.employeeId = localStorage.getItem('employeeId') || '';
    this.role = localStorage.getItem('role')!
    this.employeeName = localStorage.getItem('username')|| ''
    // if (this.role === 'sub_admin') {
    //   this.formData.employeeId = this.employeeId!
    //   this.formData.employeeName = this.employeeName.split(`_subadmin`)[0].replace(/_/g, ' ');
    //   console.log(this.formData.employeeName)
    // }
    // if (this.role === 'admin' || this.role === 'super_admin') {
    //   this.formData.approverId = this.employeeId
    //   this.formData.approverName = this.employeeName.split(`_${this.role}`)[0].replace(/_/g, ' ');
    // }
    if (this.role === 'sub_admin') {
      if (!this.formData.employeeId || this.formData.employeeId === '') {
        this.formData.employeeId = this.employeeId!;
      }
      if (!this.formData.employeeName || this.formData.employeeName === '') {
        this.formData.employeeName = this.employeeName.split(`_subadmin`)[0].replace(/_/g, ' ');
        console.log(this.formData.employeeName);
      }
    }
    
    if (this.role === 'admin' || this.role === 'super_admin') {
      if (!this.formData.approverId || this.formData.approverId === '') {
        this.formData.approverId = this.employeeId;
      }
      if (!this.formData.approverName || this.formData.approverName === '') {
        this.formData.approverName = this.employeeName.split(`_${this.role}`)[0].replace(/_/g, ' ');
      }
    }
    
  }
  parseExistingData(data: string | null): { name: string; cost: number }[] {
    if (!data) return [];
    return data.split(',').map((entry) => {
      const [name, cost] = entry.split(' - ₹');
      return { name: name.trim(), cost: cost ? parseFloat(cost) : 0 };
    });
  }

  // onSubmit(form: any) {
  //   this.updateInclusionsAndExclusions()
  //   this.saveAllSignatures()
  //   if (!this.isAnyCheckboxChecked) {
  //     console.error('At least one inclusion must be selected.');
  //     return;
  //   }
  //   if (form.valid) {
  //     console.log('Form submitted successfully:', this.formData);
  //   } else {
  //     console.log('Form is invalid:', form);
  //   }
  // }
  // clearForm(): void {
  //   this.formData = {
  //     patientUHID: '',
  //     patientName: '',
  //     ageOfPatient: null,
  //     genderOfPatient: '',
  //     consultantName: '',
  //     estimationPreferredDate: '',
  //     totalDaysStay: 0,
  //     icuStay: 0,
  //     wardStay: 0,
  //     estimationCost: 0,
  //     estimationName: '',
  //     remarks: '',
  //     roomType: '',
  //     estimatedDate: '',
  //     estimationId: '',
  //     discountPercentage: 0,
  //     totalEstimationAmount: 0,
  //     signatureOf: 'patient',
  //     employeeName: '',
  //     approverName: '',
  //     patientSign: '',
  //     employeeSign: '',
  //     approverSign: '',
  //     employeeId: '',
  //     approverId: '',
  //     statusOfEstimation: '',
  //     includedItems: {
  //       wardICUStay: false,
  //       primaryConsultant: false,
  //       crossConsultation: false,
  //       implants: false,
  //       laboratoryImaging: false,
  //       instrumentEquipment: false,
  //       diet: false,
  //       nursing: false,
  //       surgeonOTAnesthesia: false,
  //       bedsideProcedure: false,
  //       otDrugs: false,
  //       drugsConsumables: false,
  //     } as InclusionsType,
  //     exclusions: [] as string[],
  //     inclusions: [] as string[],

  //   };
  //   if (this.patientSignaturePad) {
  //     this.patientSignaturePad.clear();
  //   }
  //   if (this.staffSignaturePad) {
  //     this.staffSignaturePad.clear();
  //   }
  //   if (this.approverSignaturePad) {
  //     this.approverSignaturePad.clear();
  //   }
  //   // Implement the logic to clear the form
  // }
  clearForm(): void {
    if (this.estimationForm) {
      this.estimationForm.resetForm();
      this.clearAllSignatures()
    }

  }
  calculateTotalEstimationAmount(): void {
    const { estimationCost, discountPercentage } = this.formData;

    // Ensure valid input values
    if (estimationCost >= 0 && discountPercentage >= 0) {
      // Calculate the discounted amount
      const discount = (estimationCost * discountPercentage) / 100;

      // Calculate total estimation amount
      this.formData.totalEstimationAmount = estimationCost - discount;
    } else {
      // Set totalEstimationAmount to 0 if inputs are invalid
      this.formData.totalEstimationAmount = 0;
    }
  }
  approveRequest(): void {
    if (this.role === 'admin' || this.role === 'super_admin') {
      this.formData.approverId = this.employeeId
      this.formData.approverName = this.employeeName.split(`_${this.role}`)[0];
    }

    this.updateInclusionsAndExclusions();
    this.saveAllSignatures();
    this.formData.statusOfEstimation = 'approved'
    this.calculateTotalEstimationAmount();
    const estimationData = {
      estimationId: this.estimationData.estimationId, // Replace this with the actual ID from your context
      updateFields: {
        patientUHID: this.formData.patientUHID,
        patientName: this.formData.patientName,
        ageOfPatient: this.formData.ageOfPatient,
        genderOfPatient: this.formData.genderOfPatient,
        consultantName: this.formData.consultantName,
        estimationPreferredDate: this.formData.estimationPreferredDate,
        icuStay: this.formData.icuStay,
        wardStay: this.formData.wardStay,
        estimationCost: this.formData.estimationCost,
        estimationName: this.formData.estimationName,
        remarks: this.formData.remarks,
        roomType: this.formData.roomType,
        estimatedDate: this.formData.estimatedDate,
        discountPercentage: this.formData.discountPercentage,
        totalEstimationAmount: this.formData.totalEstimationAmount,
        signatureOf: this.formData.signatureOf,
        employeeName: this.formData.employeeName,
        approverName: this.formData.approverName,
        patientSign: this.formData.patientSign,
        employeeSign: this.formData.employeeSign,
        approverSign: this.formData.approverSign,
        statusOfEstimation: this.formData.statusOfEstimation,
        employeeId: this.formData.employeeId,
        approverId: this.formData.approverId,
        totalDaysStay: this.formData.totalDaysStay,
        attenderName: this.formData.attenderName,
        approvedDateAndTime: new Date(),
        surgeryTime: this.formData.surgeryTime,
        staffRemarks: this.formData.staffRemarks,
        patientRemarks: this.formData.patientRemarks,
        implants: this.formData.implants,
        procedures: this.formData.procedures,
        instrumentals: this.formData.instrumentals,
        surgeryPackage: this.selectedSurgeryPackage,
        multipleEstimationCost: this.formData.multipleEstimationCost,
        costForGeneral: this.formData.costForGeneral,
        costForSemiPrivate: this.formData.costForSemiPrivate,
        costForVip: this.formData.costForVip,
        costForPrivate: this.formData.costForPrivate,
        costForPresidential: this.formData.costForPresidential,
        costForDeluxe: this.formData.costForDeluxe,
        selectedRoomCost: this.selectedRoomCost,
        patientEmail: this.formData.patientEmail,
        patientPhoneNumber: this.formData.patientPhoneNumber.toString()
      },
      inclusions: this.formData.inclusions,
      exclusions: this.formData.exclusions,
    };
    console.log(estimationData);
    this.estimationService.updateEstimationDetails(estimationData.estimationId, estimationData).subscribe(
      (response) => {
        console.log('Estimation updated successfully:', response);
        this.closeForm.emit();
        this.estimationForm.resetForm();
      },
      (error) => {
        console.error('Error updating estimation:', error);
      }
    );
    // this.estimationService.updateEstimationDetails(estimationData.estimationId, estimationData).subscribe(
    //   (response) => {
    //     console.log('Estimation updated successfully:', response);
    //     this.clearForm();
    //     this.closeForm.emit()
    //     this.estimationService.generateAndSendPdf(estimationData.estimationId, estimationData).subscribe(
    //       (pdfResponse) => {
    //         console.log("✅ PDF Generated & Sent via WhatsApp:", pdfResponse);
    //         this.messageService.add({ severity: 'success', summary: 'Success', detail: 'PDF Generated & Sent PDF via WhatsApp:!' });
    //         // const to = "ipbilling@rashtrotthanahospital.com"
    //         const to = "keerthanasaminathan0805@gmail.com"
    //         this.appointmentService.sendMailtoApprover(to, estimationData.estimationId, pdfResponse.filePath).subscribe(
    //           (response) => {
    //             console.log('Email sent successfully:', response);
    //           }, (error) => {
    //             console.error("❌ Error sending mail:", error);
    //           }
    //         )
    //       },
    //       (pdfError) => {
    //         console.error("❌ Error generating PDF:", pdfError);
    //       }
    //     );
    //   },
    //   (error) => {
    //     console.error('Error updating estimation:', error);
    //   }
    // );
    if (!this.estimationData.estimationId) {

    }
  }
  calculateWardStay(): void {
    const { totalDaysStay, icuStay } = this.formData;

    // Ensure valid input values
    if (totalDaysStay >= 0 && icuStay >= 0) {
      // Calculate ward stay
      this.formData.wardStay = Math.max(0, totalDaysStay - icuStay);
    }
  }
  // rejectRequest(): void {

  //   this.formData.statusOfEstimation = 'rejected'
  //   const estimationData = {
  //     estimationId: this.estimationData.estimationId, // Replace this with the actual ID from your context
  //     updateFields: {
  //       patientUHID: this.formData.patientUHID,
  //       patientName: this.formData.patientName,
  //       ageOfPatient: this.formData.ageOfPatient,
  //       genderOfPatient: this.formData.genderOfPatient,
  //       consultantName: this.formData.consultantName,
  //       estimationPreferredDate: this.formData.estimationPreferredDate,
  //       icuStay: this.formData.icuStay,
  //       wardStay: this.formData.wardStay,
  //       estimationCost: this.formData.estimationCost,
  //       estimationName: this.formData.estimationName,
  //       remarks: this.formData.remarks,
  //       roomType: this.formData.roomType,
  //       estimatedDate: this.formData.estimatedDate,
  //       discountPercentage: this.formData.discountPercentage,
  //       totalEstimationAmount: this.formData.totalEstimationAmount,
  //       signatureOf: this.formData.signatureOf,
  //       employeeName: this.formData.employeeName,
  //       approverName: this.formData.approverName,
  //       patientSign: this.formData.patientSign,
  //       employeeSign: this.formData.employeeSign,
  //       approverSign: this.formData.approverSign,
  //       statusOfEstimation: this.formData.statusOfEstimation,
  //       employeeId: this.formData.employeeId,
  //       approverId: this.formData.approverId,
  //       totalDaysStay: this.formData.totalDaysStay,
  //       attenderName: this.formData.attenderName,
  //       surgeryTime: this.formData.surgeryTime,
  //       staffRemarks: this.formData.staffRemarks,
  //       patientRemarks: this.formData.patientRemarks,
  //       implants: this.formData.implants,
  //       procedures: this.formData.procedures,
  //       instrumentals: this.formData.instrumentals,
  //       surgeryPackage: this.selectedSurgeryPackage,
  //       multipleEstimationCost: this.formData.multipleEstimationCost,
  //       costForGeneral: this.formData.costForGeneral,
  //       costForSemiPrivate: this.formData.costForSemiPrivate,
  //       costForVip: this.formData.costForVip,
  //       costForPrivate: this.formData.costForPrivate,
  //       costForPresidential: this.formData.costForPresidential,
  //       costForDeluxe: this.formData.costForDeluxe,
  //       selectedRoomCost: this.selectedRoomCost,
  //       patientEmail: this.formData.patientEmail,
  //       patientPhoneNumber: this.formData.patientPhoneNumber.toString()
  //     },
  //     inclusions: this.formData.inclusions,
  //     exclusions: this.formData.exclusions,
  //   };
  //   console.log(estimationData);
  //   this.estimationService.updateEstimationDetails(estimationData.estimationId, estimationData).subscribe(
  //     (response) => {
  //       console.log('Estimation updated successfully:', response);
  //       this.clearForm();
  //     },
  //     (error) => {
  //       console.error('Error updating estimation:', error);
  //     }
  //   );

  // }
  loadSignatureToCanvas(canvasRef: ElementRef<HTMLCanvasElement>, base64Data: string, pad:SignaturePad): void {
    if (!canvasRef || !canvasRef.nativeElement) {
      console.error("Canvas reference is missing!");
      return;
    }
    if (!base64Data || !base64Data.startsWith("data:image/png;base64,")) {
      console.error("Invalid Base64 data:", base64Data);
      return;
    }
    // const canvas = canvasRef.nativeElement;
    // const ctx = canvas.getContext('2d');
    // if (ctx) {
    //   const img = new Image();
    //   img.src = base64Data;

    //   img.onload = () => {
    //     ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear any existing signature
    //     ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Draw the new signature
    //   };

    //   img.onerror = () => {
    //     console.error('Error loading signature image');
    //   };
    // }
    try {
      pad.fromDataURL(base64Data);
      pad['_isEmpty'] = false; // Manually set _isEmpty to false
    } catch (err) {
      console.error("Error loading signature from base64:", err);
    }
  }
  getInvalidControls(form: NgForm) {
    const invalidControls = [];
    for (const name in form.controls) {
      if (form.controls[name].invalid) {
        invalidControls.push(name);
      }
    }
    return invalidControls;
  }
  acceptRequest() {
    const { inclusions, exclusions, followUpDates, ...estimationDataWithoutInclusions } = this.estimationData;
    this.saveAllSignatures();
    const estimationData = {
      estimationId: this.estimationData.estimationId,
      updateFields: {
        ...estimationDataWithoutInclusions,
        statusOfEstimation: 'accepted',
        patientSign: this.formData.patientSign,
        signatureOf: this.formData.signatureOf,
        attenderName: this.formData.attenderName,
      },
      inclusions: this.formData.inclusions,
      exclusions: this.formData.exclusions,
    }
    this.estimationService.updateEstimationDetails(estimationData.estimationId, estimationData).subscribe(
      (response) => {
        console.log('Estimation updated successfully:', response);
        this.clearForm();
        this.closeForm.emit()
        this.estimationService.generateAndSendPdf(estimationData.estimationId, estimationData).subscribe(
          (pdfResponse) => {
            console.log("✅ PDF Generated & Sent via WhatsApp:", pdfResponse);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'PDF Generated & Sent PDF via WhatsApp:!' });
            // const to = "ipbilling@rashtrotthanahospital.com"
            const to = "keerthanasaminathan0805@gmail.com"
            this.appointmentService.sendMailtoApprover(to, estimationData.estimationId, pdfResponse.filePath).subscribe(
              (response) => {
                console.log('Email sent successfully:', response);
              }, (error) => {
                console.error("❌ Error sending mail:", error);
              }
            )
          },
          (pdfError) => {
            console.error("❌ Error generating PDF:", pdfError);
          }
        );
      },
      (error) => {
        console.error('Error updating estimation:', error);
      }
    );
  }

  onSubmit(form: any) {
    this.updateInclusionsAndExclusions(); // Prepare inclusions and exclusions
    this.saveAllSignatures(); // Save the signatures
    console.log(form.controls);
    console.log(this.getInvalidControls(form))
    if (!this.isAnyCheckboxChecked) {
      console.error('At least one inclusion must be selected.');
      return;
    }
    // if (this.estimationData.statusOfEstimation === 'pending') {
    //   this.formData.statusOfEstimation = 'submitted'
    // }

    if (form.valid) {
      if (this.estimationData && this.estimationData.estimationId) {
        const estimationData = {
          estimationId: this.estimationData.estimationId, // Replace this with the actual ID from your context
          updateFields: {
            patientUHID: this.formData.patientUHID,
            patientName: this.formData.patientName,
            ageOfPatient: this.formData.ageOfPatient,
            genderOfPatient: this.formData.genderOfPatient,
            consultantName: this.formData.consultantName,
            consultantId: this.formData.consultantId,
            estimationType: this.selectedEstimationType,
            estimationPreferredDate: this.formData.estimationPreferredDate,
            icuStay: this.formData.icuStay,
            wardStay: this.formData.wardStay,
            estimationCost: this.formData.estimationCost,
            estimationName: this.formData.estimationName,
            remarks: this.formData.remarks,
            roomType: this.formData.roomType,
            estimatedDate: this.formData.estimatedDate,
            discountPercentage: this.formData.discountPercentage,
            totalEstimationAmount: this.formData.totalEstimationAmount,
            signatureOf: this.formData.signatureOf,
            employeeName: this.formData.employeeName,
            approverName: this.formData.approverName,
            patientSign: this.formData.patientSign,
            employeeSign: this.formData.employeeSign,
            approverSign: this.formData.approverSign,
            statusOfEstimation: 'submitted',
            employeeId: this.formData.employeeId,
            totalDaysStay: this.formData.totalDaysStay,
            attenderName: this.formData.attenderName,
            staffRemarks: this.formData.staffRemarks,
            patientRemarks: this.formData.patientRemarks,
            implants: this.formData.implants,
            procedures: this.formData.procedures,
            instrumentals: this.formData.instrumentals,
            surgeryPackage: this.selectedSurgeryPackage,
            multipleEstimationCost: this.formData.multipleEstimationCost,
            costForGeneral: this.formData.costForGeneral,
            costForSemiPrivate: this.formData.costForSemiPrivate,
            costForVip: this.formData.costForVip,
            costForPrivate: this.formData.costForPrivate,
            costForPresidential: this.formData.costForPresidential,
            costForDeluxe: this.formData.costForDeluxe,
            selectedRoomCost: this.selectedRoomCost,
            patientEmail: this.formData.patientEmail,
            patientPhoneNumber: this.formData.patientPhoneNumber.toString()
          },
          inclusions: this.formData.inclusions,
          exclusions: this.formData.exclusions,
        };
        console.log(estimationData);
        this.estimationService.updateEstimationDetails(estimationData.estimationId, estimationData).subscribe(
          (response) => {
            console.log('Estimation updated successfully:', response);
            this.clearForm();
            this.closeForm.emit()
          },
          (error) => {
            console.error('Error updating estimation:', error);
          }
        );
      } else {
        const estimationData = {
          // Replace this with the actual ID from your context
          updateFields: {
            patientUHID: Number(this.formData.patientUHID),
            patientName: this.formData.patientName,
            ageOfPatient: this.formData.ageOfPatient,
            genderOfPatient: this.formData.genderOfPatient,
            consultantName: this.formData.consultantName,
            consultantId: this.formData.consultantId,
            estimationType: this.selectedEstimationType,
            estimationPreferredDate: this.formData.estimationPreferredDate,
            patientPhoneNumber: this.formData.patientPhoneNumber.toString(),
            icuStay: this.formData.icuStay,
            wardStay: this.formData.wardStay,
            estimationCost: this.formData.estimationCost,
            estimationName: this.formData.estimationName,
            remarks: this.formData.remarks,
            roomType: this.formData.roomType,
            estimatedDate: this.formData.estimatedDate,
            discountPercentage: this.formData.discountPercentage,
            totalEstimationAmount: this.formData.totalEstimationAmount,
            signatureOf: this.formData.signatureOf,
            employeeName: this.formData.employeeName,
            approverName: this.formData.approverName,
            patientSign: this.formData.patientSign,
            employeeSign: this.formData.employeeSign,
            approverSign: this.formData.approverSign,
            statusOfEstimation: 'submitted',
            employeeId: this.formData.employeeId,
            totalDaysStay: this.formData.totalDaysStay,
            attenderName: this.formData.attenderName,
            surgeryTime: this.formData.surgeryTime,
            staffRemarks: this.formData.staffRemarks,
            patientRemarks: this.formData.patientRemarks,
            implants: this.formData.implants,
            procedures: this.formData.procedures,
            instrumentals: this.formData.instrumentals,
            surgeryPackage: this.selectedSurgeryPackage,
            multipleEstimationCost: this.formData.multipleEstimationCost,
            costForGeneral: this.formData.costForGeneral,
            costForSemiPrivate: this.formData.costForSemiPrivate,
            costForVip: this.formData.costForVip,
            costForPrivate: this.formData.costForPrivate,
            costForPresidential: this.formData.costForPresidential,
            costForDeluxe: this.formData.costForDeluxe,
            selectedRoomCost: this.selectedRoomCost,
            patientEmail: this.formData.patientEmail,
            submittedDateAndTime: new Date()
          },
          inclusions: this.formData.inclusions,
          exclusions: this.formData.exclusions,
        };
        console.log(estimationData);
        this.estimationService.createNewEstimationDetails(estimationData).subscribe(
          (response) => {
            console.log('Estimation updated successfully:', response);
            this.clearForm();
            this.closeForm.emit()
          },
          (error) => {
            console.error('Error updating estimation:', error);
          }
        );
      }
    } else {
      console.log('Form is invalid:', form);
    }
  }


  get isAnyCheckboxChecked(): boolean {
    return Object.values(this.formData.includedItems).some((value) => value === true);
  }
  updateInclusionsAndExclusions() {
    const includedItems = this.formData.includedItems; // Access the structured object
    const checkedInclusions: string[] = [];
    const uncheckedExclusions: string[] = [];

    for (const key in includedItems) {
      if (includedItems[key as keyof InclusionsType]) {
        checkedInclusions.push(key); // Add names of checked inclusions
      } else {
        uncheckedExclusions.push(key); // Add names of unchecked exclusions
      }
    }

    // Update the formData object
    this.formData.inclusions = checkedInclusions; // Store names of checked inclusions
    this.formData.exclusions = uncheckedExclusions; // Store names of unchecked exclusions

    console.log('Updated Inclusions:', this.formData.inclusions);
    console.log('Updated Exclusions:', this.formData.exclusions);
  }
  ngOnDestroy(): void {
    this.clearForm()
    this.closeForm.emit()
    // this.healthCheckupService.unlockService(this.estimationData.id).subscribe({
    //   next: (response) => {
    //     console.log('Service unlocked successfully:', response);
    //   },
    //   error: (error) => {
    //     console.error('Error unlocking service:', error);
    //   },
    // });
  }
  categories: Array<"implants" | "procedures" | "instrumentals"> = ["implants", "procedures", "instrumentals"];

  // ✅ Track selected categories
  selectedCategories: Array<"implants" | "procedures" | "instrumentals"> = [];

  // ✅ Track dropdown open/close state
  isDropdownOpen = false;

  // ✅ Store entries dynamically per category
  selectedItems: Record<"implants" | "procedures" | "instrumentals", { name: string; cost: number }[]> = {
    implants: [],
    procedures: [],
    instrumentals: [],
  };

  // ✅ Toggle dropdown visibility
  toggleInclusion(event: Event) {
    event.stopPropagation();
    event.preventDefault()
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // ✅ Toggle category selection
  toggleCategory(category: "implants" | "procedures" | "instrumentals", event: Event) {
    event.stopPropagation();
    event.preventDefault()
    if (this.selectedCategories.includes(category)) {
      this.selectedCategories = this.selectedCategories.filter((cat) => cat !== category);
    } else {
      this.selectedCategories.push(category);
    }
    // Ensure category exists in selectedItems
    if (!this.selectedItems[category]) {
      this.selectedItems[category] = [];
    }
  }

  // ✅ Add a new entry for a selected category
  addItem(category: "implants" | "procedures" | "instrumentals", event: Event) {
    event.preventDefault()
    if (!this.selectedItems[category]) {
      this.selectedItems[category] = [];
    }
    this.selectedItems[category].push({ name: '', cost: 0 });
    this.updateFormData()
  }

  // ✅ Remove an entry from a category
  removeItem(category: "implants" | "procedures" | "instrumentals", index: number, event: Event) {
    event.preventDefault()
    this.selectedItems[category].splice(index, 1);
    this.updateFormData()
    // this.updateEstimationCost()
  }

  // ✅ Format data for form submission
  formatDataForSubmission() {
    console.log(this.selectedItems);

    const formattedData = {
      implants: this.selectedItems.implants.map((item) => `${item.name} - ₹${item.cost}`).join(", "),
      procedures: this.selectedItems.procedures.map((item) => `${item.name} - ₹${item.cost}`).join(", "),
      instrumentals: this.selectedItems.instrumentals.map((item) => `${item.name} - ₹${item.cost}`).join(", "),
    };
    console.log("Formatted Submission Data:", formattedData);
  }
  updateFormData(): void {
    this.formData.implants = this.selectedItems.implants
      ?.filter(item => item.name && item.cost) // ✅ Ignore empty values
      .map((item) => `${item.name} - ₹${item.cost}`)
      .join(", ") || '';

    this.formData.procedures = this.selectedItems.procedures
      ?.filter(item => item.name && item.cost) // ✅ Ignore empty values
      .map((item) => `${item.name} - ₹${item.cost}`)
      .join(", ") || '';

    this.formData.instrumentals = this.selectedItems.instrumentals
      ?.filter(item => item.name && item.cost) // ✅ Ignore empty values
      .map((item) => `${item.name} - ₹${item.cost}`)
      .join(", ") || '';

    console.log("Updated formData:", this.formData);
    this.updateEstimationCost()
  }

  trackByIndex(index: number, item: any) {
    return index; // Ensures Angular tracks items by their index
  }
  updateEstimationCosts() {
    console.log("Updating Estimation Costs based on surgery names:", this.formData.estimationName);

    if (this.formData.estimationName) {
      const surgeries = this.formData.estimationName.split(',').map(s => s.trim());

      // Ensure estimationCosts has the correct length
      const newEstimationCosts = new Array(surgeries.length).fill(0);

      if (newEstimationCosts.length > 1) {
        this.selectedSurgeryPackage = 'multiple surgeries'
      }

      // Preserve existing costs
      for (let i = 0; i < surgeries.length; i++) {
        if (this.estimationCosts[i] !== undefined) {
          newEstimationCosts[i] = this.estimationCosts[i];
        }
      }

      this.estimationCosts = newEstimationCosts;
      this.updateEstimationCostString();
    } else {
      this.estimationCosts = [];
      this.formData.multipleEstimationCost = ''; // Reset when empty
    }
  }





  /**
   * Converts estimationCosts array into a comma-separated string.
   */
  updateEstimationCostString() {
    this.formData.multipleEstimationCost = this.estimationCosts.join(', ');
    console.log("Updated multipleEstimationCost:", this.formData.multipleEstimationCost);
  }
  // loadSurgeryNames(): void {
  //   // if (!this.selectedDepartmentId || !this.selectedEstimationType) return;
  //  console.log( this.selectedEstimationType)

  //   this.estimationService.getEstimationsByType(this.selectedEstimationType).subscribe(
  //     (surgeryNames) => {
  //       this.estimationSuggestions = surgeryNames;
  //       console.log(this.estimationSuggestions)
  //     },
  //     (error) => {
  //       console.error('Error fetching surgery names:', error);
  //     }
  //   );
  // }

  onEstimationInput(): void {
    // Filter suggestions based on the input text
    console.log(this.formData.estimationName)
    console.log(this.showEstimationSuggestions)
    this.showEstimationSuggestions = true;
    if (this.formData.estimationName.trim()) {
      this.filteredSurgeryNames = this.estimationSuggestions.filter((estimation) =>
        estimation.toLowerCase().includes(this.formData.estimationName.toLowerCase())
      );
    } else {
      this.filteredSurgeryNames = [];
    }

  }
  onEstimationSelect(estimation: string): void {
    this.formData.estimationName = estimation; // Set the selected suggestion in the input field
    this.showEstimationSuggestions = false; // Hide the suggestions dropdown
    // console.log(this.estimationText)
  }
  // initializeEstimationInputs() {
  //   // Extract surgeries from estimationName
  //   this.surgeries = this.formData.estimationName
  //     ? this.formData.estimationName.split(',').map(s => s.trim())
  //     : [];

  //   // // Initialize cost strings for each room type
  //   // this.formData.costForGeneral = '';
  //   // this.formData.costForSemiPrivate = '';
  //   // this.formData.costForPrivate = '';
  //   // this.formData.costForVip = '';
  //   this.availableRooms.forEach(room => {
  //     let costVariable = `costFor${room.name.replace(/\s|-/g, '')}`;

  //     // ✅ Ensure it's a string, not undefined
  //     if (!(this.formData as any)[costVariable]) {
  //       (this.formData as any)[costVariable] = this.surgeries.map(() => '').join(',');
  //     }
  //   });
  //   // Map costs to each room type
  //   this.selectedRooms.forEach(room => {
  //     let costVariable = `costFor${room.name.replace(/\s/g, '')}`; // Format variable name
  //     (this.formData as any)[costVariable] = this.surgeries.map(() => '').join(','); // Empty cost string
  //   });
  //   console.log(this.selectedRooms)

  //   console.log('Initialized Room Costs:', this.formData);
  // }
  initializeEstimationInputs() {
    // ✅ Extract surgeries from estimationName

    this.surgeries = this.formData.estimationName
      ? this.formData.estimationName.split(',').map(s => s.trim())
      : [];

    console.log("Loaded Surgeries:", this.surgeries);

    // ✅ Initialize cost strings for each room type
    this.availableRooms.forEach(room => {
      let costVariable = this.mapRoomNameToCostKey(room.name);

      // ✅ Ensure it's a string and loads existing data
      if (!(this.formData as any)[costVariable]) {
        (this.formData as any)[costVariable] = this.estimationData?.[costVariable]
          ? this.estimationData[costVariable]
          : this.surgeries.map(() => '').join(',');
      }
    });

    console.log("Initialized Room Costs:", this.formData);
  }




  updateSelectedRoom() {
    const selectedRoom = this.selectedRoomType;
    console.log(selectedRoom)
    if (selectedRoom) {
      let costVariable = `costFor${this.selectedRoomType.join('_').replace(/\s/g, '')}`
      // let costVariable = this.mapRoomNameToCostKey(selectedRoom);
      this.selectedRoomCost = `${selectedRoom} - ${(this.formData as any)[costVariable]}`;
      // console.log(this.selectedRoomCost)
    }
  }
  getRoomCostVariable(roomName: string, surgery: string): string {
    let key = this.mapRoomNameToCostKey(roomName);
    // console.log(key)

    if (!(this.formData as any)[key] || typeof (this.formData as any)[key] !== 'string') {
      (this.formData as any)[key] = this.surgeries.map(() => '').join(',');
    }

    let costArray = (this.formData as any)[key]?.split(',');

    // console.log((this.formData as any)[key])

    const surgeryIndex = this.surgeries.indexOf(surgery);
    if (surgeryIndex !== -1 && surgeryIndex < costArray.length) {
      // console.log(`🔍 Fetching cost for ${surgery} in ${roomName}:`, costArray[surgeryIndex]);
      return costArray[surgeryIndex] || '';
    }

    return '';
  }



  updateRoomCost(roomName: string, surgery: string, value: string): void {
    let key = this.mapRoomNameToCostKey(roomName);
    // console.log(key)

    if (typeof (this.formData as any)[key] !== 'string') {
      (this.formData as any)[key] = this.surgeries.map(() => '').join(',');
    }

    let costArray = (this.formData as any)[key].split(',');

    // ✅ Ensure the array length matches the number of surgeries
    while (costArray.length < this.surgeries.length) {
      costArray.push('');
    }

    // ✅ Update only the correct index
    const surgeryIndex = this.surgeries.indexOf(surgery);
    if (surgeryIndex !== -1) {
      costArray[surgeryIndex] = value;
    }

    (this.formData as any)[key] = costArray.join(',');

    // console.log(`📝 Updating cost for ${surgery} in ${roomName}: ${value}`);
    this.calculateEstimationCostForRoom(roomName);

    // ✅ Force Angular to detect changes and update the UI
    this.cdr.detectChanges();
  }
  calculateEstimationCostForRoom(roomName: string): void {
    let key = this.mapRoomNameToCostKey(roomName);
    const costString = (this.formData as any)[key] || '';
  
    let extractedNumbers = costString.match(/\d+/g)?.map(Number) || [];
    
    if (costString.includes(',')) {
      this.formData.multipleEstimationCost = extractedNumbers.join(',');
    } else {
      this.formData.multipleEstimationCost = '';
    }
  
    const totalCost = extractedNumbers.reduce((sum: number, num: number) => sum + num, 0);
    this.formData.estimationCost = totalCost;
    this.roomCost = totalCost;
    if (this.selectedRoom?.name === roomName) {
      this.selectedRoomCost = `${roomName} - ₹${totalCost}`;
    }
    console.log(this.selectedRoomCost)
  
    console.log("Updated Estimation Cost:", totalCost, this.formData.multipleEstimationCost);
  }
  
  private inputTimeout: any;

  onCostInputChange(value: string, roomName: string, surgery: string): void {
    // ✅ Debounce input changes to prevent excessive updates
    clearTimeout(this.inputTimeout);
    this.inputTimeout = setTimeout(() => {
      this.updateRoomCost(roomName, surgery, value);
    }, 300);  // Adjust delay if needed
  }


  selectRoom(room: { name: string; cost: number }) {
    this.selectedRoom = room;

    // ✅ Normalize room key (remove spaces and hyphens)
    // let costVariable = `costFor${room.name.replace(/\s|-/g, '')}`;
    let costVariable = this.mapRoomNameToCostKey(room.name);

    // ✅ Retrieve the corresponding cost for the selected room
    let roomCost = (this.formData as any)[costVariable] || '';
    let roomCostString = (this.formData as any)[costVariable] || '';

    this.selectedRoomCost = `${room.name} - ₹${roomCost}`;
    console.log("Selected Room Cost:", this.selectedRoomCost);
    // let extractedNumbers = roomCostString.match(/\d+/g)?.map(Number) || [];
    // if (roomCostString.includes(',')) {
    //   this.formData.multipleEstimationCost = extractedNumbers.join(',');
    // } else {
    //   this.formData.multipleEstimationCost = ''; // Reset if no comma
    // }

    // let totalCost = extractedNumbers.reduce((sum: any, num: any) => sum + num, 0);

    // // ✅ Store the total cost in formData for estimation
    // this.formData.estimationCost = totalCost;
    // this.roomCost = totalCost
    this.calculateEstimationCostForRoom(room.name);

    console.log("Total Estimation Cost:", this.formData.estimationCost, this.formData.multipleEstimationCost);
  }
  // updateEstimationCost() {
  //   // ✅ Ensure estimationCost is initialized correctly
  //   this.formData.estimationCost = this.formData.estimationCost || 0;
  
  //   let additionalCost = 0;
  
  //   // ✅ Mapping of formData fields to their corresponding checkboxes in includedItems
  //   const categoryCheckboxMapping: { [key: string]: string } = {
  //     "implants": "implants",
  //     "procedures": "bedsideProcedure", // Procedures is linked to bedsideProcedure checkbox
  //     "instrumentals": "instrumentEquipment",
  //   };
  
  //   // ✅ Loop through the defined categories
  //   Object.keys(categoryCheckboxMapping).forEach((category) => {
  //     let checkboxKey = categoryCheckboxMapping[category]; // Get the corresponding checkbox key
  
  //     let isChecked = (this.formData.includedItems as any)[checkboxKey]; // Check if the category is selected
  
  //     if (!isChecked) {
  //       let categoryString = (this.formData as any)[category] || "";
  //       console.log(category, ":", categoryString);
  
  //       // ✅ Extract and sum the numerical values correctly
  //       let extractedNumbers = categoryString.match(/\d+/g)?.map(Number) || [];
  //       let categoryTotal = extractedNumbers.reduce((sum:any, num:any) => sum + num, 0);
  
  //       additionalCost += categoryTotal;
  //     }
  //   });
  
  //   // ✅ Ensure the cost updates correctly
  //   this.formData.estimationCost = Number(this.formData.estimationCost) + additionalCost;
  
  //   console.log("Updated Estimation Cost:", this.formData.estimationCost);
  // }

  updateEstimationCost() {
    // Reset estimationCost each time to avoid duplication
    let baseEstimationCost = 0; // Start from 0 and rebuild the total cost
  
    const categoryCheckboxMapping: { [key: string]: string } = {
      "implants": "implants",
      "procedures": "bedsideProcedure",
      "instrumentals": "instrumentEquipment",
    };
  
    // Loop through each category to sum costs conditionally
    Object.keys(categoryCheckboxMapping).forEach((category) => {
      const checkboxKey = categoryCheckboxMapping[category];
      let isChecked = (this.formData.includedItems as any)[checkboxKey]; 
  
      if (!isChecked) {
        let categoryString = (this.formData as any)[category] || "";
        console.log(category, ":", categoryString);
  
        // Extract and sum numerical values safely
        const extractedNumbers = categoryString.match(/\d+/g)?.map(Number) || [];
        const categoryTotal = extractedNumbers.reduce((sum:any, num:any) => sum + num, 0);
  
        baseEstimationCost += categoryTotal;
      }
      
    });
  
    // Assign the recalculated total cost directly
    this.formData.estimationCost = this.roomCost + baseEstimationCost;

  
    console.log("Updated Estimation Cost:", this.formData.estimationCost);
  }
  

  
  
  showDatePicker(event: Event) {
    (event.target as HTMLInputElement).showPicker(); // ✅ Opens date picker on input click
  }
  



  rejectRequest(): void {
    // Show popup to input rejection reason
    this.rejectionReason = ''; // Reset previous reason
    this.showRejectReasonPopup = true;
  }
  submitRejection(): void {
    if (!this.rejectionReason.trim()) {
      alert('Please enter a valid reason for rejection.');
      return;
    }
  
    this.formData.statusOfEstimation = 'rejected'; // Assuming 'staffRemarks' is the field to store rejection reason
  
    const estimationData = {
      estimationId: this.estimationData.estimationId,
      updateFields: {
        patientUHID: this.formData.patientUHID,
        patientName: this.formData.patientName,
        ageOfPatient: this.formData.ageOfPatient,
        genderOfPatient: this.formData.genderOfPatient,
        consultantName: this.formData.consultantName,
        estimationPreferredDate: this.formData.estimationPreferredDate,
        icuStay: this.formData.icuStay,
        wardStay: this.formData.wardStay,
        estimationCost: this.formData.estimationCost,
        estimationName: this.formData.estimationName,
        remarks: this.formData.remarks,
        roomType: this.formData.roomType,
        estimatedDate: this.formData.estimatedDate,
        discountPercentage: this.formData.discountPercentage,
        totalEstimationAmount: this.formData.totalEstimationAmount,
        signatureOf: this.formData.signatureOf,
        employeeName: this.formData.employeeName,
        approverName: this.formData.approverName,
        patientSign: this.formData.patientSign,
        employeeSign: this.formData.employeeSign,
        approverSign: this.formData.approverSign,
        statusOfEstimation: this.formData.statusOfEstimation,
        employeeId: this.formData.employeeId,
        approverId: this.formData.approverId,
        totalDaysStay: this.formData.totalDaysStay,
        attenderName: this.formData.attenderName,
        surgeryTime: this.formData.surgeryTime,
        staffRemarks: this.formData.staffRemarks, // Updated rejection reason
        patientRemarks: this.formData.patientRemarks,
        implants: this.formData.implants,
        procedures: this.formData.procedures,
        instrumentals: this.formData.instrumentals,
        surgeryPackage: this.selectedSurgeryPackage,
        multipleEstimationCost: this.formData.multipleEstimationCost,
        costForGeneral: this.formData.costForGeneral,
        costForSemiPrivate: this.formData.costForSemiPrivate,
        costForVip: this.formData.costForVip,
        costForPrivate: this.formData.costForPrivate,
        costForPresidential: this.formData.costForPresidential,
        costForDeluxe: this.formData.costForDeluxe,
        selectedRoomCost: this.selectedRoomCost,
        patientEmail: this.formData.patientEmail,
        patientPhoneNumber: this.formData.patientPhoneNumber.toString(),
        rejectReason: this.rejectionReason,
      },
      inclusions: this.formData.inclusions,
      exclusions: this.formData.exclusions,
    };
  
    this.estimationService.updateEstimationDetails(estimationData.estimationId, estimationData)
      .subscribe(
        (response) => {
          console.log('Estimation rejected successfully:', response);
          this.clearForm();
          this.showRejectReasonPopup = false;
          this.rejectionReason = '';
        },
        (error) => {
          console.error('Error rejecting estimation:', error);
        }
      );
  }
  
  cancelRejection(): void {
    this.showRejectReasonPopup = false;
    this.rejectionReason = '';
  }
  isRequiredSignatureMissing(): boolean {
    const status = this.formData.statusOfEstimation;

    // console.log(this.approverSignaturePad)
  
    // Case 1: If it's a new estimation, staff signature is always required
    if (this.estimationData === null) {
      return this.staffSignaturePad?.isEmpty?.() ?? true;
    }
  
    // Case 2: Role-based override for sub_admin
    if (this.role === 'sub_admin') {
      if (status === 'pending' || status === 'submitted') {
        return this.staffSignaturePad?.isEmpty?.() ?? true;
      }
    }
  
    // Case 3: Generic fallback based on status
    switch (status) {
      case 'pending':
        return this.staffSignaturePad?.isEmpty?.() ?? true;
      case 'submitted':
        console.log('submitted')
        return this.approverSignaturePad?.isEmpty?.() ?? true;
      case 'approved':
        return this.patientSignaturePad?.isEmpty?.() ?? true;
      default:
        return false;
    }
  }
  
  
  
  

}


