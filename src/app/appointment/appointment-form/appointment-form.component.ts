
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { Doctor } from '../../models/doctor.model';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';

interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  email: string;
  requestVia?: string;
  status: string;
  smsSent?: boolean;
  doctorId: number;
}


@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.css'],
  providers: [MessageService]
})
export class AppointmentFormComponent implements OnInit {
  showForm: boolean = true;
  appointmentForm!: FormGroup;
  showAvailabilityMessage: boolean = false;
  availabilityMessage: string = '';
  availableSlots: string[] = [];
  doctorId: number = 0;
  doctors: Doctor[] = []; // Array to store doctor details
  @Input() appointment: Appointment | null = null;
  bookedSlots: { [doctorName: string]: { [date: string]: string[] } } = {};
  showDoctorSuggestions: boolean = false;
  doctor: Doctor[] = []; // Array to store doctor details
  filteredDoctors: Doctor[] = []; // Array to store filtered doctors based on user input



  constructor(private fb: FormBuilder, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService) {
    console.log('Appointment:', this.appointment);
  }

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{ appointment: Appointment; status: string; requestVia: string }>();

  ngOnInit(): void {
    this.loadDoctors();
    // this.loadBookedSlots(); // Load booked slots from localStorage
    this.appointmentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(\+91\s)?[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      doctorName: ['', Validators.required],
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      requestVia: ['Call', Validators.required], // Set default to 'Website'
      appointmentStatus: ['Confirm', Validators.required] // Set default to 'Confirm'
    });


