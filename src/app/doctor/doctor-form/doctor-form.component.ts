import { Component, OnInit, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';

interface Department {
  id: number;
  name: string;
}
interface Availability {
  availableFrom: string;
  slotDuration: number;
}
@Component({
  selector: 'app-doctor-form',
  templateUrl: './doctor-form.component.html',
  styleUrls: ['./doctor-form.component.css'],
  providers:[MessageService]
})
export class DoctorFormComponent implements OnInit, AfterViewInit {
  @Input() isEditMode: boolean = false; // Determines if it's for edit or add
  @Input() doctor: Doctor | null = null;
  @Output() save = new EventEmitter<Doctor>(); // Emits when the form is saved
  @Output() cancel = new EventEmitter<void>(); // Emits when the edit is canceled

  // Define the days with a type assertion to ensure that only valid days are used
  availabilityDaysList: (keyof Doctor['availabilityDays'])[] = [
    'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'
  ];

  // Update component to use the correct type
  departments: Department[] = [];
  filteredDepartments: Department[] = [];
  departmentSearch: string = '';
  showDropdown = false;
  selectedDepartmentName: string = '';
  generatedSlots: string[] = [];
  unavailableSlots: { label: string, value: string }[] = []; // Correctly type unavailableSlots
  generatedSlotOptions: { label: string, value: string }[] = [];
  individualAvailability: { [key: string]: { availableFrom: string; slotDuration: number } } = {};
  useSameTimeForAllDays: boolean = true;
  generalAvailableFrom: string = '';
  generalSlotDuration: number = 20;
  currentStep: number = 1; // Keeps track of the current step in the form
  selectedDate: Date | null = null;
  minDate: Date = new Date();  // Set default values
  maxDate: Date = new Date();  // Set default values
  unavailableSlotsPerDate: { [date: string]: { label: string; value: string }[] } = {};


  constructor(private doctorService: DoctorServiceService, private changeDetector: ChangeDetectorRef,private datePipe: DatePipe,private messageService: MessageService) { }

  // ngOnInit(): void {
  //   if(!this.isEditMode){
  //     this.doctor = null;
  //   }
  //   if (this.isEditMode && this.doctor && this.doctor.availableFrom && this.doctor.slotDuration) {
  //     this.generateSlots();
  //   }
  //   if (this.isEditMode && this.doctor && this.doctor.id) {
  //     // Fetch unavailable slots for this specific doctor
  //     this.fetchUnavailableSlotsForDoctor(this.doctor.id);
  //   }
  //   // If doctor is null, initialize it for the add new doctor form
  //   if (!this.doctor) {
  //     this.initializeDoctor();
  //   } else {
  //     this.setDoctorAvailability();
  //     this.ensureAvailabilityDays();
  //   }
  //   this.fetchDepartments();
  //   // Ensure individual availability is initialized
  //   this.initializeIndividualAvailability();
  //   // Fetch departments and set the filteredDepartments list
  //   this.doctorService.getDepartments().subscribe((departments: Department[]) => {
  //     this.departments = departments;
  //     this.filteredDepartments = [...this.departments];  // Copy all departments to filtered list
  //   });
  //   if (this.doctor!.phone_number.startsWith('91')) {
  //     this.doctor!.phone_number = this.doctor!.phone_number.substring(2);
  //   }
  //   console.log('Doctor:', this.doctor);

  // }
  get selectedDateKey(): any {
    // console.log("selectedDate",this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd'))
    return this.selectedDate ? this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd') : '';
  }
  ngOnInit(): void {
    const today = new Date();
    this.minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // Next day
    this.maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // Next day (same as minDate)
    if (!this.isEditMode) {
      this.initializeDoctor();
      this.initializeIndividualAvailability();
    } else if (this.isEditMode && this.doctor) {
      if (this.doctor.id) {
        // Fetch unavailable slots for this specific doctor
        this.fetchUnavailableSlotsForDoctor(this.doctor.id);
      }
      this.setDoctorAvailability(); // Set availability details in edit mode
    }

    this.fetchDepartments();

    // Fetch departments and set the filteredDepartments list
    this.doctorService.getDepartments().subscribe((departments: Department[]) => {
      this.departments = departments;
      this.filteredDepartments = [...this.departments];  // Copy all departments to filtered list
    });

    if (this.doctor && this.doctor.phone_number.startsWith('91')) {
      this.doctor.phone_number = this.doctor.phone_number.substring(2);
    }
    // console.log('Doctor:', this.doctor);
  }

  ngAfterViewInit(): void {
    // Ensure correct departmentId is set after view is initialized
    if (this.isEditMode && this.doctor) {
      this.updateSelectedDepartment();
    }
  }
  private updateSelectedDepartment(): void {
    if (this.departments.length > 0 && this.doctor?.departmentId) {
      const existingDepartment = this.departments.find(dept => dept.id === this.doctor?.departmentId);
      if (existingDepartment) {
        this.doctor.departmentId = existingDepartment.id;
      }
    }
  }
  private ensureAvailabilityDays(): void {
    if (this.doctor && !this.doctor.availabilityDays) {
      this.doctor.availabilityDays = {
        sun: false,
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
      };
    }
  }
  private initializeDoctor(): void {
    this.doctor = {
      id: 0,
      name: '',
      qualification: '',
      departmentId: 0,
      departmentName: '',
      phone_number: '',
      email: '',
      availabilityDays: {
        sun: false,
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false
      },
      availableFrom: '', // Default available time
      slotDuration: 20, // Default slot timing
      availability: [], // Initialize with empty availability
      unavailableSlots: [], // Initialize with empty unavailable slots
    };
  }

  // private setDoctorAvailability(): void {
  //   if (this.doctor && this.doctor.availability && this.doctor.availability.length > 0) {
  //     // Loop through the availability array to set available days, available time, and slot duration
  //     this.doctor.availability.forEach((availability) => {
  //       if (this.doctor?.availabilityDays) {
  //         this.doctor.availabilityDays[availability.day] = true;
  //       }
  //       this.doctor!.availableFrom = availability.availableFrom; // Set available time
  //       this.doctor!.slotDuration = availability.slotDuration; // Set slot timing
  //     });
  //   }
  // }
  private initializeIndividualAvailability(): void {
    this.availabilityDaysList.forEach(day => {
      this.individualAvailability[day] = {
        availableFrom: '',
        slotDuration: 20
      };
    });
  }
  // private setDoctorAvailability(): void {
  //   if (this.doctor?.availability && this.doctor.availability.length > 0) {
  //     this.doctor.availability.forEach((availability) => {
  //       if (this.doctor?.availabilityDays) {
  //         this.doctor.availabilityDays[availability.day as keyof Doctor['availabilityDays']] = true;
  //       }
  //       this.individualAvailability[availability.day] = {
  //         availableFrom: availability.availableFrom,
  //         slotDuration: availability.slotDuration
  //       };
  //     });
  //     const uniqueAvailableTimes = new Set(this.doctor.availability.map(avail => avail.availableFrom));
  //     this.useSameTimeForAllDays = uniqueAvailableTimes.size === 1;
  //     if (this.useSameTimeForAllDays) {
  //       this.generalAvailableFrom = this.doctor.availability[0].availableFrom;
  //       this.generalSlotDuration = this.doctor.availability[0].slotDuration;
  //     }
  //   }
  // }
  // private setDoctorAvailability(): void {
  //   if (this.doctor?.availability && this.doctor.availability.length > 0) {
  //     const updatedIndividualAvailability: { [key: string]: { availableFrom: string; slotDuration: number } } = {};
  //     // Loop through availability and initialize individualAvailability
  //     console.log('Doctor availability:', this.doctor.availability);
  //     this.availabilityDaysList.forEach(day => {
  //       const dayAvailability = this.doctor?.availability.find(avail => avail.day === day);
  //       if (dayAvailability) {
  //         this.doctor!.availabilityDays[day] = true; // Mark day as available
  //         this.individualAvailability[day] = {
  //           availableFrom: dayAvailability.availableFrom,
  //           slotDuration: dayAvailability.slotDuration
  //         };
  //         console.log('Day availabitlity',this.individualAvailability[day])
  //       } else {
  //         this.doctor!.availabilityDays[day] = false;
  //         this.individualAvailability[day] = {
  //           availableFrom: '', // Reset if no availability
  //           slotDuration: 20 // Default value
  //         };
  //       }
  //     });

  //     // Determine if we should use the same time for all days
  //     const uniqueTimes = new Set(this.doctor.availability.map(avail => avail.availableFrom));
  //     this.useSameTimeForAllDays = uniqueTimes.size === 1;

  //     if (this.useSameTimeForAllDays) {
  //       // Set general values if all times are the same
  //       this.generalAvailableFrom = this.doctor.availability[0].availableFrom;
  //       this.generalSlotDuration = this.doctor.availability[0].slotDuration;
  //     }
  //   }
  // }
  // onDateSelect(event: any): void {
  //   this.selectedDate = event;
  //   if (this.selectedDate) {
  //     // Determine the day of the week (e.g., 'mon', 'tue') based on the selected date
  //     const dayOfWeek = this.selectedDate.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();

  //     // Look for the availability corresponding to that day
  //     const availability = this.doctor?.availability.find(avail => avail.day === dayOfWeek);

  //     if (availability) {
  //       // Generate slots based on the availability's start and end time
  //       const [start, end] = availability.availableFrom.split('-');
  //       this.generatedSlotOptions = this.generateTimeSlots(start, end, availability.slotDuration).map(slot => ({
  //         label: slot,
  //         value: slot
  //       }));
  //     } else {
  //       // If no availability found, clear the slots
  //       this.generatedSlotOptions = [];
  //     }
  //   }
  // }
  onDateSelect(): void {
    if (!this.selectedDate || !this.doctor) return;
    // console.log('Selected date:', this.selectedDate);
    const day = this.selectedDate.getDay(); // Get day of the week (0 for Sunday, 1 for Monday, etc.)
    const dayKey = this.availabilityDaysList[day];

    if (this.doctor.availabilityDays[dayKey]) {
      if(!this.useSameTimeForAllDays){
        // console.log('Use different time for each day',dayKey,this.individualAvailability);

      const availability = this.individualAvailability[dayKey];
      // console.log('Availability:', availability);

      if (availability.availableFrom) {
        const [start, end] = availability.availableFrom.split('-');
        const slotDuration = availability.slotDuration;

        if (start && end && slotDuration) {
          this.generatedSlots = this.generateTimeSlots(start, end, slotDuration);
          this.generatedSlotOptions = this.generatedSlots.map(slot => ({ label: slot, value: slot }));
        } else {
          console.error('Error: Invalid available time or slot duration for generating slots.');
        }
      }
    }
    else{
      // console.log('Use same time for all days',dayKey,this.doctor.availability);
      // const availability = this.doctor.availability.find(avail => avail.day === dayKey);
      // console.log('Availability:', availability);
      
        const [start, end] = this.doctor.availability[0].availableFrom.split('-');
        const slotDuration = this.doctor.availability[0].slotDuration;
        if (start && end && slotDuration) {
          this.generatedSlots = this.generateTimeSlots(start, end, slotDuration);
          this.generatedSlotOptions = this.generatedSlots.map(slot => ({ label: slot, value: slot }));
        } else {
          console.error('Error: Invalid available time or slot duration for generating slots.');
        }
      
    }
    } else {
      // console.log('No availability for selected date');
    }
  }


  private setDoctorAvailability(): void {
    if (this.doctor?.availability && this.doctor.availability.length > 0) {
      // Loop through availability and initialize individualAvailability
      // console.log('Doctor availability:', this.doctor.availability);
      this.availabilityDaysList.forEach(day => {
        const dayAvailability = this.doctor?.availability.find(avail => avail.day === day);
        if (dayAvailability) {
          this.doctor!.availabilityDays[day] = true; // Mark day as available
          this.individualAvailability[day] = {
            availableFrom: dayAvailability.availableFrom,
            slotDuration: dayAvailability.slotDuration
          };
          this.generalSlotDuration = dayAvailability.slotDuration;
          // console.log('Day availability', this.individualAvailability[day]);
        } else {
          if (!this.individualAvailability[day]) {
            this.individualAvailability[day] = {
              availableFrom: '', // Reset if no availability
              slotDuration: 20 // Default value
            };
          }
          this.doctor!.availabilityDays[day] = false;
        }
      });

      // Determine if we should use the same time for all days
      const uniqueTimes = new Set(this.doctor.availability.map(avail => avail.availableFrom));
      this.useSameTimeForAllDays = uniqueTimes.size === 1;

      if (this.useSameTimeForAllDays) {
        // Set general values if all times are the same
        this.generalAvailableFrom = this.doctor.availability[0].availableFrom;
        this.generalSlotDuration = this.doctor.availability[0].slotDuration;
      }
    }
  }




  fetchDepartments(): void {
    this.doctorService.getDepartments().subscribe((departments: Department[]) => {
      this.departments = departments;
      this.filteredDepartments = [...this.departments];
    });
  }
  // updateAvailability(day: string, event: Event): void {
  //   const target = event.target as HTMLInputElement;
  //   const isChecked = target.checked;

  //   if (this.doctor) {
  //     // this.doctor.availabilityDays[day] = isChecked;
  //     this.doctor.availabilityDays[day as keyof Doctor['availabilityDays']] = isChecked;
  //   }
  // }
  // Method to update the availability for a specific day
  updateAvailability(day: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const isChecked = target.checked;

    if (this.doctor) {
      // this.doctor.availabilityDays[day] = isChecked;
      this.doctor.availabilityDays[day as keyof Doctor['availabilityDays']] = isChecked;
      
    }
  }

  // Method to save the doctor form data
  // saveDoctor(): void {
  //   if (this.isFormValid() && this.isAnyDaySelected()) {
  //     if (!this.doctor?.phone_number.startsWith('91')) {
  //       this.doctor!.phone_number = '91' + this.doctor?.phone_number;
  //     }
  //     const unavailableSlotValues = this.unavailableSlots.map(slot => slot.value);
  //     console.log('Unavailable slots:', unavailableSlotValues);
  //     this.doctor!.unavailableSlots = unavailableSlotValues; // Assign the values array to doctor
  //     if (this.doctor) {
  //       this.save.emit(this.doctor); // Emit the updated doctor details
  //     }
  //     this.isEditMode = false; // Exit the edit mode
  //   } else {
  //     console.error("Form is invalid or no availability day is selected");
  //   }
  //   console.log('Doctor:', this.doctor);
  //   // if (this.doctor) {
  //   //   this.save.emit(this.doctor); // Emit the updated doctor details
  //   // }
  //   this.isEditMode = false; // Exit the edit mode
  // }
  // Method to save the doctor form data
  saveDoctor(): void {
    // console.log('Doctor:', this.doctor);
    if (!this.doctor) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Doctor details are missing' });
      return;
    }
  
    // Initialize availability
    this.doctor.availability = [];
  
    if (this.useSameTimeForAllDays) {
      // Set availability for all selected days
      this.availabilityDaysList.forEach(day => {
        if (this.doctor?.availabilityDays?.[day]) {
          this.doctor.availability.push({
            id: 0, // Placeholder ID, will be replaced by backend
            day: day as string,
            availableFrom: this.generalAvailableFrom,
            slotDuration: this.generalSlotDuration,
          });
        }
      });
    } else {
      // Set individual availability for each selected day
      this.availabilityDaysList.forEach(day => {
        // console.log('Day:', day);
        if (this.doctor?.availabilityDays?.[day]) {
          const availability = this.individualAvailability[day];
          // console.log('Availability:', availability);
          if (availability.availableFrom && availability.slotDuration !== undefined) {
            this.doctor.availability.push({
              id: 0,
              day: day as string,
              availableFrom: availability.availableFrom,
              slotDuration: this.generalSlotDuration,
            });
          }
        }
      });
    }
    if (!this.doctor?.phone_number.startsWith('91')) {
      this.doctor!.phone_number = '91' + this.doctor?.phone_number;
    }
    // const unavailableSlotValues = this.unavailableSlots.map(slot => slot.value);
    // console.log('Unavailable slots:', unavailableSlotValues);
    // this.doctor!.unavailableSlots = unavailableSlotValues; // Assign the values array to doctor
    // Add unavailable slots for each date
    // console.log('Unavailable slots per date:', this.unavailableSlotsPerDate);
    Object.keys(this.unavailableSlotsPerDate).forEach(date => {
      const times = this.unavailableSlotsPerDate[date].map(slot => slot.value);
      // console.log('Adding unavailable slots for date:', date, times);
  
      // Call the addUnavailableSlots API for each date
      if (this.doctor?.id) {
        this.doctorService.addUnavailableSlots(this.doctor.id, date, times).subscribe(
          response => {
            // console.log('Unavailable slots added successfully:', response);
          },
          error => {
            console.error('Error adding unavailable slots:', error);
          }
        );
      }
    });
    // console.log('Doctor:', this.doctor);
  
    // Emit the save event with the doctor details
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Doctor details saved successfully' });
    this.save.emit(this.doctor);
    this.doctor = null; // Reset the doctor object after saving
    this.isEditMode = false; // Exit edit mode after saving
  }


  goToStep(step: number): void {
    if (step === 2) {
      this.currentStep = step; // Proceed to step 2 only if form is valid
    } else if (step === 1) {
      this.currentStep = step; // Go back to step 1
    }
  }
  isDoctorValid(): boolean {
    return !!(
      this.doctor &&
      this.doctor.name &&
      this.doctor.qualification &&
      this.doctor.phone_number &&
      this.doctor.departmentName
    )
  }
  // get selectedDateKey(): string {
  //   return this.selectedDate ? this.selectedDate.toISOString().split('T')[0] : '';
  // }

  // get unavailableSlotsForSelectedDate(): { label: string, value: string }[] {
  //   return this.unavailableSlotsPerDate[this.selectedDateKey] ?? [];
  // }


  isFormValid(): boolean {
    // console.log('Doctor:', this.doctor);

    // Regular expression to validate the availableFrom format (HH:MM-HH:MM)
    const availableTimePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

    // Loop through individualAvailability to check if each availableFrom matches the pattern
    // only if the day is marked as available
    const allIndividualTimesValid = this.availabilityDaysList.every((day) => {
      if (this.doctor?.availabilityDays[day]) {
        // Check availableFrom for the days that are marked as available (true)
        return availableTimePattern.test(this.individualAvailability[day].availableFrom);
      }
      return true; // If the day is not available, it is valid by default
    });
    // console.log(availableTimePattern.test(this.generalAvailableFrom));
    return !!(
      this.doctor &&
      this.doctor.name &&
      this.doctor.qualification &&
      this.doctor.phone_number &&
      this.doctor.departmentName &&
      this.doctor.availability &&
      this.doctor.slotDuration !== undefined &&
      this.doctor.slotDuration !== null &&
      this.doctor.slotDuration > 0 &&
      /^[a-zA-Z.() ]+$/.test(this.doctor.name) && // Ensure name has letters, spaces, and dots only
      // /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.doctor.email) && // Ensure email is valid
      /^[0-9]{10}$/.test(this.doctor.phone_number) && // Ensure phone number is 10 digits
      (this.useSameTimeForAllDays ? availableTimePattern.test(this.generalAvailableFrom) : allIndividualTimesValid) // Check generalAvailableFrom if useSameTimeForAllDays is true, otherwise validate individual times
    );
  }


  generateTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
    const slots = [];
    let current = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

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

  //   // This method will fetch the unavailable slots for a specific doctor based on their ID
  // fetchUnavailableSlotsForDoctor(doctorId: number): void {
  //   this.doctorService.getUnavailableSlots(doctorId).subscribe(
  //     (unavailableSlots: string[]) => {
  //       // Set the unavailable slots to the ones fetched from the backend
  //       this.unavailableSlots = unavailableSlots.map(slot => ({ label: slot, value: slot }));
  //       console.log('Unavailable slots fetched for doctor:', this.unavailableSlots);
  //     },
  //     (error) => {
  //       console.error('Error fetching unavailable slots for doctor:', error);
  //     }
  //   );
  // }
  fetchUnavailableSlotsForDoctor(doctorId: number): void {
    this.doctorService.getUnavailableSlots(doctorId).subscribe(
      (unavailableSlots: { [date: string]: string[] }) => {
        // Transform the data to match the required format
        // console.log('Fetched unavailable slots:', unavailableSlots);
        // this.unavailableSlotsPerDate = unavailableSlots.reduce((acc, slot) => {
        //   if (!acc[slot.date]) {
        //     acc[slot.date] = [];
        //   }
        //   acc[slot.date].push({ label: slot.time, value: slot.time });
        //   return acc;
        // }, {} as { [date: string]: { label: string; value: string; }[] });
        this.unavailableSlotsPerDate = {};

      // Iterate over the dates and transform into the desired format
      for (const date in unavailableSlots) {
        if (unavailableSlots.hasOwnProperty(date)) {
          this.unavailableSlotsPerDate[date] = unavailableSlots[date].map(time => ({
            label: time,
            value: time,
          }));
        }
      }
  
        // console.log('Transformed unavailable slots:', this.unavailableSlotsPerDate);
      },
      (error) => {
        console.error('Error fetching unavailable slots for doctor:', error);
      }
    );
  }
  
  
  

  generateSlots(): void {
    if (this.doctor) {
      const [start, end] = this.doctor.availableFrom.split('-');
      const slotDuration = this.doctor.slotDuration;
      this.generatedSlots = this.generateTimeSlots(start, end, slotDuration);
      // console.log('Generated slots:', this.generatedSlots);
      this.generatedSlotOptions = this.generatedSlots.map(slot => ({ label: slot, value: slot }));
    }
  }


  // Method to cancel editing
  cancelEdit(): void {
    this.cancel.emit();
    this.isEditMode = false; // Exit the edit mode
  }
  isAnyDaySelected(): boolean {
    if (this.doctor && this.doctor.availabilityDays) {
      return Object.values(this.doctor.availabilityDays).some(day => day === true);

    }
    return false;
  }

  filterDepartments(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredDepartments = this.departments.filter(department =>
      department.name.toLowerCase().includes(query)
    );
    this.showDropdown = this.filteredDepartments.length > 0;
  }

  // selectDepartment(department: Department): void {
  //   if (this.doctor) {
  //     this.doctor.departmentName = department.name;
  //     this.doctor.departmentId = department.id; 
  //     this.selectedDepartmentName= this.doctor.departmentName; // Make sure you update the department correctly
  //     console.log('Selected department:', this.selectedDepartmentName);
  //   }
  //   this.departmentSearch = department.name; // Update the input field value
  //   this.showDropdown = false; // Hide the dropdown after selection
  // }
  selectDepartment(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    if (selectElement && selectElement.value) {
      const departmentId = Number(selectElement.value); // Convert the value to a number
      const selectedDepartment = this.departments.find(department => department.id === departmentId);
      if (selectedDepartment && this.doctor) {
        this.doctor.departmentName = selectedDepartment.name;
        this.doctor.departmentId = departmentId;
        this.changeDetector.detectChanges();

      }
    }
  }

  // Toggle the dropdown for department selection
  toggleDropdown(show: boolean): void {
    setTimeout(() => {
      this.showDropdown = show && this.filteredDepartments.length > 0;
    }, 100); // Delay to avoid immediate blur hiding dropdown before clicking
  }
  onDepartmentChange(departmentId: number): void {
    const selectedDepartment = this.departments.find(department => department.id === departmentId);
    if (selectedDepartment && this.doctor) {
      this.doctor.departmentId = departmentId;
      this.doctor.departmentName = selectedDepartment.name;
    }
  }


}
