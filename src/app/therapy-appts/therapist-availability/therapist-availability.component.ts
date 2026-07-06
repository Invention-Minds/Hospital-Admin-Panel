import { Component, OnInit } from '@angular/core';
import { TherapyService } from '../../services/therapy/therapy.service';

@Component({
  selector: 'app-therapist-availability',
  templateUrl: './therapist-availability.component.html',
  styleUrl: './therapist-availability.component.css',
})
export class TherapistAvailabilityComponent implements OnInit {
  therapists: any[] = [];
  therapistId: number | null = null;
  date = '';
  minDate = '';

  loading = false;
  result: any = null; // { therapistName, date, isDayOff, workingWindow, busy[], blockedSlots[], free[] }

  constructor(private therapyService: TherapyService) {}

  ngOnInit(): void {
    const t = new Date();
    this.date = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    this.minDate = this.date;
    this.therapyService.getAllTherapists().subscribe({
      next: (res) => (this.therapists = res || []),
      error: (err) => console.error('Error loading therapists', err),
    });
  }

  load(): void {
    if (!this.therapistId || !this.date) {
      this.result = null;
      return;
    }
    this.loading = true;
    this.therapyService.getTherapistAvailability(Number(this.therapistId), this.date).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading availability', err);
        this.result = null;
        this.loading = false;
      },
    });
  }
}
