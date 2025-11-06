import { Component } from '@angular/core';
import { TherapyService } from '../../services/therapy/therapy.service';

@Component({
  selector: 'app-therapy-analytics',
  templateUrl: './therapy-analytics.component.html',
  styleUrl: './therapy-analytics.component.css'
})
export class TherapyAnalyticsComponent {
  therapyChart: any;
  therapistChart: any;
  roomChart: any;
  trendChart: any;
  completionChart: any;
  avgDurationChart: any;
  genderChart: any;
  workloadChart: any;
  cleaningChart: any;
  checkinChart: any;

  constructor(private analyticsService: TherapyService) {}

  ngOnInit(): void {
    this.analyticsService.getAllTherapyAppointments().subscribe(data => {
      this.generateTherapyAnalytics(data);
      this.generateTherapistAnalytics(data);
      this.generateRoomAnalytics(data);
      this.generateCompletionAnalytics(data);
      this.generateAvgDurationAnalytics(data);
      this.generateDailyTrend(data);
      this.generateGenderAnalytics(data);
      this.generateCleaningAnalytics(data);
      this.generateCheckinAnalytics(data);
    });
  }

  generateTherapyAnalytics(appointments: any[]) {
    const counts: any = {};
    appointments.forEach(app => {
      const name = app.therapy?.name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });

    this.therapyChart = {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Appointments per Therapy',
        data: Object.values(counts)
      }]
    };
  }

  generateTherapistAnalytics(appointments: any[]) {
    const counts: any = {};
    appointments.forEach(app => {
      const name = app.therapist?.name || 'Unassigned';
      counts[name] = (counts[name] || 0) + 1;
    });

    this.therapistChart = {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Sessions per Therapist',
        data: Object.values(counts)
      }]
    };
  }

  generateRoomAnalytics(appointments: any[]) {
    const counts: any = {};
    appointments.forEach(app => {
      const name = app.roomNumber || 'Unassigned';
      counts[name] = (counts[name] || 0) + 1;
    });

    this.roomChart = {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Bookings per Room',
        data: Object.values(counts)
      }]
    };
  }
  generateDailyTrend(appointments: any[]) {
    const counts: any = {};
    appointments.forEach(app => {
      const date = new Date(app.date).toLocaleDateString();
      counts[date] = (counts[date] || 0) + 1;
    });
  
    this.trendChart = {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Appointments Over Time',
        data: Object.values(counts),
        fill: false,
        tension: 0.4
      }]
    };
  }
  generateCompletionAnalytics(appointments: any[]) {
    let completed = 0, cancelled = 0, postponed = 0;
  
    appointments.forEach(app => {
      if (app.cancelledAt) cancelled++;
      else if (app.postponed) postponed++;
      else if (app.therapyFinished) completed++;
    });
  
    this.completionChart = {
      labels: ['Completed', 'Cancelled', 'Postponed'],
      datasets: [{
        data: [completed, cancelled, postponed],
        backgroundColor: ['#00B194', '#FF6B6B', '#FFD93D']
      }]
    };
  }
  generateAvgDurationAnalytics(appointments: any[]) {
    const durations: Record<string, number[]> = {};
  
    appointments.forEach(app => {
      if (app.startedAt && app.finishedAt && app.therapy) {
        const diff = (new Date(app.finishedAt).getTime() - new Date(app.startedAt).getTime()) / 60000; // minutes
        const name = app.therapy.name;
        if (!durations[name]) durations[name] = [];
        durations[name].push(diff);
      }
    });
  
    const avgDurations = Object.entries(durations).map(([name, arr]) => ({
      name,
      avg: arr.reduce((a, b) => a + b, 0) / arr.length
    }));
  
    this.avgDurationChart = {
      labels: avgDurations.map(d => d.name),
      datasets: [{
        label: 'Avg Session Duration (minutes)',
        data: avgDurations.map(d => d.avg),
        backgroundColor: '#4DC9F6'
      }]
    };
  }
  generateGenderAnalytics(appointments: any[]) {
    const counts: any = { Male: 0, Female: 0, Other: 0 };
    appointments.forEach(app => {
      const g = (app.gender || 'Other').toLowerCase();
      if (g.includes('male')) counts.Male++;
      else if (g.includes('female')) counts.Female++;
      else counts.Other++;
    });
  
    this.genderChart = {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#00B7FF', '#FF77A9', '#FFE066']
      }]
    };
  }
  generateTherapistWorkload(appointments: any[]) {
    const workload: Record<string, number> = {};
    appointments.forEach(app => {
      if (app.therapist) {
        const key = app.therapist.name;
        workload[key] = (workload[key] || 0) + 1;
      }
    });
  
    this.workloadChart = {
      labels: Object.keys(workload),
      datasets: [{
        label: 'Total Sessions Conducted',
        data: Object.values(workload),
        backgroundColor: '#93AD00'
      }]
    };
  }
  generateCleaningAnalytics(appointments: any[]) {
    const totalUsed = appointments.filter(a => a.therapyFinished).length;
    const cleaned = appointments.filter(a => a.cleanedAfterUse).length;
    const notCleaned = totalUsed - cleaned;
  
    this.cleaningChart = {
      labels: ['Cleaned', 'Not Cleaned'],
      datasets: [{
        data: [cleaned, notCleaned],
        backgroundColor: ['#4CAF50', '#F44336']
      }]
    };
  }
  generateCheckinAnalytics(appointments: any[]) {
    const checkedIn = appointments.filter(a => a.checkedIn).length;
    const notCheckedIn = appointments.length - checkedIn;
  
    this.checkinChart = {
      labels: ['Checked In', 'No Show'],
      datasets: [{
        data: [checkedIn, notCheckedIn],
        backgroundColor: ['#00B194', '#FF8A65']
      }]
    };
  }
       
}
