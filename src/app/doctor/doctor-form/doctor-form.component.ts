import { Component, OnInit, Input,Output,EventEmitter } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
  selector: 'app-doctor-form',
  templateUrl: './doctor-form.component.html',
  styleUrl: './doctor-form.component.css'
})
export class DoctorFormComponent implements OnInit {
  @Input() isEditMode: boolean = false;   // Determines if it's for edit or add
  @Input() doctor: Doctor | null = {
    name: '',
  qualification: '',
  department: '',
  mobileNumber: '',
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
  availableTime: '',
  slotTiming: ''
  };  // The doctor to be edited
  @Output() save = new EventEmitter<Doctor>();  // Emits when the form is saved
  @Output() cancel = new EventEmitter<void>();  // Emits when the edit is canceled

  // Define the days with a type assertion to ensure that only valid days are used
  availabilityDaysList: (keyof Doctor['availabilityDays'])[] = [
    'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'
  ];

  constructor(private doctorService: DoctorServiceService) {}

  departmentList: string[] = [
    'General Surgery',
    'Oncology',
    'Orthopedics',
    'Urology',
    'Cardiac Sciences',
    'Neurosciences',
    'Internal Medicine',
    'Obstetrics & Gynecology',
    'Nephrology',
    'Pediatrics and Neonatology',
    'Pulmonology',
    'Ophthalmology',
    'Dental Sciences',
    'ENT Speciality',
    'Psychiatry',
    'Anesthesiology',
    'Emergency Medicine',
    'Nutrition & Dietetics',
    'Lifestyle Medicine',
    'Ayurveda',
    'Homeopathy'
  ];
  departmentSearch: string = '';
  filteredDepartments: string[] = [];
  showDropdown = false;
ngOnInit(): void {
  if (!this.doctor) {
    this.doctor = {
      name: '',
      qualification: '',
      department: '',
      mobileNumber: '',
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
      availableTime: '',
      slotTiming: ''
    };
    // Initialize filtered departments with all departments
    this.filteredDepartments = [...this.departmentList];
  }
    // Subscribe to the doctor data from the service
 console.log('doctor',this.doctor);
 console.log('isEditMode',this.isEditMode);
  }

  // Method to save the doctor form data
  saveDoctor(): void {
    if (this.doctor) {
      this.save.emit(this.doctor);  // Emit the updated doctor details
    }
    this.isEditMode = false;  // Exit the edit mode
  }

  // Method to cancel editing
  cancelEdit(): void {
    this.cancel.emit();
    this.isEditMode = false;  // Exit the edit mode
  }
  filterDepartments(event: any) {
    const query = event.target.value.toLowerCase();
    this.filteredDepartments = this.departmentList.filter(department => 
      department.toLowerCase().includes(query)
    );
    this.showDropdown = this.filteredDepartments.length > 0;
  }

  selectDepartment(department: string) {
    (document.getElementById('departmentInput') as HTMLInputElement).value = department;
    this.showDropdown = false;
  }

  toggleDropdown(show: boolean) {
    setTimeout(() => {
      this.showDropdown = show && this.filteredDepartments.length > 0;
    }, 100); // Delay to avoid immediate blur hiding dropdown before clicking
  }
}
