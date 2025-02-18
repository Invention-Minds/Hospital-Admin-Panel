import { Component, ViewChild, ElementRef, Input, ChangeDetectorRef, AfterViewInit, Output, EventEmitter } from '@angular/core';
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
  selectedSurgeryPackage: string = 'single surgery'

  constructor(private estimationService: EstimationService, private cdr: ChangeDetectorRef, private messageService: MessageService, private doctorService: DoctorServiceService, private appointmentService: AppointmentConfirmService) {
    this.filteredRooms = [...this.availableRooms];
    this.availableRooms = [
      { name: 'General', cost: 500 },
      { name: 'Semi-Private', cost: 1000 },
      { name: 'Private', cost: 1500 },
      { name: 'Deluxe', cost: 2000 },
      { name: 'VIP Suite', cost: 3000 },
      { name: 'Presidential Suite', cost: 5000 }
    ];

  }

  ngAfterViewInit(): void {
    this.patientSignaturePad = new SignaturePad(this.patientCanvasRef.nativeElement);
    this.staffSignaturePad = new SignaturePad(this.staffCanvasRef.nativeElement);
    this.approverSignaturePad = new SignaturePad(this.approverCanvasRef.nativeElement);
    this.cdr.detectChanges();
    if (this.formData.patientSign) {
      this.loadSignatureToCanvas(this.patientCanvasRef, this.formData.patientSign);
    }
    if (this.formData.employeeSign) {
      this.loadSignatureToCanvas(this.staffCanvasRef, this.formData.employeeSign);
    }
    if (this.formData.approverSign) {
      console.log(this.formData.approverSign)
      console.log(this.formData.approverSign, this.approverCanvasRef)

      this.loadSignatureToCanvas(this.approverCanvasRef, this.formData.approverSign);
    }
  }
  availableRooms = [
    { name: 'General', cost: 500 },
    { name: 'Semi-Private', cost: 1000 },
    { name: 'Private', cost: 1500 },
    { name: 'Deluxe', cost: 2000 },
    { name: 'VIP Suite', cost: 3000 },
    { name: 'Presidential Suite', cost: 5000 }
  ];

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

    // ✅ Force validation check
    if (this.estimationForm.controls['roomType']) {
      this.estimationForm.controls['roomType'].updateValueAndValidity();
    }
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


  saveAllSignatures(): void {
    // Save signatures to formData
    //   if (this.approverSignaturePad.isEmpty()) {
    //     console.error("Approver Signature is empty. Skipping save.");
    //     return;
    // }
    this.formData.patientSign = this.patientSignaturePad.toDataURL();
    this.formData.employeeSign = this.staffSignaturePad.toDataURL();
    this.formData.approverSign = this.approverSignaturePad.toDataURL();

    console.log('Form Data with Signatures:', this.formData);
    console.log("Patient Signature Base64:", this.formData.patientSign.substring(0, 100));
    console.log("Employee Signature Base64:", this.formData.employeeSign.substring(0, 100));
    console.log("Approver Signature Base64:", this.formData.approverSign.substring(0, 100));
    console.log(this.approverCanvasRef, this.formData.approverSign)
  }
  clearAllSignatures(): void {
    // Clear all signature pads and reset their corresponding formData properties
    this.patientSignaturePad.clear();
    this.staffSignaturePad.clear();
    this.approverSignaturePad.clear();

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
    ageOfPatient: null,
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
    surgeryTime: '',
    statusOfEstimation: '',
    staffRemarks: '',
    patientRemarks: '',
    implants: '',
    instrumentals: '',
    procedures: '',
    multipleEstimationCost:'',
    surgeryPackage:'',
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
  onUHIDChange(): void {
    console.log(this.formData.patientUHID)
    if (!this.formData.patientUHID) {
      // Reset fields if UHID is empty
      this.formData.patientName = '';
      this.formData.ageOfPatient = null;
      this.formData.genderOfPatient = '';
      this.formData.patientPhoneNumber = ''
      return;
    }
    console.log(this.allEstimations)
    const matchingEstimation = this.allEstimations.find(
      (estimation) => String(estimation.patientUHID) === String(this.formData.patientUHID)
    );
    console.log("🔍 Matching Estimation:", matchingEstimation);

    console.log(matchingEstimation)
    if (matchingEstimation) {
      this.formData.patientName = matchingEstimation.patientName;
      this.formData.ageOfPatient = matchingEstimation.ageOfPatient;
      this.formData.genderOfPatient = matchingEstimation.genderOfPatient;
      this.formData.patientPhoneNumber = matchingEstimation.patientPhoneNumber;
    } else {
      // Reset if no match found
      this.formData.patientName = '';
      this.formData.ageOfPatient = null;
      this.formData.genderOfPatient = '';
      this.formData.patientPhoneNumber = ''
    }
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
    if (!this.selectedDepartmentId || !this.selectedEstimationType) return;

    this.estimationService.getEstimationsByDepartment(this.selectedDepartmentId, this.selectedEstimationType).subscribe(
      (surgeryNames) => {
        this.filteredSurgeryNames = surgeryNames;
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
    this.availableRooms = [
      { name: 'General', cost: 500 },
      { name: 'Semi-Private', cost: 1000 },
      { name: 'Private', cost: 1500 },
      { name: 'Deluxe', cost: 2000 },
      { name: 'VIP Suite', cost: 3000 },
      { name: 'Presidential Suite', cost: 5000 }
    ];
    

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
    if (this.role === 'sub_admin') {
      this.formData.employeeId = this.employeeId!
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
        multipleEstimationCost: this.formData.multipleEstimationCost
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
  rejectRequest(): void {
    this.formData.statusOfEstimation = 'rejected'
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
        surgeryTime: this.formData.surgeryTime,
        staffRemarks: this.formData.staffRemarks,
        patientRemarks: this.formData.patientRemarks,
        implants: this.formData.implants,
        procedures: this.formData.procedures,
        instrumentals: this.formData.instrumentals,
        surgeryPackage: this.selectedSurgeryPackage,
        multipleEstimationCost: this.formData.multipleEstimationCost
      },
      inclusions: this.formData.inclusions,
      exclusions: this.formData.exclusions,
    };
    console.log(estimationData);
    this.estimationService.updateEstimationDetails(estimationData.estimationId, estimationData).subscribe(
      (response) => {
        console.log('Estimation updated successfully:', response);
        this.clearForm();
      },
      (error) => {
        console.error('Error updating estimation:', error);
      }
    );

  }
  loadSignatureToCanvas(canvasRef: ElementRef<HTMLCanvasElement>, base64Data: string): void {
    if (!canvasRef || !canvasRef.nativeElement) {
      console.error("Canvas reference is missing!");
      return;
    }
    if (!base64Data || !base64Data.startsWith("data:image/png;base64,")) {
      console.error("Invalid Base64 data:", base64Data);
      return;
    }
    const canvas = canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const img = new Image();
      img.src = base64Data;

      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear any existing signature
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Draw the new signature
      };

      img.onerror = () => {
        console.error('Error loading signature image');
      };
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
            multipleEstimationCost: this.formData.multipleEstimationCost
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
            patientPhoneNumber: this.formData.patientPhoneNumber,
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
            multipleEstimationCost: this.formData.multipleEstimationCost
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
}


