import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-mhc-form',
  templateUrl: './mhc-form.component.html',
  styleUrl: './mhc-form.component.css'
})
export class MhcFormComponent implements OnInit {
  doctorForm!: FormGroup;
  @Input() selectedAppointment: any; // Receive appointment data
  todayDate: string = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  userId: string = ''

  departments: any[] = [];
  availableTimes: { [doctorId: string]: string[] } = {}; // Store available time slots per doctor
  appointments: any[] = [];
  @Output() closeForm = new EventEmitter<void>();
  isLoading: boolean = false;
  doctorMap: Map<number, string> = new Map();

  constructor(private fb: FormBuilder, private doctorService: DoctorServiceService, private appointmentService: AppointmentConfirmService, private cdRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.initForm();
    if (this.selectedAppointment) {
      this.populateForm();
    }
    this.userId = localStorage.getItem('userid') || ''
  }

  initForm(): void {
    this.doctorForm = this.fb.group({
      pnrNumber: ['', Validators.required],
      patientName: ['', Validators.required],
      healthCheckType: ['', Validators.required],
      appointments: this.fb.array([]) // Dynamic fields
    });
  }

  // populateForm(): void {
  //   if (!this.selectedAppointment) return;

  //   this.doctorForm.patchValue({
  //     pnrNumber: this.selectedAppointment.prnNumber,
  //     patientName: this.selectedAppointment.firstName + ' ' + this.selectedAppointment.lastName,
  //     healthCheckType: this.selectedAppointment.packageName
  //   });

  //   const deptIds = this.selectedAppointment.package.deptIds.split(',').map(Number);

  //   // ✅ Fetch Doctors FIRST before patching appointments
  //   this.fetchDoctorsForDepartments(deptIds).then(() => {
  //     this.appointmentService.getAppointmentsByServiceId(this.selectedAppointment.id).subscribe((appointments: any[]) => {
  //       console.log("📌 Existing Appointments:", appointments);

  //       const bookedDepartments = new Set(appointments.map(appt => appt.department));
  //       console.log("📌 Booked Departments:", bookedDepartments);

  //       this.departments = this.departments.map((dept) => ({
  //         ...dept,
  //         disabled: bookedDepartments.has(dept.name) // ✅ Disable if dept already has an appointment
  //       }));

  //       console.log("📌 Updated Departments:", this.departments);

  //       // ✅ Patch the form AFTER departments are set
  //       this.patchAppointmentForm(appointments);
  //     });
  //   });
  // }
  async populateForm(): Promise<void> {
    if (!this.selectedAppointment) return;

    this.doctorForm.reset();

    this.doctorForm.patchValue({
      pnrNumber: this.selectedAppointment.pnrNumber,
      patientName: this.selectedAppointment.firstName + ' ' + this.selectedAppointment.lastName,
      healthCheckType: this.selectedAppointment.packageName
    });

    const deptIds = this.selectedAppointment.package.deptIds.split(',').map(Number);

    // ✅ Fetch Doctors BEFORE Fetching Existing Appointments
    await this.fetchDoctorsForDepartments(deptIds); // ✅ Now it waits for doctors to load

    this.appointmentService.getAppointmentsByServiceId(this.selectedAppointment.id, this.selectedAppointment.appointmentDate).subscribe((appointments: any[]) => {
      console.log("📌 Existing Appointments:", appointments);
      this.appointments = appointments;
      const bookedDepartments = new Set(appointments.map(appt => appt.department));
      console.log("📌 Booked Departments:", bookedDepartments);

      this.departments = this.departments.map((dept) => ({
        ...dept,
        disabled: bookedDepartments.has(dept.name) // ✅ Disable if dept already has an appointment
      }));

      console.log("📌 Updated Departments:", this.departments);
      this.populateAvailableTimes(appointments);

      // ✅ Patch the form AFTER departments are set
      this.patchAppointmentForm(appointments);
    });
  }
  populateAvailableTimes(appointments: any): void {
    this.departments.forEach((dept, index) => {
      if (dept.hasDoctor) {
        const bookedDoctorId = this.getBookedDoctorId(appointments, dept.name)
        console.log(`📌 Department: ${dept.name}, Booked Doctor ID: ${bookedDoctorId}`);

        const selectedDoctor = dept.doctors.find((doc: any) => doc.id === bookedDoctorId) || dept.doctors[0];

        if (selectedDoctor) {
          this.availableTimes[index] = this.generateTimeSlots(selectedDoctor);
        } else {
          this.availableTimes[index] = ['No Available Slots'];
        }
      } else {
        this.availableTimes[index] = ['No Available Slots'];
      }
    });
  }
  // getBookedDoctorIdForDept(department: string): string {
  //   console.log(department)
  //   const appointment = this.selectedAppointment?.appointments?.find((appt:any) => appt.department === department);
  //   return appointment ? appointment.doctorId : 'no-doctor';
  // }

