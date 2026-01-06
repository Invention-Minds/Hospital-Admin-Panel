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
    therapistIds: [],
    therapyId: '',
    roomNumber: '',
    date: '',
    time: '',
    hasBathing: false
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
  availableTherapists: any[] = [];
  minDate: any;

  selectedTherapy: any = null;
  durationSplitVisible = false;

  calculatedDurations = {
    therapy: 0,
    bath: 0,
    cleaning: 0,
    total: 0
  };


  roomNumbers: string[] = [
    'Room 1',
    'Room 2',
    'Room 3',
    'Room 4',
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
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    this.minDate = `${yyyy}-${mm}-${dd}`;

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
      // therapistId: service.therapistId || service.therapist?.id || '',
      therapyId: service.therapyId || service.therapy?.id || '',
      roomNumber: service.roomNumber || '',
      date: service.date || '',
      time: service.time || '',
      therapistIds: service.therapists?.map((t: any) => t.id) || [],
      hasBathing: service.hasBathing || false,
      therapyDurationMinutes: service.therapyDurationMinutes || 0,
      bathingDurationMinutes: service.bathingDurationMinutes || 0,
      cleaningDurationMinutes: service.cleaningDurationMinutes || 0,
      totalDurationMinutes: service.totalDurationMinutes || 0
    };

    console.log('📝 Populating form with data:', service.totalDurationMinutes);
    // Show previously split durations
    if (service.totalDurationMinutes > 0) {
      this.durationSplitVisible = true;
      this.calculatedDurations = {
        therapy: service.therapyDurationMinutes,
        bath: service.bathingDurationMinutes,
        cleaning: service.cleaningDurationMinutes,
        total: service.totalDurationMinutes
      };
      console.log('✅ Loaded split durations:', this.calculatedDurations);
    }

    this.selectedTherapy = this.therapies.find(t => t.id == this.formData.therapyId);

    // this.fetchScheduleForSelectedDate();
    this.getAvailableRooms();
    // this.getAvailableTherapists();
    this.updateAvailableTherapists()
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
      next: (res) => (this.therapists = res,
        this.updateAvailableTherapists()
      ),

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
    this.formData.therapistIds = this.formData.therapistIds.map((id: any) => Number(id));
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
    this.formData = {
      prn: '',
      prefix: 'Mr.',
      name: '',
      phone: '',
      email: '',
      gender: '',
      age: null,
      doctorId: '',
      therapistIds: [],   // ✔ reset multi-select
      therapyId: '',
      roomNumber: '',
      date: '',
      time: '',
      hasBathing: false
    };

    this.availableRooms = [];
    this.availableTimeSlots = [];
    this.bookedSchedule = [];

    this.durationSplitVisible = false;
    this.calculatedDurations = {
      therapy: 0,
      bath: 0,
      cleaning: 0,
      total: 0
    };

    form.resetForm(this.formData);


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
  // getAvailableTherapists(): any[] {
  //   if (!this.formData.time) return this.therapists;

  //   const bookedTherapists = this.bookedSchedule
  //     .filter(a => a.time === this.formData.time)
  //     .map(a => a.therapistId);

  //   let available = this.therapists.filter(t => !bookedTherapists.includes(t.id));

  //   // ✅ If editing, ensure the current therapist is included
  //   if (this.serviceData?.therapistId &&
  //     !available.some(t => t.id === this.formData.therapistId)) {
  //     const currentTherapist = this.therapists.find(t => t.id === this.formData.therapistId);
  //     if (currentTherapist) available = [currentTherapist, ...available];
  //   }

  //   return available;
  // }
  getAvailableTherapists(): any[] {
    if (!this.formData.time) return this.therapists;

    const bookedTherapists = this.bookedSchedule.flatMap(a =>
      a.therapists?.map((t: any) => t.therapistId) || []
    );
    let available = this.therapists.filter(t => !bookedTherapists.includes(t.id));

    // EDIT MODE: keep selected therapists visible
    if (this.serviceData?.therapists) {
      const editTherapists = this.formData.therapistIds;
      editTherapists.forEach((id: number) => {
        const th = this.therapists.find(x => x.id === id);
        if (th && !available.some(a => a.id === id)) {
          available.unshift(th);
        }
      });
    }

    return available;
  }
  updateAvailableTherapists() {
    let filtered = [...this.therapists];
    // 1️⃣ If time not selected → show all therapists (same as old logic)
    if (this.formData.gender) {
      filtered = filtered.filter(t =>
        t.gender?.toLowerCase() === this.formData.gender.toLowerCase()
      );
    }
    if (!this.formData.time) {
      this.availableTherapists = filtered;
      return;
    }
    // 2️⃣ Get booked therapist IDs for THIS time only (same as old logic)
    const bookedTherapists = this.bookedSchedule
      .filter(a => a.time === this.formData.time)     // ⬅ THIS WAS MISSING
      .flatMap(a => a.therapists?.map((t: any) => t.therapistId) || []);

    // 3️⃣ Filter out booked therapists
    filtered = filtered.filter(t => !bookedTherapists.includes(t.id));

    // 4️⃣ EDIT MODE → keep already selected therapists visible
    if (this.serviceData?.therapists) {
      this.formData.therapistIds.forEach((id: number) => {
        const th = this.therapists.find(t => t.id === id);

        if (th && !filtered.some(a => a.id === id)) {
          filtered.unshift(th);
        }
      });
    }

    this.availableTherapists = filtered;
  }
  onGenderChange() {
    this.formData.therapistIds = [];   // reset selection
    this.updateAvailableTherapists();
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

  // getAvailableTimeSlots(): string[] {
  //   if (!this.formData.therapistIds.length || !this.formData.date) return [];

  //   const therapistIds = this.formData.therapistIds.map((id: any) => Number(id));

  //   const bookedTimes = this.bookedSchedule
  //     .filter(a =>
  //       a.therapists?.some((t: any) => therapistIds.includes(t.therapistId))
  //     )
  //     .map(a => a.time);

  //   let available = this.timeSlots.filter(t => !bookedTimes.includes(t));

  //   // EDIT MODE: keep selected time
  //   if (this.serviceData?.time && !available.includes(this.formData.time)) {
  //     available = [this.formData.time, ...available];
  //   }

  //   return available;
  // }

  getAvailableTimeSlots(): string[] {
    if (!this.formData.therapistIds.length || !this.formData.date) return [];

    const therapistIds = this.formData.therapistIds.map((id: any) => Number(id));

    const bookedTimes = this.bookedSchedule
      .filter(a =>
        a.therapists?.some((t: any) => therapistIds.includes(t.therapistId))
      )
      .map(a => a.time);

    let available = this.timeSlots.filter(t => !bookedTimes.includes(t));

    // ----------------------------------------------------
    // ⏳ FILTER OUT PAST TIMES IF DATE IS TODAY
    // ----------------------------------------------------
    const today = new Date();
    const selected = new Date(this.formData.date);

    const isToday =
      today.getFullYear() === selected.getFullYear() &&
      today.getMonth() === selected.getMonth() &&
      today.getDate() === selected.getDate();

    if (isToday) {
      const nowMinutes = today.getHours() * 60 + today.getMinutes();

      available = available.filter(timeStr => {
        const [hh, mm] = timeStr.split(":").map(Number);
        const slotMinutes = hh * 60 + mm;

        return slotMinutes > nowMinutes; // Only future time slots
      });
    }

    // KEEP CURRENT TIME IN EDIT MODE
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
    if (this.formData.therapistIds.length > 0) this.fetchScheduleForSelectedDate();
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
        console.log('Fetched booked schedule:', this.bookedSchedule);
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
  onTherapyChange() {
    const therapy = this.therapies.find(t => t.id == this.formData.therapyId);
    this.selectedTherapy = therapy || null;

    if (therapy) {
      this.formData.hasBathing = false;   // reset bathing selection
      this.calculateDurations();
    }
  }
  calculateDurations(isEdit: boolean = false) {
    const total = Number(this.formData.totalDurationMinutes);
    if (!total || total <= 0) {
      this.durationSplitVisible = false;
      return;
    }

    let therapy = 0, bath = 0, cleaning = 0;

    if (this.formData.hasBathing) {
      therapy = Math.round(total * 0.70);
      bath = Math.round(total * 0.15);
      cleaning = Math.round(total * 0.15);
    } else {
      therapy = Math.round(total * 0.85);
      cleaning = Math.round(total * 0.15);
      bath = 0;
    }

    // If editing → use saved DB values
    if (isEdit) {
      therapy = this.formData.therapyDurationMinutes || therapy;
      bath = this.formData.bathingDurationMinutes || bath;
      cleaning = this.formData.cleaningDurationMinutes || cleaning;
    }

    this.calculatedDurations = {
      therapy,
      bath,
      cleaning,
      total: therapy + bath + cleaning
    };

    this.durationSplitVisible = true;

    // Save values into formData for backend
    this.formData.therapyDurationMinutes = therapy;
    this.formData.bathingDurationMinutes = bath;
    this.formData.cleaningDurationMinutes = cleaning;
    // this.formData.totalDurationMinutes = therapy + bath + cleaning;
  }



}
