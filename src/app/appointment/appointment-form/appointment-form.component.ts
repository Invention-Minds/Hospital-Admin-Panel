// // import { Component, OnInit, Output,EventEmitter,Input } from '@angular/core';
// // import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// // import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
// // import { app } from '../../../../server';
// // interface Appointment {
// //   id: string;
// //   patientName: string;
// //   phoneNumber: string;
// //   doctorName: string;
// //   therapy: string;
// //   date: string;
// //   time: string;
// //   email:string;
// //   requestVia?: string;
// //   status: string;
// // }
// // @Component({
// //   selector: 'app-appointment-form',
// //   templateUrl: './appointment-form.component.html',
// //   styleUrl: './appointment-form.component.css'
// // })
// // export class AppointmentFormComponent implements OnInit{
// //  showForm:boolean=true;
// //   appointmentForm!: FormGroup;
// //   @Input() appointment: Appointment | null = null;
// //   constructor(private fb: FormBuilder, private appointmentService: AppointmentConfirmService) { 
// //     console.log('Appointment:', this.appointment);
// //   }
// //   @Output() close = new EventEmitter<void>();
  
// //   @Output() submit = new EventEmitter<{ appointment: Appointment; status: string; requestVia: string }>(); 
// //   ngOnInit(): void {
// //     this.appointmentForm = this.fb.group({
// //       firstName: ['', Validators.required],
// //       lastName: ['', Validators.required],
// //       phoneNumber: ['', [Validators.required, Validators.pattern(/^(\+91\s)?[0-9]{10}$/)]],
// //       email: ['', [Validators.required, Validators.email]],
// //       doctorName: ['', Validators.required],
// //       appointmentDate: ['', Validators.required],
// //       appointmentTime: ['', Validators.required],
// //       requestVia: ['Website', Validators.required], // Set default to 'Website'
// //       appointmentStatus: ['Confirm', Validators.required] // Set default to 'Confirm'
// //     });
// //     // console.log('Appointment form:', this.appointment);
// //     if (this.appointment) {
// //       const appointmentDate = this.convertDateToISO(this.appointment.date); 
// //       // this.appointmentForm.patchValue({
// //       //   firstName: this.appointment.patientName.split(' ')[0],
// //       //   lastName: this.appointment.patientName.split(' ')[1],
// //       //   phoneNumber: this.appointment.phoneNumber,
// //       //   email: this.appointment.email,
// //       //   doctorName: this.appointment.doctorName,
// //       //   appointmentDate: appointmentDate,
// //       //   appointmentTime: this.appointment.time,
// //       //   requestVia: 'Website',  // Default selection
// //       //   appointmentStatus: 'Confirm', // Default selection
// //       // });
// //       // console.log('Appointment details:', this.appointmentForm.value);
// //       this.patchFormWithAppointment(this.appointment, appointmentDate);
// //     }
// //   }
// //   private patchFormWithAppointment(appointment: Appointment, appointmentDate: string) {
// //     this.appointmentForm.patchValue({
// //         firstName: appointment.patientName.split(' ')[0],
// //         lastName: appointment.patientName.split(' ')[1],
// //         phoneNumber: appointment.phoneNumber,
// //         email: appointment.email,
// //         doctorName: appointment.doctorName,
// //         appointmentDate: appointmentDate,
// //         appointmentTime: appointment.time,
// //         requestVia: 'Website',  // Default selection
// //         appointmentStatus: 'Confirm', // Default selection
// //       });
// //   }
// //   convertDateToISO(dateString: string): string {
// //     const [month, day, year] = dateString.split('/');
// //     return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;// Adjusting for 20XX century dates
// //   }
 
// //   submitAppointment() {
    
// //   }

// //   markAllAsTouched() {
// //     Object.keys(this.appointmentForm.controls).forEach(control => {
// //       this.appointmentForm.controls[control].markAsTouched();
// //     });
    
// //   }
  
