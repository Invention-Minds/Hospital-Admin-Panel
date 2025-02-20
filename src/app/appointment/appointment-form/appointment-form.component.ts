
import { Component, OnInit, Output, EventEmitter, Input, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { Doctor } from '../../models/doctor.model';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { response } from 'express';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { app } from '../../../../server';
import { start } from 'node:repl';
import { stat } from 'node:fs';
import { Toast } from 'primeng/toast';


interface Appointment {
  id?: number;
  patientName: string;
  patientId?: number; // Added patientId to track the patient
  phoneNumber: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  email: string;
  requestVia?: string;
  prnNumber?: number;
  status: string;
  smsSent?: boolean;
  emailSent?: boolean;
  messageSent?: boolean;
  doctorId: number;
  isrescheduled?: boolean;
  checkedIn?: boolean;
  doctor?: Doctor;
  age?: string;
  gender?: string;
}
type DayName = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

// Update the availability type
interface Availability {

  id: number;
  day: DayName;
  availableFrom: string; // Change here to use a single field
  slotDuration: number;
  updatedAt?: string;
  doctorId?: number;
  availableFromArray?: [''],

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
  private unsubscribe$ = new Subject<void>();
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
  minDate: any = new Date();
  @Input() doctorAvailability: Doctor | null = null;
  @Input() slot!: any;
  @Input() date!: any;
  @Input() isBookedSlot: boolean = false; // Add input to accept the value from parent component
  @Input() currentAppointment: Appointment | null = null;
  @Output() statusChange = new EventEmitter<{ slotTime: string; status: 'available' | 'booked' | 'unavailable' | 'complete' }>();
  oldDate: string = '';
  oldTime: string = '';
  isVisitingConsultant: boolean = false;
  time: string = '';
  minTime: Date | undefined;
  timeError: string = '';
  availableDates: string[] = [];
  disabledDates: Date[] = [];
  department: string = '';
  doctorType: string = '';
  patients: any[] = [];
  filteredPRNs: any[] = []; // To store filtered PRN suggestions
  showSuggestions = false; // Control visibility of suggestion dropdown
  appointmentStatus: string = 'pending'

  private subscription!: Subscription;



  constructor(private fb: FormBuilder, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private messageService: MessageService, private cdr: ChangeDetectorRef, private authService: AuthServiceService, private router: Router) {
    this.setMinTime();
  }

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{ appointment: Appointment; status: string; requestVia: string }>();

  ngOnInit(): void {
    // Set the minimum date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    // this.minDate = `${year}-${month}-${day}`;
    // this.minDate = today.toISOString().split('T')[0]
    // console.log(this.minDate)
    if (!(this.minDate instanceof Date)) {
      console.error('Invalid minDate, resetting to today.');
      this.minDate = new Date(); // Reset to today's date
    }
    this.loadDoctors();
    this.appointmentService.getAllPatients().subscribe(
      (patients => {
        this.patients = patients;
        // console.log(this.patients)
      })
    )





    // this.loadBookedSlots(); // Load booked slots from localStorage
    this.appointmentForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]*$/)]],
      lastName: ['', [Validators.pattern(/^[a-zA-Z.\s]*$/)]],
      prnNumber: ['', [Validators.pattern(/^[0-9]+$/)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$|^\d{3}\*{4}\d{3}$/)]],
      email: ['', [Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
      doctorName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z().\s]*$/)]],
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      requestVia: ['Call', Validators.required], // Set default to 'Call'
      appointmentStatus: ['Confirm', Validators.required], // Set default to 'Confirm'
      age: ['', Validators.pattern(/^[0-9]+$/)],
      gender: ['Male']
    });
    if (this.appointment?.phoneNumber.startsWith('91')) {
      this.appointment.phoneNumber = this.appointment.phoneNumber.substring(2);
    }
    // console.log(this.currentAppointment)
    if (this.currentAppointment) {
      // console.log(this.currentAppointment)

      this.patchFormWithAppointment(this.currentAppointment, new Date(this.currentAppointment.date));
    }

    if (this.appointment) {
      // console.log("existing")
      // console.log(this.appointment)
      this.doctorId = this.appointment.doctorId;
      console.log(this.appointment.status)
      this.appointmentStatus = this.appointment.status
      setTimeout(() => {


        if (this.appointmentStatus !== 'pending') {
          this.appointmentForm.get('phoneNumber')?.setValue(this.appointment!.phoneNumber);
        } else {
          this.appointmentForm.get('phoneNumber')?.setValue(this.appointment!.phoneNumber);
        }
      }, 1000);

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
      // console.log(new Date(this.appointment.date));
      this.oldDate = this.appointment.date;
      this.oldTime = this.appointment.time;
      // console.log("appointmentpatch"  ,this.appointment)

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
            // console.log(this.appointment!.time);
            this.appointment!.time = ''
            // this.appointmentForm.get('appointmentTime')?.setValue('');
            // console.log(this.appointmentForm.value)

            // Reload available slots for the given doctor and date
            this.checkDoctorAvailabilityAndLoadSlots(this.appointment!.doctorId, appointmentDate);
          }
        })
        .catch(error => {
          console.error('Error checking slot availability:', error);
        });
      this.appointmentForm.get('doctorName')?.valueChanges.subscribe(doctorName => {
        const date = this.appointmentForm.get('appointmentDate')?.value;
        // const doctorId = this.getDoctorIdByName(doctorName);

        const doctorId = this.doctorId;
        if (doctorId && date) {
          this.checkDoctorAvailabilityAndLoadSlots(doctorId, this.formatDate(date))
        }
      });
      this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(date => {
        const doctorName = this.appointmentForm.get('doctorName')?.value;
        // const doctorId = this.getDoctorIdByName(doctorName);
        console.log(this.doctorId)
        const doctorId = this.doctorId;

        if (doctorId && date) {
          this.checkDoctorAvailabilityAndLoadSlots(doctorId, this.formatDate(date));
        }
      });
      this.appointmentForm.get('appointmentTime')?.valueChanges.subscribe(time => {
        const date = this.appointmentForm.get('appointmentDate')?.value;
        const doctorName = this.appointmentForm.get('doctorName')?.value;
        // const doctorId = this.getDoctorIdByName(doctorName);
        const doctorId = this.doctorId;
        if (doctorId && date) {
          this.checkDoctorAvailabilityAndLoadSlots(doctorId, this.formatDate(date));
        }
      })
      // this.availableSlots = this.appointmentForm.get('appointmentTime')?.value;
      // console.log('available',this.availableSlots)
    }
    // else if (this.doctorAvailability ) {
    //   console.log(this.doctorAvailability, this.date)
    //   this.date = this.formatDate(this.date)
    //   console.log(this.slot.time)
    //   this.checkDoctorAvailabilityAndLoadSlots(this.doctorAvailability.id, this.date)
    //   console.log(typeof (String(this.slot.time)))
    //   this.appointmentForm.patchValue({
    //     doctorName: this.doctorAvailability!.name,
    //     appointmentDate: this.date,
    //     appointmentTime: this.slot.time,
    //   });

    //   // console.log(this.availableSlots)
    //   // if(this.currentAppointment!.status === "completed"){

    //   // }
    //   // const .match = this.availableSlots.includes(this.slot.time);
    //   // console.log(match)
    //   // this.appointmentForm.get('appointmentTime')?.setValue(this.slot.time);

    // }
    else if (this.doctorAvailability) {
      console.log(this.doctorAvailability, this.date);
      // this.date = this.formatDate(this.date)
      // Format the date correctly
      this.date = new Date(this.date);
      console.log(this.date, 'date');
      console.log(today, this.minDate)
      if (this.date.toDateString() === today.toDateString()) {
        this.minDate = null;
        console.log(this.minDate, 'minDate');
      } else if (this.date < today) {
        this.minDate = null; // Also handle past dates
        console.log(this.minDate, 'minDate');
      }

      // Check if doctor type is Visiting Consultant
      if (this.doctorAvailability.doctorType === 'Visiting Consultant') {
        this.isVisitingConsultant = true;
        this.department = this.doctorAvailability.departmentName!
        this.doctorId = this.doctorAvailability.id;
        // console.log(this.doctorId)
        // Handle Visiting Consultant doctor slots by prompting the user to select manually
        this.appointmentForm.patchValue({
          doctorName: this.doctorAvailability!.name,
          appointmentDate: this.date,
          appointmentTime: this.currentAppointment?.time,  // Set to null initially, prompt user to select a time
          age: this.currentAppointment?.age,
          gender: this.currentAppointment?.gender,
        });

        // Show message or handle slot selection using p-calendar for manual time selection
        // console.log('Please select an appointment time from the available slots.');
      } else {
        // For other doctor types, continue using the current slot
        // console.log(this.slot.time);
        this.doctorId = this.doctorAvailability.id;
        this.department = this.doctorAvailability.departmentName!
        // console.log(this.doctorId)
        this.checkDoctorAvailabilityAndLoadSlots(this.doctorAvailability.id, this.formatDate(this.date));

        if (this.slot && this.slot.time) {
          // console.log(this.date)
          this.appointmentForm.patchValue({
            doctorName: this.doctorAvailability!.name,
            appointmentDate: this.date,
            appointmentTime: this.slot.time,
          });
        } else {
          console.error('Slot time is not defined.');
        }
      }
    }

    else {
      // New appointment - load available slots when the doctor or date changes.
      this.setupNewAppointmentFormListeners();
    }

  }
  setMinTime(): void {
    const today = new Date();
    const selectedDate = new Date(); // You can replace this with your date picker control value

    if (selectedDate.toDateString() === today.toDateString()) {
      // If today is selected, limit the time to future times
      this.minTime = today;
    } else {
      this.minTime = undefined; // No restriction for other dates
    }
  }

  // onPRNChange(){
  //   // console.log(this.appointmentForm.value.prnNumber)
  //   if (!this.appointmentForm.value.prnNumber) {
  //     // Reset fields if UHID is empty
  //     this.appointmentForm.value.patientName = '';
  //     this.appointmentForm.value.phoneNumber = ''
  //     return;
  //   }
  //   const matchingEstimation = this.patients.find(
  //     (estimation) => String(estimation.prn) === String(this.appointmentForm.value.prnNumber)
  //   );
  //   // console.log("🔍 Matching Estimation:", matchingEstimation);

  //   // console.log(matchingEstimation)
  //   if (matchingEstimation) {
  //     const nameParts = matchingEstimation.name.split(" ");
  //     this.appointmentForm.get('firstName')?.setValue(nameParts[0]);
  //     this.appointmentForm.get('lastName')?.setValue(nameParts.slice(1).join(' '));
  //     this.appointmentForm.get('phoneNumber')?.setValue(matchingEstimation.phoneNumber);
  //   } else {
  //     // Reset if no match found
  //     this.appointmentForm.value.patientName = '';
  //      this.appointmentForm.value.patientPhoneNumber = ''
  //   }
  // }
  onPRNChange() {
    const input = this.appointmentForm.get('prnNumber')?.value || '';

    if (!input) {
      this.filteredPRNs = [];
      return;
    }

    // Filter PRN suggestions
    this.filteredPRNs = this.patients.filter(patient =>
      String(patient.prn).startsWith(String(input)) // Convert to string before calling startsWith()
    );
    console.log(this.filteredPRNs)

    if (this.filteredPRNs.length === 0) {
      this.showSuggestions = false;
    } else {
      this.showSuggestions = true;
    }
  }

  selectPRN(selectedPatient: any) {
    console.log(selectedPatient)
    if (!selectedPatient) return;

    console.log(selectedPatient)

    // Extract name and remove prefixes
    const nameParts = selectedPatient.name.split(" ");
    const titles = ["Mr.", "Ms.", "Mrs.", "Miss.", "Dr.", "Master"];

    let firstName = nameParts[0];
    let lastName = nameParts.slice(1).join(" ");

    if (titles.includes(firstName)) {
      firstName = nameParts[1] || "";
      lastName = nameParts.slice(2).join(" ") || "";
    }

    // Ensure that form controls exist before setting values
    this.appointmentForm.patchValue({
      prnNumber: selectedPatient.prn || '',
      firstName: firstName || '',
      lastName: lastName || '',
      phoneNumber: selectedPatient.mobileNo || '', // Extract only numbers from "81 Yrs"
      gender: selectedPatient.gender
    });
    this.appointmentForm.get('age')?.clearAsyncValidators();
    this.appointmentForm.get('age')?.updateValueAndValidity();
    this.appointmentForm.patchValue({
      age: selectedPatient.age ? selectedPatient.age.replace(/\D/g, '') : ''
    });

    this.appointmentForm.get('age')?.updateValueAndValidity();

    console.log("PRN Selected:", selectedPatient);

    // Hide suggestions
    this.showSuggestions = false;
  }


  hideSuggestions() {
    // Hide suggestions after clicking outside, but keep it visible if user is interacting
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }
  // getMaskedPhoneNumber(phoneNumber: string): string {
  //   if (!phoneNumber) return ''; // If no phone number is available, return blank

  //   // Mask middle 4 digits for non-pending statuses
  //   return phoneNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
  // }

  onPhoneFocus() {
     // Do nothing if not pending

    const originalPhone = this.appointmentForm.get('phoneNumber')?.value;
    this.appointmentForm.get('phoneNumber')?.setValue(originalPhone.replace(/\D/g, '')); // Remove masking
  }

  onPhoneBlur() {
    if (this.appointmentStatus === 'pending') return; // Do nothing if pending

    const originalPhone = this.appointmentForm.get('phoneNumber')?.value;
    this.appointmentForm.get('phoneNumber')?.setValue(originalPhone);
  }


  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
  // ngOnChanges(): void {
  //   if (this.currentAppointment) {
  //     this.patchFormWithAppointment(this.currentAppointment, this.currentAppointment.date);
  //   }
  // }
  // ngAfterViewInit(): void {
  //   if (this.currentAppointment) {
  //     this.patchFormWithAppointment(this.currentAppointment, this.currentAppointment.date);
  //   }
  // }


  private loadPatientDetails(patientId: number): void {
    this.appointmentService.getPatientById(patientId).subscribe({
      next: (response) => {
        const prnNumber = response.prn;


        // Update the form with the fetched PRN number
        this.appointmentForm.patchValue({ prnNumber: prnNumber });
        // console.log('Fetched PRN:', prnNumber);
      },
      error: (error) => {
        console.error('Error fetching patient details:', error);
      }
    });
  }

  public loadDoctors(): void {
    this.doctorService.getDoctors().subscribe(
      (doctors) => {
        this.doctors = doctors;
        this.filteredDoctors = this.doctors.slice().sort((a, b) => {
          const nameA = a.name.toLowerCase().replace(/^dr\.\s*/, ''); // Remove "Dr." prefix and normalize case
          const nameB = b.name.toLowerCase().replace(/^dr\.\s*/, ''); // Remove "Dr." prefix and normalize case
          return nameA.localeCompare(nameB); // Perform the comparison
        });
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
    this.filteredDoctors = this.doctors.slice().sort((a, b) => {
      const nameA = a.name.toLowerCase().replace(/^dr\.\s*/, ''); // Remove "Dr." prefix and normalize case
      const nameB = b.name.toLowerCase().replace(/^dr\.\s*/, ''); // Remove "Dr." prefix and normalize case
      return nameA.localeCompare(nameB); // Perform the comparison
    });
    this.filteredDoctors = this.doctors.filter(doctor => {
      // doctor.name.toLowerCase().startsWith(doctorNameInput)
      const normalizedDoctorName = doctor.name.toLowerCase().replace(/^dr\.\s*/, ''); // Remove "Dr." prefix
      return normalizedDoctorName.startsWith(doctorNameInput);

    });

    // If the input is empty or there are no matches, hide the suggestions
    this.showDoctorSuggestions = this.filteredDoctors.length > 0 && doctorNameInput.length > 0;
  }

  onDoctorSelect(doctor: Doctor): void {

    this.appointmentForm.get('doctorName')?.setValue(doctor.name);
    this.doctorId = doctor.id;
    this.department = doctor.departmentName!;
    console.log(this.department)
    this.doctorType = doctor.doctorType;
    // console.log(this.doctorId)
    this.onDoctorChange(this.doctorId)
    this.isVisitingConsultant = doctor.doctorType === 'Visiting Consultant';
    this.showDoctorSuggestions = false;  // Hide dropdown after selecting
    // const selectElement = event.target as HTMLSelectElement | null;

    // if (selectElement && selectElement.value) {
    //   const doctorId = parseInt(selectElement.value, 10); // Convert the value to an integer

    //   const selectedDoctor = this.doctors.find(doctor => doctor.id === doctorId);
    //   if (selectedDoctor) {
    //     this.appointmentForm.get('doctorName')?.setValue(selectedDoctor.name);
    //   }
    // }

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
      // this.loadAvailableDates(doctorId!);


      // const doctorId = this.getDoctorIdByName(doctorName);
      const doctorId = this.doctorId;
      if (doctorId) {
        this.onDoctorChange(doctorId)
        let date = this.appointmentForm.get('appointmentDate')?.value;
        if (doctorId && date) {
          this.checkDoctorAvailabilityAndLoadSlots(doctorId, this.formatDate(date))
        }
      }
      // const date = this.appointmentForm.get('appointmentDate')?.value;



    });


    this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(date => {
      const doctorName = this.appointmentForm.get('doctorName')?.value;
      // const doctorId = this.getDoctorIdByName(doctorName);
      console.log(this.doctorId)
      const doctorId = this.doctorId;
      // date = date.toISOString().split('T')[0]
      if (doctorId !== undefined) {
        this.appointmentService.getBookedSlots(doctorId, date).subscribe(
          (bookedSlots: { time: string; complete: boolean }[]) => {
            
            const nonCompleteBookedSlots = bookedSlots.filter(slot => !slot.complete).map(slot => slot.time);
            this.bookedSlots[doctorName] = { [date]: nonCompleteBookedSlots };
            console.log(nonCompleteBookedSlots)
            console.log(this.bookedSlots, "booked")
          });
      }
      if (doctorId && date) {
        this.checkDoctorAvailabilityAndLoadSlots(doctorId, this.formatDate(date))
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
  private checkDoctorAvailabilityAndLoadSlots(doctorId: number, appointmentDate: any): void {
    console.log(this.appointmentForm.value)
    // Fetch unavailable dates
    this.doctorService.getUnavailableDates(doctorId).subscribe(
      (unavailableDates) => {
        this.unavailableDates = unavailableDates.map((unavailable) =>
          this.formatDate(new Date(unavailable.date))
        );

        if (this.unavailableDates.includes(appointmentDate)) {
          // Doctor is unavailable on this date
          // console.log("unavailable")
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
  onTimeSelect(event: any): void {
    const selectedTime = this.formatTimeTo12Hour(event); // Assuming formatTimeTo12Hour formats the date to 'hh:mm AM/PM'
    const doctorName = this.appointmentForm.get('doctorName')?.value;
    // const doctorId = this.getDoctorIdByName(doctorName);
    const doctorId = this.doctorId;
    const selectedDate = this.appointmentForm.get('appointmentDate')?.value;

    const bookedSlotsForDoctor = this.bookedSlots[doctorName]?.[selectedDate] || [];

    // Check if the selected time is already booked
    if (bookedSlotsForDoctor.includes(selectedTime)) {
      this.showAvailabilityMessage = true;
      this.availabilityMessage = '*The selected time slot is already booked. Please choose another time.';
    } else {
      this.showAvailabilityMessage = false;
      this.timeError = '';
    }
    console.log(this.appointmentForm.value)

    // console.log(this.bookedSlots, "booked")

  }
  loadAvailableSlots(doctorId: number, date: any): void {
    // date = date.toDateString();
    // console.log(date, 'date');
    this.appointmentService.getAvailableSlots(doctorId, date).subscribe(
      (availability) => {
        if (availability && availability.availableFrom) {
          const [start, end] = availability.availableFrom.split('-');
          const slotDuration = availability.slotDuration;
          const availableFrom = availability.availableFrom;
          // console.log(start, end, slotDuration)
          let generatedSlots = this.generateTimeSlots(availableFrom, slotDuration);
          // console.log(generatedSlots)
          const today = new Date();
          const selectedDate = new Date(date);

          // if (selectedDate.toDateString() === today.toDateString() && !this.isBookedSlot) {
          //   console.log("today")
          //   const currentTimeInMinutes = today.getHours() * 60 + today.getMinutes();
          //   generatedSlots = generatedSlots.filter(slot => {
          //     const [startTime] = slot.split('-');
          //     const [startHour, startMinute] = startTime.split(':').map(Number);
          //     const slotTimeInMinutes = startHour * 60 + startMinute;
          //     return slotTimeInMinutes > currentTimeInMinutes;
          //   });
          // }
          if (selectedDate.toDateString() === today.toDateString() && !this.isBookedSlot) {
            // console.log("today");

            // Get current time in minutes
            const currentTimeInMinutes = today.getHours() * 60 + today.getMinutes();

            // Filter generatedSlots to only include future slots
            generatedSlots = generatedSlots.filter(slot => {
              // Extract the time and period (AM/PM) from the slot
              const [time, period] = slot.split(' '); // Example: "09:00 AM" -> ["09:00", "AM"]
              let [hours, minutes] = time.split(':').map(Number); // Example: "09:00" -> [9, 0]

              // Convert hours based on AM/PM
              if (period === 'PM' && hours !== 12) {
                hours += 12; // Convert PM hour to 24-hour format (e.g., 1 PM -> 13)
              } else if (period === 'AM' && hours === 12) {
                hours = 0; // Convert 12 AM to 0 hours (midnight)
              }

              // Calculate slot time in minutes
              const slotTimeInMinutes = hours * 60 + minutes;

              // Return true if the slot time is greater than the current time in minutes
              return slotTimeInMinutes > currentTimeInMinutes;
            });
          }


          this.availableSlots = generatedSlots;
          // console.log(this.availableSlots, "in current")
          this.doctorService.getExtraSlots(doctorId, date).subscribe(
            (extraSlots: { date: string; time: string }[]) => {
              // Extract times from extra slots
              const extraSlotTimes = extraSlots.map(slot => slot.time);
              // console.log(extraSlotTimes);

              // Add extra slots to generatedSlots if they are not already added
              extraSlotTimes.forEach(extraSlot => {
                // extraSlot = this.convertTo12HourFormat(extraSlot)
                // console.log(extraSlot)
                const isAlreadyAdded = this.availableSlots.includes(extraSlot);
                if (!isAlreadyAdded) {
                  this.availableSlots.push(extraSlot);
                }
              });
            });
          if (this.isBookedSlot) {
            this.availableSlots = [...this.availableSlots, this.slot.time];
          }
          else {
            // Remove the slots that are already booked for that date
            this.appointmentService.getBookedSlots(doctorId, date).subscribe(
              (bookedSlots: { time: string; complete: boolean }[]) => {
                const nonCompleteBookedSlots = bookedSlots.filter(slot => !slot.complete).map(slot => slot.time);
                // console.log(nonCompleteBookedSlots, "booked")
                // console.log(bookedSlots, "booked")

                // this.availableSlots = this.availableSlots.filter(
                //   (slot) => !bookedSlots.includes(slot)
                // );
                this.doctorService.getUnavailableSlots(doctorId).subscribe(
                  (unavailableSlots: { [date: string]: string[] }) => {
                    const unavailableSlotsForDate = unavailableSlots[date] || [];
                    if (this.appointment && this.appointment.date === date && this.appointment.doctorId === doctorId) {
                      const formatSlotIfNeeded = (slot: string): string => {
                        // Determine if the slot is in 12-hour format
                        return slot.includes('AM') || slot.includes('PM') ? slot : this.convertTo12HourFormat(slot);
                      };
                      const currentSelectedTime = this.appointment.time;
                      // if(this.isBookedSlot){
                      //   console.log("if")
                      //   this.availableSlots = [...this.availableSlots], this.slot.time;
                      //   console.log(this.availableSlots)
                      // }
                      const formattedBookedSlots = nonCompleteBookedSlots.map((bookedSlot) => formatSlotIfNeeded(bookedSlot.split('-')[0]));
                      const formattedUnavailableSlots = unavailableSlotsForDate.map((unavailableSlot) => formatSlotIfNeeded(unavailableSlot.split('-')[0]));
                      // console.log(formattedBookedSlots, "booked", formattedUnavailableSlots)

                      // console.log("else")
                      this.availableSlots = this.availableSlots.filter((slot) => {
                        return slot === currentSelectedTime || (!formattedBookedSlots.includes(slot) && !formattedUnavailableSlots.includes(slot));
                      });



                    } else {
                      const formatSlotIfNeeded = (slot: string): string => {
                        // Determine if the slot is in 12-hour format
                        return slot.includes('AM') || slot.includes('PM') ? slot : this.convertTo12HourFormat(slot);
                      };
                      // console.log(nonCompleteBookedSlots, unavailableSlotsForDate)
                      const formattedBookedSlots = nonCompleteBookedSlots.map((bookedSlot) => formatSlotIfNeeded(bookedSlot.split('-')[0]));
                      const formattedUnavailableSlots = unavailableSlotsForDate.map((unavailableSlot) => formatSlotIfNeeded(unavailableSlot.split('-')[0]));
                      // console.log(formattedBookedSlots, "booked", formattedUnavailableSlots)
                      // For new appointments, remove all booked slots
                      this.availableSlots = this.availableSlots.filter((slot) => (!formattedBookedSlots.includes(slot) && !formattedUnavailableSlots.includes(slot)));
                    }
                  });
                // If editing an appointment, retain the currently selected time slot if it exists
                if (
                  this.isBookedSlot &&
                  this.slot?.time &&
                  nonCompleteBookedSlots.includes(this.slot.time) &&
                  !this.availableSlots.includes(this.slot.time)
                ) {

                  this.availableSlots = [...this.availableSlots, this.slot.time];
                  // console.log(this.availableSlots, "availableSlots")
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
                // console.log(selectedTime, "selectedTime",)

                if (selectedTime && !this.availableSlots.includes(selectedTime)) {
                  this.showAvailabilityMessage = true;
                  this.availabilityMessage = '*The selected time slot is no longer available. Please choose a different time.';
                }
              },
              (error) => {
                console.error('Error loading booked slots:', error);
              }

            );
          }


        } else {
          this.availableSlots = [];
        }
      },
      (error) => {
        console.error('Error loading slots:', error);
      }
    );
  }

  // private removeBookedSlotsFromAvailable(doctorId: number, date: string): void {
  //   this.appointmentService.getBookedSlots(doctorId, date).subscribe(
  //     (bookedSlots) => {
  //       this.availableSlots = this.availableSlots.filter(slot => !bookedSlots.includes(slot));
  //     },
  //     (error) => {
  //       console.error('Error loading booked slots:', error);
  //     }
  //   );
  // }

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
  // private checkSlotAvailability(doctorId: number, date: string, time: string): Promise<boolean> {
  //   return new Promise((resolve, reject) => {
  //     this.appointmentService.getBookedSlots(doctorId, date).subscribe({
  //       next: (bookedSlots: string[]) => {
  //         // console.log(bookedSlots, 'in check slot availability')
  //         resolve(!bookedSlots.includes(time));
  //       },
  //       error: (error) => {
  //         reject(error);
  //       }
  //     });
  //   });
  // }
  private checkSlotAvailability(doctorId: number, date: any, time: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.appointmentService.getBookedSlots(doctorId, date).subscribe({
        next: (bookedSlots: { time: string; complete: boolean }[]) => {
          // Filter out booked slots that are complete
          const nonCompleteBookedSlots = bookedSlots.filter(slot => !slot.complete).map(slot => slot.time);

          // Resolve with true if the given time is not included in non-complete booked slots (i.e., it's available)
          resolve(!nonCompleteBookedSlots.includes(time));
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }
  // generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {

  //   const slots = [];
  //   let current = new Date(`1970-01-01T${startTime}`);
  //   const end = new Date(`1970-01-01T${endTime}`);


  //   while (current < end) {
  //     const slotStart = current.toTimeString().substring(0, 5);
  //     current = new Date(current.getTime() + slotDuration * 60000);

  //     if (current <= end) {
  //       const slotEnd = current.toTimeString().substring(0, 5);
  //       slots.push(`${slotStart}-${slotEnd}`);

  //     }
  //   }

  //   return slots;
  // }
  // generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
  //   const slots = [];
  //   let current = new Date(`1970-01-01T${startTime}`);
  //   const end = new Date(`1970-01-01T${endTime}`);

  //   while (current < end || current.toTimeString().substring(0, 5) === endTime) {
  //     const slotStart = current.toTimeString().substring(0, 5);
  //     current = new Date(current.getTime() + slotDuration * 60000);

  //     const slotEnd = current.toTimeString().substring(0, 5);
  //     slots.push(`${slotStart}-${slotEnd}`);
  //   }

  //   return slots;
  // }
  // generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
  //   const slots = [];
  //   let current = new Date(`1970-01-01T${startTime}`);
  //   const end = new Date(`1970-01-01T${endTime}`);

  //   while (current < end || current.toTimeString().substring(0, 5) === endTime) {
  //     const slotStart = this.convertTo12HourFormat(current.toTimeString());
  //     current = new Date(current.getTime() + slotDuration * 60000);


  //     slots.push(slotStart); // Only add the start time
  //   }

  //   return slots;
  // }
  // generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
  //   const slots = [];
  //   let current = new Date(`1970-01-01T${startTime}`);
  //   const end = new Date(`1970-01-01T${endTime}`);

  //   while (current <= end) {
  //     const slotStart = this.convertTo12HourFormat(current.toTimeString().substring(0, 5));
  //     current = new Date(current.getTime() + slotDuration * 60000);

  //     if (current <= end) {
  //       slots.push(slotStart); // Only add the start time if the end of the slot doesn't exceed the available time
  //     }
  //   }
  // console.log(slots,startTime,endTime)
  //   return slots;
  // }
  // generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
  //   const slots = [];
  //   let current = new Date(`1970-01-01T${startTime}`);
  //   const end = new Date(`1970-01-01T${endTime}`);

  //   while (current <= end) {
  //     const slotStart = this.convertTo12HourFormat(current.toTimeString().substring(0, 5));
  //     current = new Date(current.getTime() + slotDuration * 60000);

  //     if (current <= end) {
  //       slots.push(slotStart); // Add the slot if it fits within the schedule
  //     }
  //   }
  //   console.log(slots, startTime, endTime);
  //   return slots;
  // }
  generateTimeSlots(availableFrom: string, slotDuration: number): string[] {
    const slots: string[] = [];
    const timeRanges = availableFrom.split(',').map(range => range.trim()); // Split by commas and trim spaces

    for (const range of timeRanges) {
      const [startTime, endTime] = range.split('-').map(time => time.trim()); // Split start and end times
      let current = new Date(`1970-01-01T${startTime}`);
      const end = new Date(`1970-01-01T${endTime}`);

      while (current <= end) {
        const slotStart = this.convertTo12HourFormat(current.toTimeString().substring(0, 5));
        slots.push(slotStart);

        // Move to the next slot
        current.setMinutes(current.getMinutes() + slotDuration);

        // Ensure it does not exceed the end time
        if (current > end) break;
      }
    }

    console.log(slots);
    return slots;
  }





  // Utility function to convert Date object to 12-hour format with AM/PM
  convertTo12HourFormat(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  }



  // private loadBookedSlots() {
  //   this.bookedSlots = JSON.parse(localStorage.getItem('bookedSlots') || '{}');
  //   console.log('Loaded booked slots:', JSON.stringify(this.bookedSlots, null, 2));
  // }

  private patchFormWithAppointment(appointment: Appointment, appointmentDate: any) {
    this.appointment?.doctor?.doctorType === 'Visiting Consultant' ? this.isVisitingConsultant = true : this.isVisitingConsultant = false;
    // console.log(this.appointment?.doctor?.doctorType, this.isVisitingConsultant)
    // console.log(appointment)
    let phoneNumber = appointment.phoneNumber;

    // if (!phoneNumber.startsWith('91')) {
    //   phoneNumber = '91' + phoneNumber;
    // }
    if (phoneNumber.startsWith('91')) {
      phoneNumber = phoneNumber.substring(2);

    }
    // console.log(typeof (appointment.time))
    if (!this.isBookedSlot) {
      appointment.status = 'Confirm';
    }
    else {
      appointment.status = 'Complete';
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    if (appointment.date === date) {
      this.minDate = null;
      console.log(this.minDate, 'minDate');
    } else if (appointment.date < date) {
      this.minDate = null; // Also handle past dates
      console.log(this.minDate, 'minDate');
    }
    const nameParts = appointment.patientName.split(' ');
    this.appointmentForm.patchValue({
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      phoneNumber: phoneNumber,
      email: appointment.email,
      doctorName: appointment.doctorName,
      appointmentDate: appointmentDate,
      appointmentTime: appointment.time,
      requestVia: appointment.requestVia,  // Default selection
      appointmentStatus: appointment.status, // Default selection
      prnNumber: appointment.prnNumber,
      age: appointment.age,
      gender: appointment.gender
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
   console.log('close')
    this.close.emit();
    this.showForm = false;
    // console.log(this.showForm)
    event.stopPropagation();

  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const overlayElement = document.querySelector('.overlay');
    if (overlayElement && !overlayElement.contains(event.target as Node)) {
      // console.log('Clicked outside the form');
      this.showForm = false;
    }
  }
  private syncFormToModel(): void {
    if (!this.appointment || !this.appointmentForm) {
      console.error("Appointment or Form is not defined");
      return;
    }


    const formValues = this.appointmentForm.value;
    const selectedDoctor = this.getDoctorByName(formValues.doctorName);
    let time = formValues.appointmentTime;
    if (selectedDoctor && selectedDoctor.doctorType === 'Visiting Consultant') {
      time = this.formatTimeTo12Hour(time);
    }
    const date = this.formatDate(new Date(formValues.appointmentDate));
    this.appointment.patientName = formValues.firstName + ' ' + formValues.lastName;
    this.appointment.phoneNumber = formValues.phoneNumber.startsWith('91') ? formValues.phoneNumber : '91' + formValues.phoneNumber;
    this.appointment.email = formValues.email;
    this.appointment.doctorName = formValues.doctorName;
    this.appointment.date = date;
    this.appointment.time = time;
    this.appointment.requestVia = formValues.requestVia;
    this.appointment.status = formValues.appointmentStatus === 'Confirm' ? 'confirmed' : formValues.appointmentStatus.toLowerCase();
    this.appointment.prnNumber = parseInt(formValues.prnNumber, 10);
    this.appointment.emailSent = true;
    this.appointment.smsSent = true;
    this.appointment.messageSent = true;
    this.appointment.age = formValues.age;
    this.appointment.gender = formValues.gender;

    // console.log("Updated Appointment:", this.appointment);
  }
  completeAppointment(appointment: Appointment) {
    const appointmentId = appointment.id;
    if (appointmentId !== undefined) {
      this.doctorService.markSlotAsComplete(appointment!.doctorId, appointment.date, appointment.time)
        .subscribe(
          response => {
            // console.log('Slot marked as complete:', response);
            alert('Slot successfully marked as complete!');
            const username = localStorage.getItem('username')
            this.appointmentService.checkedinAppointment(appointmentId, username).subscribe({
              next: (response) => {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Checked in successfully!' });
                appointment.checkedIn = true; // Update the UI to reflect the checked-in status
              },
              error: (error) => {
                console.error('Error during check-in:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to check-in' });
              },
            });
            // Update your view or refresh the slots list here as needed
          },

          error => {
            console.error('Error marking slot as complete:', error);
            alert('Failed to mark the slot as complete.');
          }
        );

    }


    this.saveToLocalStorage();
    // Fetch doctor details to get the slot duration
    this.doctorService.getDoctorDetails(appointment.doctorId).subscribe(
      (doctor) => {

        if (doctor && doctor.slotDuration) {

          const delayTime = (doctor.slotDuration + 5) * 60 * 1000; // Add 5 minutes to the slot duration and convert to milliseconds
          this.appointmentService.scheduleCompletion(appointment.id!, delayTime).subscribe({
            next: () => {
              // console.log('Appointment completion scheduled successfully');
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment completion scheduled successfully' });
            },
            error: (error) => {
              console.error('Error scheduling appointment completion:', error);
            }
          });

        } else {
          console.error('Slot duration not found for doctor:', doctor);
        }
      },
      (error) => {
        console.error('Error fetching doctor details:', error);
      }
    );
  }
  saveToLocalStorage(): void {
    localStorage.setItem('appointments', JSON.stringify(this.completeAppointment));
  }
  confirm() {
    if (!this.appointmentForm.valid) {
      this.messageService.add({ severity: 'warn', summary: 'Warn', detail: 'Some fields are not filled' });
    }
    // console.log(this.appointmentForm.value)
    if (this.appointmentForm.value.appointmentStatus === 'Cancel') {

      this.close.emit();
      const selectedDoctor = this.getDoctorByName(this.appointmentForm.value.doctorName);
      const doctorId = this.doctorId;
      const department = this.department ?? 'Default Department';
      let phoneNumber = this.appointmentForm.value.phoneNumber;

      if (!phoneNumber.startsWith('91')) {
        phoneNumber = '91' + phoneNumber;
      }
      // console.log(this.appointment)
      // console.log(this.appointmentForm.value.appointmentTime)
      // const time = this.appointmentForm.value.appointmentTime;
      if (this.doctorType === 'Visiting Consultant') {
        // console.log("visiting")
        this.isVisitingConsultant = true;
        const time = this.formatTimeTo12Hour(this.appointmentForm.value.appointmentTime);
        this.time = time;
      }
      else {
        const time = this.appointmentForm.value.appointmentTime;
        this.time = time;
      }
      const appointmentDetails = {
        id: this.currentAppointment!.id || this.appointment?.id,
        patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
        phoneNumber: phoneNumber,
        doctorId: doctorId,
        doctorName: this.appointmentForm.value.doctorName,
        department: this.department, // Adjust as needed
        date: this.appointmentForm.value.appointmentDate,
        time: this.time,
        requestVia: this.appointmentForm.value.requestVia,
        status: this.appointmentForm.value.appointmentStatus,
        email: this.appointmentForm.value.email,
        smsSent: true,
        emailSent: true,
        messageSent: true,
        prnNumber: parseInt(this.appointmentForm.value.prnNumber),
        age: this.appointmentForm.value.age,
        gender: this.appointmentForm.value.gender,
      };
      // console.log(appointmentDetails)
      this.appointmentService.addCancelledAppointment(appointmentDetails);
      this.doctorService.getCancelledSlots(doctorId, appointmentDetails.date, appointmentDetails.time).subscribe({
        next: (response) => {
          // console.log('Cancelled slots:', response);
          // const cancelledSlots = response;
          // if (cancelledSlots.includes(appointment.time)) {
          //   console.log('Slot already cancelled:', appointment.time);
          //   return;
          // }
        },
        error: (error) => {
          console.error('Error fetching cancelled slots:', error);
        }
      });
      this.doctorService.getDoctorDetails(appointmentDetails.doctorId).subscribe({
        next: (response) => {
          const doctorPhoneNumber = response?.phone_number;
          const appointmentDetailsforMessage = {
            patientName: appointmentDetails?.patientName,
            doctorName: appointmentDetails?.doctorName,
            date: appointmentDetails?.date,
            time: appointmentDetails?.time,
            doctorPhoneNumber: doctorPhoneNumber,
            patientPhoneNumber: appointmentDetails?.phoneNumber,
            status: 'cancelled',
            requestVia: appointmentDetails.requestVia
          }
          this.appointmentService.sendSmsMessage(appointmentDetailsforMessage).subscribe({
            next: (response) => {
              // console.log('SMS message sent successfully:', response);
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMS message sent successfully!' });
            },
            error: (error) => {
              console.error('Error sending SMS message:', error);
            }
          });
          this.appointmentService.sendWhatsAppMessage(appointmentDetailsforMessage).subscribe({
            next: (response) => {
              // console.log('WhatsApp message sent successfully:', response);
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'WhatsApp message sent successfully!' });
            },
            error: (error) => {
              console.error('Error sending WhatsApp message:', error);
            }
          });
        }

      });
      const appointmentDetailsforEmail = {
        patientName: appointmentDetails?.patientName,
        doctorName: appointmentDetails?.doctorName,
        date: appointmentDetails?.date,
        time: appointmentDetails?.time,
      };
      const patientEmail = appointmentDetails.email;

      const emailStatus = 'cancelled';
      this.appointmentService.sendEmail(patientEmail, emailStatus, appointmentDetailsforEmail, 'patient').subscribe({
        next: (response) => {
          // console.log('Email sent to patient successfully:', response);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully!' });
        },
        error: (error) => {
          console.error('Error sending email to patient:', error);
        },
      });
    }
    else if (this.appointmentForm.value.appointmentStatus === 'Complete') {
      this.completeAppointment(this.currentAppointment!);
      // Emit the status change
      //  this.statusChange.emit({
      //   slotTime: this.currentAppointment!.time, // Assuming the slot time is available here
      //   status: 'complete'
      // });
      this.close.emit();

    }
    else {


      const currentStatus = this.appointment?.status || '';
      const newStatus = this.appointmentForm.get('appointmentStatus')?.value;
      // this.appointment.prnNumber=parseInt(this.appointmentForm.get('prnNumber')?.value);

      if (this.appointment) {
        const newDate = this.appointmentForm.get('appointmentDate')?.value;
        const newTime = this.appointmentForm.get('appointmentTime')?.value;
        this.appointment.emailSent = true;
        this.appointment.smsSent = true;
        this.appointment.messageSent = true;
        if (
          this.appointment.date !== newDate ||
          this.appointment.time !== newTime
        ) {
          this.appointment.status = 'rescheduled';
          // console.log("role", this.appointment)
        } else {
          this.appointment.status = 'confirmed';
        }
        const selectedDoctor = this.getDoctorByName(this.appointmentForm.value.doctorName);
        // console.log(this.doctor, this.appointment.doctorId)
        const doctorId = this.appointment.doctorId
        const department = this.department ?? 'Default Department';
        let phoneNumber = this.appointmentForm.value.phoneNumber;

        if (!phoneNumber.startsWith('91')) {
          phoneNumber = '91' + phoneNumber;
        }
        if (this.doctorType === 'Visiting Consultant') {
          // console.log("visiting")
          this.isVisitingConsultant = true;
          const time = this.formatTimeTo12Hour(this.appointmentForm.value.appointmentTime);
          this.time = time;
        }
        else {
          // console.log("not visiting")
          const time = this.appointmentForm.value.appointmentTime;
          this.time = time;
        }

        this.statusChange.emit({
          slotTime: this.time, // Assuming the slot time is available here
          status: 'booked'
        });
        const appointmentDetails = {
          id: this.appointment.id,
          patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
          phoneNumber: phoneNumber,
          doctorId: doctorId,
          doctorName: this.appointmentForm.value.doctorName,
          department: this.department, // Adjust as needed
          date: this.appointmentForm.value.appointmentDate,
          time: this.time,
          requestVia: this.appointmentForm.value.requestVia,
          status: this.appointmentForm.value.appointmentStatus,
          email: this.appointmentForm.value.email,
          smsSent: true,
          emailSent: true,
          messageSent: true,
          prnNumber: parseInt(this.appointmentForm.value.prnNumber),
          age: this.appointmentForm.value.age,
          gender: this.appointmentForm.value.gender,

        };
        this.appointment = appointmentDetails;
        this.appointment.date = this.appointmentForm.get('appointmentDate')?.value;
        this.appointment.time = this.appointmentForm.get('appointmentTime')?.value;
        // console.log('appointment', this.appointment);
        if (newStatus === 'Confirm' && (currentStatus === 'Cancelled' || currentStatus === 'confirmed')) {
          // This is a reschedule
          this.appointment.status = 'rescheduled';
          if (selectedDoctor!.doctorType === 'Visiting Consultant') {
            // console.log("visiting")
            this.isVisitingConsultant = true;
            const time = this.formatTimeTo12Hour(this.appointmentForm.get('appointmentTime')?.value);
            this.time = time;
            // console.log(this.time)
          }
          else {
            // console.log("not visiting")
            const time = this.appointmentForm.value.appointmentTime;
            this.time = time;
          }
          const appointmentDetails = {
            id: this.appointment.id,
            patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
            phoneNumber: phoneNumber,
            doctorId: doctorId,
            doctorName: this.appointmentForm.value.doctorName,
            department: this.department, // Adjust as needed
            date: this.appointmentForm.value.appointmentDate,
            time: this.time,
            requestVia: this.appointmentForm.value.requestVia,
            status: 'rescheduled',
            email: this.appointmentForm.value.email,
            smsSent: true,
            emailSent: true,
            messageSent: true,
            prnNumber: parseInt(this.appointmentForm.value.prnNumber),
            age: this.appointmentForm.value.age,
            gender: this.appointmentForm.value.gender,
          };
          // console.log(this.time)
          this.appointment.time = this.time;

          this.appointment = appointmentDetails;
          // console.log("status", this.appointment.status)
          if (this.appointment.status === "rescheduled") {
            // this.appointmentService.addConfirmedAppointment(this.appointment)
            this.doctorService.getDoctorDetails(this.appointment.doctorId).subscribe({
              next: (response) => {
                const doctorPhoneNumber = response?.phone_number;
                let phoneNumber = this.appointment!.phoneNumber;

                if (!phoneNumber.startsWith('91')) {
                  phoneNumber = '91' + phoneNumber;
                }
                const appointmentDetails = {
                  patientName: this.appointment?.patientName,
                  doctorName: this.appointment?.doctorName,
                  date: this.appointment?.date,
                  time: this.appointment?.time,
                  doctorPhoneNumber: doctorPhoneNumber,
                  patientPhoneNumber: phoneNumber,
                  status: 'rescheduled',
                  requestVia: this.appointment!.requestVia
                }
                this.appointmentService.sendSmsMessage(appointmentDetails).subscribe({
                  next: (response) => {
                    // console.log('SMS message sent successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMS message sent successfully!' });
                  },
                  error: (error) => {
                    console.error('Error sending SMS message:', error);
                  }
                });
                // console.log('appointment details', appointmentDetails)
                this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
                  next: (response) => {
                    // console.log('WhatsApp message sent successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Whatsapp Message Sent Successfully' });
                  },
                  error: (error) => {
                    console.error('Error sending WhatsApp message:', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending WhatsApp message' });
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

                const status = 'rescheduled';

                // Send email to the doctor
                // this.appointmentService.sendEmail(doctorEmail, status, appointmentDetails, 'doctor').subscribe({
                //   next: (response) => {
                //     console.log('Email sent to doctor successfully:', response);
                //     this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to doctor successfully' });
                //   },
                //   error: (error) => {
                //     console.error('Error sending email to doctor:', error);
                //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to doctor' });
                //   },
                // });

                // Send email to the patient
                this.appointmentService.sendEmail(patientEmail, status, appointmentDetails, 'patient').subscribe({
                  next: (response) => {
                    // console.log('Email sent to patient successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully' });
                  },
                  error: (error) => {
                    console.error('Error sending email to patient:', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to patient' });
                  },
                });
              },
              error: (error) => {
                console.error('Error in getting doctor details:', error);
              },
            });
          }
          // this.syncFormToModel(); 
          this.appointmentService.addConfirmedAppointment(this.appointment);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'The appointment is rescheduled.' });
          this.appointmentService.removeCancelledAppointment(this.appointment.id!);
        } else {
          // Store old date and time before making changes
          const oldDate = this.oldDate
          const oldTime = this.oldTime;
          // console.log("old date", oldDate, "old time", oldTime)
          // console.log("new status,", newStatus,"current status", currentStatus)
          // if(selectedDoctor!.doctorType === 'Visiting Consultant') {
          //   console.log("visiting")
          //   this.isVisitingConsultant = true;
          //   const time = this.formatTimeTo12Hour(this.appointmentForm.value.appointmentTime);
          //   this.time = time;
          //   console.log(this.time)
          // }
          // else{
          // const time = this.appointmentForm.value.appointmentTime;
          // this.time = time;
          // }
          let time: string;

          if (this.doctorType === 'Visiting Consultant') {
            // console.log("visiting");
            this.isVisitingConsultant = true;
            time = this.formatTimeTo12Hour(this.appointmentForm.get('appointmentTime')?.value);
          } else {
            time = this.appointmentForm.value.appointmentTime;
          }

          // console.log("Formatted Time:", time);
          // console.log(this.time)
          const appointmentDetails = {
            id: this.appointment.id,
            patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
            phoneNumber: phoneNumber,
            doctorId: doctorId,
            doctorName: this.appointmentForm.value.doctorName,
            department: department, // Adjust as needed
            date: this.appointmentForm.value.appointmentDate,
            time: this.appointment.time,
            requestVia: this.appointmentForm.value.requestVia,
            status: newStatus,
            email: this.appointmentForm.value.email,
            smsSent: true,
            emailSent: true,
            messageSent: true,
            prnNumber: parseInt(this.appointmentForm.value.prnNumber),
            age: this.appointmentForm.value.age,
            gender: this.appointmentForm.value.gender,


          };
          // console.log(time)

          // console.log(appointmentDetails)
          this.appointment = appointmentDetails;
          // console.log("cancel to confirm", this.appointment)
          this.appointment.time = time;
          // console.log(this.appointment.time, this.appointment)
          // console.log("cancel to confirm")
          this.syncFormToModel();
          this.appointment.status = 'rescheduled';
          if (this.appointment.status === "rescheduled") {
            // this.appointmentService.addConfirmedAppointment(this.appointment)
            this.doctorService.getDoctorDetails(this.appointment.doctorId).subscribe({
              next: (response) => {
                const doctorPhoneNumber = response?.phone_number;
                let phoneNumber = this.appointment!.phoneNumber;

                if (!phoneNumber.startsWith('91')) {
                  phoneNumber = '91' + phoneNumber;
                }
                const appointmentDetails = {
                  patientName: this.appointment?.patientName,
                  doctorName: this.appointment?.doctorName,
                  date: this.appointment?.date,
                  time: this.appointment?.time,
                  doctorPhoneNumber: doctorPhoneNumber,
                  patientPhoneNumber: phoneNumber,
                  status: 'rescheduled',
                  requestVia: this.appointment!.requestVia
                }
                this.appointmentService.sendSmsMessage(appointmentDetails).subscribe({
                  next: (response) => {
                    // console.log('SMS message sent successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMS message sent successfully!' });
                  },
                  error: (error) => {
                    console.error('Error sending SMS message:', error);
                  }
                });
                // console.log('appointment details', appointmentDetails)
                this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
                  next: (response) => {
                    // console.log('WhatsApp message sent successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'WhatsApp Message Sent Successfully' });
                  },
                  error: (error) => {
                    console.error('Error sending WhatsApp message:', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending WhatsApp message' });
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

                const status = 'rescheduled';

                // Send email to the doctor
                // this.appointmentService.sendEmail(doctorEmail, status, appointmentDetails, 'doctor').subscribe({
                //   next: (response) => {
                //     console.log('Email sent to doctor successfully:', response);
                //     this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to doctor successfully' });
                //   },
                //   error: (error) => {
                //     console.error('Error sending email to doctor:', error);
                //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to doctor' });
                //   },
                // });

                // Send email to the patient
                this.appointmentService.sendEmail(patientEmail, status, appointmentDetails, 'patient').subscribe({
                  next: (response) => {
                    // console.log('Email sent to patient successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully' });
                  },
                  error: (error) => {
                    console.error('Error sending email to patient:', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to patient' });
                  },
                });
              },
              error: (error) => {
                console.error('Error in getting doctor details:', error);
              },
            });
          }
          this.appointmentService.addConfirmedAppointment(this.appointment);
          this.doctorService.getCancelledSlots(doctorId, oldDate, oldTime).subscribe({
            next: (response) => {
              // console.log('Cancelled slots:', response);
              const cancelledSlots = response;
              // console.log(cancelledSlots)
            },
            error: (error) => {
              console.error('Error fetching cancelled slots:', error);
            }
          });
          // console.log("appointment", this.appointment)
          this.addBookedSlot(this.appointment.doctorId, this.appointment.date, this.appointment.time);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'The appointment is rescheduled.' });
        }

        // const status = this.appointmentForm.get('appointmentStatus')?.value;
        const requestVia = this.appointmentForm.get('requestVia')?.value;

        // if (status === 'Confirm' && this.appointment.status === 'Cancelled') {
        //   this.appointmentService.removeCancelledAppointment(this.appointment.id!);
        // }
        // this.appointment.status = status;
        // console.log('appointment', this.appointment);
        // console.log('time',this.appointmentForm.get('appointmentTime')?.value)
        this.syncFormToModel();
        this.submit.emit({ appointment: this.appointment, status: this.appointment.status, requestVia }); // Emit the data to the parent component
        this.showForm = false; // Close the form after submission
        // this.router.navigate(['/appointments']);
        // console.log("status of appointment", this.appointment.status)


        if (this.appointmentForm.value.appointmentStatus === "Confirm") {
          this.appointment.status = "confirmed"
        }
        // console.log(this.appointment.status)
        if (this.appointment.status === "confirmed" && this.appointment.isrescheduled === false) {
          // console.log('in form component', this.appointment);
          this.appointment.prnNumber = parseInt(this.appointmentForm.get('prnNumber')?.value);
          this.appointmentService.addConfirmedAppointment(this.appointment);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'The appointment is confirmed.',
          });
          this.doctorService.getDoctorDetails(this.appointment.doctorId).subscribe({
            next: (response) => {
              const doctorPhoneNumber = response?.phone_number;
              let phoneNumber = this.appointment!.phoneNumber;

              if (!phoneNumber.startsWith('91')) {
                phoneNumber = '91' + phoneNumber;
              }
              const appointmentDetails = {
                patientName: this.appointment?.patientName,
                doctorName: this.appointment?.doctorName,
                date: this.appointment?.date,
                time: this.appointment?.time,
                doctorPhoneNumber: doctorPhoneNumber,
                patientPhoneNumber: phoneNumber,
                status: 'confirmed',
                requestVia: this.appointment!.requestVia
              }
              this.appointmentService.sendSmsMessage(appointmentDetails).subscribe({
                next: (response) => {
                  // console.log('SMS message sent successfully:', response);
                  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMS message sent successfully!' });
                },
                error: (error) => {
                  console.error('Error sending SMS message:', error);
                }
              });
              // console.log('appointment details', appointmentDetails)
              this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
                next: (response) => {
                  // console.log('WhatsApp message sent successfully:', response);
                  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'WhatsApp Message Sent Successfully' });
                },
                error: (error) => {
                  console.error('Error sending WhatsApp message:', error);
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending WhatsApp message' });
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

              const status = this.appointment!.status;

              // // Send email to the doctor
              // this.appointmentService.sendEmail(doctorEmail, status, appointmentDetails, 'doctor').subscribe({
              //   next: (response) => {
              //     console.log('Email sent to doctor successfully:', response);
              //     this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to doctor successfully' });
              //   },
              //   error: (error) => {
              //     console.error('Error sending email to doctor:', error);
              //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to doctor' });
              //   },
              // });

              // Send email to the patient
              this.appointmentService.sendEmail(patientEmail, status, appointmentDetails, 'patient').subscribe({
                next: (response) => {
                  // console.log('Email sent to patient successfully:', response);
                  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully' });
                },
                error: (error) => {
                  console.error('Error sending email to patient:', error);
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to patient' });
                },
              });
            },
            error: (error) => {
              console.error('Error in getting doctor details:', error);
            },
          });
        }
        // Mark the slot as booked
        // this.addBookedSlot(this.appointment.doctorId, this.appointment.date, this.appointment.time);
      } else {
        // console.log('Appointment or form is not defined');
        const patientName = this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName;
        const prnNumber = parseInt(this.appointmentForm.value.prnNumber);
        const phoneNumber = this.appointmentForm.value.phoneNumber;
        const email = this.appointmentForm.value.email;

        // Save patient information to the Patient table
        const patientDetails = {
          prn: prnNumber,
          name: patientName,
          phoneNumber: phoneNumber,
          email: email
        };
        // console.log('patient details', patientDetails);
        // this.appointmentService.addPatient(patientDetails).subscribe(
        //   (patientResponse) => {
        //     // console.log('Patient information saved successfully', patientResponse);
        //     this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Patient information saved successfully' });
        //     const patientId = patientResponse.id;
        //     this.appointmentForm.patchValue({ patientId: patientId });
        //     this.appointment!.patientId = patientId;

        //     if (this.appointment && this.appointment.patientId !== undefined) {
        //       this.appointmentService.getPatientById(this.appointment.patientId).subscribe({
        //         next: (response) => {
        //           const prnNumber = response.prn;
        //           this.appointmentForm.patchValue({ prnNumber: prnNumber });
        //           // console.log('Fetched PRN:', prnNumber);
        //         },
        //         error: (error) => {
        //           console.error('Error fetching patient details:', error);
        //         }
        //       });
        //     } else {
        //       console.error('Patient ID is undefined. Cannot fetch patient details.');
        //     }
        //   },
        //   (error) => {
        //     console.error('Error saving patient information:', error);
        //   }
        // );


        // const doctorId = this.getDoctorIdByName(this.appointmentForm.value.doctorName);

        const doctorId = this.doctorId;
        if (doctorId === undefined) {
          console.error('Doctor ID not found for the given doctor name.');
          return; // Optionally, stop execution if doctor ID is required
        }
        const selectedDoctor = this.getDoctorByName(this.appointmentForm.value.doctorName);

        if (selectedDoctor) {
          const doctorId = this.doctorId;
          const department = this.department ?? 'Default Department'; // Assuming departmentName is a property in the doctor model
          let phoneNumber = this.appointmentForm.value.phoneNumber;

          if (!phoneNumber.startsWith('91')) {
            phoneNumber = '91' + phoneNumber;
          }
          if (this.doctorType === 'Visiting Consultant') {
            const time = this.formatTimeTo12Hour(this.appointmentForm.value.appointmentTime);
            this.time = time;
          }
          else {
            const time = this.appointmentForm.value.appointmentTime;
            this.time = time;
          }
          const appointmentDetails = {
            patientName: this.appointmentForm.value.firstName + ' ' + this.appointmentForm.value.lastName,
            phoneNumber: phoneNumber,
            doctorId: doctorId,
            doctorName: this.appointmentForm.value.doctorName,
            department: department, // Adjust as needed
            date: this.appointmentForm.value.appointmentDate,
            time: this.time,
            requestVia: this.appointmentForm.value.requestVia,
            status: this.appointmentForm.value.appointmentStatus,
            email: this.appointmentForm.value.email,
            smsSent: true,
            emailSent: true,
            messageSent: true,
            prnNumber: parseInt(this.appointmentForm.value.prnNumber),
            doctorType: selectedDoctor.doctorType,
            age: this.appointmentForm.value.age,
            gender: this.appointmentForm.value.gender,

          };
          this.appointment = appointmentDetails;
          // Mark the slot as booked

          if (this.appointmentForm.value.appointmentStatus === "Confirm") {
            this.appointment.status = "confirmed"
          }
          this.syncFormToModel();
          if (this.appointment.status === "confirmed") {
            this.appointmentService.addConfirmedAppointment(this.appointment);
            this.statusChange.emit({
              slotTime: this.time, // Assuming the slot time is available here
              status: 'booked'
            });
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'The appointment is confirmed.',
            });
            this.doctorService.getDoctorDetails(this.appointment.doctorId).subscribe({
              next: (response) => {
                const doctorPhoneNumber = response?.phone_number;
                const appointmentDetails = {
                  patientName: this.appointment?.patientName,
                  doctorName: this.appointment?.doctorName,
                  date: this.appointment?.date,
                  time: this.appointment?.time,
                  doctorPhoneNumber: doctorPhoneNumber,
                  patientPhoneNumber: this.appointment?.phoneNumber,
                  status: this.appointment?.status,
                  requestVia: this.appointment!.requestVia
                }
                this.appointmentService.sendSmsMessage(appointmentDetails).subscribe({
                  next: (response) => {
                    // console.log('SMS message sent successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMS message sent successfully!' });
                  },
                  error: (error) => {
                    console.error('Error sending SMS message:', error);
                  }
                });
                this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
                  next: (response) => {
                    // console.log('WhatsApp message sent successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'WhatsApp Message Sent Successfully' });
                  },
                  error: (error) => {
                    console.error('Error sending WhatsApp message:', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending WhatsApp message' });
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
                // this.appointmentService.sendEmail(doctorEmail, status, appointmentDetails, 'doctor').subscribe({
                //   next: (response) => {
                //     console.log('Email sent to doctor successfully:', response);
                //     this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to doctor successfully' });
                //   },
                //   error: (error) => {
                //     console.error('Error sending email to doctor:', error);
                //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to doctor' });
                //   },
                // });

                // Send email to the patient
                this.appointmentService.sendEmail(patientEmail, status, appointmentDetails, 'patient').subscribe({
                  next: (response) => {
                    // console.log('Email sent to patient successfully:', response);
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully' });
                  },
                  error: (error) => {
                    console.error('Error sending email to patient:', error);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to patient' });
                  },
                });
              },
              error: (error) => {
                console.error('Error in getting doctor details:', error);
              },
            });


            // this.addBookedSlot(this.appointment.doctorId, this.appointment.date, this.appointment.time);
          }
          // if (this.appointment?.requestVia === "Call") {
          //   this.appointment.status = "confirmed";
          //   this.appointmentService.addConfirmedAppointment(this.appointment);
          // }

          // If creating a new appointment, add it (no id needed)
          // console.log("appointment", this.appointment)
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




  }
  preventClose(event: Event): void {
    event.stopPropagation(); // Prevent clicks inside the form from closing it
    console.log('closes')
  }
  formatTimeTo12Hour(date: Date): string {
    // Extract hours and minutes directly from the given date
    let hours = date.getHours();
    const minutes = date.getMinutes();

    // Determine AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    hours = hours % 12 || 12; // Convert '0' hours to '12' for AM/PM format

    // Format hours and minutes with leading zeros if needed
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

    return formattedTime;
  }



  private addBookedSlot(doctorId: number, date: string, time: string) {
    this.appointmentService.addBookedSlot(doctorId, date, time).subscribe(
      (response) => {
        // console.log('Slot booked:', response);
      },
      (error) => {
        console.error('Error booking slot:', error);
      }
    );
  }
  disabledDays: number[] = [0, 6]; // Indices of disabled days

  private updateDisabledDays(availability: Availability[]): void {
    // Map short day names to their respective indices
    const dayNameToIndex: Record<DayName, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    // Convert available days to indices
    const availableDays = availability.map((avail) => dayNameToIndex[avail.day]);

    // Determine disabled days by excluding available days
    this.disabledDays = Object.values(dayNameToIndex).filter(
      (index) => !availableDays.includes(index)
    );

    // console.log('Disabled Days (by index):', this.disabledDays);
  }

  onDoctorChange(doctorId: number): void {
    // console.log('function calling')
    this.doctorService.getDoctorById(doctorId).subscribe(
      (response: { availability: { day: string; id: number; availableFrom: string; slotDuration: number; updatedAt?: string }[] }) => {
        // console.log('Doctor Availability:', response.availability);
        // const latestTimestamp = response.availability.reduce((latest, curr) => {
        //   if (curr.updatedAt) {
        //     return new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
        //       ? curr.updatedAt
        //       : latest;
        //   }
        //   return latest;
        // }, response.availability[0].updatedAt || '');

        // // Step 2: Filter entries with the latest `updatedAt` timestamp
        // const latestAvailability = response.availability.filter(
        //   avail => avail.updatedAt === latestTimestamp
        // );
        // Step 1: Check if all `updatedAt` fields are null
        const allUpdatedAtNull = response.availability?.every(avail => !avail.updatedAt);

        // Step 2: Determine the latest timestamp if some `updatedAt` values exist
        let latestTimestamp: string | null = null;
        if (!allUpdatedAtNull) {
          // Filter out entries with null `updatedAt` and find the latest timestamp
          const validUpdatedAts = response.availability
            .filter(avail => avail.updatedAt) // Only entries with non-null `updatedAt`
            .map(avail => new Date(avail.updatedAt!).getTime()); // Convert `updatedAt` to timestamps

          // Find the maximum timestamp
          const maxTimestamp = Math.max(...validUpdatedAts);

          // Convert the max timestamp back to an ISO string
          latestTimestamp = new Date(maxTimestamp).toISOString();

        }

        // Step 3: Filter availability data based on the latest timestamp
        const latestAvailability = allUpdatedAtNull
          ? response.availability // If all `updatedAt` are null, consider the entire list as "latest"
          : response.availability?.filter(avail => avail.updatedAt === latestTimestamp);

        // Step 4: Map the filtered availability to the correct `Availability` type
        const validatedAvailability: Availability[] = latestAvailability?.map(avail => ({
          ...avail,
          day: avail.day.toLowerCase() as DayName, // Ensure `day` is a valid `DayName`
        })) || []; // Default to an empty array if no availability exists

        // Debugging logs (Optional)
        // console.log('All UpdatedAt Null:', allUpdatedAtNull);
        // console.log('Latest Timestamp:', latestTimestamp);
        // console.log('Validated Availability:', validatedAvailability);


        this.updateDisabledDays(validatedAvailability); // Update disabled days
      },
      (error) => {
        console.error('Error fetching doctor availability:', error);
      }
    );
  }



}