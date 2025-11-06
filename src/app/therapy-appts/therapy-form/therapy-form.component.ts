import { Component, OnInit, Input } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TherapyService } from '../../services/therapy/therapy.service';
import { MessageService } from 'primeng/api';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

@Component({
  selector: 'app-therapy-form',
  templateUrl: './therapy-form.component.html',
  styleUrl: './therapy-form.component.css',
  providers: [MessageService]
})
export class TherapyFormComponent {
  @Input() serviceData: any = null;
  formData: any = {
    prn: '',
    prefix: 'Mr.',
    name: '',
    phone: '',
    email: '',
    gender: '',
    age: null,
    doctorId: '',
    therapistId: '',
    therapyId: '',
    roomNumber: '',
    date: '',
    time: ''
  };

  therapies: any[] = [];
  therapists: any[] = [];
  timeSlots: string[] = [];
  isLoading = false;
  ayurvedaDoctors: any[] = [];
  availableTimeSlots: string[] = [];
  availableRooms: string[] = [];
  prnSuggestions: boolean = false;
  patients: any[] = []; // List of all patients
  filteredHealthCheckupPRNs: any[] = []; // Filtered PRN list


  roomNumbers: string[] = [
    'Room 101',
    'Room 102',
    'Room 103',
    'Room 104',
    'Room 105',
  ];

