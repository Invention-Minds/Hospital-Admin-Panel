import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Doctor } from '../../models/doctor.model';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-doctor-overview',
  templateUrl: './doctor-overview.component.html',
  styleUrls: ['./doctor-overview.component.css'],
  providers:[MessageService]
})
export class DoctorOverviewComponent implements OnInit {
  constructor(private router: Router, private doctorService: DoctorServiceService, private messageService: MessageService) {}

  activeComponent: string = 'availability';
  isEditMode: boolean = false;
  role: string = '';  // User role
  isLoading:boolean=false;
  subAdminType: string = ''; // Sub-admin type
  employeeId: string = ''; // Employee ID
  ngOnInit(): void {
    // Fetch role from localStorage or the authentication service
    this.role = localStorage.getItem('role') || '';  // You can also fetch this from a service
    this.subAdminType = localStorage.getItem('subAdminType') || ''; // Fetch sub-admin type from localStorage
    this.employeeId = localStorage.getItem('employeeId') || ''; // Fetch employee ID from localStorage
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
    if (this.role === 'admin' || this.role === 'sub_admin' || this.role === 'super_admin') {
      this.activeComponent = 'availability';
    } else {
      console.error('Access denied: Only admin can view doctor availability.');
    }
  }

  showDoctorDetails() {
    if (this.role === 'admin' || this.role === 'super_admin' || this.role === 'sub_admin') {
      this.activeComponent = 'details';
    } else {
      console.error('Access denied: Only sub_admin or admin can view doctor details.');
    }
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

  showAppointments(){
    if(this.role === 'admin' || this.role === 'super_admin'){
      this.activeComponent = 'appointments'
    }
  }

  // Save doctor (either add new or update existing)
  onSaveDoctor(doctor: Doctor): void {
    console.log('save')
    this.isLoading = true;
    // console.log('Doctor to save:', doctor);
    doctor.slotDuration = Number(doctor.slotDuration);
    if (!doctor.departmentName || !doctor.departmentId) {
      console.error('Department must be selected.');
      return;
    }
    console.log(doctor)
    // if (!doctor.name || !doctor.email || !doctor.phone_number || !doctor.departmentName || !doctor.qualification || !doctor.availableFrom || !doctor.slotDuration) {
    //   console.error('All fields are required.');
    //   return;
    // }
    if (this.activeComponent === 'form' && !this.isEditMode) {
      // Logic to add the new doctor
      this.doctorService.createDoctor(doctor).subscribe(
        () => {
          this.isLoading = false;
          doctor.slotDuration = Number(doctor.slotDuration); // Convert slot duration to number
          // console.log('New doctor saved successfully:', doctor);
          this.messageService.add({severity:'success', summary:'Success', detail:'Doctor added successfully'});
          // Redirect or update UI after successful save
          this.activeComponent = ''; // Close the form after save

        },
        (error) => {
          console.error('Error saving new doctor:', error);
          this.isLoading = false;
        }
      );
      
    } else if (this.isEditMode) {
      this.isLoading = true;
      // Logic to update the existing doctor
      console.log(doctor)
      const {bookedSlots, ...rest} = doctor;
      this.doctorService.updateDoctor(rest).subscribe(
        () => {
          // console.log('Doctor updated successfully:', doctor);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Doctor details updated successfully' });
          // Redirect or update UI after successful update
          this.activeComponent = ''; // Close the form after update
          this.isLoading = false;
        },
        (error) => {
          console.error('Error updating doctor:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error in updating doctor details' });
          this.isLoading = false;
        }
      );
    }
  }

  // Cancel the form action
  onCancelForm(): void {
    this.activeComponent = 'details'; // Hide the form component on cancel
  }
}
