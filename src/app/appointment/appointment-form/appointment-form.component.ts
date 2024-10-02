import { Component, OnInit, Output,EventEmitter,Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
interface Appointment {
  id: string;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  therapy: string;
  date: string;
  time: string;
  email:string;
  status: string;
}
@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrl: './appointment-form.component.css'
})
export class AppointmentFormComponent implements OnInit{

  appointmentForm!: FormGroup;
  @Input() appointment: Appointment | null = null;
  constructor(private fb: FormBuilder) { 
    console.log('Appointment:', this.appointment);
  }
  @Output() close = new EventEmitter<void>();
  
  @Output() submit = new EventEmitter<{ appointment: Appointment; status: string }>(); 
  ngOnInit(): void {
    this.appointmentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(\+91\s)?[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      doctorName: ['', Validators.required],
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      requestVia: ['Website', Validators.required], // Set default to 'Website'
      appointmentStatus: ['Confirm', Validators.required] // Set default to 'Confirm'
    });
    console.log('Appointment form:', this.appointment);
    if (this.appointment) {
      const appointmentDate = this.convertDateToISO(this.appointment.date); 
      this.appointmentForm.patchValue({
        firstName: this.appointment.patientName.split(' ')[0],
        lastName: this.appointment.patientName.split(' ')[1],
        phoneNumber: this.appointment.phoneNumber,
        email: this.appointment.email,
        doctorName: this.appointment.doctorName,
        appointmentDate: appointmentDate,
        appointmentTime: this.appointment.time,
        requestVia: 'Website',  // Default selection
        appointmentStatus: 'Confirm', // Default selection
      });
      console.log('Appointment details:', this.appointmentForm.value);
    }
  }
  convertDateToISO(dateString: string): string {
    const [month, day, year] = dateString.split('/');
    return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Adjusting for 20XX century dates
  }
 
  submitAppointment() {
    
  }

  markAllAsTouched() {
    Object.keys(this.appointmentForm.controls).forEach(control => {
      this.appointmentForm.controls[control].markAsTouched();
    });
    
  }
  
  confirmBooking(): void {
    this.markAllAsTouched(); 
    this.appointmentForm.updateValueAndValidity();
   console.log('Form submitted:', this.appointmentForm);
   console.log(this.appointmentForm.errors);
    if (this.appointmentForm.valid) {
      const appointmentDetails: Appointment = {
        id: this.appointment?.id || '',
        patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
        phoneNumber: this.appointmentForm.value.phoneNumber,
        doctorName: this.appointmentForm.value.doctorName,
        therapy: 'Default Therapy', // Adjust as needed
        date: this.appointmentForm.value.appointmentDate,
        time: this.appointmentForm.value.appointmentTime,
        status: this.appointmentForm.value.appointmentStatus,
        email: this.appointmentForm.value.email,
      };
      console.log('Form submitted:', appointmentDetails);
      // this.confirm.emit(appointmentDetails); // Emit the appointment details
    } else {
      console.log(this.appointmentForm.status);}
  }
  closeForm() {
    this.close.emit();  // Emit close event when clicking close button
  }
  confirm() {
    if (this.appointment) {
      const status = this.appointmentForm.get('appointmentStatus')?.value;
      console.log('Status:', status);
      this.submit.emit({ appointment: this.appointment, status }); // Emit the data to the parent component
    }
  }
}
