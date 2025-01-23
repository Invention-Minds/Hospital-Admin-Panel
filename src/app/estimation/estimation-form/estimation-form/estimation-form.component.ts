import { Component } from '@angular/core';

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

  onSubmit(form: any) {
    this.updateInclusionsAndExclusions()
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
