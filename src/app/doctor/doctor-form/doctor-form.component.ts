import { Component, OnInit, Input,Output,EventEmitter } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-doctor-form',
  templateUrl: './doctor-form.component.html',
  styleUrl: './doctor-form.component.css'
})
export class DoctorFormComponent implements OnInit {
  @Input() doctor: Doctor | null = null;  // The doctor to be edited
  @Output() save = new EventEmitter<Doctor>();  // Emits when the form is saved
  @Output() cancel = new EventEmitter<void>();  // Emits when the edit is canceled

  // Define the days with a type assertion to ensure that only valid days are used
  availabilityDaysList: (keyof Doctor['availabilityDays'])[] = [
    'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'
  ];

  constructor(private doctorService: DoctorServiceService) {}

  
ngOnInit(): void {
    // Subscribe to the doctor data from the service
 console.log('doctor',this.doctor);
  }

  // Method to save the doctor form data
  saveDoctor(): void {
    if (this.doctor) {
      this.save.emit(this.doctor);  // Emit the updated doctor details
    }
  }

  // Method to cancel editing
  cancelEdit(): void {
    this.cancel.emit();
  }
}
