import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

interface Department {
  id: number;
  name: string;
}

@Component({
  selector: 'app-doctor-form',
  templateUrl: './doctor-form.component.html',
  styleUrls: ['./doctor-form.component.css']
})
export class DoctorFormComponent implements OnInit {
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

  constructor(private doctorService: DoctorServiceService) {}

  ngOnInit(): void {
    // If doctor is null, initialize it for the add new doctor form
    if (!this.doctor) {
      this.initializeDoctor();
    } else {
      this.setDoctorAvailability();
      this.ensureAvailabilityDays();
    }
    this.fetchDepartments();
    // Fetch departments and set the filteredDepartments list
    this.doctorService.getDepartments().subscribe((departments: Department[]) => {
      this.departments = departments;
      console.log('Departments fetched successfully', this.departments);
      this.filteredDepartments = [...this.departments];  // Copy all departments to filtered list
    });

    console.log('doctor', this.doctor);
    console.log('isEditMode', this.isEditMode);
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
      id:0,
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
      availability: [] // Initialize with empty availability
    };
  }

  private setDoctorAvailability(): void {
    if (this.doctor && this.doctor.availability && this.doctor.availability.length > 0) {
      // Loop through the availability array to set available days, available time, and slot duration
      this.doctor.availability.forEach((availability) => {
        if (this.doctor?.availabilityDays) {
          this.doctor.availabilityDays[availability.day] = true;
        }
        this.doctor!.availableFrom = availability.availableFrom; // Set available time
        this.doctor!.slotDuration = availability.slotDuration; // Set slot timing
      });
    }
  }
  fetchDepartments(): void {
    this.doctorService.getDepartments().subscribe((departments: Department[]) => {
      this.departments = departments;
      this.filteredDepartments = [...this.departments];
    });
  }
  updateAvailability(day: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const isChecked = target.checked;
  
    if (this.doctor) {
      this.doctor.availabilityDays[day] = isChecked;
    }
  }
  
  // Method to save the doctor form data
  saveDoctor(): void {
    if (this.doctor) {
      this.save.emit(this.doctor); // Emit the updated doctor details
    }
    this.isEditMode = false; // Exit the edit mode
  }

  // Method to cancel editing
  cancelEdit(): void {
    this.cancel.emit();
    this.isEditMode = false; // Exit the edit mode
  }

  filterDepartments(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredDepartments = this.departments.filter(department =>
      department.name.toLowerCase().includes(query)
    );
    this.showDropdown = this.filteredDepartments.length > 0;
  }
  
  selectDepartment(department: Department): void {
    if (this.doctor) {
      this.doctor.departmentName = department.name;
      this.doctor.departmentId = department.id; 
      this.selectedDepartmentName= this.doctor.departmentName; // Make sure you update the department correctly
      console.log('Selected department:', this.selectedDepartmentName);
    }
    this.departmentSearch = department.name; // Update the input field value
    this.showDropdown = false; // Hide the dropdown after selection
  }
  
  // Toggle the dropdown for department selection
  toggleDropdown(show: boolean): void {
    setTimeout(() => {
      this.showDropdown = show && this.filteredDepartments.length > 0;
    }, 100); // Delay to avoid immediate blur hiding dropdown before clicking
  }
}