// //   // confirmBooking(): void {
// //   //   this.markAllAsTouched(); 
// //   //   this.appointmentForm.updateValueAndValidity();
// //   //  console.log('Form submitted:', this.appointmentForm);
// //   //  console.log(this.appointmentForm.errors);
// //   //   if (this.appointmentForm.valid) {
// //   //     const appointmentDetails: Appointment = {
// //   //       id: this.appointment?.id || '',
// //   //       patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
// //   //       phoneNumber: this.appointmentForm.value.phoneNumber,
// //   //       doctorName: this.appointmentForm.value.doctorName,
// //   //       therapy: 'Default Therapy', // Adjust as needed
// //   //       date: this.appointmentForm.value.appointmentDate,
// //   //       time: this.appointmentForm.value.appointmentTime,
// //   //       requestVia: this.appointmentForm.value.requestVia,
// //   //       status: this.appointmentForm.value.appointmentStatus,
// //   //       email: this.appointmentForm.value.email,
// //   //     };
// //   //     console.log('Form submitted:', appointmentDetails);
// //   //     // this.confirm.emit(appointmentDetails); // Emit the appointment details
// //   //   } else {
// //   //     console.log(this.appointmentForm.status);}
// //   // }
// //   closeForm(event: Event) {
// //     event.preventDefault(); // Prevents any default action, if needed
// //     this.close.emit();
// //     this.showForm = false;
// // }
// //   confirm() {
// //     // this.appointment = this.appointmentForm.value;
// //     if (this.appointment) {
// //       const status = this.appointmentForm.get('appointmentStatus')?.value;
// //       const requestVia = this.appointmentForm.get('requestVia')?.value;
// //       console.log('Status:', status);
// //        // If the current status is 'Confirmed' and the previous status was 'Cancelled'
// //        if (status === 'Confirm' && this.appointment.status === 'Cancelled') {
// //         // Remove this appointment from the cancelled appointments
// //         this.appointmentService.removeCancelledAppointment(this.appointment.phoneNumber);
// //     }
// //       this.appointment.status = status
// //       this.submit.emit({ appointment: this.appointment, status , requestVia }); // Emit the data to the parent component
// //       this.showForm=false; // Close the form after submission
// //       console.log('Appointment from confirm on confirming:', this.appointment);
// //     }
// //     else{
// //       // const appointmentDate = this.convertDateToISO(this.appointmentForm.value.appointmentDate); 
// //       const appointmentDetails: Appointment = {
// //               id: '', // Generate a unique ID as needed
// //               patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
// //               phoneNumber: this.appointmentForm.value.phoneNumber,
// //               doctorName: this.appointmentForm.value.doctorName,
// //               therapy: 'Default Therapy', // Adjust as needed
// //               date: this.appointmentForm.value.appointmentDate,
// //               time: this.appointmentForm.value.appointmentTime,
// //               requestVia: this.appointmentForm.value.requestVia,
// //               status: this.appointmentForm.value.appointmentStatus,
// //               email: this.appointmentForm.value.email,
// //             };

// //       this.appointment = appointmentDetails;
// //       // this.appointmentService.addConfirmedAppointment(appointmentDetails);
// //     }
// //     if(this.appointment?.requestVia === "Call"){
// //       this.appointment.status = "Booked";
// // this.appointmentService.addConfirmedAppointment(this.appointment);
// //     }
// //   }
// // }

// import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

// interface Appointment {
//   id: string;
//   patientName: string;
//   phoneNumber: string;
//   doctorName: string;
//   therapy: string;
//   date: string;
//   time: string;
//   email: string;
//   requestVia?: string;
//   status: string;
// }

// @Component({
//   selector: 'app-appointment-form',
//   templateUrl: './appointment-form.component.html',
//   styleUrls: ['./appointment-form.component.css']
// })
// export class AppointmentFormComponent implements OnInit {
//   showForm: boolean = true;
//   appointmentForm!: FormGroup;
//   showAvailabilityMessage: boolean = false;
//   availabilityMessage: string = '';
//   @Input() appointment: Appointment | null = null;

//   constructor(private fb: FormBuilder, private appointmentService: AppointmentConfirmService) {
//     console.log('Appointment:', this.appointment);
//   }

//   @Output() close = new EventEmitter<void>();
//   @Output() submit = new EventEmitter<{ appointment: Appointment; status: string; requestVia: string }>();

//   ngOnInit(): void {
//     this.appointmentForm = this.fb.group({
//       firstName: ['', Validators.required],
//       lastName: ['', Validators.required],
//       phoneNumber: ['', [Validators.required, Validators.pattern(/^(\+91\s)?[0-9]{10}$/)]],
//       email: ['', [Validators.required, Validators.email]],
//       doctorName: ['', Validators.required],
//       appointmentDate: ['', Validators.required],
//       appointmentTime: ['', Validators.required],
//       requestVia: ['Website', Validators.required], // Set default to 'Website'
//       appointmentStatus: ['Confirm', Validators.required] // Set default to 'Confirm'
//     });