  // patchAppointmentForm(appointments: any[]): void {
  //   const appointmentsArray = this.doctorForm.get('appointments') as FormArray;
  //   appointmentsArray.clear();

  //   this.departments.forEach((dept, index) => {
  //     const isDisabled = appointments.some(appt => appt.department === dept.name);


  //     appointmentsArray.push(
  //       this.fb.group({
  //         doctor: new FormControl(
  //           { value: isDisabled ? this.getBookedDoctorId(appointments, dept.name) : '', disabled: isDisabled },
  //           Validators.required
  //         ),
  //         time: new FormControl(
  //           { value: isDisabled ? this.getBookedTime(appointments, dept.name) : '4:40 PM', disabled: isDisabled },
  //           Validators.required
  //         )
  //       })
  //     );
  //     console.log(appointmentsArray)
  //   });

  //   console.log("✅ Form Patched with Existing Appointments:", this.doctorForm.value);
  // }
  // patchAppointmentForm(appointments: any[]): void {
  //   const appointmentsArray = this.doctorForm.get('appointments') as FormArray;
  //   appointmentsArray.clear();

  //   this.departments.forEach((dept, index) => {
  //     const isDisabled = appointments.some(appt => appt.department === dept.name);

  //     // ✅ Check if the doctor is assigned, otherwise set to "No Doctor Available"
  //     let doctorId = isDisabled ? this.getBookedDoctorId(appointments, dept.name) : ''; // ✅ Set to empty if no appointment
  //       let doctorName = doctorId ? this.getDoctorNameById(Number(doctorId), dept.id) : 'Select Doctor';
  //       let time = isDisabled ? this.getBookedTime(appointments, dept.name) : '';
  //     console.log(time,doctorId)
  //     if (!dept.hasDoctor) {
  //       doctorId = 'no-doctor';
  //       time = 'no-slots';
  //   } else {
  //       // ✅ Ensure time is set correctly when a doctor exists
  //       time = time || (this.availableTimes[index] && this.availableTimes[index][0]) || ''; 
  //       console.log(time)
  //   }
  //     appointmentsArray.push(
  //       this.fb.group({
  //         doctor: new FormControl(
  //           { value: doctorId, disabled: isDisabled },
  //           Validators.required
  //         ),
  //         time: new FormControl(
  //           { value: time, disabled: isDisabled },
  //           Validators.required
  //         )
  //       })
  //     );
  //   });
  //   this.cdRef.detectChanges();
  //   console.log(this.departments)
  //   console.log("✅ Form Patched with Existing Appointments:", this.doctorForm.value);
  // }
  //   patchAppointmentForm(appointments: any[]): void {
  //     const appointmentsArray = this.doctorForm.get('appointments') as FormArray;
  //     appointmentsArray.clear();

  //     this.departments.forEach((dept, index) => {
  //         const existingAppointment = appointments.find(appt => appt.department === dept.name);
  //         const isDisabled = !!existingAppointment;

  //         let doctorId = isDisabled ? this.getBookedDoctorId(appointments, dept.name) : '';
  //         let doctorName = doctorId ? this.getDoctorNameById(Number(doctorId), dept.id) : 'No Doctor Available';

  //         // ✅ Assign booked time if it exists
  //         let time = isDisabled ? existingAppointment?.time : '';

  //         // ✅ If no available slots exist, use the booked time instead
  //         if (!dept.hasDoctor) {
  //             doctorId = 'no-doctor';
  //             time = 'no-slots';
  //         } else if (!this.availableTimes[index] || this.availableTimes[index].length === 0) {
  //             time = existingAppointment ? existingAppointment.time : 'no-slots';
  //         }

  //         console.log(`🔹 Dept: ${dept.name}, Assigned Doctor: ${doctorId}, Assigned Time: ${time}`);

  //         const appointmentGroup = this.fb.group({
  //             doctor: new FormControl(
  //                 { value: doctorId, disabled: !dept.hasDoctor || isDisabled },
  //                 Validators.required
  //             ),
  //             time: new FormControl(
  //                 { value: time, disabled: !dept.hasDoctor || isDisabled },
  //                 Validators.required
  //             )
  //         });

