import { Component, OnInit } from '@angular/core';
import { Doctor } from '../../models/doctor.model';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-inactive-doctors',
  templateUrl: './inactive-doctors.component.html',
  styleUrls: ['./inactive-doctors.component.css'],
  providers: [MessageService]
})
export class InactiveDoctorsComponent implements OnInit {
  inactiveDoctors: Doctor[] = [];
  isLoading: boolean = false;
  doctorToActivate: Doctor | null = null;
  showActivateConfirmDialog: boolean = false;

  constructor(
    private doctorService: DoctorServiceService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.fetchInactiveDoctors();
  }

  fetchInactiveDoctors(): void {
    this.isLoading = true;
    this.doctorService.getInactiveDoctors().subscribe({
      next: (doctors: Doctor[]) => {
        this.inactiveDoctors = doctors || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching inactive doctors:', error);
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load inactive doctors.' });
      }
    });
  }

  openActivateDialog(doctor: Doctor): void {
    this.doctorToActivate = doctor;
    this.showActivateConfirmDialog = true;
  }

  closeActivateDialog(): void {
    this.showActivateConfirmDialog = false;
    this.doctorToActivate = null;
  }

  confirmActivate(): void {
    if (!this.doctorToActivate) return;
    const doctor = this.doctorToActivate;
    this.doctorService.activateDoctor(doctor.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Dr. ${doctor.name} has been activated.` });
        this.showActivateConfirmDialog = false;
        this.doctorToActivate = null;
        this.fetchInactiveDoctors();
      },
      error: (error) => {
        console.error('Error activating doctor:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to activate doctor.' });
      }
    });
  }
}