//     if (this.appointment) {
//       const appointmentDate = this.convertDateToISO(this.appointment.date);
//       this.patchFormWithAppointment(this.appointment, appointmentDate);
//       this.checkDoctorAvailability(appointmentDate, this.appointment.time); // Check availability
//     }
//   }

//   private patchFormWithAppointment(appointment: Appointment, appointmentDate: string) {
//     this.appointmentForm.patchValue({
//       firstName: appointment.patientName.split(' ')[0],
//       lastName: appointment.patientName.split(' ')[1],
//       phoneNumber: appointment.phoneNumber,
//       email: appointment.email,
//       doctorName: appointment.doctorName,
//       appointmentDate: appointmentDate,
//       appointmentTime: appointment.time,
//       requestVia: 'Website',  // Default selection
//       appointmentStatus: 'Confirm', // Default selection
//     });
//   }

//   private checkDoctorAvailability(date: string, time: string) {
//     if (!this.appointmentService.isTimeAvailable(date, time)) {
//       this.showAvailabilityMessage = true;
//       this.availabilityMessage = 'The selected time slot is not available. Please choose another time.';
//       this.appointmentForm.get('appointmentTime')?.setValue(''); // Clear the time field
//     } else {
//       this.showAvailabilityMessage = false;
//       this.availabilityMessage = '';
//     }
//   }

//   convertDateToISO(dateString: string): string {
//     const [month, day, year] = dateString.split('/');
//     return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Adjusting for 20XX century dates
//   }

//   closeForm(event: Event) {
//     event.preventDefault(); // Prevents any default action, if needed
//     this.close.emit();
//     this.showForm = false;
//   }

//   confirm() {
//     if (this.appointment) {
//       const status = this.appointmentForm.get('appointmentStatus')?.value;
//       const requestVia = this.appointmentForm.get('requestVia')?.value;
//       console.log('Status:', status);
//       if (status === 'Confirm' && this.appointment.status === 'Cancelled') {
//         this.appointmentService.removeCancelledAppointment(this.appointment.phoneNumber);
//       }
//       this.appointment.status = status;
//       this.submit.emit({ appointment: this.appointment, status, requestVia }); // Emit the data to the parent component
//       this.showForm = false; // Close the form after submission
//       console.log('Appointment from confirm on confirming:', this.appointment);
//     } else {
//       const appointmentDetails: Appointment = {
//         id: '', // Generate a unique ID as needed
//         patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
//         phoneNumber: this.appointmentForm.value.phoneNumber,
//         doctorName: this.appointmentForm.value.doctorName,
//         therapy: 'Default Therapy', // Adjust as needed
//         date: this.appointmentForm.value.appointmentDate,
//         time: this.appointmentForm.value.appointmentTime,
//         requestVia: this.appointmentForm.value.requestVia,
//         status: this.appointmentForm.value.appointmentStatus,
//         email: this.appointmentForm.value.email,
//       };

//       this.appointment = appointmentDetails;
//     }

//     if (this.appointment?.requestVia === "Call") {
//       this.appointment.status = "Booked";
//       this.appointmentService.addConfirmedAppointment(this.appointment);
//     }
//   }
// }
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

interface Appointment {
  id: string;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  therapy: string;
  date: string;
  time: string;
  email: string;
  requestVia?: string;
  status: string;
}

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.css']
})
export class AppointmentFormComponent implements OnInit {
  showForm: boolean = true;
  appointmentForm!: FormGroup;
  showAvailabilityMessage: boolean = false;
  availabilityMessage: string = '';
  @Input() appointment: Appointment | null = null;
 bookedSlots: { [doctorName: string]: { [date: string]: string[] } } = {};

  // Hardcoded doctor availability for demonstration purposes
  doctorAvailability: { [doctorName: string]: { [date: string]: string[] } } = {
    'Dr. Smith': {
      '2024-10-10': ['09:00', '10:00', '14:00'],
      '2024-10-11': ['11:00', '13:00']
    },
    'Dr. Jane': {
      '2024-10-10': ['10:00', '11:30', '15:00'],
      '2024-10-11': ['09:00', '12:00', '16:00']
    },
    'Dr. Nitish': {
      '2024-11-04': ['09:00 - 09:15', '10:00 - 10:15', '14:00 - 14:10'],
      '2024-10-11': ['11:00', '13:00']
    }
  };