  //         appointmentsArray.push(appointmentGroup);

  //         // ✅ Explicitly update the FormControl after form initialization
  //         setTimeout(() => {
  //             appointmentGroup.get('time')?.setValue(time);
  //             this.cdRef.detectChanges(); // ✅ Force UI update
  //             this.doctorForm.updateValueAndValidity(); 
  //             console.log(`✅ Updated FormControl for Time: ${appointmentGroup.get('time')?.value}`);
  //         }, 100);
  //     });

  //     this.cdRef.detectChanges(); // ✅ Ensure UI updates properly
  // }


  patchAppointmentForm(appointments: any[]): void {
    const appointmentsArray = this.doctorForm.get('appointments') as FormArray;
    appointmentsArray.clear();

    this.departments.forEach((dept, index) => {
      const existingAppointment = appointments.find(appt => appt.department === dept.name);
      const isDisabled = !!existingAppointment;

      let doctorId = isDisabled ? this.getBookedDoctorId(appointments, dept.name) : '';
      console.log(doctorId, 'doctorId')
      let doctorName = doctorId ? this.getBookedDoctorName(appointments, dept.name) : 'No Doctor Available';

      // ✅ Assign booked time if it exists
      let time = isDisabled ? existingAppointment?.time : '';

      // ✅ If no available slots exist, use the booked time instead
      if (!dept.hasDoctor) {
        doctorId = 'no-doctor';
        time = 'no-slots';
      } else if (!this.availableTimes[index] || this.availableTimes[index].length === 0) {
        time = existingAppointment ? existingAppointment.time : 'no-slots';
      }

      console.log(`🔹 Dept: ${dept.name}, Assigned Doctor: ${doctorId}, Assigned Time: ${time}`);

      const appointmentGroup = this.fb.group({
        doctor: new FormControl(
          { value: doctorId, disabled: !dept.hasDoctor || isDisabled },
          Validators.required
        ),
        time: new FormControl(
          { value: time, disabled: !dept.hasDoctor || isDisabled },
          Validators.required
        )
      });

      appointmentsArray.push(appointmentGroup);

      // ✅ Explicitly update the FormControl after form initialization
      setTimeout(() => {
        appointmentGroup.get('time')?.setValue(time); // 🔹 Force update time field
        appointmentGroup.get('doctor')?.setValue(doctorId)
        this.cdRef.detectChanges(); // 🔹 Ensure UI updates properly
        this.doctorForm.updateValueAndValidity();
        console.log(`✅ Updated FormControl for Time: ${appointmentGroup.get('time')?.value}`);
      }, 100);
    });

    this.cdRef.detectChanges(); // 🔹 Force change detection to update UI
  }





  // 🔹 Find Doctor ID from existing appointments
  getBookedDoctorId(appointments: any[], department: string): string {
    const appointment = appointments.find(appt => appt.department === department);
    return appointment ? appointment.doctorId : '';
  }

  // 🔹 Find Booked Time from existing appointments
  getBookedTime(appointments: any[], department: string): string {
    const appointment = appointments.find(appt => appt.department === department);
    console.log(appointment.time)
    return appointment ? appointment.time : '';
  }
  getBookedDoctorName(appointments: any[], department: string): string {
    const appointment = appointments.find(appt => appt.department === department);
    console.log(appointment.doctorName)
    return appointment ? appointment.doctorName : '';
  }


  // fetchDoctorsForDepartments(deptIds: number[]): void {
  //   this.doctorService.getAllDoctors(this.todayDate).subscribe((doctors: any) => {
  //     console.log("🚀 Raw Doctors Data:", doctors);

  //     // Step 1: Remove Visiting Consultants
  //     let filteredDoctors = doctors.filter((doctor: any) => doctor.doctorType !== 'Visiting Consultant');

  //     // Step 2: Remove doctors unavailable today
  //     filteredDoctors = filteredDoctors.filter((doctor: any) => {
  //       return !(doctor.unavailableDates || []).some((unavailableDate: any) => {
  //         return new Date(unavailableDate.date).toISOString().split('T')[0] === this.todayDate;
  //       });
  //     });

  //     console.log("✅ Doctors After Filtering:", filteredDoctors);

  //     // Step 3: Find doctors available today
  //     filteredDoctors = filteredDoctors.filter((doctor: any) => {
  //       const latestAvailability = this.getLatestAvailability(doctor);
  //       if (!latestAvailability) {
  //         return false;
  //       }
  //       const today = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
  //       return latestAvailability.some((avail: any) => avail.day.toLowerCase() === today);
  //     });