    if (this.appointment) {
      // Edit existing pending appointment - check availability for the given doctor, date, and time.
      const appointmentDate = this.appointment.date;
      this.patchFormWithAppointment(this.appointment, appointmentDate);
      this.checkSlotAvailability(this.appointment.doctorId, appointmentDate, this.appointment.time);
      console.log('Appointment from appointment form:', this.appointment);
      this.loadAvailableSlots(this.appointment.doctorId, appointmentDate);
      this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(date => {
        const doctorName = this.appointmentForm.get('doctorName')?.value;
        const doctorId = this.getDoctorIdByName(doctorName);

        if (doctorId && date) {
          this.loadAvailableSlots(doctorId, date);
        }
      });
      this.appointmentForm.get('appointmentTime')?.valueChanges.subscribe(time => {
        const date = this.appointmentForm.get('appointmentDate')?.value;
        const doctorName = this.appointmentForm.get('doctorName')?.value;
        const doctorId = this.getDoctorIdByName(doctorName);
        if (doctorId && date) {
          this.loadAvailableSlots(doctorId, date);
        }
      })
      this.availableSlots = this.appointmentForm.get('appointmentTime')?.value;
    } else {
      // New appointment - load available slots when the doctor or date changes.
      this.setupNewAppointmentFormListeners();
    }

  }
  private loadDoctors(): void {
    this.doctorService.getDoctors().subscribe(
      (doctors) => {
        this.doctors = doctors;
      },
      (error) => {
        console.error('Error loading doctors:', error);
      }
    );
  }
  onDoctorNameInput(): void {
    const doctorNameInput = this.appointmentForm.get('doctorName')?.value.toLowerCase();
    this.filteredDoctors = this.doctors.filter(doctor =>
      doctor.name.toLowerCase().startsWith(doctorNameInput)
    );
  
    // If the input is empty or there are no matches, hide the suggestions
    this.showDoctorSuggestions = this.filteredDoctors.length > 0 && doctorNameInput.length > 0;
  }
  
  onDoctorSelect(doctor: Doctor): void {
    this.appointmentForm.get('doctorName')?.setValue(doctor.name);
    this.showDoctorSuggestions = false;  // Hide dropdown after selecting
  }
  private setupNewAppointmentFormListeners() {
    // Load available slots when doctor or date changes for new appointments only
    // this.appointmentForm.get('doctorId')?.valueChanges.subscribe(doctorId => {
    //   const date = this.appointmentForm.get('appointmentDate')?.value;
    //   if (doctorId && date) {
    //     this.loadAvailableSlots(doctorId, date);
    //   }
    // });
    this.appointmentForm.get('doctorName')?.valueChanges.subscribe(doctorName => {
      const date = this.appointmentForm.get('appointmentDate')?.value;
      const doctorId = this.getDoctorIdByName(doctorName);
      if (doctorId && date) {
        this.loadAvailableSlots(doctorId, date);
      }
    });


    this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(date => {
      const doctorName = this.appointmentForm.get('doctorName')?.value;
      const doctorId = this.getDoctorIdByName(doctorName);

      if (doctorId && date) {
        this.loadAvailableSlots(doctorId, date);
      }
    });
    this.appointmentForm.get('appointmentTime')?.valueChanges.subscribe(time => {
      const date = this.appointmentForm.get('appointmentDate')?.value;
      const doctorName = this.appointmentForm.get('doctorName')?.value;
      const doctorId = this.getDoctorIdByName(doctorName);
      if (doctorId && date) {
        this.loadAvailableSlots(doctorId, date);
      }
    })

  }
  // loadAvailableSlots(doctorId: number, date: string): void {
  //   console.log('Loading available slots for doctor:', doctorId, 'on date:', date);
  //   this.appointmentService.getAvailableSlots(doctorId, date).subscribe(
  //     (availability) => {
  //       if (availability && availability.availableFrom) {
  //         const [start, end] = availability.availableFrom.split('-');
  //         const slotDuration = availability.slotDuration;
  //         this.availableSlots = this.generateTimeSlots(start, end, slotDuration);

  //         // Remove any already booked slots for that day
  //         this.removeBookedSlotsFromAvailable(doctorId, date);
  //         console.log('Available slots:', this.availableSlots);
  //       } else {
  //         this.availableSlots = [];
  //       }
  //     },
  //     (error) => {
  //       console.error('Error loading slots:', error);
  //     }
  //   );
  // }

  private getDoctorIdByName(doctorName: string): number | undefined {
    const doctor = this.doctors.find(d => d.name === doctorName);
    return doctor ? doctor.id : undefined;
  }
  loadAvailableSlots(doctorId: number, date: string): void {
    console.log('Loading available slots for doctor:', doctorId, 'on date:', date);
    this.appointmentService.getAvailableSlots(doctorId, date).subscribe(
      (availability) => {
        if (availability && availability.availableFrom) {
          const [start, end] = availability.availableFrom.split('-');
          const slotDuration = availability.slotDuration;
          console.log(start, end, slotDuration)
          this.availableSlots = this.generateTimeSlots(start, end, slotDuration);

          // Remove the slots that are already booked for that date
          this.appointmentService.getBookedSlots(doctorId, date).subscribe(
            (bookedSlots: string[]) => {

              // this.availableSlots = this.availableSlots.filter(
              //   (slot) => !bookedSlots.includes(slot)
              // );
              // If editing an appointment, retain the currently selected time slot if it exists
              if (this.appointment && this.appointment.date === date && this.appointment.doctorId === doctorId) {
                const currentSelectedTime = this.appointment.time;

                this.availableSlots = this.availableSlots.filter((slot) => {
                  return slot === currentSelectedTime || !bookedSlots.includes(slot);
                });
              } else {
                // For new appointments, remove all booked slots
                this.availableSlots = this.availableSlots.filter((slot) => !bookedSlots.includes(slot));
              }
              console.log('Filtered available slots:', this.availableSlots);
              if (this.availableSlots.length === 0) {
                this.showAvailabilityMessage = true;
                this.availabilityMessage = '*No slots available for the selected date';
              } else {
                this.showAvailabilityMessage = false;
                this.availabilityMessage = '';
              }

              // Check if the currently selected time in the form is still available
              const selectedTime = this.appointmentForm.get('appointmentTime')?.value;
              console.log("selectedTIme", selectedTime)
              if (selectedTime && !this.availableSlots.includes(selectedTime)) {
                this.showAvailabilityMessage = true;
                this.availabilityMessage = '*The selected time slot is no longer available. Please choose a different time.';
              }
            },
            (error) => {
              console.error('Error loading booked slots:', error);
            }

          );
        } else {
          this.availableSlots = [];
        }
      },
      (error) => {
        console.error('Error loading slots:', error);
      }
    );
  }

  private removeBookedSlotsFromAvailable(doctorId: number, date: string): void {
    this.appointmentService.getBookedSlots(doctorId, date).subscribe(
      (bookedSlots) => {
        this.availableSlots = this.availableSlots.filter(slot => !bookedSlots.includes(slot));
      },
      (error) => {
        console.error('Error loading booked slots:', error);
      }
    );
  }

  private checkSlotAvailability(doctorId: number, date: string, time: string): void {
    console.log('Checking slot availability for doctor:', doctorId, 'on date:', date, 'at time:', time);
    this.appointmentService.getAvailableSlots(doctorId, date).subscribe(
      (availability) => {
        console.log('Availability:', availability);
        if (availability && availability.availableFrom) {
          const [start, end] = availability.availableFrom.split('-');
          const slotDuration = availability.slotDuration;
          const availableSlots = this.generateTimeSlots(start, end, slotDuration);
          console.log('Available slots:', availableSlots);

          if (!availableSlots.includes(time)) {
            this.showAvailabilityMessage = true;
            this.availabilityMessage = '*The selected time slot is no longer available';
          } else {
            this.showAvailabilityMessage = false;
            this.availabilityMessage = '';
          }
        }
      },
      (error) => {
        console.error('Error checking slot availability:', error);
      }
    );
  }

  generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
    console.log('Generating time slots from:', startTime, 'to:', endTime, 'with duration:', slotDuration);
    const slots = [];
    let current = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    console.log(current, end)

    while (current < end) {
      const slotStart = current.toTimeString().substring(0, 5);
      current = new Date(current.getTime() + slotDuration * 60000);
      console.log(current, slotStart)
      if (current <= end) {
        const slotEnd = current.toTimeString().substring(0, 5);
        slots.push(`${slotStart}-${slotEnd}`);
        console.log(slotStart, slotEnd)
      }
    }
    console.log(slots)
    return slots;
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
      requestVia: appointment.requestVia,  // Default selection
      appointmentStatus: 'Confirm', // Default selection
    });
    console.log('Appointment form:', this.appointmentForm.value);
  }

  // private checkDoctorAvailability(doctorName: string, date: string, time: string) {
  //   // this.loadBookedSlots(); // Refresh booked slots before checking availability
  //   const formattedTime = this.formatTime(time);
  //   const availableTimes = this.doctorAvailability[doctorName]?.[date]?.map(t => this.formatTime(t)) || [];
  //   console.log('bookedslots in the function',this.bookedSlots);
  //   const bookedTimes = this.bookedSlots[doctorName]?.[date]?.map(t => this.formatTime(t)) || [];
  //   // const bookedTimes = ['09:00-09:15', '10:00', '14:00'];

  //   console.log('Available times:', availableTimes);
  //   console.log('Booked times:', bookedTimes);
  //   console.log('Formatted time:', formattedTime);

  //   if (!availableTimes.includes(formattedTime) || bookedTimes.includes(formattedTime)) {
  //     this.showAvailabilityMessage = true;
  //     this.availabilityMessage = '*The selected time slot is not available';
  //   } else {
  //     this.showAvailabilityMessage = false;
  //     this.availabilityMessage = '';
  //   }
  // }

  private formatTime(time: string): string {
    return time
      .replace(/\s+/g, '')
      .replace(/\./g, ':')
      .replace(/(\d{1,2})(?=:)/g, (match) => match.padStart(2, '0'))
      .toLowerCase();
  }

  // convertDateToISO(dateString: string): string {
  //   const [month, day, year] = dateString.split('/');
  //   return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Adjusting for 20XX century dates
  // }

  closeForm(event: Event) {
    event.preventDefault(); // Prevents any default action, if needed
    this.close.emit();
    this.showForm = false;
  }

  confirm() {
    if (!this.appointmentForm.valid) {
      this.messageService.add({ severity: 'warn', summary: 'Warn', detail: 'Some fields are not filled' });
    }
    console.log('Form values:', this.appointmentForm.value);
    console.log('Appointment:', this.appointmentForm.valid);
    if (this.appointment) {
      this.appointment.date = this.appointmentForm.get('appointmentDate')?.value;
      console.log('Appointment:', this.appointment);
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
      if (this.appointmentForm.value.appointmentStatus === "Confirm") {
        this.appointment.status = "confirmed"
      }
      if (this.appointment.status === "confirmed") {
        this.appointmentService.addConfirmedAppointment(this.appointment);
      }
      // Mark the slot as booked
      this.addBookedSlot(this.appointment.doctorId, this.appointment.date, this.appointment.time);
    } else {
      const doctorId = this.getDoctorIdByName(this.appointmentForm.value.doctorName);

      if (doctorId === undefined) {
        console.error('Doctor ID not found for the given doctor name.');
        return; // Optionally, stop execution if doctor ID is required
      }
      const appointmentDetails = {
        patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
        phoneNumber: this.appointmentForm.value.phoneNumber,
        doctorId: doctorId,
        doctorName: this.appointmentForm.value.doctorName,
        department: 'Default Therapy', // Adjust as needed
        date: this.appointmentForm.value.appointmentDate,
        time: this.appointmentForm.value.appointmentTime,
        requestVia: this.appointmentForm.value.requestVia,
        status: this.appointmentForm.value.appointmentStatus,
        email: this.appointmentForm.value.email,
        smsSent: false
      };

      this.appointment = appointmentDetails;
      // Mark the slot as booked
      this.addBookedSlot(this.appointment.doctorId, this.appointment.date, this.appointment.time);
      if (this.appointmentForm.value.appointmentStatus === "Confirm") {
        this.appointment.status = "confirmed"
      }
      if (this.appointment.status === "confirmed") {
        this.appointmentService.addConfirmedAppointment(this.appointment);
      }
      // if (this.appointment?.requestVia === "Call") {
      //   this.appointment.status = "confirmed";
      //   this.appointmentService.addConfirmedAppointment(this.appointment);
      // }

      // If creating a new appointment, add it (no id needed)
      this.appointmentService.addNewAppointment(appointmentDetails);
      this.showForm = false; // Close the form after submission
    }

    if (this.appointment?.requestVia === "Call") {
      this.appointment.status = "confirmed";
      this.appointmentService.addConfirmedAppointment(this.appointment);
    }

  }

  private addBookedSlot(doctorId: number, date: string, time: string) {
    this.appointmentService.addBookedSlot(doctorId, date, time).subscribe(
      (response) => {
        console.log('Slot booked:', response);
      },
      (error) => {
        console.error('Error booking slot:', error);
      }
    );
  }


}
