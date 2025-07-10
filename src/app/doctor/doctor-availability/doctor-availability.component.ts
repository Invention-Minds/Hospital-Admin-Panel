import { Component, Input, Output } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';
import { DoctorWithSlots } from '../../models/doctos_with_slots.model';
import { ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { MessageService } from 'primeng/api';

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
  styleUrl: './doctor-availability.component.css',
  providers: [MessageService],
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
  doctorsList: any[] = [];
  unavailableDoctorList: any[] = [];
  subAdminType: string = ''; // Sub-admin type
  employeeId: string = ''; // Employee ID
  userId: string = ''; // User ID





  constructor(private doctorService: DoctorServiceService, private cdr: ChangeDetectorRef, private appointmentService: AppointmentConfirmService, private messageService: MessageService) {
    this.tomorrow.setDate(this.todayforUnavialable.getDate() + 1);
    this.initializeTimeFormatCache()
  }

  ngOnInit(): void {
    this.fetchDoctors();
    this.role = localStorage.getItem('role') || ''
    console.log(this.role);
    this.subAdminType = localStorage.getItem('subAdminType') || ''; // Fetch sub-admin type from localStorage
    this.employeeId = localStorage.getItem('employeeId') || ''; // Fetch employee ID from localStorage
    this.userId = localStorage.getItem('userid') || ''; // Fetch user ID from localStorage
    console.log(this.subAdminType)
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
    this.isLoading = true;
    this.doctorService.getAllDoctors(formattedDate).subscribe({
      next: (doctors: Doctor[]) => {
        this.unavailableDoctorList = doctors.map(d => ({
          ...d,
          selected: false  // Add this if using checkboxes
        }));
        console.log('unavailableDoctorList', this.unavailableDoctorList);
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
          // const extraHoursBefore = Number(doctor.ExtraSlotCount[0]?.extraHoursBefore) || 0;
          // const extraHoursAfter = Number(doctor.ExtraSlotCount[0]?.extraHoursAfter) || 0;
          const extraHoursBefore: Record<string, number> = {};
          const extraHoursAfter: Record<string, number> = {};

          doctor.ExtraSlotCount.forEach((slot: any) => {
            const timeRange = slot.timeRange?.trim();
            if (!timeRange) return;

            extraHoursBefore[timeRange] = Number(slot.extraHoursBefore || 0);
            extraHoursAfter[timeRange] = Number(slot.extraHoursAfter || 0);
          });


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
            // console.log(availableFrom.split('-')[1], doctor.id)
            // console.log(availableFrom, availableDay?.slotDuration, doctor.id)
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
    console.log('Slot clicked:', slot);
    if (doctor.unavailableSlots!.includes(slot.time)) {
      slot.status = 'blocked'
      this.showForm = false;
      console.log('Slot is blocked:', slot);
      return;
    }
    if (slot.status === 'booked' || slot.status === "complete") {
      console.log('Slot is booked:', slot);
      this.isBookedSlot = true;
      this.appointmentService.getAppointmentsBySlot(doctor.id, this.formatDate(this.selectedDate), slot.time)
        .subscribe((appointment) => {
          this.selectedDoctor = doctor;
          this.selectedSlot = slot;
          this.showForm = true;
          this.currentAppointment = appointment;
          if (this.currentAppointment.status === 'complete' && this.currentAppointment.time === slot.time) {
            this.slotComplete = true;
          }
        });
    } else if (slot.status === 'available') {
      console.log('Slot is available:', slot);
      this.isBookedSlot = false;
      this.selectedDoctor = doctor;
      this.selectedSlot = slot;
      this.currentAppointment = null;
      this.showForm = false;
      setTimeout(() => {
        this.showForm = true;
      }, 0);
    
    }
    else if (slot.status === 'extra') {
      console.log('Slot is extra:', slot);
      this.doctorService.addExtraSlots(doctor.id, this.formatDate(this.selectedDate), slot.time, this.userId).subscribe(
        (response) => {
          this.fetchDoctors();
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
  isHaveAccess():boolean{
    return this.subAdminType === 'Tele Caller' || this.role === 'admin'|| this.role === 'super_admin'  || this.employeeId === 'JMRH124';
  }
  openUnavailableModal(doctor: DoctorWithSlots): void {
    // console.log(doctor)
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isToday = this.selectedDate.toDateString() === today.toDateString();
    const isTomorrow = this.selectedDate.toDateString() === tomorrow.toDateString();

    // Ensure the modal only opens for today or tomorrow
    if (this.subAdminType === 'Tele Caller' || this.role === 'admin'|| this.role === 'super_admin'  || this.employeeId === 'JMRH124'|| doctor.id === 14) {
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
            console.log(allSlots)

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



            this.isSlotDialogOpen = true; // Open the modal after fetching data
            console.log(this.generatedSlots)
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
      this.doctorService.addUnavailableSlots(this.selectedDoctor.id, date, this.unavailableSlots,this.userId)
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
    console.log(doctor.ExtraSlotCount[0]?.extraHoursAfter)
    // const slotDuration = doctor.slotDuration;
    const extraHoursBefore: Record<string, number> = {};
    const extraHoursAfter: Record<string, number> = {};

    doctor.ExtraSlotCount.forEach((slot: any) => {
      const timeRange = slot.timeRange?.trim();
      if (!timeRange) return;

      extraHoursBefore[timeRange] = Number(slot.extraHoursBefore || 0);
      extraHoursAfter[timeRange] = Number(slot.extraHoursAfter || 0);
    });


    const generatedSlots = this.generateDoctorSlots(
      doctor.availableFrom,
      slotDuration,
      bookedSlots,
      doctor.isUnavailable ?? false,
      doctor.unavailableSlots ?? [],
      endTime,
      extraHoursBefore,
      extraHoursAfter
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
  addExtraSlotsBefore(doctor: any, timeRange: string): void {
    // Ensure object exists
    if (!doctor.extraHoursBefore) {
      doctor.extraHoursBefore = {};
    }
    const trimmedTimeRange = timeRange.trim();
    // 🟢 Get the existing slot data from ExtraSlotCount
    const slot = doctor.ExtraSlotCount.find((s: any) => s.timeRange === trimmedTimeRange);
    const existingExtras = Number(slot?.extraHoursBefore || 0);

    // 🧠 Get current start time of this range
    const timeRanges = doctor.availableFrom.split(',').map((r: string) => r.trim());
    const currentIndex = timeRanges.findIndex((r: string) => r === trimmedTimeRange);
    const currentStart = this.stringToMinutes(timeRange.split('-')[0]);

    // Check previous range (if any)
    const previousRange = timeRanges[currentIndex - 1];
    if (previousRange) {
      const previousSlot = doctor.ExtraSlotCount.find((s: any) => s.timeRange?.trim() === previousRange);
      const previousExtras = Number(previousSlot?.extraHoursAfter || 0);

      const previousEnd = this.stringToMinutes(previousRange.split('-')[1]);
      const previousExtendedEnd = previousEnd + previousExtras * 60;

      const extraStart = currentStart - (existingExtras + 1) * 60;

      if (extraStart < previousExtendedEnd) {
        alert('Cannot add extra slot — it overlaps with extra slots from the previous time range.');
        return;
      }
    }
    else {
      // Optional: prevent going before midnight
      const extraStart = currentStart - (existingExtras + 1) * 60;
      if (extraStart < 0) {
        alert('Cannot add extra slot — it goes before 12:00 AM.');
        return;
      }
    }

    // ✅ Update in memory for UI
    doctor.extraHoursBefore[trimmedTimeRange] = existingExtras + 1;

    // ✅ Update ExtraSlotCount for consistency
    if (slot) {
      slot.extraHoursBefore = String(existingExtras + 1);
    } else {
      console.log('noslot')
      doctor.ExtraSlotCount.push({
        timeRange: trimmedTimeRange,
        extraHoursBefore: "1",
        extraHoursAfter: "0"
      });
    }

    this.updateExtraSlot(doctor, trimmedTimeRange);
  }

  addExtraSlotsAfter(doctor: any, timeRange: string): void {
    // Ensure object exists
    if (!doctor.extraHoursAfter) {
      doctor.extraHoursAfter = {};
    }

    // 🟢 Trim and find time range safely
    const timeRanges = doctor.availableFrom.split(',').map((r: string) => r.trim());
    const trimmedTimeRange = timeRange.trim();
    const currentIndex = timeRanges.findIndex((r: string) => r === trimmedTimeRange);

    if (currentIndex === -1) {
      alert('Time range not found.');
      return;
    }

    // 🔍 Get current end time and existing extra slot count
    const slot = doctor.ExtraSlotCount.find((s: any) => s.timeRange === trimmedTimeRange);
    const existingExtras = Number(slot?.extraHoursAfter || 0);
    const currentEnd = this.stringToMinutes(trimmedTimeRange.split('-')[1]);
    const extraEnd = currentEnd + (existingExtras + 1) * 60;

    // 🔒 Check overlap with next range
    const nextRange = timeRanges[currentIndex + 1];
    if (nextRange) {
      const nextStart = this.stringToMinutes(nextRange.split('-')[0]);

      const nextSlot = doctor.ExtraSlotCount.find((s: any) => s.timeRange?.trim() === nextRange);
      const nextExtraBefore = Number(nextSlot?.extraHoursBefore || 0);
      const nextExtendedStart = nextStart - (nextExtraBefore * 60);

      if (extraEnd > nextExtendedStart) {
        alert('Cannot add extra slot — it overlaps with extra before-slots from the next time range.');
        return;
      }
    }


    // ✅ Update in-memory state
    doctor.extraHoursAfter[trimmedTimeRange] = existingExtras + 1;

    // ✅ Sync to ExtraSlotCount (used in UI or later update)
    if (slot) {
      slot.extraHoursAfter = String(existingExtras + 1);
    } else {
      console.log('no slot')
      doctor.ExtraSlotCount.push({
        timeRange: trimmedTimeRange,
        extraHoursBefore: "0",
        extraHoursAfter: "1"
      });
    }

    // ✅ Send update to backend
    this.updateExtraSlot(doctor, trimmedTimeRange);
  }

  updateExtraSlot(doctor: any, timeRange: string): void {
    const slot = doctor.ExtraSlotCount.find((s: any) => s.timeRange?.trim() === timeRange.trim());

    const extraSlotData = {
      doctorId: doctor.id,
      date: this.formatDate(this.selectedDate),
      timeRange: timeRange.trim(),
      extraHoursBefore: Number(slot?.extraHoursBefore || 0),
      extraHoursAfter: Number(slot?.extraHoursAfter || 0),
      createdBy: this.userId, // Assuming userId is available in the component
    };

    console.log("🔁 Updating extraSlot:", extraSlotData);

    this.doctorService.addOrUpdateExtraSlot(extraSlotData).subscribe({
      next: () => this.fetchDoctors(),
      error: (error) => console.error('Error updating extra slot:', error),
    });
  }


  minutesToFormattedTime(minutes: number): string {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
  }
 

  generateDoctorSlots(
    availableFrom: string,
    slotDuration: number,
    bookedSlots: { time: string; complete: boolean }[],
    isUnavailableDay: boolean,
    unavailableSlots: string[],
    doctorAvailableUntil: string,
    extraHoursBefore: Record<string, number>,
    extraHoursAfter: Record<string, number>
  ): Slot[] {
    const timeRanges = availableFrom.split(',').map(range => range.trim());
    const slots: Slot[] = [];
    const currentTimeInMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    console.log(availableFrom, slotDuration,doctorAvailableUntil, 'log')
    const doctorAvailableUntilInMinutes = this.stringToMinutes(doctorAvailableUntil);

    const today = new Date();
    const isToday = today.toLocaleDateString() === this.selectedDate.toLocaleDateString();
    const isPastDoctorAvailableTime = isToday && currentTimeInMinutes >= doctorAvailableUntilInMinutes;
    const isPastDate = this.formatDate(this.selectedDate) < today.toLocaleDateString('en-CA');

    for (const timeRange of timeRanges) {
      const [availableStart, availableEnd] = timeRange.split('-').map(this.stringToMinutes);

      const beforeMinutes = (extraHoursBefore?.[timeRange] || 0) * 60;
      const afterMinutes = (extraHoursAfter?.[timeRange] || 0) * 60;

      // If unavailable or past time, show as unavailable
      if (isUnavailableDay || isPastDoctorAvailableTime || isPastDate) {
        slots.push(
          ...this.generateUnavailableSlots(
            availableStart,
            availableEnd,
            slotDuration,
            bookedSlots,
            currentTimeInMinutes,
            isUnavailableDay,
            beforeMinutes,
            afterMinutes
          )
        );
        continue;
      }

      // Extra slots BEFORE
      for (
        let current = availableStart - slotDuration;
        current >= availableStart - beforeMinutes;
        current -= slotDuration
      ) {
        if (current < 0) break;
        const formatted = this.minutesToFormattedTime(current);
        const status = isToday && current < currentTimeInMinutes ? 'unavailable' : 'extra';
        slots.push({ time: formatted, status });
      }

      // Main slots
      for (let current = availableStart; current < availableEnd; current += slotDuration) {
        if (slotDuration === 0) break;
        const formattedSlotTime = this.minutesToFormattedTime(current);
        let status: Slot['status'] = 'extra';

        const bookedSlot = bookedSlots.find(slot => {
          const [bookedStartTime] = slot.time.split('-');
          const is12HourFormat = (time: string): boolean => time.includes('AM') || time.includes('PM');
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
          status = isToday && current < currentTimeInMinutes ? 'unavailable' : 'available';
        }

        slots.push({ time: formattedSlotTime, status });
      }

      // Extra slots AFTER
      for (
        let current = availableEnd;
        current < availableEnd + afterMinutes;
        current += slotDuration
      ) {
        const formatted = this.minutesToFormattedTime(current);
        const status = isToday && current < currentTimeInMinutes ? 'unavailable' : 'extra';
        slots.push({ time: formatted, status });
      }
    }

    this.cdr.detectChanges();
    slots.sort((a, b) => this.convert12HourToMinutes(a.time) - this.convert12HourToMinutes(b.time));
    console.log(slots, this.selectedDate);
    return slots;
  }



  convert12HourToMinutes(time: string): number {
    const [hhmm, meridian] = time.split(' ');
    let [hours, minutes] = hhmm.split(':').map(Number);

    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
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
        // console.log(status, 'available')
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
        // console.log(status,'unavailable')
      }

      slots.push({ time: formattedSlotTime, status });
    }

    return slots;
  }

  showWarningDialog = false;
  unavailableStartDate: string = '';
  unavailableEndDate: string = '';
  conflictingSlots: any[] = [];

 

  checkFutureAppointments() {
    const selectedDoctorIds = this.unavailableDoctorList.filter(d => d.selected).map(d => d.id);
    if (!selectedDoctorIds.length || !this.unavailableStartDate || !this.unavailableEndDate) {
      alert('Please select doctors and date range.');
      return;
    }
  
    this.doctorService.getBulkFutureBookedSlots(this.unavailableStartDate, this.unavailableEndDate, selectedDoctorIds)
      .subscribe((response: any[]) => {
        if (response.length > 0) {
          this.conflictingSlots = response.map(slot => {
            const doctor = this.unavailableDoctorList.find(doc => doc.id === slot.doctorId);
            return {
              ...slot,
              doctorName: doctor ? doctor.name : `Doctor ID ${slot.doctorId}`
            };
          });
          this.showWarningDialog = true;
        } else {
          this.confirmBulkUpdate(selectedDoctorIds);
        }
      });
  }
  
  confirmBulkUpdate(doctorIds: number[]) {
    this.doctorService.setUnavailableForDoctors({
      doctorIds,
      startDate: this.unavailableStartDate,
      endDate: this.unavailableEndDate
    }).subscribe(() => {
      this.closeDialog();
      this.fetchDoctors();
      alert('Unavailable dates updated.');
    });
  }
  
  closeDialog() {
    this.showDialog = false;
  }
  openDialog(){
    this.showDialog = true;
    this.unavailableStartDate = '';
    this.unavailableEndDate = '';
    this.conflictingSlots = [];
    console.log(this.unavailableDoctorList)
  }





closeDoctorDropdown() {
  setTimeout(() => this.showDoctorDropdown = false, 150); // Allow checkbox clicks to register
}


showDialog = false;
showDoctorDropdown = false;
doctorSearch = '';


get selectedDoctorNames(): string[] {
  return this.unavailableDoctorList.filter(d => d.selected).map(d => d.name);
}

toggleDoctorDropdown() {
  this.showDoctorDropdown = !this.showDoctorDropdown;
}

handleBlur(event: FocusEvent) {
  // Optional: You can close if the new focus is outside your dropdown
  const relatedTarget = event.relatedTarget as HTMLElement;
  if (!relatedTarget || !relatedTarget.closest('.multi-select-container')) {
    this.showDoctorDropdown = false;
  }
}

toggleDoctorSelection(doctor: any) {
  doctor.selected = !doctor.selected;
}

filteredUnavailableDoctors(): any[] {
  if (!this.doctorSearch.trim()) return this.unavailableDoctorList;
  return this.unavailableDoctorList.filter(d =>
    d.name.toLowerCase().includes(this.doctorSearch.toLowerCase())
  );
}

selectAllDoctors() {
  this.filteredUnavailableDoctors().forEach(d => d.selected = true);
}

deselectAllDoctors() {
  this.filteredUnavailableDoctors().forEach(d => d.selected = false);
}


}