  //     console.log("🎯 Doctors Available Today:", filteredDoctors);

  //     // Step 4: Generate Departments & Include 'No Doctor Available'
  //     this.departments = deptIds.map(deptId => {
  //       const deptDoctors = filteredDoctors.filter((doc: any) => doc.departmentId === deptId);
  //       return {
  //         id: deptId,
  //         name: this.getDepartmentNameById(deptId),
  //         doctors: deptDoctors.length > 0 ? deptDoctors : [{ id: 'no-doctor', name: 'No Doctor Available' }],
  //         hasDoctor: deptDoctors.length > 0
  //       };
  //     });

  //     console.log("📌 Final Departments Data:", this.departments);

  //     this.populateDoctorAndSlots();
  //   });
  // }
  fetchDoctorsForDepartments(deptIds: number[]): Promise<void> {
    return new Promise((resolve) => { // ✅ Wrap in a Promise
      this.doctorService.getAllDoctors(this.selectedAppointment.appointmentDate).subscribe((doctors: any) => {
        console.log("🚀 Raw Doctors Data:", doctors);

        let filteredDoctors = doctors.filter((doctor: any) => doctor.doctorType !== 'Visiting Consultant');

        filteredDoctors = filteredDoctors.filter((doctor: any) => {
          return !(doctor.unavailableDates || []).some((unavailableDate: any) => {
            return new Date(unavailableDate.date).toISOString().split('T')[0] === this.todayDate;
          });
        });

        console.log("✅ Doctors After Filtering:", filteredDoctors);

        filteredDoctors = filteredDoctors.filter((doctor: any) => {
          const latestAvailability = this.getLatestAvailability(doctor);
          if (!latestAvailability) return false;
          const today = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
          return latestAvailability.some((avail: any) => avail.day.toLowerCase() === today);
        });

        console.log("🎯 Doctors Available Today:", filteredDoctors);
        this.doctorMap.clear();
        filteredDoctors.forEach((doctor: any) => {
          this.doctorMap.set(doctor.id, doctor.name);
        });


        this.departments = deptIds.map(deptId => {
          const deptDoctors = filteredDoctors.filter((doc: any) => doc.departmentId === deptId);
          return {
            id: deptId,
            name: this.getDepartmentNameById(deptId),
            doctors: deptDoctors.length > 0 ? deptDoctors : [{ id: 'no-doctor', name: 'No Doctor Available' }],
            hasDoctor: deptDoctors.length > 0
          };
        });

        console.log("📌 Final Departments Data:", this.departments);

        this.populateDoctorAndSlots();

        resolve(); // ✅ Resolve after setting departments
      });
    });
  }


  getLatestAvailability(doctor: any) {
    if (!doctor.availability || doctor.availability.length === 0) return null;

    const allUpdatedAtNull = doctor.availability.every((avail: any) => !avail.updatedAt);

    let latestTimestamp: string | null = null;
    if (!allUpdatedAtNull) {
      latestTimestamp = doctor.availability
        .filter((avail: any) => avail.updatedAt)
        .map((avail: any) => new Date(avail.updatedAt).getTime())
        .reduce((max: any, curr: any) => Math.max(max, curr), 0)
        .toString();
    }

    const latestAvailability = allUpdatedAtNull
      ? doctor.availability
      : doctor.availability.filter((avail: any) => new Date(avail.updatedAt).getTime().toString() === latestTimestamp);

    return latestAvailability;
  }

  populateDoctorAndSlots(): void {
    const appointmentsArray = this.doctorForm.get('appointments') as FormArray;
    appointmentsArray.clear();

    this.departments.forEach((dept) => {
      appointmentsArray.push(
        this.fb.group({
          doctor: [dept.hasDoctor ? '' : 'no-doctor', Validators.required],
          time: [dept.hasDoctor ? '' : 'no-slots', Validators.required]
        })
      );
    });

    console.log("✅ Doctor & Slot Form Updated:", this.doctorForm.value);
  }

