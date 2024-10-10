import { Component, OnInit } from '@angular/core';
import { Doctor } from '../../models/doctor.model';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { ChangeDetectorRef } from '@angular/core';

interface Department {
  id:number;
  name: string;
  doctors?: Doctor[];
}

@Component({
  selector: 'app-doctor-details',
  templateUrl: './doctor-details.component.html',
  styleUrls: ['./doctor-details.component.css']
})
export class DoctorDetailsComponent implements OnInit {
  departments: Department[] = [];
  selectedDepartment: string = '';
  selectedDoctor: string = '';
  isEditMode: boolean = false; 
  selectedEditDoctor: Doctor | null = null;
  showUnavailableModal: boolean = false;
  selectedUnavailableDates: string[] = [];

  constructor(private doctorService: DoctorServiceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // this.fetchDoctors(); // Fetch all doctors when the component initializes
    // console.log('Doctor details component initialized');
    // this.fetchDepartments();
    this.fetchDepartmentsAndDoctors(); // Fetch all departments and doctors
  }
  // Fetch all departments and doctors from the backend
  fetchDepartmentsAndDoctors(): void {
    // Fetch departments
    this.doctorService.getDepartments().subscribe(
      (departments: Department[]) => {
        this.departments = departments.map(dep => ({
          ...dep,
          doctors: [] // Initialize empty doctors array
        }));
        
        // Fetch doctors and link them to departments
        this.fetchDoctors();
      },
      (error) => {
        console.error('Error fetching departments:', error);
      }
    );
  }

  fetchDoctors(): void {
    this.doctorService.getDoctors().subscribe(
      (doctors: Doctor[]) => {
        doctors.forEach((doctor) => {
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
          // Map availability to availabilityDays
          doctor.availability?.forEach((avail) => {
            doctor.availabilityDays[avail.day] = true;
          });
          console.log('Doctors available days', doctor.availabilityDays);
        });
  
        this.departments = this.groupDoctorsByDepartment(doctors);
        console.log('Doctors fetched and grouped successfully', this.departments);
      },
      (error) => {
        console.error('Error fetching doctors:', error);
      }
    );
  }
  
  // fetchDepartments(): void {
  //   this.doctorService.getDepartments().subscribe((departments: Department[]) => {
  //     this.departments = departments;
  //     console.log('Departments fetched successfully', this.departments);
  //   });
  // }
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
  
    if (this.selectedDoctor) {
      filteredDepartments = filteredDepartments
        .map((dep: Department) => ({
          ...dep,
          doctors: (dep.doctors ?? []).filter((doc: Doctor) => doc.name === this.selectedDoctor) // Use `??` to provide a fallback if `doctors` is `undefined`
        }))
        .filter((dep: Department) => (dep.doctors?.length ?? 0) > 0);
        
    }
  
    return filteredDepartments;
  }
  
  

// Get doctors for selected department for doctor dropdown
getDoctorsForSelectedDepartment(): Doctor[] {
  if (this.selectedDepartment) {
    const department = this.departments.find((dep: Department) => dep.name === this.selectedDepartment);
    // Add a fallback to an empty array if 'doctors' is undefined
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
      console.log('Selected doctor availability days:', this.selectedEditDoctor.availabilityDays);
    }
  
    this.isEditMode = true;
    this.cdr.detectChanges();
  }
  

  // Handle saving the edited doctor
  onSaveDoctor(updatedDoctor: Doctor): void {
    if (this.isEditMode && this.selectedEditDoctor) {
      this.doctorService.updateDoctor(updatedDoctor).subscribe(
        () => {
          updatedDoctor.slotDuration = Number(updatedDoctor.slotDuration);
          this.fetchDepartmentsAndDoctors(); // Refresh the list of doctors
          this.isEditMode = false;
          this.selectedEditDoctor = null;
        },
        (error) => {
          console.error('Error updating doctor:', error);
        }
      );
    } else {
       // Find the department ID based on the name provided
    const department = this.departments.find(dep => dep.name === updatedDoctor.departmentName);
    if (department) {
      updatedDoctor.departmentId = department.id;

      this.doctorService.createDoctor(updatedDoctor).subscribe(
        () => {
          updatedDoctor.slotDuration = Number(updatedDoctor.slotDuration);

          this.fetchDepartmentsAndDoctors(); // Refresh the list of doctors
          this.selectedEditDoctor = null;
          console.log('Doctor created successfully');
        },
        (error) => {
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

  // Add unavailable date
  addUnavailableDate(event: any): void {
    const selectedDate = event.target.value;
    if (selectedDate && !this.selectedUnavailableDates.includes(selectedDate)) {
      this.selectedUnavailableDates.push(selectedDate);
    }
  }

  // Save unavailable dates
  saveUnavailableDates(): void {
    if (this.selectedEditDoctor) {
      this.selectedEditDoctor.unavailableDates = [...this.selectedUnavailableDates];
      this.doctorService.updateDoctor(this.selectedEditDoctor).subscribe(
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
