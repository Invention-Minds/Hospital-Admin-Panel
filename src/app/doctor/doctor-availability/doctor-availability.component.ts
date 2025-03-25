import { Component, Input, Output } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';
import { DoctorWithSlots } from '../../models/doctos_with_slots.model';
import { ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

interface Slot {
  time: string;
  status: 'available' | 'booked' | 'unavailable' | 'complete' | 'blocked' | 'extra';
}

type UnavailableDate = {
  id: number;
  doctorId: number;
  date: string; // ISO string
};

@Component({
  selector: 'app-doctor-availability',
  templateUrl: './doctor-availability.component.html',
  styleUrl: './doctor-availability.component.css'
})
export class DoctorAvailabilityComponent {
  selectedDate: Date = new Date();
  todayforUnavialable: Date = new Date();
  tomorrow: Date = new Date();
  opdStartTime: string = '00:00';
  opdEndTime: string = '20:00';
  doctors: DoctorWithSlots[] = [];
  selectedCalendarView: string = 'calendar'; // Add this property
  filteredDoctors: DoctorWithSlots[] = [];
  searchQuery: string = '';
  selectedDoctor: Doctor | null = null;
  selectedSlot: any | null = null;
  showForm: boolean = false;
  isBookedSlot: boolean = false;
  currentAppointment: any | null = null;
  generatedSlots: Slot[] = [];
  isSlotDialogOpen: boolean = false;
  unavailableSlots: string[] = [];
  slotComplete: boolean = false;
  isUpdateButtonDisabled: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  isLoading: boolean = false;
  role: string = '';
  doctorsList: any[] = []




  constructor(private doctorService: DoctorServiceService, private cdr: ChangeDetectorRef, private appointmentService: AppointmentConfirmService) {
    this.tomorrow.setDate(this.todayforUnavialable.getDate() + 1);
    this.initializeTimeFormatCache()
  }

  ngOnInit(): void {
    this.fetchDoctors();
    this.role = localStorage.getItem('role') || ''
    console.log(this.role)
  }


  onDateSelectionChange(): void {
    if (this.selectedDoctor) {
      const selectedDoctorWithSlots: DoctorWithSlots = {
        ...this.selectedDoctor,
        slots: [] // Initialize with empty slots if they are not available yet
      };
      // Re-generate slots based on the selected date
      this.generatedSlots = this.generateSlotsForDoctor(selectedDoctorWithSlots);
    }
  }
  fetchDoctors(): void {
    const formattedDate = this.formatDate(this.selectedDate);
    // console.log('formattedDate', formattedDate);

    // this.doctorService.getAllDoctors(formattedDate).subscribe((doctors: Doctor[]) => {
    //   console.log('doctors', doctors);
    //   doctors.forEach(doctor => {
    //     // Initialize `availabilityDays` if it does not exist
    //     if (!doctor.availabilityDays) {
    //       doctor.availabilityDays = {
    //         sun: false,
    //         mon: false,
    //         tue: false,
    //         wed: false,
    //         thu: false,
    //         fri: false,
    //         sat: false,
    //       };
    //     }
    //     doctor.availableFrom = 'N/A';
    //     // doctor.slotDuration = 0;

    //     const date = new Date(formattedDate);
    //     const todayDay = this.getDayString(date);
    //     const isToday = date.toDateString() === new Date().toDateString();
    //     const isFuture = date > new Date();

    //     // console.log(filteredDoctors,"filteredDoctors")
    //     doctor.availability?.forEach((avail) => {
    //       // console.log('avail',avail)
    //       doctor.availabilityDays[avail.day] = true;
    //       // console.log('avail.day', avail.day);
    //       // console.log(avail.day === todayDay, 'in if');

    //       if (avail.day === todayDay) {
    //         // console.log(avail.availableFrom,avail.doctorId)
    //         doctor.availableFrom = avail.availableFrom;
    //         doctor.slotDuration = avail.slotDuration;
    //         // console.log('avail.availableFrom', avail.availableFrom);
    //       }
    //     });
    //   }
    //   );




    //   const doctorRequests = doctors
    //     .filter(doctor => doctor.id !== undefined)
    //     .map(doctor =>
    //       forkJoin({
    //         bookedSlots: this.doctorService.getBookedSlots(doctor.id!, this.formatDate(this.selectedDate)),
    //         unavailableDates: this.doctorService.getUnavailableDates(doctor.id!),
    //         unavailableSlots: this.doctorService.getUnavailableSlots(doctor.id!),
    //         extraSlots: this.doctorService.getExtraSlots(doctor.id!, this.formatDate(this.selectedDate))
    //       })

    //     );

    //   forkJoin(doctorRequests).subscribe((doctorDataArray) => {
    //     this.doctors = doctors.map((doctor, index) => {

    //       const { bookedSlots, unavailableDates, unavailableSlots, extraSlots } = doctorDataArray[index];
    //       const formattedUnavailableSlots = unavailableSlots[formattedDate] || [];
    //       console.log("unavailableSlots", unavailableSlots,formattedUnavailableSlots)
    //       console.log("bookedSlots", bookedSlots)
    //       const formattedExtraSlots: string[] = extraSlots.map((slot: { time: string }) => slot.time);

    //       if (doctor.doctorType === 'Visiting Consultant') {
    //         // For Visiting Consultant, only show booked slots
    //         console.log(`Skipping slot generation for Visiting Consultant: ${doctor.name}`);
    //         const slots: Slot[] = [];

    //         if (bookedSlots && bookedSlots.length > 0) {
    //           bookedSlots.forEach(slot => {
    //             slots.push({
    //               time: slot.time,
    //               status: slot.complete ? 'complete' : 'booked'
    //             });
    //           });
    //         }

    //         // Assign the generated slots back to the doctor
    //         // Find the corresponding doctor in `this.doctors` and assign the slots
    //         const doctorIndex = this.doctors.findIndex(d => d.id === doctor.id);
    //         if (doctorIndex !== -1) {
    //           this.doctors[doctorIndex].slots = slots;
    //         }
    //         return {
    //           ...doctor,
    //           slots,
    //           isUnavailable: false,
    //           unavailableSlots: formattedUnavailableSlots,
    //           extraSlots: formattedExtraSlots,
    //         } as DoctorWithSlots; // Ensure type compatibility
    //       }
    //       else {
    //         // Determine if the selected day is unavailable for the doctor
    //         const isUnavailableDay = unavailableDates.some(unavailable => {
    //           const unavailableDate = new Date(unavailable.date);
    //           const formattedUnavailableDate = unavailableDate.toISOString().split('T')[0];
    //           return formattedUnavailableDate === formattedDate;
    //         });

    //         // Check if the doctor is available on the given day of the week
    //         const dayOfWeek = this.selectedDate.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
    //         // console.log('dayOfWeek',doctor.availability)
    //         const availableDay = doctor.availability?.find((avail: any) =>
    //           avail.day.toLowerCase() === dayOfWeek
    //         );

    //         // If the doctor is not available on this day, mark as unavailable
    //         const isUnavailableDueToSchedule = !availableDay;
    //         // console.log(isUnavailableDueToSchedule)

    //         // Set an `isUnavailable` flag for the doctor based on unavailable date or default availability
    //         const isUnavailable = isUnavailableDay || isUnavailableDueToSchedule;

    //         // Provide default values for `availableFrom` and `slotDuration` if `availableDay` is not available

    //         const availableFrom = availableDay?.availableFrom ?? '08:00-20:00'; // Use a default value for unavailable days
    //         doctor.availableFrom = availableFrom;
    //         if (doctor.availableFrom === '08:00-20:00') {
    //           doctor.availableFrom = 'N/A';
    //         }
    //         const slotDuration = availableDay?.slotDuration ?? 20; // Default to 30-minute slots if unavailable

    //         const date = this.formatDate(this.selectedDate); // Format the selected date to match the keys in the object
    //         // const unavailableSlotsForDate = unavailableSlots[formattedDate] || [];
    //         let generatedSlots = this.generateDoctorSlots(availableFrom, slotDuration, bookedSlots, isUnavailable, formattedUnavailableSlots, availableFrom.split('-')[1]);

    //         formattedExtraSlots.forEach(extraSlot => {
    //           const isAlreadyBooked = bookedSlots.some(bookedSlot => bookedSlot.time === extraSlot);
    //           const isAlreadyUnavailable = formattedUnavailableSlots.includes(extraSlot);
    //           const isAlreadyAdded = generatedSlots.some(slot => slot.time === extraSlot);
    //           const existingSlot = generatedSlots.find(slot => slot.time === extraSlot);

    //           if (!isAlreadyBooked && !isAlreadyUnavailable && existingSlot) {
    //             // If the slot already exists, mark it as available
    //             existingSlot.status = 'available';
    //           }


    //           // if (!isAlreadyBooked && !isAlreadyUnavailable && isAlreadyAdded) {
    //           //   generatedSlots.push({
    //           //     time: extraSlot,
    //           //     status: 'available'
    //           //   });
    //           // }
    //         });
    //         // Sort the slots by time to maintain the order
    //         generatedSlots = generatedSlots.sort((a, b) => {
    //           const [aStart] = a.time.split('-');
    //           const [bStart] = b.time.split('-');
    //           return this.stringToMinutes(aStart) - this.stringToMinutes(bStart);
    //         });

    //         return {
    //           ...doctor,
    //           isUnavailable,
    //           slots: generatedSlots,
    //           unavailableSlots: formattedUnavailableSlots,
    //           extraSlots: formattedExtraSlots
    //         };
    //       }
    //     });
    //     this.applySearchFilter();
    //   });




    // });
    this.isLoading = true;
    this.doctorService.getAllDoctors(formattedDate).subscribe({
      next: (doctors: Doctor[]) => {
        this.isLoading = false;
        doctors.forEach(doctor => {
          // Initialize `availabilityDays` if it does not exist
          if (!doctor.availabilityDays) {
            doctor.availabilityDays = {
              sun: false,
              mon: false,
              tue: false,
              wed: false,
              thu: false,
              fri: false,
              sat: false,
            };
          }
          doctor.availableFrom = 'N/A';

          const date = new Date(formattedDate);
          const todayDay = this.getDayString(date);
          const isToday = date.toDateString() === new Date().toDateString();

          doctor.availability?.forEach((avail) => {
            doctor.availabilityDays[avail.day] = true;

            if (avail.day === todayDay) {
              doctor.availableFrom = avail.availableFrom;
              doctor.slotDuration = avail.slotDuration;
            }

          });
          if (doctor.ExtraSlotCount && doctor.ExtraSlotCount.length > 0) {
            doctor.ExtraSlotCount[0].extraHoursBefore ??= 0;
            doctor.ExtraSlotCount[0].extraHoursAfter ??= 0;
          } else {
            // Initialize ExtraSlotCount array if it doesn't exist
            doctor.ExtraSlotCount = [{ extraHoursBefore: 0, extraHoursAfter: 0 }];
          }

        });
        this.doctorsList = doctors.map(doctor => ({
          ...doctor,
          extraHoursBefore: doctor.ExtraSlotCount?.extraHoursBefore || 1,
          extraHoursAfter: doctor.ExtraSlotCount?.extraHoursAfter || 1
        }));

        this.doctors = doctors.map(doctor => {

          // Extract bookedSlots, unavailableDates, unavailableSlots, and extraSlots directly from the doctor object
          const bookedSlots = doctor.bookedSlots || [];
          const unavailableDates: UnavailableDate[] = doctor.unavailableDates || [];
          const unavailableSlots = doctor.unavailableSlots || [];
          const extraSlots = doctor.extraSlots?.map(slot => slot.time) || [];
          const extraHoursBefore = Number(doctor.ExtraSlotCount[0]?.extraHoursBefore) || 0;
          const extraHoursAfter = Number(doctor.ExtraSlotCount[0]?.extraHoursAfter) || 0;

          // const formattedUnavailableSlots = unavailableSlots; // Array of strings

          const formattedUnavailableSlots = unavailableSlots.map(slot => slot.time) // Array of strings
          // console.log('unable',unavailableSlots,extraSlots,formattedUnavailableSlots);
          const formattedExtraSlots = extraSlots; // Array of strings
          // console.log(formattedExtraSlots)

          if (doctor.doctorType === 'Visiting Consultant') {
            // For Visiting Consultant, only show booked slots
            // console.log(`Skipping slot generation for Visiting Consultant: ${doctor.name}`);
            const slots: Slot[] = [];

            if (bookedSlots && bookedSlots.length > 0) {
              bookedSlots.forEach(slot => {
                slots.push({
                  time: slot.time,
                  status: slot.complete ? 'complete' : 'booked',
                });
              });
            }

            return {
              ...doctor,
              slots,
              isUnavailable: false,
              unavailableSlots: formattedUnavailableSlots,
              extraSlots: formattedExtraSlots,
            } as DoctorWithSlots; // Ensure type compatibility
          } else {
            // Determine if the selected day is unavailable for the doctor
            const isUnavailableDay = unavailableDates.some(unavailable => {
              const unavailableDate = unavailable.date;
              // console.log(unavailableDate)
              const formattedUnavailableDate = unavailableDate.toString().split('T')[0];
              return formattedUnavailableDate === formattedDate;
            });

            const allUpdatedAtNull = doctor.availability?.every(avail => !avail.updatedAt);

            // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
            const latestTimestamp = allUpdatedAtNull
              ? null // If all are null, treat it as the "latest"
              : doctor.availability?.reduce((latest, curr) => {
                return curr.updatedAt && new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
                  ? curr.updatedAt
                  : latest;
              }, doctor.availability.find(avail => avail.updatedAt)?.updatedAt || '');

            // Step 3: Filter availability data based on the latest timestamp
            const latestAvailability = allUpdatedAtNull
              ? doctor.availability // If all are null, consider the entire availability as "latest"
              : doctor.availability?.filter(avail => avail.updatedAt === latestTimestamp);
            // console.log('Doctors available days', doctor.availabilityDays);
            const dayOfWeek = this.selectedDate.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
            const matchingDays = latestAvailability
              ?.filter(avail => avail.day.toLowerCase() === dayOfWeek); // Get all matching days

            const availableDay = matchingDays?.length ? matchingDays[matchingDays.length - 1] : null;
            // console.log(availableDay)


            const isUnavailableDueToSchedule = !availableDay;


            const isUnavailable = isUnavailableDay || isUnavailableDueToSchedule;

            const availableFrom = availableDay?.availableFrom ?? '08:00-20:00';
            doctor.availableFrom = availableFrom;
            console.log(availableFrom.split('-')[1], doctor.id)
            console.log(availableFrom, availableDay?.slotDuration, doctor.id)
            if (doctor.availableFrom === '08:00-20:00') {
              doctor.availableFrom = 'N/A';
            }
            const slotDuration = availableDay?.slotDuration ?? 20;

            let generatedSlots = this.generateDoctorSlots(
              availableFrom,
              slotDuration,
              bookedSlots,
              isUnavailable,
              formattedUnavailableSlots,
              availableFrom.split('-')[1],
              extraHoursBefore,
              extraHoursAfter,

            );
            console.log(generatedSlots, doctor.id)

            // formattedExtraSlots.forEach(extraSlot => {
            //   const isAlreadyBooked = bookedSlots.some(bookedSlot => bookedSlot.time === extraSlot);
            //   const isAlreadyUnavailable = formattedUnavailableSlots.includes(extraSlot);
            //   // console.log(generatedSlots, extraSlot)
            //   const existingSlot = generatedSlots.find(slot => slot.time === extraSlot);
            //   // console.log(isAlreadyBooked, isAlreadyUnavailable, existingSlot)
            //   if (isAlreadyBooked && existingSlot) {
            //     existingSlot!.status = 'booked';
            //   }

            //   if (!isAlreadyBooked && !isAlreadyUnavailable && existingSlot) {
            //     existingSlot.status = 'available';
            //   }
            // });
            formattedExtraSlots.forEach(extraSlot => {
              const isAlreadyBooked = bookedSlots.some(bookedSlot => bookedSlot.time === extraSlot);
              const isAlreadyUnavailable = formattedUnavailableSlots.includes(extraSlot);
              const existingSlot = generatedSlots.find(slot => slot.time === extraSlot);
              const isToday = this.selectedDate.toDateString() === new Date().toDateString();
              const currentTime = new Date();
              const currentHours = currentTime.getHours();
              const currentMinutes = currentTime.getMinutes();
              const isPastDate = this.formatDate(this.selectedDate) < new Date().toLocaleDateString('en-Ca');
    
              // Convert current time to minutes for easier comparison
              const currentTimeInMinutes = currentHours * 60 + currentMinutes;
            
              if (existingSlot) {
                const [hourStr, minutePart] = extraSlot.split(':');
                const [minuteStr, period] = minutePart.split(' ');
                let hours = parseInt(hourStr, 10);
                const minutes = parseInt(minuteStr, 10);
            
                // Convert 12-hour format to 24-hour
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
            
                const slotTimeInMinutes = hours * 60 + minutes;
            
                if (isAlreadyBooked) {
                  existingSlot.status = 'booked';
                } else if (
                  !isAlreadyBooked &&
                  !isAlreadyUnavailable &&
                  (
                    (isToday && slotTimeInMinutes < currentTimeInMinutes) || isPastDate
                  )
                ) {
                  existingSlot.status = 'unavailable';
                } else if (!isAlreadyBooked && !isAlreadyUnavailable) {
                  existingSlot.status = 'available';
                }
              }
            });
            

            generatedSlots = generatedSlots.sort((a, b) => {
              const [aStart] = a.time.split('-');
              const [bStart] = b.time.split('-');
              return this.stringToMinutes(aStart) - this.stringToMinutes(bStart);
            });

            return {
              ...doctor,
              isUnavailable,
              slots: generatedSlots,
              unavailableSlots: formattedUnavailableSlots,
              extraSlots: formattedExtraSlots,
            };
          }
        });

        this.applySearchFilter();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error fetching doctors:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });



  }

  onAddSlotClick(doctor: Doctor): void {
    // Assign the selected doctor and open the form for adding an appointment.
    this.selectedDoctor = doctor;
    this.selectedSlot = null; // No specific time slot selected, adding new one.
    this.isBookedSlot = false; // Mark that we're adding a new slot, not editing an existing one.
    this.showForm = true; // Show the form for creating a new appointment.
  }

  private getDayString(date: Date): keyof Doctor['availabilityDays'] {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[date.getDay()];
  }

  reloadData(): void {
    this.fetchDoctors();
    this.selectedDate = new Date();
  }

  onDateChange(event: any): void {
    // console.log("event in",event)
    if (event instanceof Date) {
      this.selectedDate = event;
      // console.log('event',this.selectedDate)
    } else {
      this.selectedDate = new Date(event); // Ensure correct date parsing
    }

    // console.log('selectedDate',this.selectedDate)
    this.fetchDoctors();
    this.cdr.detectChanges(); // Ensure the changes are applied immediately
  }

  prevDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.selectedDate = new Date(this.selectedDate);
    this.fetchDoctors();
  }

  nextDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.selectedDate = new Date(this.selectedDate);
    this.fetchDoctors();
  }

  today(): void {
    this.selectedDate = new Date();
    this.fetchDoctors();
  }

  // Define variables for the search queries
  departmentSearchQuery: string = '';
  doctorSearchQuery: string = '';


  applySearchFilter(): void {
    let filteredDoctors = [];

    if (this.departmentSearchQuery.trim() === '' && this.doctorSearchQuery.trim() === '') {
      // If both search fields are empty, show all doctors
      filteredDoctors = this.doctors.sort((a, b) =>
        this.stripPrefix(a.name).localeCompare(this.stripPrefix(b.name))
      );
    } else {
      filteredDoctors = this.doctors.filter(doctor => {
        const matchesDepartment = this.departmentSearchQuery.trim() === '' || doctor.departmentName?.toLowerCase().includes(this.departmentSearchQuery.toLowerCase());
        const matchesDoctor = this.doctorSearchQuery.trim() === '' || doctor.name.toLowerCase().includes(this.doctorSearchQuery.toLowerCase());
        return matchesDepartment && matchesDoctor;
      });
    }

    this.totalPages = Math.ceil(filteredDoctors.length / this.itemsPerPage);
    this.filteredDoctors = filteredDoctors.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
  }
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applySearchFilter();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applySearchFilter();
    }
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.currentPage = pageNumber;
      this.applySearchFilter();
    }
  }
  onPageInputChange(): void {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.applySearchFilter();
  }


  // Utility function to strip prefixes
  stripPrefix(name: string): string {
    return name.replace(/^(Dr\.|Ms\.|Mr\.|Mrs\.)\s*/i, '').trim();
  }
  onSearchChange(): void {
    this.applySearchFilter(); // Apply filter when either search value changes
  }
  onSlotClick(doctor: Doctor, slot: any): void {
    // console.log(doctor.unavailableSlots, "unavailableSlots while click")
    // console.log(doctor.unavailableSlots,"unavailableSlots while click")
    if (doctor.unavailableSlots!.includes(slot.time)) {
      // console.log('unavailableSlots', doctor.unavailableSlots);
      slot.status = 'blocked'
      this.showForm = false; // Ensure form is not shown
      return; // Stop further execution
    }
    if (slot.status === 'booked' || slot.status === "complete") {
      // console.log('booked slot',slot)
      this.isBookedSlot = true;


      // Retrieve booked appointment details
      this.appointmentService.getAppointmentsBySlot(doctor.id, this.formatDate(this.selectedDate), slot.time)
        .subscribe((appointment) => {
          this.selectedDoctor = doctor;
          this.selectedSlot = slot;
          this.showForm = true;
          this.currentAppointment = appointment; // Store the current appointment to pass to the form
          if (this.currentAppointment.status === 'complete' && this.currentAppointment.time === slot.time) {
            this.slotComplete = true;
          }
          // console.log('appointment',this.currentAppointment)
        });
    } else if (slot.status === 'available') {
      this.isBookedSlot = false;
      this.selectedDoctor = doctor;
      this.selectedSlot = slot;
      this.currentAppointment = null;
      this.showForm = true;
    }
    else if (slot.status === 'extra') {
      //  slot.status = 'available';
      this.doctorService.addExtraSlots(doctor.id, this.formatDate(this.selectedDate), slot.time).subscribe(
        (response) => {
          // console.log('Extra slot added successfully:', response);
          this.fetchDoctors();
          // this.isBookedSlot = false;
          // this.selectedDoctor = doctor;
          // this.selectedSlot = slot;
          // this.currentAppointment = null;
          // this.showForm = true;
        },
        (error) => {
          console.error('Error adding extra slot:', error);
        }
      );
    }


  }
  closeForm(): void {
    // Close the appointment form
    this.showForm = false;
    this.selectedDoctor = null;
    this.selectedSlot = null;
    this.fetchDoctors()
  }
  onStatusChange(event: { slotTime: string; status: 'complete' | 'available' | 'booked' | 'unavailable' }): void {
    const doctor = this.doctors.find((d: any) => d.id === this.selectedDoctor!.id); // Find the doctor
    // console.log("changing")
    setTimeout(() => {
      this.fetchDoctors();
    }, 3000);

    // this.doctorsChanged.next();
    // this.refreshDoctors.emit();
    if (doctor) {
      const slot = doctor.slots.find((s: Slot) => s.time === event.slotTime); // Find the slot
      if (slot) {
        slot.status = event.status; // Update the slot status
      }
    }
  }

  onDateChangeInModal(newDate: Date): void {
    this.selectedDate = newDate;

    if (this.selectedDoctor) {
      this.fetchUnavailableSlots(); // Re-fetch the unavailable slots based on the new date
    }
  }
  private fetchUnavailableSlots(): void {
    if (this.selectedDoctor && this.selectedDoctor.id && this.selectedDate) {
      const formattedDate = this.formatDate(this.selectedDate);

      this.doctorService.getUnavailableSlots(this.selectedDoctor.id).subscribe(
        (slots: { [date: string]: string[] }) => {
          this.unavailableSlots = slots[formattedDate] || []; // Get unavailable slots for the specific date
          // console.log('unavailableSlots', this.unavailableSlots);
          const doctorWithSlots: DoctorWithSlots = {
            id: this.selectedDoctor!.id,
            name: this.selectedDoctor!.name || '',
            qualification: this.selectedDoctor!.qualification || '',
            departmentId: this.selectedDoctor!.departmentId || 0,
            departmentName: this.selectedDoctor!.departmentName || '',
            email: this.selectedDoctor?.email || '',
            phone_number: this.selectedDoctor!.phone_number || '',
            availability: this.selectedDoctor!.availability || [],
            availabilityDays: this.selectedDoctor!.availabilityDays || {
              sun: false,
              mon: false,
              tue: false,
              wed: false,
              thu: false,
              fri: false,
              sat: false,
            },
            availableFrom: this.selectedDoctor!.availableFrom || '',
            slotDuration: this.selectedDoctor!.slotDuration || 0,
            unavailableSlots: this.selectedDoctor!.unavailableSlots || [],
            slots: [], // Set the initial slots as an empty array
            doctorType: this.selectedDoctor!.doctorType || '',

          };

          const bookedSlotsForDate = (this.selectedDoctor?.bookedSlots as any[])
            ?.filter((slot: any) => slot.date === this.formatDate(this.selectedDate)) // Filter booked slots for selected date
            ?.map(slot => slot.time) || [];

          // Generate slots based on current availability and update checkboxes accordingly
          const allSlots = this.generateSlotsForDoctor(this.selectedDoctor);
          // console.log(allSlots, 'this.unavailable')
          const currentTime = new Date();
          const currentHours = currentTime.getHours();
          const currentMinutes = currentTime.getMinutes();

          // Convert current time to minutes for easier comparison
          const currentTimeInMinutes = currentHours * 60 + currentMinutes;

          this.generatedSlots = allSlots
            .map(slot => {
              if (this.unavailableSlots.includes(slot.time)) {
                return { ...slot, status: 'blocked' as 'blocked' }; // ✅ Explicitly set status
              } else if (bookedSlotsForDate.includes(slot.time)) {
                return { ...slot, status: 'booked' as 'booked' }; // ✅ Explicitly set status
              } else {
                return { ...slot, status: 'available' as 'available' }; // ✅ Explicitly set status
              }
            })
            .filter((slot): slot is any => slot !== null);
        },
        error => {
          console.error('Error fetching unavailable slots:', error);
        }
      );
    }
  }
  openUnavailableModal(doctor: DoctorWithSlots): void {
    // console.log(doctor)
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isToday = this.selectedDate.toDateString() === today.toDateString();
    const isTomorrow = this.selectedDate.toDateString() === tomorrow.toDateString();

    // Ensure the modal only opens for today or tomorrow
    if (isToday || isTomorrow || doctor.id === 14) {
      this.selectedDoctor = doctor;

      const bookedSlotsForDate = (this.selectedDoctor?.bookedSlots as any[])
        ?.filter((slot: any) => slot.date === this.formatDate(this.selectedDate)) // Filter booked slots for selected date
        ?.map(slot => slot.time) || [];  // Extract booked times

      console.log(this.selectedDoctor, this.selectedDate)
      // Fetch unavailable slots for the selected doctor and selected date
      if (this.selectedDoctor?.id && this.selectedDate) {
        const formattedDate = this.formatDate(this.selectedDate);

        this.doctorService.getUnavailableSlots(this.selectedDoctor.id).subscribe(
          (slots: { [date: string]: string[] }) => {
            this.unavailableSlots = slots[formattedDate] || []; // Get unavailable slots for the specific date
            // console.log('unavailableSlots',this.unavailableSlots)

            // Generate slots based on current availability and update checkboxes accordingly
            const allSlots = this.generateSlotsForDoctor(doctor);
            console.log(allSlots)
            // this.generatedSlots = allSlots.filter(slot => {
            //   return this.unavailableSlots.includes(slot.time) || slot.status === 'available';
            // });
            // this.generatedSlots = allSlots.map(slot => {
            //   if (this.unavailableSlots.includes(slot.time)) {
            //     return { ...slot, status: 'blocked' };
            //   } else if (bookedSlotsForDate.includes(slot.time)) {
            //     return { ...slot, status: 'booked' }; // Mark booked slots
            //   } else if(slot.status === 'available') {
            //     return {...slot, status:'available'}; // Keep other slots unchanged
            //   }
            // });
            const currentTime = new Date();
            const currentHours = currentTime.getHours();
            const currentMinutes = currentTime.getMinutes();

            // Convert current time to minutes for easier comparison
            const currentTimeInMinutes = currentHours * 60 + currentMinutes;

            this.generatedSlots = allSlots
              .map(slot => {
                // Convert slot time to minutes for comparison
                const [slotHours, slotMinutes] = slot.time.replace(/ AM| PM/, '').split(':').map(Number);
                const isPM = slot.time.includes('PM');
                const slotTimeInMinutes = (isPM && slotHours !== 12 ? slotHours + 12 : slotHours) * 60 + slotMinutes;

                // 🚨 Exclude past slots (before the current time)
                const today = new Date();
                const isToday = this.selectedDate.toDateString() === today.toDateString();

                // 🚨 Exclude past slots only if the selected date is today
                if (isToday && slotTimeInMinutes < currentTimeInMinutes) {
                  return null; // Skip past slots
                }

                if (this.unavailableSlots.includes(slot.time)) {
                  return { ...slot, status: 'blocked' as 'blocked' }; // ✅ Explicitly set status
                } else if (bookedSlotsForDate.includes(slot.time)) {
                  return { ...slot, status: 'booked' as 'booked' }; // ✅ Explicitly set status
                } else {
                  return { ...slot, status: 'available' as 'available' }; // ✅ Explicitly set status
                }
              })
              .filter((slot): slot is any => slot !== null); // ✅ Remove `null` values & ensure correct typing
            // this.generatedSlots= allSlots
            //   .map(slot => {
            //     if (this.unavailableSlots.includes(slot.time)) {
            //       return { ...slot, status: 'blocked' as 'blocked' };
            //     } else if (bookedSlotsForDate.includes(slot.time)) {
            //       return { ...slot, status: 'booked' as 'booked' };
            //     } else {
            //       return { ...slot, status: 'available' as 'available' };
            //     }
            //   })
            //   .filter(slot => (slot as any).status !== "extra");
            console.log(this.generatedSlots)



            this.isSlotDialogOpen = true; // Open the modal after fetching data
          },
          error => {
            console.error('Error fetching unavailable slots:', error);
          }
        );
      }
    }
  }

  onSlotSelectionChange(event: Event, slotTime: string): void {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (isChecked) {
      // If the slot is checked, add it to the unavailable slots list
      if (!this.unavailableSlots.includes(slotTime)) {
        this.unavailableSlots.push(slotTime);
      }
    } else {
      // If the slot is unchecked, remove it from the unavailable slots list
      this.unavailableSlots = this.unavailableSlots.filter(slot => slot !== slotTime);
    }
  }

  updateUnavailableSlots(): void {
    this.isUpdateButtonDisabled = true;
    if (this.selectedDoctor?.id) {
      const date = this.formatDate(this.selectedDate);

      // Store the unavailable slots in the database
      this.doctorService.addUnavailableSlots(this.selectedDoctor.id, date, this.unavailableSlots)
        .subscribe(
          response => {
            // console.log('Unavailable slots added successfully:', response);
            // Close the dialog after saving
            this.fetchDoctors();
            this.closeSlotDialog();
            this.isUpdateButtonDisabled = false;
          },
          error => {
            console.error('Error adding unavailable slots:', error);
            this.isUpdateButtonDisabled = false;
          }
        );
    }
  }


  generateSlotsForDoctor(doctor: any): Slot[] {
    this.fetchDoctors()
    // console.log('doctor', doctor)
    if (doctor.doctorType === 'Visiting Consultant') {
      // console.log(`Skipping slot generation for Visiting Consultant: ${doctor.name}`);
      return this.getBookedSlotsForDoctor(doctor.id, this.formatDate(this.selectedDate)).map(bookedSlot => ({
        time: bookedSlot.time,
        status: bookedSlot.complete ? 'complete' : 'booked'
      }));
    }
    if (!doctor.availableFrom || !doctor.slotDuration) {
      console.error('Doctor availability or slot duration is not set.');
      return []; // Return an empty array if unavailable
    }
    const allUpdatedAtNull = doctor.availability?.every((avail: any) => !avail.updatedAt);

    // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
    const latestTimestamp = allUpdatedAtNull
      ? null // If all are null, treat it as the "latest"
      : doctor.availability?.reduce((latest: any, curr: any) => {
        return curr.updatedAt && new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
          ? curr.updatedAt
          : latest;
      }, doctor.availability.find((avail: any) => avail.updatedAt)?.updatedAt || '');

    // Step 3: Filter availability data based on the latest timestamp
    const latestAvailability = allUpdatedAtNull
      ? doctor.availability // If all are null, consider the entire availability as "latest"
      : doctor.availability?.filter((avail: any) => avail.updatedAt === latestTimestamp);
    // console.log('Doctors available days', doctor.availabilityDays);
    const dayOfWeek = this.selectedDate.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
    // console.log(dayOfWeek)
    // const availableDay = latestAvailability?.find(avail => avail.day.toLowerCase() === dayOfWeek);
    // const availableDay = latestAvailability?.find(avail => avail.day.toLowerCase() === dayOfWeek);
    const matchingDays = latestAvailability
      ?.filter((avail: any) => avail.day.toLowerCase() === dayOfWeek); // Get all matching days

    const availableDay = matchingDays?.length ? matchingDays[matchingDays.length - 1] : null;


    // const isUnavailableDueToSchedule = !availableDay;



    const availableFrom = availableDay?.availableFrom ?? '08:00-20:00';
    doctor.availableFrom = availableFrom;

    const formattedDate = this.formatDate(this.selectedDate);

    const bookedSlots = this.getBookedSlotsForDoctor(doctor.id, formattedDate); // Synchronous placeholder
    const unavailableSlots = this.getUnavailableSlotsForDoctor(doctor.id, formattedDate); // Synchronous placeholder

    const [startTime, endTime] = doctor.availableFrom.split('-');
    console.log(endTime)

    // const dayOfWeek = this.selectedDate.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
    // const availableDay = doctor.availability.find((avail: any) =>
    //   avail.day.toLowerCase() === dayOfWeek
    // );
    const slotDuration = availableDay?.slotDuration ?? 20;
    // console.log(doctor.ExtraSlotCount[0]?.extraHoursAfter)
    // const slotDuration = doctor.slotDuration;

    const generatedSlots = this.generateDoctorSlots(
      doctor.availableFrom,
      slotDuration,
      bookedSlots,
      doctor.isUnavailable ?? false,
      doctor.unavailableSlots ?? [],
      endTime,
      doctor.ExtraSlotCount[0]?.extraHoursBefore,
      doctor.ExtraSlotCount[0]?.extraHoursAfter
    );
    console.log(generatedSlots, doctor.id)
    return generatedSlots; // Explicitly return the slots
  }


  getBookedSlotsForDoctor(doctorId: number, date: string): { time: string, complete: boolean }[] {
    let bookedSlots: { time: string, complete: boolean }[] = [];
    this.doctorService.getBookedSlots(doctorId, date).subscribe(
      (slots: { time: string, complete: boolean }[]) => {
        bookedSlots = slots; // Store the booked slots
      },
      (error) => {
        console.error('Error fetching booked slots:', error);
      }
    );
    return bookedSlots;
  }

  getUnavailableSlotsForDoctor(doctorId: number, date: string): string[] {
    let unavailableSlots: string[] = [];
    this.doctorService.getUnavailableSlots(doctorId).subscribe(
      (slots: { [date: string]: string[] }) => {
        unavailableSlots = slots[date] || []; // Get unavailable slots for the specific date
      },
      (error) => {
        console.error('Error fetching unavailable slots:', error);
      }
    );
    return unavailableSlots;
  }
  isTodayOrTomorrow(date: Date): boolean {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    return date.toDateString() === today.toDateString() || date.toDateString() === tomorrow.toDateString();
  }


  closeSlotDialog(): void {
    this.isSlotDialogOpen = false;
    this.selectedDoctor = null;
    this.selectedDate = this.todayforUnavialable;
    this.generatedSlots = [];
  }

  addExtraSlotsBefore(doctor: any): void {
    if (!doctor.extraHoursBefore || isNaN(doctor.extraHoursBefore)) {
      doctor.extraHoursBefore = 0;
    }

    doctor.ExtraSlotCount[0].extraHoursBefore = Number(doctor.ExtraSlotCount[0].extraHoursBefore) + 1;
    this.updateExtraSlot(doctor);
    // console.log('Extra slots before:', Number(doctor.ExtraSlotCount[0].extraHoursBefore) + 1);
  }


  // Call this function when user clicks "Add Extra After" button
  addExtraSlotsAfter(doctor: any): void {
    if (!doctor.extraHoursAfter || isNaN(doctor.extraHoursAfter)) {
      doctor.extraHoursAfter = 0;
    }

    doctor.ExtraSlotCount[0].extraHoursAfter = Number(doctor.ExtraSlotCount[0].extraHoursAfter) + 1;
    this.updateExtraSlot(doctor);
    // console.log('Extra slots after:', Number(doctor.ExtraSlotCount[0].extraHoursAfter) + 1);
  }






  updateExtraSlot(doctor: any): void {
    // console.log('Updating extra slots:', doctor.ExtraSlotCount[0].extraHoursBefore, doctor.ExtraSlotCount[0].extraHoursAfter);

    if (!doctor.id) {
      console.error('Doctor ID is missing!');
      return;
    }

    const extraSlotData = {
      doctorId: doctor.id,
      date: this.formatDate(this.selectedDate),
      extraHoursBefore: Number(doctor.ExtraSlotCount[0].extraHoursBefore),
      extraHoursAfter: Number(doctor.ExtraSlotCount[0].extraHoursAfter),
    };

    this.doctorService.addOrUpdateExtraSlot(extraSlotData).subscribe({
      next: (response) => {
        // console.log('Extra slot updated:', response);

        // Ensure doctor list updates properly
        this.fetchDoctors();
      },
      error: (error) => {
        console.error('Error updating extra slot:', error);
      }
    });
  }

  minutesToFormattedTime(minutes: number): string {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
  }
  // generateDoctorSlots(
  //   availableFrom: string,
  //   slotDuration: number,
  //   bookedSlots: { time: string; complete: boolean }[],
  //   isUnavailableDay: boolean,
  //   unavailableSlots: string[],
  //   doctorAvailableUntil: string
  // ): Slot[] {


  //   const timeRanges = availableFrom.split(',').map(range => range.trim()); // Split by commas and trim spaces
  //   const slots: Slot[] = [];

  //   const currentTimeInMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  //   const doctorAvailableUntilInMinutes = this.stringToMinutes(doctorAvailableUntil);

  //   const today = new Date();
  //   const isToday = today.toLocaleDateString() === this.selectedDate.toLocaleDateString();
  //   const isPastDoctorAvailableTime = isToday && currentTimeInMinutes >= doctorAvailableUntilInMinutes;
  //   const isPastDate = this.formatDate(this.selectedDate) < today.toLocaleDateString('en-Ca');

  //   // If the day is unavailable or the time has passed, return unavailable slots
  //   if (isUnavailableDay || isPastDoctorAvailableTime || isPastDate) {
  //     for (const timeRange of timeRanges) {
  //       const [availableStart, availableEnd] = timeRange.split('-').map(this.stringToMinutes);
  //       slots.push(
  //         ...this.generateUnavailableSlots(
  //           availableStart,
  //           availableEnd,
  //           slotDuration,
  //           bookedSlots,
  //           currentTimeInMinutes,
  //           isUnavailableDay
  //         )
  //       );
  //     }
  //     return slots;
  //   }

  //   // Process each time range separately
  //   let earliestStart = Infinity;
  //   let latestEnd = -Infinity;

  //   for (const timeRange of timeRanges) {
  //     const [availableStart, availableEnd] = timeRange.split('-').map(this.stringToMinutes);
  //     earliestStart = Math.min(earliestStart, availableStart);
  //     latestEnd = Math.max(latestEnd, availableEnd);
  //     // console.log(slotDuration, availableStart, availableEnd)

  //     // Generate regular slots for the current time range
  //     for (let current = availableStart; current < availableEnd; current += slotDuration) {
  //       if (current >= availableEnd) break;
  //       if (slotDuration === 0) {
  //         break;
  //       }
  //       const slotTime = this.minutesToString(current);
  //       const [hours, minutes] = slotTime.split(':').map(Number);
  //       const period = hours >= 12 ? 'PM' : 'AM';
  //       const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  //       // const formattedSlotTime = this.convertTo12HourFormat(slotTime);
  //       // console.log(formattedSlotTime)

  //       let status: Slot['status'] = 'extra'; // Default to extra

  //       const bookedSlot = bookedSlots.find(slot => {
  //         const [bookedStartTime] = slot.time.split('-');
  //         const is12HourFormat = (time: string): boolean =>
  //           time.includes('AM') || time.includes('PM');
  //         const formattedBookedStartTime = is12HourFormat(bookedStartTime)
  //           ? bookedStartTime
  //           : this.convertTo12HourFormat(bookedStartTime);

  //         return formattedBookedStartTime === formattedSlotTime;
  //       });

  //       if (current >= availableStart && current < availableEnd) {
  //         if (unavailableSlots.includes(formattedSlotTime)) {
  //           status = 'blocked'; // Mark as blocked if the slot is in unavailableSlots
  //         } else if (bookedSlot) {
  //           status = bookedSlot.complete ? 'complete' : 'booked'; // Mark as booked or complete
  //         } else if (!isUnavailableDay) {
  //           if (isToday && current < currentTimeInMinutes) {
  //             status = 'unavailable'; // Mark as unavailable if the time has passed
  //           } else {
  //             status = 'available'; // Otherwise, mark as available
  //           }
  //         }
  //       }

  //       slots.push({
  //         time: formattedSlotTime,
  //         status,
  //       });
  //     }
  //   }

  //   // Generate extra slots before the earliest start time
  //   for (let current = earliestStart - slotDuration; current >= earliestStart - 60; current -= slotDuration) {
  //     if (current < 0) break; // Skip invalid times
  //     const slotTime = this.minutesToString(current);
  //     const [hours, minutes] = slotTime.split(':').map(Number);
  //     const period = hours >= 12 ? 'PM' : 'AM';
  //     const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  //     // const formattedSlotTime = this.convertTo12HourFormat(slotTime);
  //     let status: Slot['status'] = 'extra';

  //     if (isToday && current < currentTimeInMinutes) {
  //       status = 'unavailable'; // Mark as unavailable if the time has passed
  //     }

  //     slots.unshift({ time: formattedSlotTime, status }); // Add to the beginning
  //   }

  //   // Generate extra slots after the latest end time
  //   for (let current = latestEnd; current < latestEnd + 60; current += slotDuration) {
  //     const slotTime = this.minutesToString(current);
  //     const [hours, minutes] = slotTime.split(':').map(Number);
  //     const period = hours >= 12 ? 'PM' : 'AM';
  //     const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  //     // const formattedSlotTime = this.convertTo12HourFormat(slotTime);
  //     let status: Slot['status'] = 'extra';

  //     if (isToday && current < currentTimeInMinutes) {
  //       status = 'unavailable'; // Mark as unavailable if the time has passed
  //     }

  //     slots.push({ time: formattedSlotTime, status });
  //   }

  //   return slots;
  // }

  generateDoctorSlots(
    availableFrom: string,
    slotDuration: number,
    bookedSlots: { time: string; complete: boolean }[],
    isUnavailableDay: boolean,
    unavailableSlots: string[],
    doctorAvailableUntil: string,
    extraHoursBefore: any,
    extraHoursAfter: any
  ): Slot[] {
    // console.log('generating')
    const timeRanges = availableFrom.split(',').map(range => range.trim());
    const slots: Slot[] = [];
    const currentTimeInMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const doctorAvailableUntilInMinutes = this.stringToMinutes(doctorAvailableUntil);

    const today = new Date();
    const isToday = today.toLocaleDateString() === this.selectedDate.toLocaleDateString();
    const isPastDoctorAvailableTime = isToday && currentTimeInMinutes >= doctorAvailableUntilInMinutes;
    const isPastDate = this.formatDate(this.selectedDate) < today.toLocaleDateString('en-Ca');

    // If the day is unavailable or the time has passed, generate unavailable slots
    if (isUnavailableDay || isPastDoctorAvailableTime || isPastDate) {
      for (const timeRange of timeRanges) {
        const [availableStart, availableEnd] = timeRange.split('-').map(this.stringToMinutes);
        slots.push(
          ...this.generateUnavailableSlots(
            availableStart,
            availableEnd,
            slotDuration,
            bookedSlots,
            currentTimeInMinutes,
            isUnavailableDay,
            extraHoursBefore,
            extraHoursAfter
          )
        );
      }
      return slots;
    }

    // Process each time range for regular slots
    let earliestStart = Infinity;
    let latestEnd = -Infinity;

    for (const timeRange of timeRanges) {
      const [availableStart, availableEnd] = timeRange.split('-').map(this.stringToMinutes);
      earliestStart = Math.min(earliestStart, availableStart);
      latestEnd = Math.max(latestEnd, availableEnd);

      for (let current = availableStart; current < availableEnd; current += slotDuration) {
        if (slotDuration === 0) break;
        const formattedSlotTime = this.minutesToFormattedTime(current);
        let status: Slot['status'] = 'extra'; // default status

        const bookedSlot = bookedSlots.find(slot => {
          const [bookedStartTime] = slot.time.split('-');
          const is12HourFormat = (time: string): boolean =>
            time.includes('AM') || time.includes('PM');
          const formattedBookedStartTime = is12HourFormat(bookedStartTime)
            ? bookedStartTime
            : this.convertTo12HourFormat(bookedStartTime);
          return formattedBookedStartTime === formattedSlotTime;
        });

        if (unavailableSlots.includes(formattedSlotTime)) {
          status = 'blocked';
        } else if (bookedSlot) {
          status = bookedSlot.complete ? 'complete' : 'booked';
        } else if (!isUnavailableDay) {
          if (isToday && current < currentTimeInMinutes) {
            status = 'unavailable';
          } else {
            status = 'available';
          }
        }
        slots.push({ time: formattedSlotTime, status });
      }
    }

    // Generate extra slots BEFORE the normal period using extraHoursBefore
    const extraBeforeMinutes = extraHoursBefore * 60;
    for (let current = earliestStart - slotDuration; current >= earliestStart - extraBeforeMinutes; current -= slotDuration) {
      if (current < 0) break;
      const formattedSlotTime = this.minutesToFormattedTime(current);
      let status: Slot['status'] = 'extra';
      if (isToday && current < currentTimeInMinutes) {
        status = 'unavailable';
      }
      slots.unshift({ time: formattedSlotTime, status });
    }

    // Generate extra slots AFTER the normal period using extraHoursAfter
    const extraAfterMinutes = extraHoursAfter * 60;
    for (let current = latestEnd; current < latestEnd + extraAfterMinutes; current += slotDuration) {
      const formattedSlotTime = this.minutesToFormattedTime(current);
      let status: Slot['status'] = 'extra';
      if (isToday && current < currentTimeInMinutes) {
        status = 'unavailable';
      }
      slots.push({ time: formattedSlotTime, status });
      console.log(slots, this.selectedDate)
      this.cdr.detectChanges()
    }

    return slots;
  }









  private timeFormatCache: { [key: string]: string } = {};

  private initializeTimeFormatCache(): void {
    for (let minutes = 0; minutes < 1440; minutes++) {
      const time24 = this.minutesToString(minutes);
      this.timeFormatCache[time24] = this._convertTo12HourFormatInternal(time24);
    }
  }

  private _convertTo12HourFormatInternal(time: string): string {
    let [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  convertTo12HourFormat(time: string): string {
    // console.log('convert')
    return this.timeFormatCache[time];
  }


  // Utility function to convert time in "HH:mm" format to minutes
  stringToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Utility function to convert minutes back to "HH:mm" format
  minutesToString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Utility function to format date to string "yyyy-MM-dd"
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Utility function to generate all slots as unavailable
  // generateUnavailableSlots(availableStart: number, availableEnd: number, slotDuration: number, bookedSlots: { time: string, complete: boolean }[],
  //   currentTimeInMinutes: number, isUnavailableDay: boolean): Slot[] {
  //   // console.log("unavailableSlots")
  //   const slots: Slot[] = [];
  //   const today = new Date();
  //   const isToday = today.toLocaleDateString() === this.selectedDate.toLocaleDateString();
  //   const isPastDate = this.formatDate(this.selectedDate) < today.toLocaleDateString('en-Ca');
  //   const backwardSlots: Slot[] = [];
  //   let backwardStart = availableStart;
  //   while (true) {
  //     backwardStart -= slotDuration;
  //     if (backwardStart < availableStart - 60) break; // Stop if we exceed 1 hour before availableStart
  //     if (backwardStart < 0) continue; // Skip invalid times

  //     const slotTime = this.minutesToString(backwardStart);
  //     const [hours, minutes] = slotTime.split(':').map(Number);
  //     const period = hours >= 12 ? 'PM' : 'AM';
  //     const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  //     // const formattedSlotTime = this.convertTo12HourFormat(slotTime);
  //     let status: Slot['status'] = 'extra';

  //     if (isToday && backwardStart < currentTimeInMinutes || isPastDate) {
  //       status = 'unavailable'; // Mark as unavailable if the time has passed
  //     }

  //     backwardSlots.push({ time: formattedSlotTime, status });
  //   }

  //   // Add the backward slots to the final slots array in reverse order to maintain time sequence
  //   slots.push(...backwardSlots.reverse());

  //   for (let current = availableStart; current < availableEnd; current += slotDuration) {
  //     // const slotTime = this.minutesToString(current);
  //     const nextSlotTime = this.minutesToString(current + slotDuration);
  //     const slotTime = this.minutesToString(current);
  //     const [hours, minutes] = slotTime.split(':').map(Number);
  //     const period = hours >= 12 ? 'PM' : 'AM';
  //     const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

  //     let status: Slot['status'] = 'unavailable'; // Default to available

  //     const bookedSlot = bookedSlots.find(slot => {
  //       const [bookedStartTime] = slot.time.split('-'); // Extract start time from "10:00-10:20"

  //       // Function to determine if the time is already in 12-hour format
  //       const is12HourFormat = (time: string): boolean => {
  //         return time.includes('AM') || time.includes('PM');
  //       };

  //       let formattedBookedStartTime: string;

  //       if (is12HourFormat(bookedStartTime)) {
  //         // If the booked start time is already in 12-hour format, use it directly
  //         formattedBookedStartTime = bookedStartTime;
  //       } else {
  //         // If it is in 24-hour format, convert it to 12-hour format
  //         formattedBookedStartTime = this.convertTo12HourFormat(bookedStartTime);
  //       }

  //       return formattedBookedStartTime === formattedSlotTime; // Compare with the generated slot time
  //     });


  //     if (isUnavailableDay || isPastDate) {
  //       // If the day is marked as unavailable or the date is in the past
  //       status = 'unavailable';
  //     } else if (isToday) {
  //       // For today, check if the slot has passed based on the current time
  //       if (current <= currentTimeInMinutes) {
  //         status = 'unavailable'; // Mark as unavailable if past available time
  //       }
  //     } else {
  //       // For future days that are available
  //       status = 'available';
  //     }
  //     // Check if the slot should be unavailable (only available slots)
  //     if (bookedSlot) {
  //       // Mark as complete if the slot is marked as complete, otherwise as booked
  //       status = bookedSlot.complete ? 'complete' : 'booked';
  //     }
  //     slots.push({
  //       time: formattedSlotTime,
  //       status
  //     });
  //     // console.log('status',slots)
  //   }
  //   // Generate extra slots after available time
  //   const extraAfterMinutes = this.extraHoursAfter * 60;
  //   for (let current = availableEnd; current < availableEnd + extraAfterMinutes; current += slotDuration) {
  //     const slotTime = this.minutesToString(current);
  //     const [hours, minutes] = slotTime.split(':').map(Number);
  //     const period = hours >= 12 ? 'PM' : 'AM';
  //     const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  //     // const formattedSlotTime = this.convertTo12HourFormat(slotTime);
  //     let status: Slot['status'] = 'extra';

  //     if (isToday && current < currentTimeInMinutes || isPastDate) {
  //       status = 'unavailable'; // Mark as unavailable if the time has passed
  //     }

  //     slots.push({ time: formattedSlotTime, status });
  //   }
  //   return slots;
  // }
  generateUnavailableSlots(
    availableStart: number,
    availableEnd: number,
    slotDuration: number,
    bookedSlots: { time: string, complete: boolean }[],
    currentTimeInMinutes: number,
    isUnavailableDay: boolean,
    extraHoursBefore: any,
    extraHoursAfter: any
  ): Slot[] {
    const slots: Slot[] = [];
    const today = new Date();
    const isToday = today.toLocaleDateString() === this.selectedDate.toLocaleDateString();
    const isPastDate = this.formatDate(this.selectedDate) < today.toLocaleDateString('en-Ca');

    // Define extra slot duration before & after
    const extraBeforeMinutes = extraHoursBefore * 60;
    const extraAfterMinutes = extraHoursAfter * 60;

    // Generate extra slots BEFORE the available start time
    for (let current = availableStart - slotDuration; current >= availableStart - extraBeforeMinutes; current -= slotDuration) {
      if (current < 0) continue; // Skip invalid times

      const slotTime = this.minutesToString(current);
      const [hours, minutes] = slotTime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

      let status: Slot['status'] = 'extra';
      if (isToday && current < currentTimeInMinutes || isPastDate) {
        status = 'unavailable'; // Mark as unavailable if past time
      }

      slots.unshift({ time: formattedSlotTime, status }); // Add to the beginning
    }

    // Generate slots for the available time range
    for (let current = availableStart; current < availableEnd; current += slotDuration) {
      const slotTime = this.minutesToString(current);
      const [hours, minutes] = slotTime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

      let status: Slot['status'] = 'unavailable'; // Default to unavailable

      // const bookedSlot = bookedSlots.find(slot => {
      //   const [bookedStartTime] = slot.time.split('-');
      //   const formattedBookedStartTime = this.convertTo12HourFormat(bookedStartTime);
      //   return formattedBookedStartTime === formattedSlotTime;
      // });
      const bookedSlot = bookedSlots.find(slot => {
        const [bookedStartTime] = slot.time.split('-');
        const is12HourFormat = (time: string): boolean =>
          time.includes('AM') || time.includes('PM');
        const formattedBookedStartTime = is12HourFormat(bookedStartTime)
          ? bookedStartTime
          : this.convertTo12HourFormat(bookedStartTime);
        return formattedBookedStartTime === formattedSlotTime;
      });
      // console.log(bookedSlot)

      if (!isUnavailableDay && !isPastDate) {
        status = isToday && current <= currentTimeInMinutes ? 'unavailable' : 'available';
        console.log(status, 'available')
      }
      if (bookedSlot) {
        status = bookedSlot.complete ? 'complete' : 'booked';
      }

      slots.push({ time: formattedSlotTime, status });
    }

    // Generate extra slots AFTER the available end time
    for (let current = availableEnd; current < availableEnd + extraAfterMinutes; current += slotDuration) {
      const slotTime = this.minutesToString(current);
      const [hours, minutes] = slotTime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedSlotTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

      let status: Slot['status'] = 'extra';
      if ((isToday && current < currentTimeInMinutes) || isPastDate) {
        status = 'unavailable';
        console.log(status,'unavailable')
      }

      slots.push({ time: formattedSlotTime, status });
    }

    return slots;
  }

}