  onDoctorSelected(deptIndex: number, event: Event) {
    const target = event.target as HTMLSelectElement; // Type-cast properly
    const doctorId = target?.value; // Get selected value safely

    if (!doctorId) return; // Ensure it is not null or undefined

    if (doctorId === 'no-doctor') {
      this.availableTimes[deptIndex] = ['No Available Slots'];
      return;
    }
    console.log(doctorId);
    console.log(this.departments[deptIndex].doctors)
    const doctorsArray = Array.isArray(this.departments[deptIndex].doctors)
      ? this.departments[deptIndex].doctors
      : [];

    const doctor = doctorsArray.find((doc: any) => doc.id === Number(doctorId));

    console.log(doctor)
    if (doctor) {
      let generatedSlots = this.generateTimeSlots(doctor); // Generate available slots
      console.log(doctor.bookedSlots)
      // 🔹 **Step 2: Remove booked slots**
      const bookedTimes = (doctor.bookedSlots || [])
        .filter((slot: any) => !slot.complete) // 🔹 Ignore completed bookings
        .map((slot: any) => slot.time);

      console.log("Filtered Booked Slots:", bookedTimes);

      // **✅ Step 2: Remove booked times from available slots**
      generatedSlots = generatedSlots.filter(slot => !bookedTimes.includes(slot));
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes

      generatedSlots = generatedSlots.filter(slot => {
        const [time, period] = slot.split(" "); // Split "06:20 PM" → ["06:20", "PM"]
        const [hour, minute] = time.split(":").map(Number); // Extract hour & minute

        // Convert to 24-hour format
        let slotTimeInMinutes = hour * 60 + minute;
        if (period === "PM" && hour !== 12) slotTimeInMinutes += 12 * 60;
        if (period === "AM" && hour === 12) slotTimeInMinutes -= 12 * 60;

        return slotTimeInMinutes >= currentTime; // 🔹 Keep only future slots
      });

      this.availableTimes[deptIndex] = generatedSlots; // ✅ Update available slots
      console.log(this.availableTimes[deptIndex]);
    }
    else {
      this.availableTimes[deptIndex] = ['No Available Slots']; // Ensure slots are assigned
    }
  }
  getInvalidControls(form: any) {
    const invalidControls = [];
    for (const name in form.controls) {
      if (form.controls[name].invalid) {
        invalidControls.push(name);
      }
    }
    return invalidControls;
  }

  generateTimeSlots(doctor: any): string[] {
    if (!doctor || !doctor.availability) return ['No Available Slots'];

    const today = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
    const todayAvailability = doctor.availability.find((avail: any) => avail.day.toLowerCase() === today);

    if (!todayAvailability || !todayAvailability.availableFrom) return ['No Available Slots'];

    // ✅ Extract available slots from doctor's availability
    // const [startTime, endTime] = todayAvailability.availableFrom.split('-').map((time: string) => time.trim());
    // console.log(startTime,endTime,todayAvailability.slotDuration,todayAvailability.doctorId)
    // let availableSlots = this.createTimeSlots(startTime, endTime, todayAvailability.slotDuration);
    let availableSlots: string[] = [];

    // Check if todayAvailability.availableFrom contains multiple time ranges
    if (todayAvailability.availableFrom.includes(',')) {
      // If multiple ranges exist, use the function that handles multiple time ranges
      availableSlots = this.createTimeSlotsMultiple(todayAvailability.availableFrom, todayAvailability.slotDuration);
    } else {
      // If only a single time range exists, proceed normally
      const [startTime, endTime] = todayAvailability.availableFrom.split('-').map((time: string) => time.trim());
      availableSlots = this.createTimeSlots(startTime, endTime, todayAvailability.slotDuration);
    }

    console.log(availableSlots);


    // ✅ Step 1: Retrieve Extra Slots (if any)
    let extraSlots: string[] = [];
    if (doctor.extraSlots && doctor.extraSlots.length > 0) {
      extraSlots = doctor.extraSlots
        .filter((slot: any) => slot.date === this.todayDate) // Match today's date
        .map((slot: any) => slot.time); // Extract only time
    }

    // ✅ Step 2: Merge Available & Extra Slots
    let allSlots = [...availableSlots, ...extraSlots];
    console.log(allSlots)

    // ✅ Step 3: Remove Booked Slots
    const bookedTimes = (doctor.bookedSlots || [])
      .filter((slot: any) => !slot.complete) // Ignore completed bookings
      .map((slot: any) => slot.time);

    allSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    // ✅ Step 4: Remove Past Slots
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes

    allSlots = allSlots.filter(slot => {
      const [time, period] = slot.split(" "); // "06:20 PM" → ["06:20", "PM"]
      const [hour, minute] = time.split(":").map(Number);

      let slotTimeInMinutes = hour * 60 + minute;
      if (period === "PM" && hour !== 12) slotTimeInMinutes += 12 * 60;
      if (period === "AM" && hour === 12) slotTimeInMinutes -= 12 * 60;

      return slotTimeInMinutes >= currentTime; // ✅ Keep only future slots
    });

    // ✅ Step 5: Sort Slots in Chronological Order
    allSlots.sort((a, b) => {
      const [aTime, aPeriod] = a.split(" ");
      const [bTime, bPeriod] = b.split(" ");

      if (aPeriod !== bPeriod) {
        return aPeriod === "AM" ? -1 : 1; // AM slots first
      }
      return aTime.localeCompare(bTime);
    });

    return allSlots.length > 0 ? allSlots : ['No Available Slots'];
  }


  createTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
    const slots = [];
    let currentTime = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    while (currentTime < end) {
      slots.push(currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      currentTime.setMinutes(currentTime.getMinutes() + slotDuration); // 30-min slot
    }

    return slots.length > 0 ? slots : ['No Available Slots'];
  }
  createTimeSlotsMultiple(availableTimes: string, slotDuration: number): string[] {
    const slots: string[] = [];
  
    // Split multiple time ranges (e.g., "10:00-14:00, 15:00-16:00")
    const timeRanges = availableTimes.split(',').map(range => range.trim());
  
    timeRanges.forEach(range => {
      const [startTime, endTime] = range.split('-').map(time => time.trim());
  
      let currentTime = new Date(`1970-01-01T${startTime}:00`);
      const end = new Date(`1970-01-01T${endTime}:00`);
  
      while (currentTime < end) {
        slots.push(currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
        currentTime.setMinutes(currentTime.getMinutes() + slotDuration); // Increase time by slot duration
      }
    });
  
    return slots.length > 0 ? slots : ['No Available Slots'];
  }
  

  getDepartmentNameById(deptId: number): string {
    const departmentNames: { [key: number]: string } = {
      5: 'Emergency Medicine',
      4: 'DENTAL SCIENCES',
      6: 'ENT',
      17: 'OPTHALMOLOGY',
      14: 'NUTRITION & DIETETICS',
      1: 'ANAESTHESIOLOGY',
      10: 'INTERNAL MEDICINE',
      11: 'LIFE STYLE MEDICINE',
      2: 'AYURVEDA',
      15: 'OBSTETRICS & GYNECOLOGY'
    };
    return departmentNames[deptId] || 'Unknown';
  }

  onSubmit(): void {
    // Get only the valid appointments with valid doctor and time
    const validAppointments = this.doctorForm.value.appointments.map((appt: any) => {
      // ✅ Find the correct department for the appointment by doctor ID
      const department = this.departments.find(dept =>
        dept.doctors.some((doc: any) => doc.id === Number(appt.doctor))
      );

      if (!department) {
        console.warn(`⚠️ Department not found for doctor ID: ${appt.doctor}`);
        return null; // Skip this appointment
      }

      return {
        patientName: this.doctorForm.value.patientName,
        prnNumber: Number(this.doctorForm.value.pnrNumber),
        phoneNumber: this.selectedAppointment.phoneNumber,
        email: this.selectedAppointment.email,
        doctorId: Number(appt.doctor),
        doctorName: this.getDoctorNameById(Number(appt.doctor)),
        department: department.name, // ✅ Use the correct department name
        date: this.todayDate,
        time: appt.time,
        status: 'confirmed',
        userId: Number(this.userId),
        serviceId: this.selectedAppointment.id
      };
    }).filter((appt: any) => appt !== null && appt.doctorId !== 0 && appt.time !== "" && appt.doctorId !== "no-doctor" && appt.time !== "no-slots"); // Remove any null entries

    // If no valid appointments, prevent API call
    if (validAppointments.length === 0) {
      alert("No valid appointments to book.");
      return;
    }

    this.isLoading = true;
    console.log("📝 Creating Appointments:", validAppointments);

    // ✅ Send API request only for valid appointments
    this.appointmentService.createAppointment(JSON.parse(JSON.stringify(validAppointments)));
    this.closeForm.emit(); // Emit event to close form if needed

    this.isLoading = false; // Hide loading indicator after processing
  }



  getDoctorNameById(doctorId: number): string {
    console.log(`🔍 Searching for Doctor ID: ${doctorId}`);

    if (this.doctorMap.has(doctorId)) {
      return this.doctorMap.get(doctorId)!; // ✅ Get name from Map
    } else {
      console.warn(`⚠️ No doctor found with ID ${doctorId}`);
      return 'Unknown';
    }
  }




  onCancel(): void {
    this.doctorForm.reset()
  }

}