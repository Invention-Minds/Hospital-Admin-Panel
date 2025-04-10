import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { RadiologyService } from '../../services/radiology/radiology.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-mhc-radiology',
  templateUrl: './mhc-radiology.component.html',
  styleUrl: './mhc-radiology.component.css'
})

export class MhcRadiologyComponent implements OnInit {
  doctorForm!: FormGroup;
  @Input() selectedAppointment: any;
  userId: string = '';
  todayDate: string = new Date().toISOString().split('T')[0];

  departments: any[] = [];
  radiologies: any[] = []; // Store available radiology services
  availableTimes: { [id: string]: string[] } = {}; // Store available slots per service

  @Output() closeForm = new EventEmitter<void>();
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private radiologyService: RadiologyService, // ✅ Add Radiology Service
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.selectedAppointment) {
      this.populateForm();
    }
    this.userId = localStorage.getItem('userid') || '';
  }

  initForm(): void {
    this.doctorForm = this.fb.group({
      pnrNumber: ['', Validators.required],
      patientName: ['', Validators.required],
      healthCheckType: ['', Validators.required],
      radiologyAppointments: this.fb.array([]) // ✅ Add Radiology Appointments
    });
  }

  async populateForm(): Promise<void> {
    if (!this.selectedAppointment) return;
  
    this.doctorForm.reset();
  
    this.doctorForm.patchValue({
      pnrNumber: this.selectedAppointment.pnrNumber,
      patientName: `${this.selectedAppointment.firstName} ${this.selectedAppointment.lastName}`,
      healthCheckType: this.selectedAppointment.packageName
    });
  
    const radioIds = this.selectedAppointment.package.radioIds
      ? this.selectedAppointment.package.radioIds.split(',').map(Number)
      : [];
  
    // ✅ Fetch existing appointments for this serviceId
    const existingAppointments = await this.radiologyService
      .getAppointmentsByServiceId(this.selectedAppointment.id, this.selectedAppointment.appointmentDate)
      .toPromise();
  
    console.log("📌 Existing Radiology Appointments:", existingAppointments);
  
    await this.fetchRadiologyServices(existingAppointments); // ✅ Pass existing appointments
    this.patchRadiologyForm(existingAppointments); // ✅ Pass existing appointments
  }
  

  async fetchRadiologyServices(existingAppointments:any): Promise<void> {
    try {
      // ✅ Step 1: Fetch all available radiology services
      const allRadiologies = await this.radiologyService.getPackages().toPromise();
  
      // ✅ Step 2: Extract radioIds from the selected package
      const radioIds = this.selectedAppointment.package.radioIds
        ? this.selectedAppointment.package.radioIds.split(',').map(Number)
        : [];
  
      if (radioIds.length === 0) {
        console.warn('⚠️ No radiology IDs found for this package.');
        return;
      }
  
      // ✅ Step 3: Filter the radiology services based on the extracted radioIds
      this.radiologies = allRadiologies.filter((radio: any) => radioIds.includes(radio.id));
      this.patchRadiologyForm(existingAppointments);
      // ✅ Step 4: Generate available time slots for each relevant radiology service
       this.fetchAvailableSlotsForRadiologies()
  
      console.log('✅ Fetched Relevant Radiologies:', this.radiologies);
    } catch (error) {
      console.error('❌ Error fetching radiologies:', error);
    }
  }
  
  patchRadiologyForm(existingAppointments: any[]): void {
    const radiologyArray = this.doctorForm.get('radiologyAppointments') as FormArray;
    radiologyArray.clear();
  
    this.radiologies.forEach((radio, index) => {
      // ✅ Check if an appointment exists for this radiology service
      const existingAppointment = existingAppointments.find(appt => appt.radioServiceId === radio.id);
      console.log(existingAppointment)
  
      // ✅ If an appointment exists, set the time and disable it
      const isDisabled = !!existingAppointment;
      const bookedTime = existingAppointment ? existingAppointment.appointmentTime : '';
      console.log(bookedTime)
  
      radiologyArray.push(
        this.fb.group({
          radiologyName: [{ value: radio.name, disabled: true }, Validators.required],
          time: [{ value: bookedTime, disabled: isDisabled }, Validators.required] // ✅ Disable if appointment exists
        })
      );
    });
  
    this.cdRef.detectChanges();
    console.log('✅ Radiology Form Patched with Existing Appointments:', this.doctorForm.value);
  }
  getRadiologyAppointmentControl(index: number, controlName: string) {
    const radiologyArray = this.doctorForm.get('radiologyAppointments') as FormArray;
    return radiologyArray.at(index).get(controlName) as FormControl;
  }
  
  onTimeSelected(index: number, event: Event) {
    const selectedTime = (event.target as HTMLSelectElement).value;
  
    // ✅ Get the FormArray
    const radiologyArray = this.doctorForm.get('radiologyAppointments') as FormArray;
    if (radiologyArray && radiologyArray.controls[index]) {
      radiologyArray.at(index).patchValue({ time: selectedTime });
    }
  
    console.log(`✅ Selected time for radiology ${this.radiologies[index].name}:`, selectedTime);
  }
  
  generateTimeSlots(radio: any): string[] {
    if (!radio || !radio.availableTime) return ['No Available Slots'];

    const [startTime, endTime] = radio.availableTime.split('-').map((time:any) => time.trim());
    let slots = this.createTimeSlots(startTime, endTime, radio.slotDuration);

    const bookedTimes = (radio.bookedSlots || []).map((slot: any) => slot.time);
    slots = slots.filter(slot => !bookedTimes.includes(slot)); // ✅ Remove Booked Slots

    return slots.length > 0 ? slots : ['No Available Slots'];
  }

  createTimeSlots(startTime: string, endTime: string, slotDuration: number): string[] {
    const slots = [];
    let currentTime = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    while (currentTime < end) {
      slots.push(currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
    }

    return slots.length > 0 ? slots : ['No Available Slots'];
  }
  async fetchAvailableSlotsForRadiologies(): Promise<void> {
    if (!this.selectedAppointment.appointmentDate) {
      console.warn("⚠️ No selected date for fetching radiology slots.");
      return;
    }
  
    const isToday = new Date(this.selectedAppointment.appointmentDate).toLocaleDateString('en-CA') 
                    === new Date().toLocaleDateString('en-CA');
  
    for (const radio of this.radiologies) {
      try {
        const response = await this.radiologyService
          .getAvailableSlots(this.selectedAppointment.appointmentDate, radio.id)
          .toPromise();
  
        let availableSlots = Array.isArray(response.availableSlots) ? response.availableSlots : [];
  
        if (isToday) {
          const now = new Date();
          const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
  
          availableSlots = availableSlots.filter((slot: string) => {
            let [time, modifier] = slot.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
  
            // Convert 12-hour format to 24-hour format
            if (modifier === "PM" && hours !== 12) hours += 12;
            if (modifier === "AM" && hours === 12) hours = 0;
  
            const slotTimeInMinutes = hours * 60 + minutes;
            return slotTimeInMinutes >= currentTimeInMinutes; // Only include future slots
          });
        }
  
  
        this.availableTimes[radio.id] = availableSlots.length > 0 ? availableSlots : ["No Available Slots"];
  
        console.log(`✅ Available Slots for ${radio.name}:`, this.availableTimes[radio.id]);
      } catch (error) {
        console.error(`❌ Failed to fetch slots for ${radio.name}:`, error);
        this.availableTimes[radio.id] = ["No Available Slots"]; // Fallback
      }
    }
  }
  

  onSubmit(): void {
    console.log(this.doctorForm.value)
    const validRadiologyAppointments = this.doctorForm.value.radiologyAppointments
      .filter((appt: any) => appt.time !== '' && appt.time !== 'No Available Slots')
      .map((appt: any, index: number) => ({
        firstName: this.selectedAppointment.firstName,
        lastName: this.selectedAppointment.lastName,
        prnNumber: this.doctorForm.value.pnrNumber,
        phoneNumber: this.selectedAppointment.phoneNumber,
        appointmentDate: this.selectedAppointment.appointmentDate,
        radiologyId: this.radiologies[index].id,
        radiologyName: this.radiologies[index].name,
        appointmentTime: appt.time,
        requestVia: this.selectedAppointment.requestVia === 'Samraksha' ? 'Samraksha' : 'Walk-In',
        appointmentStatus: 'Confirm',
        userId: Number(this.userId),
        serviceId: this.selectedAppointment.id,
        email:this.selectedAppointment.email,
        prefix: this.selectedAppointment.prefix,
        patientType: this.selectedAppointment.patientType,
      }));

    if (validRadiologyAppointments.length === 0) {
      alert('No valid radiology appointments to book.');
      return;
    }

    this.isLoading = true;
    console.log('📝 Booking Radiology Appointments:', validRadiologyAppointments);

    this.radiologyService.createNewService(validRadiologyAppointments).subscribe(() => {
      this.isLoading = false;
      this.closeForm.emit();
    });
  }

  
}