  constructor(private fb: FormBuilder, private appointmentService: AppointmentConfirmService) {
    console.log('Appointment:', this.appointment);
  }

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{ appointment: Appointment; status: string; requestVia: string }>();

  ngOnInit(): void {
    // this.loadBookedSlots(); // Load booked slots from localStorage
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

    if (this.appointment) {
      const appointmentDate = this.convertDateToISO(this.appointment.date);
      this.patchFormWithAppointment(this.appointment, appointmentDate);
      this.checkDoctorAvailability(this.appointment.doctorName, appointmentDate, this.appointment.time); // Check availability
    }
  }

  // private loadBookedSlots() {
  //   this.bookedSlots = JSON.parse(localStorage.getItem('bookedSlots') || '{}');
  //   console.log('Loaded booked slots:', JSON.stringify(this.bookedSlots, null, 2));
  // }

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

  private checkDoctorAvailability(doctorName: string, date: string, time: string) {
    // this.loadBookedSlots(); // Refresh booked slots before checking availability
    const formattedTime = this.formatTime(time);
    const availableTimes = this.doctorAvailability[doctorName]?.[date]?.map(t => this.formatTime(t)) || [];
    console.log('bookedslots in the function',this.bookedSlots);
    const bookedTimes = this.bookedSlots[doctorName]?.[date]?.map(t => this.formatTime(t)) || [];
    // const bookedTimes = ['09:00-09:15', '10:00', '14:00'];

    console.log('Available times:', availableTimes);
    console.log('Booked times:', bookedTimes);
    console.log('Formatted time:', formattedTime);

    if (!availableTimes.includes(formattedTime) || bookedTimes.includes(formattedTime)) {
      this.showAvailabilityMessage = true;
      this.availabilityMessage = '*The selected time slot is not available';
      this.appointmentForm.get('appointmentTime')?.setValue(''); // Clear the time field
    } else {
      this.showAvailabilityMessage = false;
      this.availabilityMessage = '';
    }
  }

  private formatTime(time: string): string {
    return time
      .replace(/\s+/g, '')
      .replace(/\./g, ':')
      .replace(/(\d{1,2})(?=:)/g, (match) => match.padStart(2, '0'))
      .toLowerCase();
  }

  convertDateToISO(dateString: string): string {
    const [month, day, year] = dateString.split('/');
    return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Adjusting for 20XX century dates
  }

  closeForm(event: Event) {
    event.preventDefault(); // Prevents any default action, if needed
    this.close.emit();
    this.showForm = false;
  }

  confirm() {
    if (this.appointment) {
      const status = this.appointmentForm.get('appointmentStatus')?.value;
      const requestVia = this.appointmentForm.get('requestVia')?.value;
      console.log('Status:', status);
      if (status === 'Confirm' && this.appointment.status === 'Cancelled') {
        this.appointmentService.removeCancelledAppointment(this.appointment.phoneNumber);
      }
      this.appointment.status = status;
      this.submit.emit({ appointment: this.appointment, status, requestVia }); // Emit the data to the parent component
      this.showForm = false; // Close the form after submission
      console.log('Appointment from confirm on confirming:', this.appointment);
      // Mark the slot as booked
      this.addBookedSlot(this.appointment.doctorName, this.appointment.date, this.appointment.time);
    } else {
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
      // Mark the slot as booked
      this.addBookedSlot(this.appointment.doctorName, this.appointment.date, this.appointment.time);
    }

    if (this.appointment?.requestVia === "Call") {
      this.appointment.status = "Booked";
      this.appointmentService.addConfirmedAppointment(this.appointment);
    }

  }

  private addBookedSlot(doctorName: string, date: string, time: string) {
    if (!this.bookedSlots[doctorName]) {
      this.bookedSlots[doctorName] = {};
    }
    if (!this.bookedSlots[doctorName][date]) {
      this.bookedSlots[doctorName][date] = [];
    }
    const formattedTime = this.formatTime(time);
    if (!this.bookedSlots[doctorName][date].includes(formattedTime)) {
      this.bookedSlots[doctorName][date].push(formattedTime);
      console.log('Updated booked slots:', this.bookedSlots);
      // localStorage.setItem('bookedSlots', JSON.stringify(this.bookedSlots));
      // console.log('Updated booked slots:', this.bookedSlots);
    }
    console.log('bookedslots in the function',this.bookedSlots);
  }
}