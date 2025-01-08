
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-signature',
  templateUrl: './signature.component.html',
  styleUrl: './signature.component.css'
})
export class SignatureComponent {
  @ViewChild('patientPad', { static: true }) patientPadElement!: ElementRef;
  @ViewChild('employeePad', { static: true }) employeePadElement!: ElementRef;

  private patientPad!: SignaturePad;
  private employeePad!: SignaturePad;

  ngAfterViewInit() {
    this.patientPad = new SignaturePad(this.patientPadElement.nativeElement);
    this.employeePad = new SignaturePad(this.employeePadElement.nativeElement);
  }

  clearPad(type: 'patient' | 'employee') {
    if (type === 'patient') {
      this.patientPad.clear();
    } else {
      this.employeePad.clear();
    }
  }

  getSignature(type: 'patient' | 'employee'): string {
    if (type === 'patient') {
      return this.patientPad.toDataURL(); // Get the patient's signature as a base64 string
    } else {
      return this.employeePad.toDataURL(); // Get the employee's signature as a base64 string
    }
  }

  submitForm() {
    const patientSignature = this.getSignature('patient');
    const employeeSignature = this.getSignature('employee');

    // Example form data
    const formData = {
      patientName: 'John Doe',
      estimationDetails: 'Estimation details here...',
      employeeName: 'Jane Smith',
      patientSignature,
      employeeSignature
    };
    console.log(formData);

    // // Send formData to the backend
    // fetch('http://localhost:3000/submit-form', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(formData)
    // }).then(() => alert('Form submitted successfully!'));
  }
}
