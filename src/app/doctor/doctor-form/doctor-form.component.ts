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
  providers: [MessageService]
})
export class DoctorFormComponent implements OnInit, AfterViewInit {
  @Input() isEditMode: boolean = false; // Determines if it's for edit or add
  @Input() doctor: Doctor | null = null;
  @Output() save = new EventEmitter<Doctor>(); // Emits when the form is saved
  @Output() cancel = new EventEmitter<void>(); // Emits when the edit is canceled
  @Input() isLoading!: boolean;
  availableTimes: string = ''; // Single string storing all ranges
  availableTimesArray: string[] = ['']; // Dynamic array for input fields
  formError: string | null = null;
  formErrors: { [key: string]: string } = {};

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
  individualAvailability: { [key: string]: { availableFrom: string; slotDuration: number; availableFromArray: string[] } } = {};
  useSameTimeForAllDays: boolean = true;
  generalAvailableFrom: string = '';
  generalSlotDuration: number = 20;
  currentStep: number = 1; // Keeps track of the current step in the form
  selectedDate: Date | null = null;
  minDate: Date = new Date();  // Set default values
  maxDate: Date = new Date();  // Set default values
  unavailableSlotsPerDate: { [date: string]: { label: string; value: string }[] } = {};
  modifiedDay: keyof Doctor['availabilityDays'] | null = null;
  isSlotDurationChanged: boolean = false;
  previousAvailability: any[] = [];
  needsSlotCheck: boolean = false;


  constructor(private doctorService: DoctorServiceService, private changeDetector: ChangeDetectorRef, private datePipe: DatePipe, private messageService: MessageService, private cdr: ChangeDetectorRef) { }

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
      doctorType: 'Regular',
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
  onAvailabilityChange(day: keyof Doctor['availabilityDays']): void {
    this.modifiedDay = day;
    // console.log('Modified day set to:', this.modifiedDay);
    this.changeDetector.detectChanges();
  }

