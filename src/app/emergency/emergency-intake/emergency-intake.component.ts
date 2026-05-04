import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmergencyService } from '../../services/emergency.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-emergency-intake',
  templateUrl: './emergency-intake.component.html',
  styleUrls: ['./emergency-intake.component.css']
})
export class EmergencyIntakeComponent implements OnInit {
  emergencyForm!: FormGroup;
  loading = false;
  triageCategories = [
    { label: 'Critical (Red)', value: 'red' },
    { label: 'Urgent (Yellow)', value: 'yellow' },
    { label: 'Stable (Green)', value: 'green' },
    { label: 'Deceased (Black)', value: 'black' }
  ];

  roomTypes = ['general', 'semi-private', 'private', 'ICU', 'HDU'];

  constructor(
    private fb: FormBuilder,
    private emergencyService: EmergencyService,
    private messageService: MessageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.emergencyForm = this.fb.group({
      prn: ['', Validators.required],
      triageCategory: ['', Validators.required],
      presentingComplaint: ['', Validators.required],
      abcdeAssessment: ['', Validators.required],
      traumaScore: [''],
      vitalsBP: ['', Validators.required],
      vitalsHR: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      vitalsRR: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      vitalsSpO2: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      vitalsTemp: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      proceduresDone: ['']
    });
  }

  onSubmit(): void {
    if (this.emergencyForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    this.loading = true;
    const formData = {
      ...this.emergencyForm.value,
      status: 'arrived',
      docmindsCreated: true,
      hmisCreated: false
    };

    this.emergencyService.createEmergencyCase(formData).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Emergency case created. PRN: ${response.prn}`
        });
        this.router.navigate([`/emergency/${response.id}`]);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to create emergency case'
        });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  resetForm(): void {
    this.emergencyForm.reset();
  }
}
