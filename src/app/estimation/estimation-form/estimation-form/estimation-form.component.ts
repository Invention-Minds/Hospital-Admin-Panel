import { Component } from '@angular/core';

@Component({
  selector: 'app-estimation-form',
  templateUrl: './estimation-form.component.html',
  styleUrl: './estimation-form.component.css'
})

  export class EstimationFormComponent {
    formData = {
      uhid: '',
      patientName: '',
      age: null,
      gender: ''
    };
  
    /**
     * Handles form submission and validates required fields.
     */
   
  onSubmit(form: any) {
    if (form.valid) {
      console.log('Form submitted successfully:', this.formData);
    } else {
      console.log('Form is invalid:', form);
    }
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
