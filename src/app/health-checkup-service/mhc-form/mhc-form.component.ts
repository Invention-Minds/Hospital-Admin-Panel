import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';

@Component({
  selector: 'app-mhc-form',
  templateUrl: './mhc-form.component.html',
  styleUrl: './mhc-form.component.css'
})
export class MhcFormComponent implements OnInit {
  doctorForm!: FormGroup;
  @Input() selectedAppointment: any; // Receive appointment data
  todayDate: string = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

  departments: any[] = [];
  availableTimes: { [doctorId: string]: string[] } = {}; // Store available time slots per doctor

  constructor(private fb: FormBuilder, private doctorService: DoctorServiceService) { }

  ngOnInit(): void {
    this.initForm();
    if (this.selectedAppointment) {
      this.populateForm();
    }
  }

  initForm(): void {
    this.doctorForm = this.fb.group({
      pnrNumber: ['', Validators.required],
      patientName: ['', Validators.required],
      healthCheckType: ['', Validators.required],
      appointments: this.fb.array([]) // Dynamic fields
    });
  }

  populateForm(): void {
    if (!this.selectedAppointment) return;

    // Set patient details
    this.doctorForm.patchValue({
      pnrNumber: this.selectedAppointment.id,
      patientName: this.selectedAppointment.firstName + ' ' + this.selectedAppointment.lastName,
      healthCheckType: this.selectedAppointment.packageName
    });

    // Extract department IDs
    const deptIds = this.selectedAppointment.package.deptIds.split(',').map(Number);

    // Fetch doctors based on departments
    this.fetchDoctorsForDepartments(deptIds);
  }

  fetchDoctorsForDepartments(deptIds: number[]): void {
    this.doctorService.getAllDoctors(this.todayDate).subscribe((doctors: any) => {
      console.log("🚀 Raw Doctors Data:", doctors);

      // Step 1: Remove Visiting Consultants
      let filteredDoctors = doctors.filter((doctor: any) => doctor.doctorType !== 'Visiting Consultant');

      // Step 2: Remove doctors unavailable today
      filteredDoctors = filteredDoctors.filter((doctor: any) => {
        return !(doctor.unavailableDates || []).some((unavailableDate: any) => {
          return new Date(unavailableDate.date).toISOString().split('T')[0] === this.todayDate;
        });
      });

      console.log("✅ Doctors After Filtering:", filteredDoctors);

      // Step 3: Find doctors available today
      filteredDoctors = filteredDoctors.filter((doctor: any) => {
        const latestAvailability = this.getLatestAvailability(doctor);
        if (!latestAvailability) {
          return false;
        }
        const today = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
        return latestAvailability.some((avail: any) => avail.day.toLowerCase() === today);
      });

      console.log("🎯 Doctors Available Today:", filteredDoctors);

      // Step 4: Generate Departments & Include 'No Doctor Available'
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


  generateTimeSlots(doctor: any): string[] {
    if (!doctor || !doctor.availability) return ['No Available Slots'];

    const today = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
    const todayAvailability = doctor.availability.find((avail: any) => avail.day.toLowerCase() === today);

    if (!todayAvailability || !todayAvailability.availableFrom) return ['No Available Slots'];

    const [startTime, endTime] = todayAvailability.availableFrom.split('-').map((time: string) => time.trim());

    return this.createTimeSlots(startTime, endTime, todayAvailability.slotDuration);
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

  getDepartmentNameById(deptId: number): string {
    const departmentNames: { [key: number]: string } = {
      2: 'Physician',
      4: 'Ophthalmology',
      6: 'ENT',
      17: 'Life Style – Cognitive Fitness',
      14: 'Diet Counselling'
    };
    return departmentNames[deptId] || 'Unknown';
  }

  onSubmit(): void {
    if (this.doctorForm.invalid) {
      alert('Please fill all required fields.');
      return;
    }
    console.log('Form Submitted:', this.doctorForm.value);
  }
}