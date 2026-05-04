import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IpdService } from '../../services/ipd.service';
import { WardManagementService } from '../../services/ward-management.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { Router, ActivatedRoute } from '@angular/router';

interface PatientLite { id: number; prn: number; name: string; mobileNo?: string | null; }
interface DoctorLite { id: number; name: string; departmentName?: string | null; }

@Component({
  selector: 'app-ipd-admission',
  templateUrl: './ipd-admission.component.html',
  styleUrls: ['./ipd-admission.component.css']
})
export class IpdAdmissionComponent implements OnInit {
  admissionForm!: FormGroup;
  loading = false;
  wards: any[] = [];
  availableBeds: any[] = [];
  selectedWard: any = null;

  // Patient autocomplete (Sprint manual-test toolkit) — type to search by name or PRN.
  patients: PatientLite[] = [];
  filteredPatients: PatientLite[] = [];
  selectedPatient: PatientLite | null = null;

  // Doctor pickers — admitting (required, drives department) + referring (optional).
  doctors: DoctorLite[] = [];

  admissionTypes = [
    { label: 'Elective', value: 'elective' },
    { label: 'Emergency', value: 'emergency' },
    { label: 'Transfer', value: 'transfer' }
  ];

  roomTypes = [
    { label: 'General', value: 'general' },
    { label: 'Semi-Private', value: 'semi-private' },
    { label: 'Private', value: 'private' },
    { label: 'ICU', value: 'ICU' },
    { label: 'HDU', value: 'HDU' }
  ];

  constructor(
    private fb: FormBuilder,
    private ipdService: IpdService,
    private wardService: WardManagementService,
    private appointmentConfirmService: AppointmentConfirmService,
    private doctorService: DoctorServiceService,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadWards();
    this.loadPatients();
    this.loadDoctors();
  }

  loadPatients(): void {
    this.appointmentConfirmService.getAllPatients().subscribe({
      next: (rows: any) => {
        const list: PatientLite[] = Array.isArray(rows) ? rows : (rows?.data ?? []);
        this.patients = list.map(p => ({
          id: (p as any).id,
          prn: (p as any).prn,
          name: (p as any).name,
          mobileNo: (p as any).mobileNo ?? null,
        })).filter(p => p.prn != null && p.name);
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Patients', detail: 'Failed to load patient list',
        });
      },
    });
  }

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (rows: any[]) => {
        this.doctors = (rows ?? []).map((d: any) => ({
          id: d.id,
          name: d.name,
          departmentName: d.departmentName ?? null,
        }));
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Doctors', detail: 'Failed to load doctor list',
        });
      },
    });
  }

  /** Autocomplete filter — match on name OR PRN. Case-insensitive substring. */
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
    this.admissionForm.patchValue({ prn: String(p.prn) });
  }

  onPatientClear(): void {
    this.selectedPatient = null;
    this.admissionForm.patchValue({ prn: '' });
  }

  /** When the admitting doctor changes, prefill department from the doctor row. */
  onAdmittingDoctorChange(doctorId: number | null): void {
    if (doctorId == null) {
      this.admissionForm.patchValue({ admittingDoctor: '', department: '' });
      return;
    }
    const d = this.doctors.find(x => x.id === doctorId);
    if (d) {
      this.admissionForm.patchValue({
        admittingDoctor: d.name,
        department: d.departmentName ?? this.admissionForm.value.department ?? '',
      });
    }
  }

  /** Referring doctor is optional — clearing is allowed. */
  onReferringDoctorChange(doctorId: number | null): void {
    if (doctorId == null) {
      this.admissionForm.patchValue({ referringDoctor: '' });
      return;
    }
    const d = this.doctors.find(x => x.id === doctorId);
    if (d) this.admissionForm.patchValue({ referringDoctor: d.name });
  }

  initializeForm(): void {
    this.admissionForm = this.fb.group({
      prn: ['', Validators.required],
      admissionDate: [new Date(), Validators.required],
      admissionTime: [this.formatTime(new Date()), Validators.required],
      admissionType: ['', Validators.required],
      // Picker-bound doctor ids (UI). The string `admittingDoctor`/`referringDoctor`
      // names are still on the form (set by onAdmittingDoctorChange) since the
      // backend currently expects names, not ids.
      admittingDoctorId: [null as number | null, Validators.required],
      admittingDoctor: ['', Validators.required],
      department: ['', Validators.required],
      wardId: ['', Validators.required],
      bedId: ['', Validators.required],
      roomType: ['', Validators.required],
      diagnosis: ['', Validators.required],
      referringDoctorId: [null as number | null],
      referringDoctor: [''],
      sourceModule: ['direct']
    });
  }

  loadWards(): void {
    this.wardService.getAllWards().subscribe({
      next: (wards) => {
        this.wards = wards;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load wards'
        });
      }
    });
  }

  onWardChange(wardId: string): void {
    if (!wardId) {
      this.availableBeds = [];
      return;
    }

    this.wardService.getBedsByWard(wardId).subscribe({
      next: (beds) => {
        this.availableBeds = beds.filter(b => b.status === 'available');
        this.admissionForm.patchValue({ bedId: '' });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load available beds'
        });
      }
    });
  }

  onSubmit(): void {
    if (this.admissionForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    this.loading = true;
    const formData = {
      ...this.admissionForm.value,
      admissionDate: this.formatDate(this.admissionForm.get('admissionDate')?.value),
      status: 'admitted'
    };

    this.ipdService.createAdmission(formData).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `IPD admission created. Admission No: ${response.admissionNo}`
        });
        this.router.navigate([`/ipd/${response.id}`]);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to create IPD admission'
        });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatTime(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.getHours().toString().padStart(2, '0') + ':' +
           d.getMinutes().toString().padStart(2, '0');
  }

  resetForm(): void {
    this.admissionForm.reset({
      admissionDate: new Date(),
      admissionTime: this.formatTime(new Date()),
      sourceModule: 'direct'
    });
  }
}
