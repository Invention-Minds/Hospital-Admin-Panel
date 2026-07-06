import { Component, OnInit, Input } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TherapyService } from '../../services/therapy/therapy.service';
import { MessageService } from 'primeng/api';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

interface ConflictResult {
  roomConflicts: {
    room: string;
    start: string;
    end: string;
  }[];
  therapistConflicts: {
    therapistName: string;
    start: string;
    end: string;
  }[];
}


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
    therapyIds: [],
    therapyId: '',
    roomNumber: '',
    date: '',
    time: '',
    hasBathing: false,
    remarks:'',
    totalDays: 1,
    intervalDays: 1
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

  // Per-day editable rows for a multi-day course (date/time/therapist/room).
  dayRows: any[] = [];

  // Conflict popup (MHC-style) for tentative/planned clashes.
  displayConflictDialog = false;
  conflictMessage = '';
  private pendingProceed: (() => void) | null = null;

  calculatedDurations = {
    therapy: 0,
    bath: 0,
    cleaning: 0,
    total: 0
  };


  roomNumbers: string[] = [
    'Room 1541',
    'Room 1542',
    'Room 1543',
    'Room 1545',
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
      therapyIds: service.therapies?.map((t: any) => t.id) || [],
      hasBathing: service.hasBathing || false,
      therapyDurationMinutes: service.therapyDurationMinutes || 0,
      bathingDurationMinutes: service.bathingDurationMinutes || 0,
      cleaningDurationMinutes: service.cleaningDurationMinutes || 0,
      totalDurationMinutes: service.totalDurationMinutes || 0,
      remarks: service.remarks || '',

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
    // time window check (5-min buffer matches the backend's BUFFER_MIN)
    const start = this.toMinutes(this.formData.time);
    const end = start + Number(this.formData.totalDurationMinutes) + 5;

    if (start < 360 || end > 1080) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Time', detail: 'Allowed only 06:00 to 18:00 (buffer included).' });
      return;
    }

    // if (this.hasConflictRange()) {
    //   this.messageService.add({ severity: 'error', summary: 'Conflict', detail: 'Room or therapist already booked in this duration.' });
    //   return;
    // }
    const conflict = this.checkConflictRange();

    if (conflict.roomConflicts.length || conflict.therapistConflicts.length) {

      conflict.roomConflicts.forEach(c => {
        this.messageService.add({
          severity: 'error',
          summary: 'Room Conflict',
          detail: `Room ${c.room} is already booked from ${c.start} to ${c.end}`
        });
      });

      conflict.therapistConflicts.forEach(c => {
        this.messageService.add({
          severity: 'error',
          summary: 'Therapist Conflict',
          detail: `${c.therapistName} is already booked from ${c.start} to ${c.end}`
        });
      });

      return;
    }


    this.isLoading = true;
    this.formData.prn = Number(this.formData.prn);
    this.formData.doctorId = Number(this.formData.doctorId);
    this.formData.therapistIds = this.formData.therapistIds.map((id: any) => Number(id));
    this.formData.status = 'confirmed'
    this.formData.id = this.serviceData?.id || null;

    const therapyIds = this.formData.therapyIds.map((id: any) => Number(id));
    const totalDays = Number(this.formData.totalDays) || 1;
    // Multi-day course (create only) → POST /courses. Otherwise a single appointment.
    const isCourse = !this.serviceData?.id && totalDays > 1;

    let coursePayload: any = null;
    let singlePayload: any = null;

    if (isCourse) {
      if (!this.dayRows.length) this.buildDayRows();

      // Days 2..N (the cards) each need date/time/therapist/room. Day 1 is the
      // top fields, already enforced by the form's `required` validation.
      for (const r of this.dayRows) {
        if (!r.date || !r.time || !r.roomNumber || !r.therapistIds?.length) {
          this.messageService.add({
            severity: 'error',
            summary: `Day ${r.dayNumber} incomplete`,
            detail: 'Date, time, therapist and room are required for every day.',
          });
          this.isLoading = false;
          return;
        }
      }

      // Real (confirmed) clash on any day → cannot book; operator must fix the red days.
      if (this.hasBlockingConflict()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Schedule clash',
          detail: 'One or more days clash with a real booking (red). Change their date/time/therapist/room before booking.',
        });
        this.isLoading = false;
        return;
      }

      const dur = Number(this.formData.totalDurationMinutes);
      const hasBathing = !!this.formData.hasBathing;
      // Day 1 = top fields; Days 2..N = the cards.
      const day1 = {
        plannedDate: this.formData.date,
        time: this.formData.time,
        roomNumber: this.formData.roomNumber,
        totalDurationMinutes: dur,
        hasBathing,
        therapistIds: this.formData.therapistIds.map((id: any) => Number(id)),
        therapyIds,
      };
      const extraDays = this.dayRows.map((r: any) => ({
        plannedDate: r.date,
        time: r.time,
        roomNumber: r.roomNumber,
        totalDurationMinutes: dur,
        hasBathing,
        therapistIds: r.therapistIds.map((id: any) => Number(id)),
        therapyIds,
      }));
      const days = [day1, ...extraDays];

      coursePayload = {
        prn: this.formData.prn,
        prefix: this.formData.prefix,
        name: this.formData.name,
        phone: this.formData.phone,
        email: this.formData.email,
        gender: this.formData.gender,
        age: this.formData.age ? Number(this.formData.age) : null,
        doctorId: this.formData.doctorId,
        remarks: this.formData.remarks || null,
        totalDays: days.length,
        intervalDays: Number(this.formData.intervalDays) || 1,
        startDate: this.formData.date,
        days,
      };
    } else {
      singlePayload = { ...this.formData, therapyIds };
    }

    // `force` is added per attempt: a 409 warning (tentative/planned clash) prompts
    // the operator to proceed, which re-fires with force=true.
    const fire = (force: boolean) => {
      let request$: any;
      if (isCourse) {
        request$ = this.therapyService.createTherapyCourse({ ...coursePayload, force });
      } else if (this.serviceData?.id) {
        request$ = this.therapyService.updateTherapyAppointment(singlePayload.id, singlePayload);
      } else {
        request$ = this.therapyService.createTherapyAppointment({ ...singlePayload, force });
      }

      request$.subscribe({
        next: (res: any) => {
          this.messageService.add({
            severity: "success",
            summary: this.serviceData?.id ? "Updated" : (isCourse ? "Course Created" : "Created"),
            detail: res.message,
          });
          this.isLoading = false;
          this.resetForm(form);
        },
        error: (err: any) => {
          // Soft clash with a tentative (planned) course day → show conflict popup; retry with force on Yes.
          if (err.status === 409 && err.error?.warning && !force) {
            this.isLoading = false;
            this.conflictMessage = err.error.message || 'This slot has a tentative booking. Do you want to proceed?';
            this.pendingProceed = () => {
              this.isLoading = true;
              fire(true);
            };
            this.displayConflictDialog = true;
            return;
          }
          console.error(err);
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: err.error?.message || "Operation failed",
          });
          this.isLoading = false;
        },
      });
    };

    fire(false);
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
      therapyIds: [],
      therapyId: '',
      roomNumber: '',
      date: '',
      time: '',
      hasBathing: false,
      totalDays: 1,
      intervalDays: 1
    };

    this.availableRooms = [];
    this.availableTimeSlots = [];
    this.bookedSchedule = [];
    this.dayRows = [];

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
  // getAvailableRooms(): string[] {
  //   if (!this.formData.date || !this.formData.time) return [];

  //   const bookedRooms = this.bookedSchedule
  //     .filter(a => a.time === this.formData.time)
  //     .map(a => a.roomNumber);

  //   let available = this.roomNumbers.filter(r => !bookedRooms.includes(r));

  //   // ✅ If editing, ensure current room is included
  //   if (this.serviceData?.roomNumber && !available.includes(this.formData.roomNumber)) {
  //     available = [this.formData.roomNumber, ...available];
  //   }

  //   return available;
  // }
  getAvailableRooms(): string[] {
    if (!this.formData.date || !this.formData.time) return [];

    const newStart = this.toMinutes(this.formData.time);
    const newEnd =
      newStart + Number(this.formData.totalDurationMinutes || 0);

    const blockedRooms = new Set<string>();

    this.bookedSchedule.forEach(a => {
      if (!a.roomNumber || !a.totalDurationMinutes) return;

      const existingStart = this.toMinutes(a.time);
      const existingEnd = this.getEndTime(
        a.time,
        a.totalDurationMinutes
      );

      if (this.isOverlap(newStart, newEnd, existingStart, existingEnd)) {
        blockedRooms.add(a.roomNumber);
      }
    });

    let available = this.roomNumbers.filter(
      r => !blockedRooms.has(r)
    );

    // ✅ EDIT MODE: allow current room
    if (
      this.serviceData?.roomNumber &&
      !available.includes(this.formData.roomNumber)
    ) {
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
    // Day 1's therapists cascade to the additional-day cards.
    if (Number(this.formData.totalDays) > 1 && this.dayRows.length) {
      this.dayRows.forEach((r) => (r.therapistIds = [...(this.formData.therapistIds || [])]));
      this.refreshDayAvailability();
    }
  }

  onDateChange() {
    if (!this.serviceData) {
      this.formData.time = '';
      this.formData.roomNumber = '';
      this.availableRooms = [];
      this.availableTimeSlots = [];
    }
    if (this.formData.therapistIds.length > 0) this.fetchScheduleForSelectedDate();
    if (Number(this.formData.totalDays) > 1) this.buildDayRows();
  }

  onTimeChange() {
    this.formData.roomNumber = '';
    this.availableRooms = this.getAvailableRooms();
    this.seedEmptyDayFields();
  }

  // ---- Multi-day per-day editable rows ----
  scheduleByDate: { [date: string]: any[] } = {};
  plannedByDate: { [date: string]: any[] } = {};

  onCourseConfigChange() {
    this.buildDayRows();
  }

  /** Build the ADDITIONAL day cards (Day 2..N). Day 1 is the top form fields.
   *  Dates spaced from the start date by the interval; time/room/therapist seeded
   *  from the top (Day 1). Recomputes dates on rebuild; keeps edited values. */
  buildDayRows() {
    const n = Number(this.formData.totalDays) || 1;
    if (n <= 1) {
      this.dayRows = [];
      return;
    }
    const interval = Number(this.formData.intervalDays) || 1;
    const extra = n - 1; // days 2..N
    const rows: any[] = [];
    for (let i = 0; i < extra; i++) {
      const ex = this.dayRows[i];
      rows.push({
        dayNumber: i + 2,
        date: this.formData.date ? this.addDays(this.formData.date, (i + 1) * interval) : (ex?.date || ''),
        time: ex?.time || this.formData.time || '',
        roomNumber: ex?.roomNumber || this.formData.roomNumber || '',
        therapistIds: ex?.therapistIds?.length ? ex.therapistIds : [...(this.formData.therapistIds || [])],
      });
    }
    this.dayRows = rows;
    this.refreshDayAvailability();
  }

  /** Fill only empty row fields from the top selections (when the operator picks
   *  therapist/time/room AFTER setting the day count). */
  seedEmptyDayFields() {
    if (Number(this.formData.totalDays) <= 1 || !this.dayRows.length) return;
    this.dayRows.forEach((r) => {
      if (!r.time) r.time = this.formData.time || '';
      if (!r.roomNumber) r.roomNumber = this.formData.roomNumber || '';
      if (!r.therapistIds?.length) r.therapistIds = [...(this.formData.therapistIds || [])];
    });
    this.refreshDayAvailability();
  }

  resetDayRows() {
    this.dayRows = [];
    this.buildDayRows();
  }

  onDayRowChange() {
    this.refreshDayAvailability();
  }

  onConflictAccept() {
    this.displayConflictDialog = false;
    const proceed = this.pendingProceed;
    this.pendingProceed = null;
    if (proceed) proceed();
  }

  onConflictReject() {
    this.displayConflictDialog = false;
    this.pendingProceed = null;
  }

  /** Fetch each distinct day's confirmed bookings AND tentative planned days, then flag rows. */
  refreshDayAvailability() {
    const dates = Array.from(new Set(this.dayRows.map((r) => r.date).filter(Boolean)));
    if (!dates.length) {
      this.computeDayFlags();
      return;
    }
    let pending = dates.length * 2;
    const done = () => {
      if (--pending === 0) this.computeDayFlags();
    };
    dates.forEach((d) => {
      this.therapyService.getTherapyScheduleByDate(d).subscribe({
        next: (res) => (this.scheduleByDate[d] = res || []),
        error: () => (this.scheduleByDate[d] = []),
        complete: done,
      });
      this.therapyService.getPlannedDaysByDate(d).subscribe({
        next: (res) => (this.plannedByDate[d] = res || []),
        error: () => (this.plannedByDate[d] = []),
        complete: done,
      });
    });
  }

  /** Detailed overlaps for a slot — returns which therapist/room clashes, when, and the source label. */
  private overlapDetails(
    list: any[], start: number, end: number, roomNumber: string, tIds: number[], type: string
  ): { what: string; when: string; type: string }[] {
    const out: { what: string; when: string; type: string }[] = [];
    (list || []).forEach((a: any) => {
      const aStart = this.toMinutes(a.time);
      const adur = Number(a.totalDurationMinutes || 0);
      const aEnd = aStart + adur + 5;
      if (!this.isOverlap(start, end, aStart, aEnd)) return;
      const when = adur > 0 ? `${a.time}–${this.minutesToTime(aStart + adur)}` : a.time;
      if (a.roomNumber === roomNumber) {
        out.push({ what: roomNumber, when, type });
      }
      const ids = (a.therapists || []).map((t: any) => Number(t.therapistId));
      ids.filter((id: number) => tIds.includes(id)).forEach((id: number) => {
        const name = this.therapists.find((t) => t.id === id)?.name || `Therapist #${id}`;
        out.push({ what: name, when, type });
      });
    });
    return out;
  }

  private dedupeConflicts(list: any[]): any[] {
    const seen = new Set<string>();
    return list.filter((c) => {
      const k = `${c.what}|${c.when}|${c.type}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /** Flag each card: red "busy" for a real booking clash, amber "tentative" for
   *  another course's planned-day clash, else available — with who/when details. */
  private computeDayFlags() {
    const dur = Number(this.formData.totalDurationMinutes) || 0;
    this.dayRows.forEach((row, idx) => {
      row.unavailable = false;
      row.tentative = false;
      row.reason = '';
      row.conflicts = [];
      if (!row.date || !row.time) return;

      const start = this.toMinutes(row.time);
      const end = start + dur + 5; // 5-min post-session buffer (matches backend)
      const tIds = (row.therapistIds || []).map((x: any) => Number(x));

      // Other cards in THIS form on the same date.
      const sameForm = this.dayRows
        .filter((other, j) => j !== idx && other.date === row.date)
        .map((other) => ({
          time: other.time,
          roomNumber: other.roomNumber,
          totalDurationMinutes: dur,
          therapists: (other.therapistIds || []).map((id: any) => ({ therapistId: Number(id) })),
        }));

      const real = [
        ...this.overlapDetails(this.scheduleByDate[row.date] || [], start, end, row.roomNumber, tIds, 'Confirmed'),
        ...this.overlapDetails(sameForm, start, end, row.roomNumber, tIds, 'This course'),
      ];
      if (real.length) {
        row.unavailable = true;
        row.reason = 'Booked';
        row.conflicts = this.dedupeConflicts(real);
        return; // real clash wins
      }

      const planned = this.overlapDetails(this.plannedByDate[row.date] || [], start, end, row.roomNumber, tIds, 'Tentative');
      if (planned.length) {
        row.tentative = true;
        row.reason = 'Tentatively planned';
        row.conflicts = this.dedupeConflicts(planned);
      }
    });
  }

  /** True when any day card has a REAL (confirmed) clash — submit must be blocked.
   *  Tentative (planned) clashes are allowed (handled by the proceed popup). */
  hasBlockingConflict(): boolean {
    return Number(this.formData.totalDays) > 1 && this.dayRows.some((r) => r.unavailable);
  }

  private addDays(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  }

  /** Rooms still free at this card's date+time (booked rooms hidden). Keeps the
   *  current selection visible so it isn't lost. */
  availableRoomsForRow(row: any): string[] {
    if (!row.date || !row.time) return this.roomNumbers;
    const dur = Number(this.formData.totalDurationMinutes) || 0;
    const start = this.toMinutes(row.time);
    const end = start + dur + 5;
    const blocked = new Set<string>();

    (this.scheduleByDate[row.date] || []).forEach((a: any) => {
      if (!a.roomNumber) return;
      const aStart = this.toMinutes(a.time);
      const aEnd = aStart + Number(a.totalDurationMinutes || 0) + 5;
      if (this.isOverlap(start, end, aStart, aEnd)) blocked.add(a.roomNumber);
    });
    // Other cards in this same form on the same date.
    this.dayRows.forEach((o) => {
      if (o === row || o.date !== row.date || !o.roomNumber) return;
      const oStart = this.toMinutes(o.time);
      const oEnd = oStart + dur + 5;
      if (this.isOverlap(start, end, oStart, oEnd)) blocked.add(o.roomNumber);
    });

    let avail = this.roomNumbers.filter((r) => !blocked.has(r));
    if (row.roomNumber && !avail.includes(row.roomNumber)) avail = [row.roomNumber, ...avail];
    return avail;
  }

  /** The card's selected therapists' booked timings on that date (so the operator can avoid them). */
  therapistBusyForRow(row: any): { name: string; slots: string[] }[] {
    if (!row.date || !row.therapistIds?.length) return [];
    const result: { name: string; slots: string[] }[] = [];
    row.therapistIds.forEach((id: any) => {
      const tid = Number(id);
      const therapist = this.therapists.find((t) => t.id === tid);
      if (!therapist) return;
      const slots: string[] = [];
      (this.scheduleByDate[row.date] || []).forEach((a: any) => {
        const ids = (a.therapists || []).map((t: any) => Number(t.therapistId));
        if (!ids.includes(tid)) return;
        const aStart = this.toMinutes(a.time);
        const adur = Number(a.totalDurationMinutes || 0);
        slots.push(adur > 0 ? `${a.time}–${this.minutesToTime(aStart + adur)}` : a.time);
      });
      if (slots.length) result.push({ name: therapist.name, slots });
    });
    return result;
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

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  private getEndTime(start: string, duration: number): number {
    return this.toMinutes(start) + duration;
  }

  private isOverlap(
    startA: number,
    endA: number,
    startB: number,
    endB: number
  ): boolean {
    return startA < endB && endA > startB;
  }

  // private hasConflictRange(): boolean {
  //   if (!this.formData.time || !this.formData.totalDurationMinutes) return false;

  //   const start = this.toMinutes(this.formData.time);
  //   const end = start + Number(this.formData.totalDurationMinutes) + 10;

  //   const selectedTherapists = (this.formData.therapistIds || []).map((x: any) => Number(x));

  //   return (this.bookedSchedule || []).some((appt: any) => {
  //     // ignore self while editing
  //     if (this.serviceData?.id && Number(appt.id) === Number(this.serviceData.id)) return false;

  //     const aStart = this.toMinutes(appt.time);
  //     const aDur = Number(appt.totalDurationMinutes || 0);
  //     const aEnd = aStart + aDur + 10;

  //     const overlaps = start < aEnd && end > aStart;
  //     if (!overlaps) return false;

  //     // same room conflict
  //     if (appt.roomNumber === this.formData.roomNumber) return true;

  //     // therapist conflict
  //     const bookedTherapists = (appt.therapists || []).map((t: any) => Number(t.therapistId));
  //     return bookedTherapists.some((id: number) => selectedTherapists.includes(id));
  //   });
  // }
  checkConflictRange(): ConflictResult {
    const result: ConflictResult = {
      roomConflicts: [],
      therapistConflicts: []
    };

    if (!this.formData.time || !this.formData.totalDurationMinutes) {
      return result;
    }

    const newStart = this.toMinutes(this.formData.time);
    const newEnd = newStart + Number(this.formData.totalDurationMinutes);

    this.bookedSchedule.forEach(a => {
      if (!a.time || !a.totalDurationMinutes) return;

      const existingStart = this.toMinutes(a.time);
      const existingEnd = existingStart + a.totalDurationMinutes;

      if (!this.isOverlap(newStart, newEnd, existingStart, existingEnd)) {
        return;
      }

      // -------- ROOM CONFLICT --------
      if (a.roomNumber === this.formData.roomNumber) {
        result.roomConflicts.push({
          room: a.roomNumber,
          start: a.time,
          end: this.minutesToTime(existingEnd)
        });
      }

      // -------- THERAPIST CONFLICT --------
      const selectedTherapists = this.formData.therapistIds || [];

      a.therapists?.forEach((t: any) => {
        if (selectedTherapists.includes(t.therapistId)) {
          const therapist = this.therapists.find(th => th.id === t.therapistId);

          result.therapistConflicts.push({
            therapistName: therapist?.name || 'Therapist',
            start: a.time,
            end: this.minutesToTime(existingEnd)
          });
        }
      });
    });

    return result;
  }
getSelectedTherapistBusySlots(): {
  therapistName: string;
  slots: string[];
}[] {
  if (!this.formData.date || !this.formData.therapistIds?.length) return [];

  const result: any[] = [];

  this.formData.therapistIds.forEach((id: number) => {
    const therapist = this.therapists.find(t => t.id === id);
    if (!therapist) return;

    const slots: string[] = [];

    this.bookedSchedule.forEach(appt => {
      const isAssigned = appt.therapists?.some(
        (t: any) => t.therapistId === id
      );

      if (!isAssigned) return;

      const start = appt.time;
      const endMinutes =
        this.toMinutes(appt.time) + Number(appt.totalDurationMinutes || 0);

      const end = this.minutesToTime(endMinutes);
      slots.push(`${start} – ${end}`);
    });

    if (slots.length > 0) {
      result.push({
        therapistName: therapist.name,
        slots
      });
    }
  });

  return result;
}


}
