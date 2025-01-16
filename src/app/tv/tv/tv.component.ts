import { Component } from '@angular/core';

@Component({
  selector: 'app-tv',
  templateUrl: './tv.component.html',
  styleUrl: './tv.component.css'
})
export class TvComponent {
  currentDate: string = '';
  currentTime: string = '';
  doctors: any[] = []; // Array of doctors
  private intervalId: any;

  ngOnInit() {
    this.updateDateTime();
    this.intervalId = setInterval(() => {
      this.updateDateTime();
    }, 60000); // Update time every second
    this.doctors = [
      {
        name: 'Dr. Nitish',
        department: 'Orthopaedics',
        time: '9:00 AM - 12:00 PM',
        image: './sunil.svg',
        patients: [
          { name: 'Mr. Name Last Name', details: 'Patient In', status: 'PatientIn' },
          { name: 'Mr. Name Last Name', details: 'Next', status: 'Next' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
        ],
      },
      {
        name: 'Dr. Nitish',
        department: 'Orthopaedics',
        time: '9:00 AM - 12:00 PM',
        image: './sunil.svg',
        patients: [
          { name: 'Mr. Name Last Name', details: 'Patient In', status: 'PatientIn' },
          { name: 'Mr. Name Last Name', details: 'Next', status: 'Next' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
        ],
      },
      {
        name: 'Dr. Nitish',
        department: 'Orthopaedics',
        time: '9:00 AM - 12:00 PM',
        image: './sunil.svg',
        patients: [
          { name: 'Mr. Name Last Name', details: 'Patient In', status: 'PatientIn' },
          { name: 'Mr. Name Last Name', details: 'Next', status: 'Next' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
          { name: 'Mr. Name Last Name', details: '10:00 AM', status: 'Default' },
        ],
      },
      {
        name: 'Dr. Nitish',
        department: 'Orthopaedics',
        time: '9:00 AM - 12:00 PM',
        image: 'doctor1.jpg',
        patients: [
          { name: 'Mr. John Doe', details: '10:00 AM' },
          { name: 'Ms. Jane Doe', details: '10:15 AM' },
          // Add more patients
        ],
      },
      // Add 1, 2, 3, or 4 doctors dynamically based on requirements
    ];
  }

  updateDateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata', // Explicitly set timezone to IST
    };
    this.currentDate = new Intl.DateTimeFormat('en-US', options).format(now);
  
    // Format the time as "12:12" in IST
    this.currentTime = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata', // Explicitly set timezone to IST
      hour12: true,
    }).format(now);
  }
  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId); // Clear the interval when the component is destroyed
    }
  }
  isFourDoctors(): boolean {
    return this.doctors.length === 4;
  }
}
