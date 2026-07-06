import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmergencyService } from '../../services/emergency.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { NurseStaffService } from '../../services/nurse-staff.service';

interface PatientLite {
  id: number;
  prn: number;
  name: string;
  mobileNo?: string | null;
  age?: string | null;
  gender?: string | null;
}

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

  // Patient autocomplete — type to search by name or PRN.
  patients: PatientLite[] = [];
  filteredPatients: PatientLite[] = [];
  selectedPatient: PatientLite | null = null;

  // Staff name pickers — suggest system doctors/nurses but still allow free text
  // (hand-off / receiving staff may be external, e.g. a transfer or locum).
  doctorNames: string[] = [];
  filteredDoctorNames: string[] = [];
  nurseNames: string[] = [];
  filteredNurseNames: string[] = [];

  constructor(
    private fb: FormBuilder,
    private emergencyService: EmergencyService,
    private appointmentConfirmService: AppointmentConfirmService,
    private messageService: MessageService,
    private router: Router,
    private doctorService: DoctorServiceService,
    private nurseStaffService: NurseStaffService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadPatients();
    this.loadStaffNames();
  }

  /** Load doctor + nurse name lists for the hand-off / receiving pickers. */
  private loadStaffNames(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (rows: any[]) => {
        this.doctorNames = (rows ?? [])
          .map((d) => d?.name)
          .filter((n: unknown): n is string => typeof n === 'string' && n.trim().length > 0);
      },
      error: () => { /* leave empty — fields still accept free text */ },
    });
    this.nurseStaffService.list().subscribe({
      next: (res) => {
        this.nurseNames = (res?.data ?? [])
          .map((n) => n.fullName)
          .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
      },
      error: () => { /* leave empty — fields still accept free text */ },
    });
  }

  searchDoctors(event: { query: string }): void {
    const q = (event.query ?? '').trim().toLowerCase();
    this.filteredDoctorNames = q
      ? this.doctorNames.filter((n) => n.toLowerCase().includes(q))
      : this.doctorNames.slice(0, 50);
  }

  searchNurses(event: { query: string }): void {
    const q = (event.query ?? '').trim().toLowerCase();
    this.filteredNurseNames = q
      ? this.nurseNames.filter((n) => n.toLowerCase().includes(q))
      : this.nurseNames.slice(0, 50);
  }

  loadPatients(): void {
    this.appointmentConfirmService.getAllPatients().subscribe({
      next: (rows: any) => {
        const list = Array.isArray(rows) ? rows : (rows?.data ?? []);
        this.patients = list.map((p: any) => ({
          id: p.id, prn: p.prn, name: p.name, mobileNo: p.mobileNo ?? p.contactNo ?? null,
          age: p.age ?? null, gender: p.gender ?? null,
        })).filter((p: PatientLite) => p.prn != null && p.name);
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Patients', detail: 'Failed to load patient list',
        });
      },
    });
  }

  searchPatients(event: { query: string }): void {
    const q = (event.query ?? '').trim().toLowerCase();
    if (!q) {
      this.filteredPatients = this.patients.slice(0, 50);
      return;
    }
    this.filteredPatients = this.patients
      .filter(p => p.name.toLowerCase().includes(q) || String(p.prn).includes(q))
      .slice(0, 50);
  }

  onPatientSelect(p: PatientLite): void {
    this.selectedPatient = p;
    // Auto-fill demographics from the patient master; all remain editable
    // (handles unknown/unconscious patients or stale master records).
    const ageDigits = p.age ? String(p.age).replace(/\D/g, '') : '';
    this.emergencyForm.patchValue({
      prn: String(p.prn),
      patientName: p.name ?? '',
      age: ageDigits ? Number(ageDigits) : null,
      gender: p.gender ?? '',
      phoneNumber: p.mobileNo ?? '',
    });
  }

  onPatientClear(): void {
    this.selectedPatient = null;
    this.emergencyForm.patchValue({
      prn: '', patientName: '', age: null, gender: '', phoneNumber: '',
    });
  }

  initializeForm(): void {
    this.emergencyForm = this.fb.group({
      prn: ['', Validators.required],
      patientName: ['', Validators.required],
      age: [null],
      gender: [''],
      phoneNumber: [''],
      allergies: [''],
      triageCategory: ['', Validators.required],
      presentingComplaint: ['', Validators.required],
      abcdeAssessment: ['', Validators.required],
      traumaScore: [''],
      vitalsBP: ['', Validators.required],
      vitalsHR: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      vitalsRR: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      vitalsSpO2: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      vitalsTemp: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      proceduresDone: [''],
      // Phase 6 — intake form fields per UHJ/EMR/F-01
      modeOfArrival: [''],
      broughtBy: [''],
      historyGivenBy: [''],
      referralFrom: [''],
      referredTo: [''],
      identificationMark: [''],
      policeInformationGiven: [false],
      reasonsForMlc: [''],
      painScore: [''],
      airway: [''],
      breathing: [''],
      circulation: [''],
      mentalStatus: [''],
      pupilsRight: [''],
      pupilsLeft: [''],
      secondarySurvey: [''],
      workingDiagnosis: [''],
      conditionAtDisposition: [''],
      disposition: [''],
      handOffDoctorName: [''],
      receivingDoctorName: [''],
      handOffNurseName: [''],
      receivingNurseName: [''],
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
    const v = this.emergencyForm.value;
    const formData = {
      ...v,
      // `prn` holds the selected patient's master PRN — send it as patientPrn
      // so the backend links the ER case to the Patient record (it generates
      // its own ER case number). Status is derived server-side from disposition.
      patientPrn: v.prn,
      age: v.age != null && v.age !== '' ? Number(v.age) : null,
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
