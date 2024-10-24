
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { Doctor } from '../../models/doctor.model';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { response } from 'express';

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
  emailSent?: boolean;
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
  showDoctorUnavailableMessage: boolean = false;
  doctorUnavailableMessage: string = '';
  unavailableDates: string[] = [];



  constructor(private fb: FormBuilder, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService, private cdr: ChangeDetectorRef, private authService: AuthServiceService) {
  }

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{ appointment: Appointment; status: string; requestVia: string }>();

  ngOnInit(): void {
    this.loadDoctors();
    // this.loadBookedSlots(); // Load booked slots from localStorage
    this.appointmentForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(\+91\s)?[0-9]{12}$/)]],
      email: ['', [Validators.required, Validators.email]],
      doctorName: ['', Validators.required],
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      requestVia: ['Call', Validators.required], // Set default to 'Website'
      appointmentStatus: ['Confirm', Validators.required] // Set default to 'Confirm'
    });


    if (this.appointment) {
      console.log("existing")
      // Edit existing pending appointment - check availability for the given doctor, date, and time.
      // const appointmentDate = this.appointment.date;

      // this.cdr.detectChanges();
      // this.checkSlotAvailability(this.appointment.doctorId, appointmentDate, this.appointment.time);

      // this.loadAvailableSlots(this.appointment.doctorId, appointmentDate);

      // this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(date => {
      //   const doctorName = this.appointmentForm.get('doctorName')?.value;
      //   const doctorId = this.getDoctorIdByName(doctorName);

      //   if (doctorId && date) {
      //     this.loadAvailableSlots(doctorId, date);
      //   }
      // });
      // this.appointmentForm.get('appointmentTime')?.valueChanges.subscribe(time => {
      //   const date = this.appointmentForm.get('appointmentDate')?.value;
      //   const doctorName = this.appointmentForm.get('doctorName')?.value;
      //   const doctorId = this.getDoctorIdByName(doctorName);
      //   if (doctorId && date) {
      //     this.loadAvailableSlots(doctorId, date);
      //   }
      // })
      // this.availableSlots = this.appointmentForm.get('appointmentTime')?.value;
      // this.patchFormWithAppointment(this.appointment, appointmentDate);
      const appointmentDate = this.appointment.date;
      this.patchFormWithAppointment(this.appointment!, appointmentDate);
      this.checkSlotAvailability(this.appointment.doctorId, appointmentDate, this.appointment.time)
        .then(isAvailable => {
          if (isAvailable) {
            this.cdr.detectChanges();
            this.checkDoctorAvailabilityAndLoadSlots(this.appointment!.doctorId, appointmentDate);
          } else {
            this.showAvailabilityMessage = true;
            this.availabilityMessage = '*The selected time slot is already booked. Please choose another time.';
            // Clear the currently selected appointment time
            this.cdr.detectChanges();
            console.log(this.appointment!.time);
            this.appointment!.time = ''
            // this.appointmentForm.get('appointmentTime')?.setValue('');
            console.log(this.appointmentForm.value)

            // Reload available slots for the given doctor and date
            this.checkDoctorAvailabilityAndLoadSlots(this.appointment!.doctorId, appointmentDate);
          }
        })
        .catch(error => {
          console.error('Error checking slot availability:', error);
        });
      this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(date => {
        const doctorName = this.appointmentForm.get('doctorName')?.value;
        const doctorId = this.getDoctorIdByName(doctorName);

        if (doctorId && date) {
          this.checkDoctorAvailabilityAndLoadSlots(doctorId, date);
        }
      });
      this.appointmentForm.get('appointmentTime')?.valueChanges.subscribe(time => {
        const date = this.appointmentForm.get('appointmentDate')?.value;
        const doctorName = this.appointmentForm.get('doctorName')?.value;
        const doctorId = this.getDoctorIdByName(doctorName);
        if (doctorId && date) {
          this.checkDoctorAvailabilityAndLoadSlots(doctorId, date);
        }
      })
      // this.availableSlots = this.appointmentForm.get('appointmentTime')?.value;
      // console.log('available',this.availableSlots)
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
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        this.checkDoctorAvailabilityAndLoadSlots(doctorId, date)
      }
    });


    this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(date => {
      const doctorName = this.appointmentForm.get('doctorName')?.value;
      const doctorId = this.getDoctorIdByName(doctorName);

      if (doctorId && date) {
        this.checkDoctorAvailabilityAndLoadSlots(doctorId, date)
      }
    });

    // this.appointmentForm.get('appointmentTime')?.valueChanges.subscribe(time => {
    //   const date = this.appointmentForm.get('appointmentDate')?.value;
    //   const doctorName = this.appointmentForm.get('doctorName')?.value;
    //   const doctorId = this.getDoctorIdByName(doctorName);
    //   if (doctorId && date) {
    //     this.loadAvailableSlots(doctorId, date);
    //   }
    // })

  }
  private checkDoctorAvailabilityAndLoadSlots(doctorId: number, appointmentDate: string): void {
    // Fetch unavailable dates
    this.doctorService.getUnavailableDates(doctorId).subscribe(
      (unavailableDates) => {
        this.unavailableDates = unavailableDates.map((unavailable) =>
          this.formatDate(new Date(unavailable.date))
        );

        if (this.unavailableDates.includes(appointmentDate)) {
          // Doctor is unavailable on this date
          this.showDoctorUnavailableMessage = true;
          this.doctorUnavailableMessage = '*The selected doctor is unavailable on this date.';
          this.availableSlots = []; // Clear available slots
          this.appointmentForm.get('appointmentTime')?.setValue(''); // Clear selected appointment time
        } else {
          // Doctor is available, load slots
          this.showDoctorUnavailableMessage = false;
          this.doctorUnavailableMessage = '';
          this.loadAvailableSlots(doctorId, appointmentDate);
        }

        this.cdr.detectChanges(); // Trigger change detection
      },
      (error) => {
        console.error('Error fetching unavailable dates:', error);
      }
    );
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
  private getDoctorByName(doctorName: string): Doctor | undefined {
    return this.doctors.find(d => d.name === doctorName);
  }

  loadAvailableSlots(doctorId: number, date: string): void {
    this.appointmentService.getAvailableSlots(doctorId, date).subscribe(
      (availability) => {
        if (availability && availability.availableFrom) {
          const [start, end] = availability.availableFrom.split('-');
          const slotDuration = availability.slotDuration;
          this.availableSlots = this.generateTimeSlots(start, end, slotDuration);

          // Remove the slots that are already booked for that date
          this.appointmentService.getBookedSlots(doctorId, date).subscribe(
            (bookedSlots: string[]) => {
              console.log(bookedSlots, "booked")

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

              if (this.availableSlots.length === 0) {
                this.showAvailabilityMessage = true;
                this.availabilityMessage = '*No slots available for the selected date';
              } else {
                this.showAvailabilityMessage = false;
                this.availabilityMessage = '';
              }

              // Check if the currently selected time in the form is still available
              const selectedTime = this.appointmentForm.get('appointmentTime')?.value;

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

  // private checkSlotAvailability(doctorId: number, date: string, time: string): void {

  //   this.appointmentService.getAvailableSlots(doctorId, date).subscribe(
  //     (availability) => {

  //       if (availability && availability.availableFrom) {
  //         const [start, end] = availability.availableFrom.split('-');
  //         const slotDuration = availability.slotDuration;
  //         const availableSlots = this.generateTimeSlots(start, end, slotDuration);


  //         if (!availableSlots.includes(time)) {
  //           this.showAvailabilityMessage = true;
  //           this.availabilityMessage = '*The selected time slot is no longer available';
  //         } else {
  //           this.showAvailabilityMessage = false;
  //           this.availabilityMessage = '';
  //         }
  //       }
  //     },
  //     (error) => {
  //       console.error('Error checking slot availability:', error);
  //     }
  //   );
  // }
  private checkSlotAvailability(doctorId: number, date: string, time: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.appointmentService.getBookedSlots(doctorId, date).subscribe({
        next: (bookedSlots: string[]) => {
          console.log(bookedSlots, 'in check slot availability')
          resolve(!bookedSlots.includes(time));
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }
  generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {

    const slots = [];
    let current = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);


    while (current < end) {
      const slotStart = current.toTimeString().substring(0, 5);
      current = new Date(current.getTime() + slotDuration * 60000);

      if (current <= end) {
        const slotEnd = current.toTimeString().substring(0, 5);
        slots.push(`${slotStart}-${slotEnd}`);

      }
    }

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

    if (this.appointment) {
      this.appointment.date = this.appointmentForm.get('appointmentDate')?.value;
      this.appointment.time = this.appointmentForm.get('appointmentTime')?.value;
      this.appointment.emailSent = true;
      this.appointment.smsSent = true;

      const status = this.appointmentForm.get('appointmentStatus')?.value;
      const requestVia = this.appointmentForm.get('requestVia')?.value;

      if (status === 'Confirm' && this.appointment.status === 'Cancelled') {
        this.appointmentService.removeCancelledAppointment(this.appointment.id!);
      }
      this.appointment.status = status;
      this.submit.emit({ appointment: this.appointment, status, requestVia }); // Emit the data to the parent component
      this.showForm = false; // Close the form after submission
      if (this.appointmentForm.value.appointmentStatus === "Confirm") {
        this.appointment.status = "confirmed"
      }
      if (this.appointment.status === "confirmed") {
        console.log('in form component', this.appointment);
        this.appointmentService.addConfirmedAppointment(this.appointment);
        this.doctorService.getDoctorDetails(this.appointment.doctorId).subscribe({
          next: (response) =>{
            const doctorPhoneNumber = response?.phone_number;
            const appointmentDetails ={
              patientName: this.appointment?.patientName,
              doctorName: this.appointment?.doctorName,
              date: this.appointment?.date,
              time: this.appointment?.time,
              doctorPhoneNumber: doctorPhoneNumber,
              patientPhoneNumber: this.appointment?.phoneNumber,
              status: this.appointment?.status
            }
            this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
              next: (response) => {
                console.log('WhatsApp message sent successfully:', response);
              },
              error: (error) => {
                console.error('Error sending WhatsApp message:', error);
              }
            });
          }
          
        });

        
        this.doctorService.getDoctorDetails(this.appointment.doctorId).subscribe({
          next: (response) => {
            const doctorEmail = response?.email;
            const patientEmail = this.appointment?.email;

            // Ensure both emails are valid
            if (!doctorEmail || !patientEmail) {
              console.error('Doctor or patient email is missing.');
              return;
            }

            // Prepare appointment details for email
            const appointmentDetails = {
              patientName: this.appointment?.patientName,
              doctorName: this.appointment?.doctorName,
              date: this.appointment?.date,
              time: this.appointment?.time,
            };

            const status = 'confirmed';

            // Send email to the doctor
            this.appointmentService.sendEmail(doctorEmail, status, appointmentDetails, 'doctor').subscribe({
              next: (response) => {
                console.log('Email sent to doctor successfully:', response);
              },
              error: (error) => {
                console.error('Error sending email to doctor:', error);
              },
            });

            // Send email to the patient
            this.appointmentService.sendEmail(patientEmail, status, appointmentDetails, 'patient').subscribe({
              next: (response) => {
                console.log('Email sent to patient successfully:', response);
              },
              error: (error) => {
                console.error('Error sending email to patient:', error);
              },
            });
          },
          error: (error) => {
            console.error('Error in getting doctor details:', error);
          },
        });
      }
      // Mark the slot as booked
      this.addBookedSlot(this.appointment.doctorId, this.appointment.date, this.appointment.time);
    } else {
      const doctorId = this.getDoctorIdByName(this.appointmentForm.value.doctorName);

      if (doctorId === undefined) {
        console.error('Doctor ID not found for the given doctor name.');
        return; // Optionally, stop execution if doctor ID is required
      }
      const selectedDoctor = this.getDoctorByName(this.appointmentForm.value.doctorName);

      if (selectedDoctor) {
        const doctorId = selectedDoctor.id;
        const department = selectedDoctor.departmentName ?? 'Default Department'; // Assuming departmentName is a property in the doctor model

        const appointmentDetails = {
          patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
          phoneNumber: this.appointmentForm.value.phoneNumber,
          doctorId: doctorId,
          doctorName: this.appointmentForm.value.doctorName,
          department: department, // Adjust as needed
          date: this.appointmentForm.value.appointmentDate,
          time: this.appointmentForm.value.appointmentTime,
          requestVia: this.appointmentForm.value.requestVia,
          status: this.appointmentForm.value.appointmentStatus,
          email: this.appointmentForm.value.email,
          smsSent: true,
          emailSent:true
        };
        this.appointment = appointmentDetails;
        // Mark the slot as booked

        if (this.appointmentForm.value.appointmentStatus === "Confirm") {
          this.appointment.status = "confirmed"
        }
        if (this.appointment.status === "confirmed") {
          this.appointmentService.addConfirmedAppointment(this.appointment);
          this.doctorService.getDoctorDetails(this.appointment.doctorId).subscribe({
            next: (response) =>{
              const doctorPhoneNumber = response?.phone_number;
              const appointmentDetails ={
                patientName: this.appointment?.patientName,
                doctorName: this.appointment?.doctorName,
                date: this.appointment?.date,
                time: this.appointment?.time,
                doctorPhoneNumber: doctorPhoneNumber,
                patientPhoneNumber: this.appointment?.phoneNumber,
                status: this.appointment?.status
              }
              this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
                next: (response) => {
                  console.log('WhatsApp message sent successfully:', response);
                },
                error: (error) => {
                  console.error('Error sending WhatsApp message:', error);
                }
              });
            }
            
          });
          this.doctorService.getDoctorDetails(this.appointment.doctorId).subscribe({
            next: (response) => {
              const doctorEmail = response?.email;
              const patientEmail = this.appointment?.email;

              // Ensure both emails are valid
              if (!doctorEmail || !patientEmail) {
                console.error('Doctor or patient email is missing.');
                return;
              }

              // Prepare appointment details for email
              const appointmentDetails = {
                patientName: this.appointment?.patientName,
                doctorName: this.appointment?.doctorName,
                date: this.appointment?.date,
                time: this.appointment?.time,
              };

              const status = 'confirmed';

              // Send email to the doctor
              this.appointmentService.sendEmail(doctorEmail, status, appointmentDetails, 'doctor').subscribe({
                next: (response) => {
                  console.log('Email sent to doctor successfully:', response);
                },
                error: (error) => {
                  console.error('Error sending email to doctor:', error);
                },
              });

              // Send email to the patient
              this.appointmentService.sendEmail(patientEmail, status, appointmentDetails, 'patient').subscribe({
                next: (response) => {
                  console.log('Email sent to patient successfully:', response);
                },
                error: (error) => {
                  console.error('Error sending email to patient:', error);
                },
              });
            },
            error: (error) => {
              console.error('Error in getting doctor details:', error);
            },
          });


          this.addBookedSlot(this.appointment.doctorId, this.appointment.date, this.appointment.time);
        }
        // if (this.appointment?.requestVia === "Call") {
        //   this.appointment.status = "confirmed";
        //   this.appointmentService.addConfirmedAppointment(this.appointment);
        // }

        // If creating a new appointment, add it (no id needed)
        this.appointmentService.addNewAppointment(appointmentDetails);
        this.showForm = false; // Close the form after submission
      }

      // if (this.appointment?.requestVia === "Call" || this.appointment?.requestVia === "Walk-In") {
      //   this.appointment.status = "confirmed";
      //   this.appointmentService.addConfirmedAppointment(this.appointment);
      //   this.addBookedSlot(this.appointment.doctorId, this.appointment.date, this.appointment.time);
      // }
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