  constructor(
    private therapyService: TherapyService,
    private messageService: MessageService,
    private appointmentService: AppointmentConfirmService
  ) { }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadTherapies(),
      this.loadTherapists(),
      this.loadAyurvedaDoctors(),
    ]);

    this.generateTimeSlots();
    this.appointmentService.getAllPatients().subscribe((patients) => {
      this.patients = patients;
    });

    if (this.serviceData) {
      setTimeout(() => this.populateForm(this.serviceData), 300); // small delay ensures lists are loaded
    }
  }

  populateForm(service: any): void {
    this.formData = {
      prn: service.prn.toString() || '',
      prefix: service.prefix || '',
      name: service.name || '',
      phone: service.phone || '',
      email: service.email || '',
      gender: service.gender || '',
      age: service.age || '',
      doctorId: service.doctorId || service.doctor?.id || '',
      therapistId: service.therapistId || service.therapist?.id || '',
      therapyId: service.therapyId || service.therapy?.id || '',
      roomNumber: service.roomNumber || '',
      date: service.date || '',
      time: service.time || '',
    };

    // this.fetchScheduleForSelectedDate();
    this.getAvailableRooms();
    this.getAvailableTherapists();
    this.getAvailableTimeSlots();
    this.onDateChange();
    // this.formData.time = service.time || '';
    this.formData.roomNumber = service.roomNumber || '';
    this.formData.therapistId = service.therapistId || service.therapist?.id || '';
    this.formData.therapyId = service.therapyId || service.therapy?.id || '';
    console.log('✅ Form populated with full data:', this.formData);
  }

  loadTherapies() {
    this.therapyService.getAllTherapies().subscribe({
      next: (res) => (this.therapies = res),
      error: (err) => console.error('Error fetching therapies', err),
    });
  }

  loadTherapists() {
    this.therapyService.getAllTherapists().subscribe({
      next: (res) => (this.therapists = res),
      error: (err) => console.error('Error fetching therapists', err),
    });
  }

  loadAyurvedaDoctors() {
    this.therapyService.getAyurvedaDoctors().subscribe({
      next: (res) => (this.ayurvedaDoctors = res),
      error: (err) => console.error('Error fetching Ayurveda doctors', err),
    });
  }

  generateTimeSlots() {
    const slots: string[] = [];
    let start = 8 * 60; // 8:00 AM
    const end = 18 * 60; // 6:00 PM

    while (start + 75 <= end) {
      const hours = Math.floor(start / 60);
      const minutes = start % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slots.push(timeStr);
      start += 75;
    }

    this.timeSlots = slots;
  }

  onPrefixChange() {
    switch (this.formData.prefix) {
      case 'Mr.':
      case 'Master':
        this.formData.gender = 'Male';
        break;
      case 'Mrs.':
      case 'Ms.':
      case 'Miss':
      case 'Baby Of.':
      case 'Dr.':
        this.formData.gender = 'Female';
        break;
      default:
        this.formData.gender = '';
        break;
    }
  }

  onSubmit(form: NgForm) {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.formData.prn = Number(this.formData.prn);
    this.formData.doctorId = Number(this.formData.doctorId);
    this.formData.therapistId = Number(this.formData.therapistId);
    this.formData.therapyId = Number(this.formData.therapyId);
    this.formData.status = 'confirmed'
    this.formData.id = this.serviceData?.id || null;
    const payload = { ...this.formData };

    // Decide based on presence of ID
    const request$ = this.serviceData?.id
      ? this.therapyService.updateTherapyAppointment(payload.id, payload)
      : this.therapyService.createTherapyAppointment(payload);

    request$.subscribe({
      next: (res) => {
        this.messageService.add({
          severity: "success",
          summary: payload.id ? "Updated" : "Created",
          detail: res.message,
        });
        this.isLoading = false;
        this.resetForm(form);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: err.error?.message || "Operation failed",
        });
        this.isLoading = false;
      },
    });
  }

  resetForm(form: NgForm) {
    form.resetForm({ prefix: 'Mr.' });
  }

  bookedSchedule: any[] = [];



  // // Filter available therapists for selected time
  // getAvailableTherapists(): any[] {
  //   if (!this.formData.time) return this.therapists;
  //   const bookedTherapists = this.bookedSchedule
  //     .filter(a => a.time === this.formData.time)
  //     .map(a => a.therapistId);
  //   return this.therapists.filter(t => !bookedTherapists.includes(t.id));
  // }

  // // Filter available rooms for selected time
  // getAvailableRooms(): string[] {
  //   if (!this.formData.date || !this.formData.time) return [];

  //   const bookedRooms = this.bookedSchedule
  //     .filter(a => a.time === this.formData.time)
  //     .map(a => a.roomNumber);

  //   return this.roomNumbers.filter(r => !bookedRooms.includes(r));
  // }

  // Filter available therapists for selected time
  getAvailableTherapists(): any[] {
    if (!this.formData.time) return this.therapists;

    const bookedTherapists = this.bookedSchedule
      .filter(a => a.time === this.formData.time)
      .map(a => a.therapistId);

    let available = this.therapists.filter(t => !bookedTherapists.includes(t.id));

    // ✅ If editing, ensure the current therapist is included
    if (this.serviceData?.therapistId &&
      !available.some(t => t.id === this.formData.therapistId)) {
      const currentTherapist = this.therapists.find(t => t.id === this.formData.therapistId);
      if (currentTherapist) available = [currentTherapist, ...available];
    }

    return available;
  }


  // Filter available rooms for selected time
  getAvailableRooms(): string[] {
    if (!this.formData.date || !this.formData.time) return [];

    const bookedRooms = this.bookedSchedule
      .filter(a => a.time === this.formData.time)
      .map(a => a.roomNumber);

    let available = this.roomNumbers.filter(r => !bookedRooms.includes(r));

    // ✅ If editing, ensure current room is included
    if (this.serviceData?.roomNumber && !available.includes(this.formData.roomNumber)) {
      available = [this.formData.roomNumber, ...available];
    }

    return available;
  }



  getAvailableTimeSlots(): string[] {
    if (!this.formData.therapistId || !this.formData.date) return [];

    const therapistId = Number(this.formData.therapistId);

    // Get all times already booked for this therapist on that date
    const bookedTimes = this.bookedSchedule
      .filter(a => a.therapistId === therapistId)
      .map(a => a.time);

    // Filter out booked times normally
    let available = this.timeSlots.filter(slot => !bookedTimes.includes(slot));

    // ✅ If we’re editing (serviceData exists), include the current time in dropdown
    if (this.serviceData?.time && !available.includes(this.formData.time)) {
      available = [this.formData.time, ...available];
    }

    return available;
  }


  onTherapistChange() {
    this.formData.time = '';
    this.formData.roomNumber = '';
    this.availableRooms = [];
    this.availableTimeSlots = [];
    if (this.formData.date) this.fetchScheduleForSelectedDate();
  }

  onDateChange() {
    if (!this.serviceData) {
      this.formData.time = '';
      this.formData.roomNumber = '';
      this.availableRooms = [];
      this.availableTimeSlots = [];
    }
    if (this.formData.therapistId) this.fetchScheduleForSelectedDate();
  }

  onTimeChange() {
    this.formData.roomNumber = '';
    this.availableRooms = this.getAvailableRooms();
  }

  fetchScheduleForSelectedDate() {
    const date = this.formData.date;
    if (!date) return;

    this.therapyService.getTherapyScheduleByDate(date).subscribe({
      next: (res) => {
        this.bookedSchedule = res;
        // After fetching schedule, re-evaluate available time slots & rooms
        this.availableTimeSlots = this.getAvailableTimeSlots();
        this.availableRooms = this.getAvailableRooms();
      },
      error: (err) => console.error('Error fetching schedule:', err),
    });
  }
  onHealthCheckupPRNChange() {
    const input = this.formData.prn || '';
    console.log(input)

    if (!input) {
      this.filteredHealthCheckupPRNs = [];
      return;
    }

    // Filter PRN suggestions based on input
    this.filteredHealthCheckupPRNs = this.patients.filter(patient =>
      String(patient.prn).trim().includes(String(input))
    );

    this.prnSuggestions = this.filteredHealthCheckupPRNs.length > 0;
  }

  // Function to handle PRN selection
  selectHealthCheckupPRN(selectedPatient: any) {
    if (!selectedPatient) return;

    // Extract name and remove prefixes
    const nameParts = selectedPatient.name.split(" ");

    const titles = ["Mr.", "Ms.", "Mrs.", "Miss.", "Dr.", "Master", "Baby Of."];
    let prefix = "";
    let firstName = "";
    let lastName = "";

    if (titles.includes(nameParts[0])) {
      prefix = nameParts[0];
      firstName = nameParts[1] || "";
      lastName = nameParts.slice(2).join(" ") || "";
    } else if (nameParts[0] === "Baby" && nameParts[1] === "Of.") {
      prefix = "Baby Of.";
      firstName = nameParts.slice(2).join(" ") || "";
      lastName = ""; // Adjust based on your preference
    } else {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ") || "";
    }

    if (titles.includes(firstName)) {
      firstName = nameParts[1] || "";
      lastName = nameParts.slice(2).join(" ") || "";
    }

    this.formData.prn = selectedPatient.prn.toString() || '';
    this.formData.name = `${firstName} ${lastName}`.trim();
    this.formData.phone = selectedPatient.mobileNo || '';
    this.formData.age = selectedPatient.age ? Number(selectedPatient.age.replace(/\D/g, '')) : null
    this.formData.gender = selectedPatient.gender || '';
    this.formData.email = selectedPatient.email || '';
    this.formData.prefix = prefix || ''
    this.prnSuggestions = false;
  }

}
