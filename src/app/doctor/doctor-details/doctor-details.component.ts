import { Component, OnInit, Inject } from '@angular/core';
import { Doctor } from '../../models/doctor.model';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import Swal from 'sweetalert2'; // Import SweetAlert2 for confirmation dialog

interface Department {
  id: number;
  name: string;
  doctors?: Doctor[];
}

@Component({
  selector: 'app-doctor-details',
  templateUrl: './doctor-details.component.html',
  styleUrls: ['./doctor-details.component.css'],
  providers: [MessageService]
})
export class DoctorDetailsComponent implements OnInit {
  departments: Department[] = [];
  selectedDepartment: string = '';
  selectedDoctor: string = '';
  isEditMode: boolean = false;
  selectedEditDoctor: Doctor | null = null;
  showUnavailableModal: boolean = false;
  selectedUnavailableDates: string[] = [];
  unavailabilityForm: FormGroup;
  isLoading: boolean = false;
  role: string = '';
  isButtonLoading: boolean = false; // Flag to control button loading state

  constructor(
    private doctorService: DoctorServiceService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.unavailabilityForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.fetchDepartmentsAndDoctors(); // Fetch all departments and doctors
  }
  ngAfterViewInit() {
    const buttons = document.querySelectorAll('button[id^="doctor-btn-"]');
    buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        // console.log('Manually attached event triggered:', event);
      });
    });
  }
  click() {
    console.log('clicked');
    this.isEditMode = true;
  }
  // Method to handle deleting a doctor with a confirmation dialog
  //  deleteDoctor(doctor: Doctor): void {
  //   Swal.fire({
  //     title: 'Are you sure?',
  //     text: `Do you want to delete Dr. ${doctor.name}? This action cannot be undone.`,
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonText: 'Yes, delete it!',
  //     cancelButtonText: 'Cancel'
  //   }).then((result) => {
  //     if (result.isConfirmed) {
  //       // Proceed with deleting the doctor
  //       this.doctorService.deleteDoctor(doctor.id).subscribe(
  //         () => {
  //           Swal.fire('Deleted!', `Dr. ${doctor.name} has been deleted.`, 'success');
  //           this.fetchDepartmentsAndDoctors(); // Refresh the list after deletion
  //         },
  //         (error) => {
  //           console.error('Error deleting doctor:', error);
  //           Swal.fire('Error!', 'An error occurred while deleting the doctor.', 'error');
  //         }
  //       );
  //     } 
  //     // else if (result.dismiss === Swal.DismissReason.cancel) {
  //     //   Swal.fire('Cancelled', 'The doctor is safe :)', 'info');
  //     // }
  //   });
  // }
  doctorToDelete: Doctor | null = null; // Hold the doctor to delete
  showDeleteConfirmDialog: boolean = false; // Control the visibility of the dialog

  // Method to open the delete confirmation dialog
  deleteDoctor(doctor: Doctor): void {
    this.doctorToDelete = doctor;
    this.showDeleteConfirmDialog = true; // Show the dialog
  }

  // Method to handle delete confirmation
  confirmDelete(): void {
    if (this.doctorToDelete) {
      this.doctorService.deleteDoctor(this.doctorToDelete.id).subscribe(
        () => {
          // console.log(`Dr. ${this.doctorToDelete!.name} has been deleted.`);
          this.showDeleteConfirmDialog = false; // Close the dialog
          this.fetchDepartmentsAndDoctors(); // Refresh the list after deletion
        },
        (error) => {
          console.error('Error deleting doctor:', error);
          alert('An error occurred while deleting the doctor.');
        }
      );
    }
  }

  // Method to close the dialog
  closeDeleteDialog(): void {
    this.showDeleteConfirmDialog = false;
  }


  // Fetch all departments and doctors from the backend
  fetchDepartmentsAndDoctors(): void {
    // Fetch departments
    this.isLoading = true;
    this.doctorService.getDepartments().subscribe({

      next: (departments: Department[]) => {
        this.isLoading = false;
        this.departments = departments.map(dep => ({
          ...dep,
          doctors: [] // Initialize empty doctors array
        }));

        // Fetch doctors and link them to departments
        this.fetchDoctors();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error fetching departments:', error);
      },
      complete: () => {
        this.isLoading = false;
        // console.log('Departments retrieval completed.');
      }
    });
  }

  fetchDoctors(): void {
    this.isLoading = true;
    this.doctorService.getDoctors().subscribe({
      next: (doctors: Doctor[]) => {
        const today = new Date();
        const todayDay = this.getDayString(today);
        doctors.forEach((doctor) => {
          // this.isLoading = false;
          // Initialize availabilityDays object if it does not exist
          doctor.availabilityDays = {
            sun: false,
            mon: false,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
          };
          let isAvailableToday = false;
          // Map availability to availabilityDays
          doctor.availability?.forEach((avail) => {
            doctor.availabilityDays[avail.day] = true;
            // console.log('avail.day', avail.day);
            // console.log(avail.day === todayDay, 'in if');

            if (avail.day === todayDay) {
              doctor.availableFrom = avail.availableFrom;
              doctor.slotDuration = avail.slotDuration;
              isAvailableToday = true; // Mark doctor as available today
            }
            // else{
            //   doctor.availableFrom = 'N/A';

            // }
          });
          if (!isAvailableToday) {
            doctor.availableFrom = 'N/A';
            // Clear slotDuration if not available
          }

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
          const dayOfWeek = today.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
          const availableDay = latestAvailability?.find(avail => avail.day.toLowerCase() === dayOfWeek);
          // console.log(availableDay,'AvailableDay')
          doctor.availableFrom = availableDay?.availableFrom ?? 'N/A';
        });


        this.departments = this.groupDoctorsByDepartment(doctors);
        // console.log('Doctors fetched and grouped successfully', this.departments);
      },
      error:
        (error) => {
          this.isLoading = false;
          console.error('Error fetching doctors:', error);
        },
      complete: () => {
        this.isLoading = false;
        // console.log('Doctors retrieval completed.');
      }

    });
  }

  private getDayString(date: Date): keyof Doctor['availabilityDays'] {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[date.getDay()];
  }
  // Group doctors by department
  private groupDoctorsByDepartment(doctors: Doctor[]): Department[] {
    // Create a map of department IDs to departments
    const departmentMap = new Map<number, Department>();
    this.departments.forEach((department) => {
      departmentMap.set(department.id, { ...department, doctors: [] });
    });

    // Iterate over doctors and assign them to the correct department
    doctors.forEach((doctor) => {
      if (doctor.departmentId) {
        const department = departmentMap.get(doctor.departmentId);
        if (department) {
          department.doctors?.push(doctor);
        }
      }
    });

    // Convert the map back to an array of departments
    return Array.from(departmentMap.values());
  }

  getFilteredDoctors(): Department[] {
    let filteredDepartments = this.departments;

    if (this.selectedDepartment) {
      filteredDepartments = filteredDepartments.filter((dep: Department) => dep.name === this.selectedDepartment);
    }
    // console.log('selectedDoctor', this.selectedDoctor);
    if (this.selectedDoctor) {
      filteredDepartments = filteredDepartments
        .map((dep: Department) => ({
          ...dep,
          doctors: (dep.doctors ?? []).filter((doc: Doctor) => doc.name === this.selectedDoctor) // Use `??` to provide a fallback if `doctors` is `undefined`
        }))
        .filter((dep: Department) => (dep.doctors?.length ?? 0) > 0);
    }
    // console.log('filteredDepartments', filteredDepartments);
    return filteredDepartments;
  }



  // Get doctors for selected department for doctor dropdown
  getDoctorsForSelectedDepartment(): Doctor[] {
    if (this.selectedDepartment) {
      const department = this.departments.find((dep: Department) => dep.name === this.selectedDepartment);
      // Add a fallback to an empty array if 'doctors' is undefined
      // console.log('department', department);
      return department ? department.doctors ?? [] : [];

    } else {
      // Use the fallback for 'doctors' in case any department has undefined doctors
      return this.departments.flatMap((department: Department) => department.doctors ?? []);
    }
  }

  // Reset filters
  reset(): void {
    this.selectedDepartment = '';
    this.selectedDoctor = '';
  }

  // Initiate editing a doctor profile
  editProfile(doctor: Doctor): void {
    console.log("true")
    if (!doctor) {
      console.error("No doctor selected for editing.");
      return;
    }

    // console.log("Editing doctor:", doctor);
    this.selectedEditDoctor = { ...doctor }; // Create a copy to avoid direct changes

    // Initialize availabilityDays if it does not exist
    if (!this.selectedEditDoctor.availabilityDays) {
      this.selectedEditDoctor.availabilityDays = {
        sun: false,
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
      };
    }

    // Set availabilityDays based on the available availability data
    if (doctor.availability) {
      doctor.availability.forEach((avail) => {
        this.selectedEditDoctor!.availabilityDays[avail.day] = true;
      });
      // console.log('Selected doctor availability days:', this.selectedEditDoctor.availabilityDays);
    }

    this.isEditMode = true;
    this.cdr.detectChanges();
  }

  // Handle saving the edited doctor
  onSaveDoctor(updatedDoctor: Doctor): void {
    if (this.isEditMode && this.selectedEditDoctor) {
      console.log(updatedDoctor)
      this.isButtonLoading = true; // Start loading state
      const {bookedSlots,unavailableDates, ...rest} = updatedDoctor;
      this.doctorService.updateDoctor(rest).subscribe(
        () => {
          updatedDoctor.slotDuration = Number(updatedDoctor.slotDuration);
          this.fetchDepartmentsAndDoctors(); // Refresh the list of doctors
          this.isEditMode = false;
          this.isButtonLoading = false; // Stop loading state
          this.selectedEditDoctor = null;
        },
        (error) => {
          this.isButtonLoading = false; // Stop loading state
          console.error('Error updating doctor:', error);
        }
      );
    } else {
      this.isButtonLoading = true; // Start loading state
      // Find the department ID based on the name provided
      const department = this.departments.find(dep => dep.name === updatedDoctor.departmentName);
      if (department) {
        updatedDoctor.departmentId = department.id;

        this.doctorService.createDoctor(updatedDoctor).subscribe(
          () => {
            updatedDoctor.slotDuration = Number(updatedDoctor.slotDuration);

            this.fetchDepartmentsAndDoctors(); // Refresh the list of doctors
            this.selectedEditDoctor = null;
            this.isButtonLoading = false;
            // console.log('Doctor created successfully');
          },
          (error) => {
            this.isButtonLoading = false; // Stop loading state
            console.error('Error creating doctor:', error);
          }
        );
      } else {
        console.error('Department not found for the provided name');
      }
    }
  }

  // Cancel editing
  cancelEdit(): void {
    this.isEditMode = false;
    this.selectedEditDoctor = null;
  }

  // Open modal for unavailable dates
  openUnavailableModal(doctor: Doctor): void {
    this.selectedEditDoctor = { ...doctor };
    this.selectedUnavailableDates = doctor.unavailableDates ? [...doctor.unavailableDates] : [];
    this.showUnavailableModal = true;
  }

  // Close modal for unavailable dates
  closeUnavailableModal(): void {
    this.showUnavailableModal = false;
    this.selectedEditDoctor = null;
  }

  // Handle updating the unavailable dates
  // Handle updating the unavailable dates
  onUpdate(): void {
    if (this.unavailabilityForm.valid) {
      const startDate = new Date(this.unavailabilityForm.value.startDate);
      const endDate = new Date(this.unavailabilityForm.value.endDate);

      if (endDate < startDate) {
        console.error('End date must be after start date');
        return;
      }
      // 🏥 Check if the doctor has any booked slots within the selected date range
      const hasFutureAppointments = (this.selectedEditDoctor?.bookedSlots as any[])?.some((slot: any) => {
        const slotDate = new Date(slot.date); // ✅ Ensure `date` exists and is correctly typed
        return slotDate >= startDate && slotDate <= endDate;
      });
      console.log(hasFutureAppointments)

      if (hasFutureAppointments) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Future Appointment Exists',
          detail: 'The doctor has future appointments within the selected range.',
        });
        return;
      }

      const unavailableDates = this.generateDatesBetween(startDate, endDate);

      if (this.selectedEditDoctor) {
        this.doctorService.addUnavailableDates(this.selectedEditDoctor.id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], unavailableDates).subscribe(
          () => {
            this.fetchDoctors(); // Refresh the list of doctors
            this.closeUnavailableModal();
          },
          (error) => {
            console.error('Error updating unavailable dates:', error);
          }
        );
      }
    }
  }
  // New Method to mark dates as available
  markAsAvailable(): void {
    const { startDate, endDate } = this.unavailabilityForm.value;
    const unavailableDates = this.generateDatesBetween(startDate, endDate);
    if (startDate && endDate) {
      this.doctorService.markDatesAsAvailable(this.selectedEditDoctor!.id, startDate, endDate).subscribe(
        () => {
          // Update UI or notify success
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Dates marked as available Successfully' });
          // console.log('Dates marked as available successfully');
          this.closeUnavailableModal();
        },
        error => {
          console.error('Error marking dates as available:', error);
        }
      );
    }
  }

  // Generate all dates between two given dates (inclusive)
  private generateDatesBetween(start: Date, end: Date): string[] {
    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]); // Format as 'YYYY-MM-DD'
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
}
