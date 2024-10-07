import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-doctor-overview',
  templateUrl: './doctor-overview.component.html',
  styleUrl: './doctor-overview.component.css'
})
export class DoctorOverviewComponent {
  constructor(private router: Router) {}
  activeComponent: string = 'availability';
  isEditMode: boolean = false;
  newDoctor: Doctor = {
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
      sat: false,
    },
    availableTime: '',
    slotTiming: ''
  };
  showDoctorAvailability() {
    this.activeComponent = 'availability';
  }
  showDoctorDetails() {
    this.activeComponent = 'details';
  }
  showDoctorForm() {
    this.activeComponent = 'form';
  }
  onSaveDoctor(doctor: Doctor): void {
    if (this.activeComponent === 'form') {
      // Logic to add the new doctor
      console.log('Saving new doctor:', doctor);
      // Call service to save the doctor or add it to the array
    } else {
      // Handle updating doctor
    }
    this.activeComponent = ''; // Close the form after save
  }
  
  onCancelForm(): void {
    this.activeComponent = ''; // Hide the form component on cancel
  }
  
}
