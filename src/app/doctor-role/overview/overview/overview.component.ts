import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Doctor } from '../../../models/doctor.model';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { TodayConsultationsComponent } from "../../today-consultations/today-consultations/today-consultations.component";
import { FutureConsultationsComponent } from "../../future-consultations/future-consultations/future-consultations.component";

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
 
})
export class OverviewComponent implements OnInit {
  constructor(private router: Router, private doctorService: DoctorServiceService, private messageService: MessageService) {}

  activeComponent: string = 'availability';
  isEditMode: boolean = false;
  role: string = '';  // User role
  ngOnInit(): void {
    // Fetch role from localStorage or the authentication service
    this.role = localStorage.getItem('role') || '';  // You can also fetch this from a service
    // console.log('User role:', this.role);
  }
  newDoctor: Doctor = {
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
      sat: false,
    },
    availableFrom: '',
    slotDuration: 20,
    availability: [],
    doctorType: 'Regular'
  };
  showDoctorAvailability() {
   
      this.activeComponent = 'availability';

  }

  showDoctorDetails() {
    this.activeComponent = 'details'
  }

  showDoctorForm() {
    if (this.role === 'admin'|| this.role === 'super_admin' || this.role === 'sub_admin') {
      this.activeComponent = 'form';
    } else {
      console.error('Access denied: Only sub_admin or admin can add a new doctor.');
    }
  }
  setActiveComponent(componentName: string): void {
    this.activeComponent = componentName;
  }

  // Save doctor (either add new or update existing)
  onSaveDoctor(doctor: Doctor): void {
    // console.log('Doctor to save:', doctor);
    doctor.slotDuration = Number(doctor.slotDuration);
    if (!doctor.departmentName || !doctor.departmentId) {
      console.error('Department must be selected.');
      return;
    }
    // if (!doctor.name || !doctor.email || !doctor.phone_number || !doctor.departmentName || !doctor.qualification || !doctor.availableFrom || !doctor.slotDuration) {
    //   console.error('All fields are required.');
    //   return;
    // }
    if (this.activeComponent === 'form' && !this.isEditMode) {
      // Logic to add the new doctor
      this.doctorService.createDoctor(doctor).subscribe(
        () => {
          doctor.slotDuration = Number(doctor.slotDuration); // Convert slot duration to number
          // console.log('New doctor saved successfully:', doctor);
          this.messageService.add({severity:'success', summary:'Success', detail:'Doctor added successfully'});
          // Redirect or update UI after successful save
          this.activeComponent = ''; // Close the form after save

        },
        (error) => {
          console.error('Error saving new doctor:', error);
        }
      );
      
    } else if (this.isEditMode) {
      // Logic to update the existing doctor
      this.doctorService.updateDoctor(doctor).subscribe(
        () => {
          // console.log('Doctor updated successfully:', doctor);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Doctor details updated successfully' });
          // Redirect or update UI after successful update
          this.activeComponent = ''; // Close the form after update
        },
        (error) => {
          console.error('Error updating doctor:', error);
        }
      );
    }
  }

  // Cancel the form action
  onCancelForm(): void {
    this.activeComponent = 'details'; // Hide the form component on cancel
  }
}
