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
  allEstimations: any[] = []

  constructor(private estimationService: EstimationService, private cdr: ChangeDetectorRef, private messageService: MessageService, private doctorService: DoctorServiceService, private appointmentService: AppointmentConfirmService) { }

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
    statusOfEstimation: '',
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
    this.fetchPendingEstimations()
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
      this.cdr.detectChanges();
      console.log(this.formData)
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
        approvedDateAndTime: new Date()
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

  onSubmit(form: any) {
    this.updateInclusionsAndExclusions(); // Prepare inclusions and exclusions
    this.saveAllSignatures(); // Save the signatures

    if (!this.isAnyCheckboxChecked) {
      console.error('At least one inclusion must be selected.');
      return;
    }
    // if (this.estimationData.statusOfEstimation === 'pending') {
    //   this.formData.statusOfEstimation = 'submitted'
    // }

    if (form.valid) {
      if(this.estimationData && this.estimationData.estimationId){
      const estimationData = {
        estimationId: this.estimationData.estimationId, // Replace this with the actual ID from your context
        updateFields: {
          patientUHID: this.formData.patientUHID,
          patientName: this.formData.patientName,
          ageOfPatient: this.formData.ageOfPatient,
          genderOfPatient: this.formData.genderOfPatient,
          consultantName: this.formData.consultantName,
          consultantId: this.formData.consultantId,
          estimationType: this.formData.estimationType,
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
    }else{
      const estimationData = {
// Replace this with the actual ID from your context
        updateFields: {
          patientUHID: Number(this.formData.patientUHID),
          patientName: this.formData.patientName,
          ageOfPatient: this.formData.ageOfPatient,
          genderOfPatient: this.formData.genderOfPatient,
          consultantName: this.formData.consultantName,
          consultantId: this.formData.consultantId,
          estimationType: this.formData.estimationType,
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
}

