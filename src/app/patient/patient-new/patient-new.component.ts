import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PatientService, CreatePatientPayload } from '../../services/patient.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import Swal from 'sweetalert2';

/**
 * Phase 1 — Patient registration form.
 *
 * Ported from the Docminds-Clinic patient-new with NABH AAC.2 / PRE.1
 * enhancements: next-of-kin, clinical baselines, communication preference,
 * patient-rights consent (signed via <app-e-sign>), inline phone-duplicate
 * lookup.
 *
 * Auto-fill behaviours preserved from the original:
 *   • prefix → gender
 *   • DOB → age
 *   • pincode (6 digits) → state/district/city/area/country via /whatsapp/pincode/:pin
 *   • blood group → Rh
 */
@Component({
  selector: 'app-patient-new',
  templateUrl: './patient-new.component.html',
  styleUrls: ['./patient-new.component.css'],
})
export class PatientNewComponent implements OnInit {
  @ViewChild('form') form!: NgForm;

  isLoading = false;
  duplicateChecking = false;
  duplicateFound: { name?: string; prn?: number } | null = null;
  successMessage = '';
  errorMessage = '';

  // Two-step flow: 1 = demographics form, 2 = patient-rights consent capture.
  step: 1 | 2 = 1;
  consentVersion = 'pr-1.0';
  consentText = `I acknowledge that I have been informed of my rights and responsibilities as a patient at this hospital, including the right to respectful care, privacy, informed consent before any procedure, access to my medical records, and the option of a second opinion. I agree to provide accurate information about my health and to follow the agreed care plan.`;
  consentSignatureId: string | null = null;

  formData: PatientFormState = freshFormState();

  currentYear = new Date().getFullYear();
  maxDate: Date = new Date();

  private phoneInput$ = new Subject<string>();

  constructor(
    private http: HttpClient,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    // Inline duplicate-check on phone change (debounced).
    this.phoneInput$
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((phone) => this.checkDuplicate(phone));
  }

  // ─── Auto-fill helpers ─────────────────────────────────────────────────
  onDOBChange(): void {
    if (this.formData.dob) {
      const birthDate = new Date(this.formData.dob);
      if (!Number.isNaN(birthDate.getTime())) {
        const today = new Date();
        let ageYears = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageYears--;
        this.formData.age = ageYears >= 0 ? String(ageYears) : '';
      }
    }
  }

  onPincodeChange(): void {
    const pin = this.formData.pin;
    if (pin && pin.length === 6) {
      this.http
        .get<any>(`https://api.postalpincode.in/pincode/${pin}`)
        .subscribe({
          next: (res) => {
            if (res?.[0]?.Status === 'Success') {
              const po = res[0].PostOffice?.[0];
              if (po) {
                this.formData.state = po.State;
                this.formData.district = po.District;
                this.formData.city = po.Block;
                this.formData.area = po.Name;
                this.formData.country = po.Country;
              }
            }
          },
          error: (err) => {
            // Auto-fill is convenience, not critical — log so failures aren't fully silent.
            console.error('Pincode lookup failed:', err);
          },
        });
    }
  }

  onPrefixChange(): void {
    switch (this.formData.prefix) {
      case 'Mr.':
      case 'Master':
        this.formData.gender = 'male';
        break;
      case 'Mrs.':
      case 'Ms.':
      case 'Miss':
      case 'Baby Of.':
        this.formData.gender = 'female';
        break;
      default:
        this.formData.gender = '';
    }
  }

  onMobileChange(value: string): void {
    this.duplicateFound = null;
    if (value && value.length >= 10) {
      this.phoneInput$.next(value);
    }
  }

  private checkDuplicate(phone: string): void {
    this.duplicateChecking = true;
    this.patientService.findByPhone(phone).subscribe({
      next: (existing) => {
        this.duplicateChecking = false;
        if (existing) {
          this.duplicateFound = { name: existing.name, prn: existing.prn };
        }
      },
      error: () => {
        this.duplicateChecking = false;
      },
    });
  }

  // ─── Step 1 → step 2 transition ────────────────────────────────────────
  proceedToConsent(): void {
    this.errorMessage = '';
    if (!this.isStep1Complete()) {
      this.errorMessage = 'Please fill all required fields in red.';
      this.form.control.markAllAsTouched();
      return;
    }
    // A duplicate phone is no longer a hard stop — the inline warning informs
    // the user, and submit will ask for explicit "create anyway?" confirmation
    // (warn-but-allow, e.g. family members sharing a number).
    this.step = 2;
  }

  backToForm(): void {
    this.step = 1;
  }

  onConsentSigned(resp: SignatureCreateResponse): void {
    this.consentSignatureId = resp.id;
    this.submitForm();
  }

