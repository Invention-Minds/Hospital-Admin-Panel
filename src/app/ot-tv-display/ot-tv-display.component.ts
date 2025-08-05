import { Component } from '@angular/core';
import { EstimationService } from '../services/estimation/estimation.service';
import { environment } from '../../environment/environment.prod';

@Component({
  selector: 'app-ot-tv-display',
  templateUrl: './ot-tv-display.component.html',
  styleUrl: './ot-tv-display.component.css'
})
export class OtTvDisplayComponent {
  currentDate: string = '';
  currentTime: string = '';
  intervalId: any;
  hourlyRefreshId: any;
  confirmedEstimations: any[] = [];
  eventSource: EventSource | null = null;

  constructor( private estimationService: EstimationService) { }

  ngOnInit() {
    this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);
    this.updateDateTime();
    this.eventSource.addEventListener('loadOtTv', (event: MessageEvent) => {
      const type = JSON.parse(event.data);
      this.fetchEstimations()
    });
    this.fetchEstimations();

    this.intervalId = setInterval(() => {
      this.updateDateTime();
    }, 60000);

    this.hourlyRefreshId = setInterval(() => {
      this.fetchEstimations();
    }, 3600000);
  }

  updateDateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    };
    this.currentDate = new Intl.DateTimeFormat('en-US', options).format(now);

    this.currentTime = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: true,
    }).format(now);
  }

  fetchEstimations(){
    this.estimationService.getConfirmedEstimations().subscribe({
      next: (services: any[]) => {
        this.confirmedEstimations = services
        this.confirmedEstimations.sort((a, b) => {
          const dateA = new Date(a.createdAt!);
          const dateB = new Date(b.createdAt!);
          return dateB.getTime() - dateA.getTime();
        });
        console.log('Services processed successfully.');
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      }
    });
  }
}
