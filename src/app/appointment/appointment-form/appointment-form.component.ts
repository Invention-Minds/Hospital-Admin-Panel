import { Component, OnInit, Output,EventEmitter,Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { app } from '../../../../server';
interface Appointment {
  id: string;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  therapy: string;
  date: string;
  time: string;
  email:string;
  requestVia?: string;
  status: string;
}
@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrl: './appointment-form.component.css'
})
export class AppointmentFormComponent implements OnInit{
 showForm:boolean=true;
  appointmentForm!: FormGroup;
  @Input() appointment: Appointment | null = null;
  constructor(private fb: FormBuilder, private appointmentService: AppointmentConfirmService) { 
    console.log('Appointment:', this.appointment);
  }
  @Output() close = new EventEmitter<void>();
  
  @Output() submit = new EventEmitter<{ appointment: Appointment; status: string; requestVia: string }>(); 
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
      // this.appointmentForm.patchValue({
      //   firstName: this.appointment.patientName.split(' ')[0],
      //   lastName: this.appointment.patientName.split(' ')[1],
      //   phoneNumber: this.appointment.phoneNumber,
      //   email: this.appointment.email,
      //   doctorName: this.appointment.doctorName,
      //   appointmentDate: appointmentDate,
      //   appointmentTime: this.appointment.time,
      //   requestVia: 'Website',  // Default selection
      //   appointmentStatus: 'Confirm', // Default selection
      // });
      // console.log('Appointment details:', this.appointmentForm.value);
      this.patchFormWithAppointment(this.appointment, appointmentDate);
    }
  }
  private patchFormWithAppointment(appointment: Appointment, appointmentDate: string) {
    this.appointmentForm.patchValue({
        firstName: appointment.patientName.split(' ')[0],
        lastName: appointment.patientName.split(' ')[1],
        phoneNumber: appointment.phoneNumber,
        email: appointment.email,
        doctorName: appointment.doctorName,
        appointmentDate: appointmentDate,
        appointmentTime: appointment.time,
        requestVia: 'Website',  // Default selection
        appointmentStatus: 'Confirm', // Default selection
      });
  }
  convertDateToISO(dateString: string): string {
    const [month, day, year] = dateString.split('/');
    return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;// Adjusting for 20XX century dates
  }
 
  submitAppointment() {
    
  }

  markAllAsTouched() {
    Object.keys(this.appointmentForm.controls).forEach(control => {
      this.appointmentForm.controls[control].markAsTouched();
    });
    
  }
  
  // confirmBooking(): void {
  //   this.markAllAsTouched(); 
  //   this.appointmentForm.updateValueAndValidity();
  //  console.log('Form submitted:', this.appointmentForm);
  //  console.log(this.appointmentForm.errors);
  //   if (this.appointmentForm.valid) {
  //     const appointmentDetails: Appointment = {
  //       id: this.appointment?.id || '',
  //       patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
  //       phoneNumber: this.appointmentForm.value.phoneNumber,
  //       doctorName: this.appointmentForm.value.doctorName,
  //       therapy: 'Default Therapy', // Adjust as needed
  //       date: this.appointmentForm.value.appointmentDate,
  //       time: this.appointmentForm.value.appointmentTime,
  //       requestVia: this.appointmentForm.value.requestVia,
  //       status: this.appointmentForm.value.appointmentStatus,
  //       email: this.appointmentForm.value.email,
  //     };
  //     console.log('Form submitted:', appointmentDetails);
  //     // this.confirm.emit(appointmentDetails); // Emit the appointment details
  //   } else {
  //     console.log(this.appointmentForm.status);}
  // }
  closeForm() {
    this.close.emit(); // Emit close event when clicking close 
    this.showForm=false;
    this.appointmentForm.reset();
  }
  confirm() {
    // this.appointment = this.appointmentForm.value;
    console.log('Appointment:', this.appointment);
    console.log("submitted")
    if (this.appointment) {
      console.log('Appointment in confirm:', this.appointment);
      const status = this.appointmentForm.get('appointmentStatus')?.value;
      const requestVia = this.appointmentForm.get('requestVia')?.value;
      console.log('Status:', status);
      this.submit.emit({ appointment: this.appointment, status , requestVia }); // Emit the data to the parent component
      this.closeForm(); // Close the form after submission
    }
    else{
      // const appointmentDate = this.convertDateToISO(this.appointmentForm.value.appointmentDate); 
      const appointmentDetails: Appointment = {
              id: '', // Generate a unique ID as needed
              patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
              phoneNumber: this.appointmentForm.value.phoneNumber,
              doctorName: this.appointmentForm.value.doctorName,
              therapy: 'Default Therapy', // Adjust as needed
              date: this.appointmentForm.value.appointmentDate,
              time: this.appointmentForm.value.appointmentTime,
              requestVia: this.appointmentForm.value.requestVia,
              status: this.appointmentForm.value.appointmentStatus,
              email: this.appointmentForm.value.email,
            };

      this.appointment = appointmentDetails;
    }
    if(this.appointment?.requestVia === "Call"){
      this.appointment.status = "Booked";
this.appointmentService.addConfirmedAppointment(this.appointment);
    }
  }
}