  // ─── Submit ─────────────────────────────────────────────────────────────
  submitForm(allowDuplicatePhone = false): void {
    if (!this.consentSignatureId) {
      this.errorMessage = 'Please sign the patient-rights acknowledgement to continue.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';

    const fullName = this.formData.prefix
      ? `${this.formData.prefix} ${this.formData.name}`.trim()
      : this.formData.name.trim();

    const payload: CreatePatientPayload = {
      name: fullName,
      prefix: this.formData.prefix,
      gender: this.formData.gender,
      dob: this.formData.dob,
      age: this.formData.age,

      phoneNumber: this.formData.mobileNo,
      contactNo: this.formData.contactNo,
      email: this.formData.email,
      address: this.formData.address,
      pin: this.formData.pin,
      area: this.formData.area,
      city: this.formData.city,
      district: this.formData.district,
      state: this.formData.state,
      country: this.formData.country,

      aadharNo: this.formData.aadharNo,
      pan: this.formData.pan,
      passportNo: this.formData.passportNo,
      foreignNational: this.formData.foreignNational,

      fatherOrSpouse: this.formData.fatherOrSpouse,
      motherName: this.formData.motherName,
      religion: this.formData.religion,
      occupation: this.formData.occupation,
      vipPatient: this.formData.vipPatient,
      patientType: this.formData.patientType,
      source: this.formData.patientType, // backend `source` field

      bloodGroup: this.formData.bloodGroup,
      knownAllergies: this.formData.knownAllergies,
      chronicConditions: this.formData.chronicConditions,
      currentMedications: this.formData.currentMedications,

      nextOfKinName: this.formData.nextOfKinName,
      nextOfKinRelation: this.formData.nextOfKinRelation,
      nextOfKinPhone: this.formData.nextOfKinPhone,

      preferredLanguage: this.formData.preferredLanguage,
      preferredCommChannel: this.formData.preferredCommChannel,

      consentVersionAccepted: this.consentVersion,
      consentSignatureId: this.consentSignatureId,
      allowDuplicatePhone,
    };

    this.patientService.create(payload).subscribe({
      next: (patient) => {
        this.isLoading = false;
        this.successMessage = `Patient registered successfully — PRN ${patient.prn}`;
        // Reset for the next registration after a short delay.
        setTimeout(() => this.resetForm(), 2000);
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.status === 409 && err?.error?.duplicatePhone) {
          // Warn but allow — let the user create a separate patient on confirm.
          const existingName = err?.error?.patient?.name || 'an existing patient';
          Swal.fire({
            title: 'Duplicate phone number',
            text: `This phone number already belongs to ${existingName}. Create a separate patient anyway?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Create anyway',
            cancelButtonText: 'Cancel',
          }).then((result) => {
            if (result.isConfirmed) {
              this.submitForm(true);
            }
            // On cancel: do nothing. isLoading already reset above.
          });
        } else if (err?.status === 409) {
          this.errorMessage = `A patient with this phone number already exists (PRN ${err?.error?.patient?.prn}). Open the existing record instead.`;
          this.step = 1;
        } else {
          this.errorMessage = err?.error?.message || 'Failed to register patient. Please try again.';
        }
      },
    });
  }

  resetForm(): void {
    this.form?.resetForm();
    this.formData = freshFormState();
    this.consentSignatureId = null;
    this.step = 1;
    this.duplicateFound = null;
    this.successMessage = '';
    this.errorMessage = '';
  }

  // ─── Validation ────────────────────────────────────────────────────────
  isStep1Complete(): boolean {
    // Required for clinical operations and NABH AAC.2 / PRE.1 minimum.
    // Aadhar / PAN / mother name / religion / occupation are NOT required.
    const required: Array<keyof PatientFormState> = [
      'prefix',
      'name',
      'gender',
      'dob',
      'age',
      'mobileNo',
      'address',
      'pin',
      'city',
      'state',
      'country',
      'bloodGroup',
      'patientType',
      'nextOfKinName',
      'nextOfKinRelation',
      'nextOfKinPhone',
      'preferredCommChannel',
      'preferredLanguage',
    ];
    return required.every((f) => {
      const v = this.formData[f];
      return v !== null && v !== undefined && String(v).trim() !== '';
    });
  }
}

interface PatientFormState {
  prn: string;
  prefix: string;
  name: string;
  gender: string;
  dob: string;
  age: string;
  mobileNo: string;
  contactNo: string;
  email: string;
  address: string;
  pin: string;
  area: string;
  city: string;
  district: string;
  state: string;
  country: string;
  bloodGroup: string;
  patientType: string;
  foreignNational: boolean;
  vipPatient: boolean;
  fatherOrSpouse: string;
  motherName: string;
  aadharNo: string;
  pan: string;
  passportNo: string;
  religion: string;
  occupation: string;

  // NABH additions
  knownAllergies: string;
  chronicConditions: string;
  currentMedications: string;
  nextOfKinName: string;
  nextOfKinRelation: string;
  nextOfKinPhone: string;
  preferredLanguage: string;
  preferredCommChannel: string;
}

function freshFormState(): PatientFormState {
  return {
    prn: '',
    prefix: '',
    name: '',
    gender: '',
    dob: '',
    age: '',
    mobileNo: '',
    contactNo: '',
    email: '',
    address: '',
    pin: '',
    area: '',
    city: '',
    district: '',
    state: '',
    country: '',
    bloodGroup: '',
    patientType: '',
    foreignNational: false,
    vipPatient: false,
    fatherOrSpouse: '',
    motherName: '',
    aadharNo: '',
    pan: '',
    passportNo: '',
    religion: '',
    occupation: '',

    knownAllergies: '',
    chronicConditions: '',
    currentMedications: '',
    nextOfKinName: '',
    nextOfKinRelation: '',
    nextOfKinPhone: '',
    preferredLanguage: 'en',
    preferredCommChannel: 'sms',
  };
}
