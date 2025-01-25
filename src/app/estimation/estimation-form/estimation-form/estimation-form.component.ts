import { Component , ViewChild, ElementRef, Input} from '@angular/core';
import SignaturePad from 'signature_pad';


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
  @ViewChild('patientSignatureCanvas', { static: true }) patientSignatureCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('staffSignatureCanvas', { static: true }) staffSignatureCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('approverSignatureCanvas', { static: true }) approverSignatureCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() estimationData: any = null;

  private patientSignaturePad!: SignaturePad;
  private staffSignaturePad!: SignaturePad;
  private approverSignaturePad!: SignaturePad;
  // private signaturePad!: SignaturePad;

  ngAfterViewInit(): void {
    this.patientSignaturePad = new SignaturePad(this.patientSignatureCanvas.nativeElement);
    this.staffSignaturePad = new SignaturePad(this.staffSignatureCanvas.nativeElement);
    this.approverSignaturePad = new SignaturePad(this.approverSignatureCanvas.nativeElement);
  }

  saveAllSignatures(): void {
    // Save signatures to formData
    this.formData.patientSign = this.patientSignaturePad.toDataURL();
    this.formData.employeeSign = this.staffSignaturePad.toDataURL();
    this.formData.approverSign = this.approverSignaturePad.toDataURL();

    console.log('Form Data with Signatures:', this.formData);
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


  formData = {
    patientUHID: '',
    patientName: '',
    ageOfPatient: null,
    genderOfPatient: '',
    consultantName: '',
    estimationPreferredDate: '',
    icuStay: null,
    wardStay: null,
    estimationCost: null,
    estimationName: '',
    remarks: '',
    roomType: '',
    estimationDate: '',
    discountPercentage: '',
    totalEstimationAmount: '',
    signatureOf: '',
    staffName: '',
    approverName: '',
    patientSign: '',
    employeeSign:'',
    approverSign:'',
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

ngOnInit(): void{
  console.log(this.estimationData)
  // this.formData = this.estimationData
  if (this.estimationData) {
    this.formData = {
      ...this.formData, // Use the default formData structure
      ...this.estimationData, // Override with estimationData values
      includedItems: {
        ...this.formData.includedItems, // Ensure default structure for includedItems
        ...(this.estimationData.includedItems || {}), // Override with includedItems from estimationData if present
      },
    };
  }
}
  onSubmit(form: any) {
    this.updateInclusionsAndExclusions()
    this.saveAllSignatures()
    if (!this.isAnyCheckboxChecked) {
      console.error('At least one inclusion must be selected.');
      return;
    }
    if (form.valid) {
      console.log('Form submitted successfully:', this.formData);
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
  /**
   * Validates the form fields for required data.
   */
  // validateForm(): boolean {
  //   // Basic validation
  //   return (
  //     !!this.patient.uhid &&
  //     !!this.patient.name &&
  //     !!this.patient.age &&
  //     !!this.patient.gender &&
  //     !!this.consultant.name &&
  //     !!this.consultant.date &&
  //     !!this.consultant.surgery &&
  //     !!this.stay.roomType &&
  //     !!this.estimation.date &&
  //     !!this.estimation.cost
  //   );
  // }


  /**
   * Resets all form fields to their default values.
   */
  // resetForm(): void {
  //   this.patient = {
  //     uhid: '',
  //     name: '',
  //     age: null,
  //     gender: ''
  //   };

  //   this.consultant = {
  //     name: '',
  //     date: '',
  //     surgery: '',
  //     remarks: ''
  //   };

  //   this.stay = {
  //     icuDays: null,
  //     wardDays: null,
  //     roomType: ''
  //   };

  //   this.inclusions = {
  //     wardStay: false,
  //     labTests: false,
  //     surgeon: false
  //     // Reset other inclusion fields
  //   };

  //   this.estimation = {
  //     date: '',
  //     cost: null,
  //     discount: null,
  //     total: null
  //   };

  //   this.signature = {
  //     type: '',
  //     staff: '',
  //     approver: ''
  //   };
  // }
}