  getModifiedDay(): number | undefined {
    // console.log('Modified day before conversion:', this.modifiedDay);
    if (this.modifiedDay) {
      const dayIndexMap: { [key: string]: number } = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
      };

      // console.log('Returning day index:', dayIndexMap[this.modifiedDay]);
      return dayIndexMap[this.modifiedDay];
    }
    return undefined;
  }

  private initializeIndividualAvailability(): void {
    this.availabilityDaysList.forEach(day => {
      this.individualAvailability[day] = {
        availableFrom: '',
        availableFromArray: [''],
        slotDuration: 20
      };
    });
  }

  onDateSelect(): void {
    if (!this.selectedDate || !this.doctor) return;
    // console.log('Selected date:', this.selectedDate);
    const day = this.selectedDate.getDay(); // Get day of the week (0 for Sunday, 1 for Monday, etc.)
    const dayKey = this.availabilityDaysList[day];

    if (this.doctor.availabilityDays[dayKey]) {
      if (!this.useSameTimeForAllDays) {
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
      else {
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
      // Step 1: Find the latest `updatedAt` timestamp
      // const latestTimestamp = this.doctor.availability.reduce((latest, curr) => {
      //   return curr.updatedAt && new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
      //     ? curr.updatedAt
      //     : latest;
      // }, this.doctor.availability[0].updatedAt || '');

      // // Step 2: Filter entries with the latest `updatedAt` timestamp
      // const latestAvailability = this.doctor.availability.filter(
      //   avail => avail.updatedAt === latestTimestamp
      // );
      // const latestTimestamp = this.doctor.availability.reduce((latest, curr) => {
      //   // Consider `null` as the earliest timestamp
      //   if (curr.updatedAt === null) {
      //     return latest;
      //   }

      //   if (curr.updatedAt) {
      //     return new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
      //       ? curr.updatedAt
      //       : latest;
      //   }
      //   return latest;
      // }, this.doctor.availability[0].updatedAt || '');

      // // Step 2: Filter entries with the latest `updatedAt` timestamp, including those with `null`
      // const latestAvailability = this.doctor.availability.filter(
      //   avail => avail.updatedAt === latestTimestamp || avail.updatedAt === null
      // );
      this.previousAvailability = this.doctor.availability.map((a: any) => ({
        day: a.day,
        availableFrom: a.availableFrom
      }));
      const allUpdatedAtNull = this.doctor.availability?.every(avail => !avail.updatedAt);

      // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
      const latestTimestamp = allUpdatedAtNull
        ? null // If all are null, treat it as the "latest"
        : this.doctor.availability?.reduce((latest, curr) => {
          return curr.updatedAt && new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
            ? curr.updatedAt
            : latest;
        }, this.doctor.availability.find(avail => avail.updatedAt)?.updatedAt || '');

      // Step 3: Filter availability data based on the latest timestamp
      const latestAvailability = allUpdatedAtNull
        ? this.doctor.availability // If all are null, consider the entire availability as "latest"
        : this.doctor.availability?.filter(avail => avail.updatedAt === latestTimestamp);
      console.log('Latest availability:', latestAvailability);

      // Step 3: Reset availabilityDays and individualAvailability for all days
      this.availabilityDaysList.forEach(day => {
        this.doctor!.availabilityDays[day] = false;
        this.individualAvailability[day] = {
          availableFrom: '',
          slotDuration: 20,
          availableFromArray: ['']
        };
      });

      // Step 4: Update individual availability for valid days
      latestAvailability.forEach(avail => {
        const day = avail.day;
        if (this.availabilityDaysList.includes(day)) {
          this.doctor!.availabilityDays[day] = true;
          this.individualAvailability[day] = {
            availableFrom: avail.availableFrom,
            slotDuration: avail.slotDuration,
            availableFromArray: avail.availableFrom
              ? avail.availableFrom.includes(',')
                ? avail.availableFrom.split(',').map(time => time.trim()) // Split by commas
                : [avail.availableFrom.trim()] // Single item array
              : [''] // Default to one empty string if no value
          };
          // console.log('Day availability', this.individualAvailability[day]);
          this.generalSlotDuration = this.individualAvailability[day].slotDuration;
        }
      });

      // Step 5: Check if all days in the latest update have the same time and duration
      const uniqueTimes = new Set(latestAvailability.map(avail => avail.availableFrom));
      const uniqueDurations = new Set(latestAvailability.map(avail => avail.slotDuration));

      this.useSameTimeForAllDays = uniqueTimes.size === 1 && uniqueDurations.size === 1;

      if (this.useSameTimeForAllDays) {
        // Set general values if all times and durations are the same
        this.generalAvailableFrom = latestAvailability[0].availableFrom;
        this.availableTimesArray = this.generalAvailableFrom.includes(',')
          ? this.generalAvailableFrom.split(',').map(time => time.trim())
          : [this.generalAvailableFrom.trim()];
        this.generalSlotDuration = latestAvailability[0].slotDuration;
      }
    }

    // console.log(this.useSameTimeForAllDays);
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
    if (!this.doctor) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Doctor details are missing' });
      return;
    }
    // console.log('Doctor:', this.doctor);
    // Initialize the selected date to today in case we need to check future slots
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    if (this.doctor.id) {
      const doctorid = (this.doctor.id);

      if (this.useSameTimeForAllDays) {
        this.availabilityDaysList.forEach(day => {
          if (this.doctor?.availabilityDays?.[day]) {
            const old = this.previousAvailability?.find((a: any) => a.day === day);
            if (old && this.isTimeReduced(old.availableFrom, this.generalAvailableFrom)) {
              this.needsSlotCheck = true;
            }
          }
        });
      } else {
        this.availabilityDaysList.forEach(day => {
          if (this.doctor?.availabilityDays?.[day]) {
            const newTime = this.individualAvailability[day]?.availableFrom;
            const old = this.previousAvailability?.find((a: any) => a.day === day);
            if (old && this.isTimeReduced(old.availableFrom, newTime)) {
              this.needsSlotCheck = true;
            }
          }
        });
      }
      if (!this.needsSlotCheck) {
        this.saveDoctorDetails();
        return;
      }
      if (this.useSameTimeForAllDays) {
        // Step 1: Check if there are future booked slots for this doctor
        this.doctorService.getFutureBookedSlots(doctorid.toString(), formattedDate, false).subscribe(
          (slots) => {
            console.log(this.generalAvailableFrom, 'allTime');
            const outOfNewTimeSlots = slots.filter((slot: any) =>
              this.isSlotOutsideNewTime(slot.time, this.generalAvailableFrom)
            );
            console.log(slots, outOfNewTimeSlots, 'oneTime');

            if (outOfNewTimeSlots.length > 0) {
              // Step 2: If future booked slots exist, show an error message
              this.messageService.add({
                severity: 'error',
                summary: 'Doctor Update Error',
                detail: 'This doctor has future booked slots. Please cancel them before making changes.'
              });
            } else {
              // Step 3: Proceed with saving doctor details if no future booked slots exist
              // console.log("No future booked slots")
              this.saveDoctorDetails();
            }
          },
          (error) => {
            console.error('Error fetching future booked slots:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Unable to check booked slots. Please try again later.'
            });
          }
        );
      }
      else {
        // Assuming each input box corresponds to a day, you can detect which day is being modified.
        const dayOfWeek = this.getModifiedDay();
        // console.log(dayOfWeek)

        if (dayOfWeek !== undefined) {
          // Send the modified day to the backend for checking
          console.log(dayOfWeek, this.individualAvailability['fri'])
          const shortDayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
          const dayName = shortDayNames[dayOfWeek].toLowerCase();

          console.log(dayOfWeek, dayName, this.individualAvailability[dayName]);

          const dayTimeRange = this.individualAvailability[dayName]?.availableFrom;
          console.log(dayTimeRange, 'dayTimeRange');
          this.doctorService.getFutureBookedSlots(doctorid.toString(), formattedDate, true, dayOfWeek).subscribe(
            (slots) => {

              const outOfNewTimeSlots = slots.filter((slot: any) =>
                this.isSlotOutsideNewTime(slot.time, dayTimeRange)
              );
              console.log(slots, outOfNewTimeSlots, dayTimeRange, 'individual');
              // console.log(slots);
              if (outOfNewTimeSlots.length > 0) {
                // Step 2: If future booked slots exist, show an error message
                this.messageService.add({
                  severity: 'error',
                  summary: 'Doctor Update Error',
                  detail: 'This doctor has future booked slots for the specific day. Please cancel them before making changes.'
                });
              } else {
                // Step 3: Proceed with saving doctor details if no future booked slots exist
                // console.log("No future booked slots in specific day")
                this.saveDoctorDetails();
              }
            },
            (error) => {
              console.error('Error fetching future booked slots:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Unable to check booked slots. Please try again later.'
              });
            }
          );
        } else {
          // Handle the case where no specific day is modified
          this.saveDoctorDetails()


        }


      }


    }
    else {
      // If it's a new doctor, just proceed to save
      // console.log('New doctor, proceed to save');
      this.saveDoctorDetails();
    }
  }
  isSlotOutsideNewTime(slotTime: string, availableTimeRange: string): boolean {
    if (!availableTimeRange || !availableTimeRange.includes('-')) {
      console.warn('Invalid or missing time range:', availableTimeRange);
      return false; // or return true based on your app logic
    }

    // Normalize and extract from-to
    const [from, to] = availableTimeRange.includes(' - ')
      ? availableTimeRange.split(' - ')
      : availableTimeRange.split('-');

    const toMinutes = (time: string): number => {
      const [h, m] = time?.split(':')?.map(Number) || [];
      return h * 60 + m;
    };

    const parseSlotTime = (time: string): number => {
      if (!time || !time.includes(' ')) return NaN;
      const [t, meridian] = time.split(' ');
      const [hourStr, minStr] = t.split(':');
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minStr, 10);

      if (meridian === 'PM' && hour !== 12) hour += 12;
      if (meridian === 'AM' && hour === 12) hour = 0;

      return hour * 60 + minute;
    };

    const slotMinutes = parseSlotTime(slotTime);
    const startMinutes = toMinutes(from);
    const endMinutes = toMinutes(to);

    if (isNaN(slotMinutes) || isNaN(startMinutes) || isNaN(endMinutes)) {
      console.warn('Invalid time values:', { slotTime, from, to });
      return false;
    }

    return slotMinutes < startMinutes || slotMinutes > endMinutes;
  }




  // Refactored method to handle the actual save operation
  private saveDoctorDetails(): void {
    console.log(this.doctor)
    if (this.doctor?.doctorType === 'Visiting Consultant') {
      // console.log('Visiting Consultant', this.doctor)
      if (!this.doctor?.phone_number.startsWith('91')) {
        this.doctor!.phone_number = '91' + this.doctor?.phone_number;
      }
      this.save.emit(this.doctor!);
    }
    else {
      this.doctor!.availability = [];
      //   this.doctor!.slotDuration = this.generalSlotDuration; // Set the general slot duration
      //  this.generalAvailableFrom = this.availableFrom + '-' + this.availableTo;
      //  console.log(this.generalAvailableFrom)

      if (this.useSameTimeForAllDays) {
        this.availabilityDaysList.forEach(day => {
          if (this.doctor?.availabilityDays?.[day]) {
            // console.log(this.generalAvailableFrom)
            this.doctor.availability.push({
              id: 0, // Placeholder ID, will be replaced by backend
              day: day as string,
              availableFrom: this.generalAvailableFrom,
              slotDuration: this.generalSlotDuration,
            });
          }
        });
      } else {
        this.availabilityDaysList.forEach(day => {
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

      // Add unavailable slots for each date
      // Object.keys(this.unavailableSlotsPerDate).forEach(date => {
      //   const times = this.unavailableSlotsPerDate[date].map(slot => slot.value);

      //   if (this.doctor?.id) {
      //     // console.log('Adding unavailable slots for doctor:', this.doctor.id, date, times);
      //     this.doctorService.addUnavailableSlots(this.doctor.id, date, times).subscribe(
      //       response => {
      //         // Successfully added unavailable slots
      //       },
      //       error => {
      //         console.error('Error adding unavailable slots:', error);
      //       }
      //     );
      //   }
      // });

      // Emit the save event with the doctor details
      // this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Doctor details saved successfully' });
      this.save.emit(this.doctor!);
      console.log(this.doctor)
      // this.doctor = null; // Reset the doctor object after saving
      // this.isEditMode = false;
    }
    // Initialize availability
    ;
    // Exit edit mode after saving
  }
  isTimeReduced(oldTime: string, newTime: string): boolean {
    const [oldStart, oldEnd] = oldTime.split('-').map(t => this.stringToMinutes(t.trim()));
    const [newStart, newEnd] = newTime.split('-').map(t => this.stringToMinutes(t.trim()));

    // If new starts later or ends earlier => it's a reduction
    return newStart > oldStart || newEnd < oldEnd;
  }
  stringToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  onDoctorTypeChange(): void {
    if (this.doctor?.doctorType === 'Visiting Consultant') {
      // Clear availability-related fields for visiting consultants
      this.doctor.availabilityDays = {
        sun: false,
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
      };
      this.generalAvailableFrom = '';
      this.generalSlotDuration = 0;
      this.useSameTimeForAllDays = false;
      this.individualAvailability = {};
    } else {
      // Reset fields for regular doctors (if needed)
      this.initializeIndividualAvailability();
    }
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
    if (this.doctor?.doctorType === 'Visiting Consultant') {
      return !!(
        this.doctor &&
        this.doctor.name &&
        this.doctor.qualification &&
        this.doctor.phone_number &&
        this.doctor.departmentName
      );
    }
    // console.log('Doctor:', this.doctor);

    const availableTimePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

    // Function to validate a comma-separated list of times
    const validateMultipleTimes = (timeString: string): boolean => {
      const times = timeString.split(',').map(time => time.trim()); // Split and trim each timing
      return times.every(time => availableTimePattern.test(time)); // Validate each timing
    };

    // Check if all individual times are valid
    const allIndividualTimesValid = this.availabilityDaysList.every((day) => {
      if (this.doctor?.availabilityDays[day]) {
        // Split the availableFrom times by comma and validate each time
        const times = this.individualAvailability[day].availableFrom.split(',').map(time => time.trim());
        return times.every((time) => availableTimePattern.test(time));
      }
      return true; // If the day is not available, it is valid by default
    });
    // console.log(allIndividualTimesValid, "individual");

    // Validate generalAvailableFrom if using the same time for all days
    const isGeneralTimeValid = this.useSameTimeForAllDays
      ? validateMultipleTimes(this.generalAvailableFrom)
      : true;

    // Final validation result
    const isValid = allIndividualTimesValid || isGeneralTimeValid;

    // console.log('Validation Result:', isValid);

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
      /^[a-zA-Z.() ]+$/.test(this.doctor.name) || // Ensure name has letters, spaces, and dots only
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.doctor!.email) && // Ensure email is valid
      /^[0-9]{10}$/.test(this.doctor!.phone_number) &&
      // && // Ensure phone number is 10 digits
      (this.useSameTimeForAllDays ? isGeneralTimeValid : allIndividualTimesValid) // Check generalAvailableFrom if useSameTimeForAllDays is true, otherwise validate individual times
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

  // Split the string into an array of time ranges
  splitAvailableTimes(): string[] {
    return this.availableTimesArray; // Use the dynamic array directly
  }

  // Add a new time range
  addTime() {
    if (this.validateTimes()) {
      this.availableTimesArray.push(''); // Add a new empty time slot
      this.saveTimes()
    }
  }

  // Remove a specific time range
  removeTime(index: number) {

    this.availableTimesArray.splice(index, 1); // Remove time slot
    this.saveTimes()
  }

  // Validate all time ranges
  validateTimes(): boolean {
    const timePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

    // Check if availableTimesArray is empty or contains only empty strings
    if (this.availableTimesArray.length === 0 || this.availableTimesArray.every(time => time.trim() === '')) {
      this.formError = 'Please enter available time.';
      return false;
    }

    for (const time of this.availableTimesArray) {
      if (time.trim() !== '' && !timePattern.test(time)) {
        this.formError = 'All times must be in the format 00:00-00:00.';
        return false;
      }
    }

    this.formError = null; // Clear error if validation passes
    return true;
  }
  // Track elements by their index
  trackByFn(index: number, item: string) {
    return index; // Use index as the unique identifier
  }
  // Save all time ranges
  saveTimes() {
    if (this.validateTimes()) {
      // Combine the array into a single string for saving
      this.availableTimes = this.availableTimesArray.filter(time => time.trim() !== '').join(', ');
      // console.log('Combined Available Times:', this.availableTimes);
      this.generalAvailableFrom = this.availableTimes;
      // Perform save logic here (e.g., send to API or store in the database)
    }
  }

  addTimeRange(day: string): void {
    this.validateTimesForIndividual()
    if (this.formErrors) {
      this.modifiedDay = day as keyof Doctor['availabilityDays'];
      this.individualAvailability[day].availableFromArray.push(''); // Add a new empty time range
      this.updateAvailableFromString(day);
    }
    // Update the combined string
  }

  removeTimeRange(day: string, index: number): void {
    this.modifiedDay = day as keyof Doctor['availabilityDays'];
    this.individualAvailability[day].availableFromArray.splice(index, 1); // Remove the specific time range
    this.updateAvailableFromString(day); // Update the combined string
  }
  updateAvailableFromString(day: string): void {
    this.validateTimesForIndividual()
    console.log(this.formErrors)
    if (this.formErrors) {
      console.log('updating')

      this.modifiedDay = day as keyof Doctor['availabilityDays'];
      const timeArray = this.individualAvailability[day].availableFromArray || [];
      this.individualAvailability[day].availableFrom = timeArray.filter(time => time.trim() !== '').join(', '); // Join non-empty values
      this.cdr.detectChanges();
      // console.log('Updated available from:', this.individualAvailability[day].availableFrom);
    }
  }
  // validateTimesForIndividual(): boolean {
  //   const timePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
  //   let isValid = true; // Flag to track validation status

  //   // Reset errors for all days
  //   this.formErrors = {};

  //   for (const day in this.individualAvailability) {
  //     if (this.individualAvailability.hasOwnProperty(day)) {
  //       const availableTimes = this.individualAvailability[day].availableFromArray;

  //       // Check if availableFromArray is empty or contains only empty values
  //       if (!availableTimes || availableTimes.length === 0 || availableTimes.every(time => time.trim() === '')) {
  //         this.formErrors[day] = `Please enter available time for ${day}.`;
  //         isValid = false;
  //         continue; // Skip further validation for this day
  //       }

  //       // Validate format
  //       for (const time of availableTimes) {
  //         if (time.trim() !== '' && !timePattern.test(time)) {
  //           this.formErrors[day] = `All times for ${day} must be in the format 00:00-00:00.`;
  //           isValid = false;
  //           break; // Stop checking once an invalid format is found
  //         }
  //       }
  //       if (!this.formErrors[day]) {
  //         delete this.formErrors[day];
  //       }
  //       console.log(this.formErrors[day])
  //     }
  //   }

  //   return isValid; // Return overall validation status
  // }
  validateTimesForIndividual(): boolean {
    const timePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
    let isValid = true; // Assume valid until proven otherwise

    // Reset errors for all days
    this.formErrors = {};

    for (const day in this.individualAvailability) {
      if (this.individualAvailability.hasOwnProperty(day)) {
        // ✅ Skip validation if the day is NOT selected in availabilityDays
        if (!this.doctor?.availabilityDays[day]) {
          delete this.formErrors[day]; // Ensure old errors are cleared
          continue;
        }

        const availableTimes = this.individualAvailability[day]?.availableFromArray || [];

        // Check if `availableFromArray` is empty or contains only empty values
        if (availableTimes.length === 0 || availableTimes.every(time => time.trim() === '')) {
          this.formErrors[day] = `Please enter available time for ${day}.`;
          isValid = false;
          continue; // Skip further validation for this day
        }

        // Validate format
        let hasInvalidFormat = false;
        for (const time of availableTimes) {
          if (time.trim() !== '' && !timePattern.test(time)) {
            this.formErrors[day] = `All times for ${day} must be in the format 00:00-00:00.`;
            isValid = false;
            hasInvalidFormat = true;
            break; // Stop checking once an invalid format is found
          }
        }

        // ✅ If the day was previously invalid but is now valid, remove the error
        if (!hasInvalidFormat) {
          delete this.formErrors[day];
        }
      }
    }

    // ✅ If `formErrors` is empty, return `true`
    return Object.keys(this.formErrors).length === 0;
  }




  generateSlots(): void {
    if (this.doctor) {
      const [start, end] = this.doctor.availableFrom.split('-');
      const slotDuration = this.doctor.slotDuration;
      this.isSlotDurationChanged = true;
      this.generatedSlots = this.generateTimeSlots(start, end, slotDuration);
      this.generatedSlotOptions = this.generatedSlots.map(slot => ({ label: slot, value: slot }));
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];

      // Step 1: Check if there are future booked slots for this doctor
      this.doctorService.getFutureBookedSlotDuration(this.doctor.id.toString(), formattedDate).subscribe(
        (slots) => {

          if (slots.length > 0) {
            // Step 2: If future booked slots exist, show an error message
            this.messageService.add({
              severity: 'error',
              summary: 'Doctor Update Error',
              detail: 'This doctor has future booked slots. Please cancel them before making changes.'
            });
          }
        },
        (error) => {
          console.error('Error fetching future booked slots:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Unable to check booked slots. Please try again later.'
          });
        }
      );
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
