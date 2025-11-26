import { Component } from '@angular/core';
import { TherapyService } from '../../services/therapy/therapy.service';
import { getLast7Days } from '../../analytics/functions';

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

  filtered: any[] = [];
  allAppointments: any[] = [];

  showPopup: boolean = false;
  showChartPopup: boolean = false;
  
  popupTitle = '';
  chartPopupTitle = '';
  
  popupTableData: any[] = [];
  popupTableColumns: any[] = [];
  
  chartPopupData: any;
  chartPopupDisplayType: 'bar' | 'line' | 'pie' | 'doughnut' | 'polarArea' | 'radar' | 'scatter' | 'bubble' | undefined = 'bar';
  chartDisplayOptions: any;
  
  popupDateRange: any;
  chartPopupDateRange: any;
  
  selectedTherapist: any = null;
  chartSelectedTherapist: any = null;
  currentChartType: string = '';
  popupOriginalData: any[] = [];
  dashboardDateRange: any = null;




  therapyTypeColumns = [
    { header: 'Patient Name', field: 'name' },
    { header: 'Therapy', field: 'therapyName' },
    { header: 'Date', field: 'date' },
    { header: 'Time', field: 'time' }
  ];
  
  therapistColumns = [
    { header: 'Therapist', field: 'therapistName' },
    { header: 'Patient', field: 'name' },
    { header: 'Therapy', field: 'therapyName' },
    { header: 'Date', field: 'date' }
  ];
  
  roomColumns = [
    { header: 'Room', field: 'roomNumber' },
    { header: 'Patient', field: 'name' },
    { header: 'Therapy', field: 'therapyName' },
    { header: 'Date', field: 'date' }
  ];
  
  genderColumns = [
    { header: 'Gender', field: 'gender' },
    { header: 'Patient', field: 'name' },
    { header: 'Therapy', field: 'therapyName' },
    { header: 'Date', field: 'date' }
  ];
  

  constructor(private analyticsService: TherapyService) {}

  ngOnInit(): void {
    this.analyticsService.getAllTherapyAppointments().subscribe(data => {
        
        // store full list
        this.allAppointments = data;
  
        // default filtered list = all data
        this.filtered = this.filterLastDays(7);
  
        // now generate charts normally
        this.generateTherapyAnalytics(this.filtered);
        this.generateTherapistAnalytics(this.filtered);
        this.generateRoomAnalytics(this.filtered);
        this.generateCompletionAnalytics(this.filtered);
        this.generateAvgDurationAnalytics(this.filtered);
        this.generateDailyTrend(this.filtered);
        this.generateGenderAnalytics(this.filtered);
        this.generateCleaningAnalytics(this.filtered);
        this.generateCheckinAnalytics(this.filtered);
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
  openTherapyDetails(type: string) {
    this.currentChartType = type;
  
    let data: any[] = [];
  
    switch (type) {
  
      // -----------------------------
      // 1. Therapy Type
      // -----------------------------
      case 'therapyType':
        this.popupTitle = 'Therapy Type – Details';
        data = this.filtered.map(a => ({
          patient: a.name,
          therapy: a.therapy?.name,
          date: a.date,
          time: a.time
        }));
        this.popupTableColumns = [
          { header: 'Patient', field: 'patient' },
          { header: 'Therapy', field: 'therapy' },
          { header: 'Date', field: 'date' },
          { header: 'Time', field: 'time' }
        ];
        break;
  
  
      // -----------------------------
      // 2. Therapist Wise
      // -----------------------------
      case 'therapistWise':
        this.popupTitle = 'Therapist Wise – Details';
        data = this.filtered.flatMap(a =>
          a.therapists.map((t: any) => ({
            therapist: t.therapist.name,
            patient: a.name,
            therapy: a.therapy?.name,
            date: a.date
          }))
        );
        this.popupTableColumns = [
          { header: 'Therapist', field: 'therapist' },
          { header: 'Patient', field: 'patient' },
          { header: 'Therapy', field: 'therapy' },
          { header: 'Date', field: 'date' }
        ];
        break;
  
  
      // -----------------------------
      // 3. Room Wise
      // -----------------------------
      case 'roomWise':
        this.popupTitle = 'Room Utilization – Details';
        data = this.filtered.map(a => ({
          room: a.roomNumber,
          patient: a.name,
          therapy: a.therapy?.name,
          date: a.date
        }));
        this.popupTableColumns = [
          { header: 'Room', field: 'room' },
          { header: 'Patient', field: 'patient' },
          { header: 'Therapy', field: 'therapy' },
          { header: 'Date', field: 'date' }
        ];
        break;
  
  
      // -----------------------------
      // 4. Gender Wise
      // -----------------------------
      case 'genderWise':
        this.popupTitle = 'Gender – Details';
        data = this.filtered.map(a => ({
          gender: a.gender,
          patient: a.name,
          therapy: a.therapy?.name,
          date: a.date
        }));
        this.popupTableColumns = [
          { header: 'Gender', field: 'gender' },
          { header: 'Patient', field: 'patient' },
          { header: 'Therapy', field: 'therapy' },
          { header: 'Date', field: 'date' }
        ];
        break;
  
  
      // -----------------------------
      // 5. Daily Trend
      // -----------------------------
      case 'dailyTrend':
        this.popupTitle = 'Appointments Daily Trend – Details';
        data = this.filtered.map(a => ({
          patient: a.name,
          therapy: a.therapy?.name,
          date: a.date
        }));
        this.popupTableColumns = [
          { header: 'Patient', field: 'patient' },
          { header: 'Therapy', field: 'therapy' },
          { header: 'Date', field: 'date' }
        ];
        break;
  
  
      // -----------------------------
      // 6. Avg Duration
      // -----------------------------
      case 'avgDuration':
        this.popupTitle = 'Average Duration – Details';
        data = this.filtered
          .filter(a => a.startedAt && a.finishedAt)
          .map(a => ({
            therapy: a.therapy?.name,
            patient: a.name,
            duration: Math.round((new Date(a.finishedAt).getTime() - new Date(a.startedAt).getTime()) / 60000),
            date: a.date
          }));
        this.popupTableColumns = [
          { header: 'Therapy', field: 'therapy' },
          { header: 'Patient', field: 'patient' },
          { header: 'Duration (Min)', field: 'duration' },
          { header: 'Date', field: 'date' }
        ];
        break;
  
  
      // -----------------------------
      // 7. Completion vs Cancellation
      // -----------------------------
      case 'completion':
        this.popupTitle = 'Completion / Cancellation – Details';
        data = this.filtered.map(a => ({
          patient: a.name,
          therapy: a.therapy?.name,
          status: a.cancelledAt ? 'Cancelled' : a.postponed ? 'Postponed' : a.therapyFinished ? 'Completed' : 'Pending',
          date: a.date
        }));
        this.popupTableColumns = [
          { header: 'Patient', field: 'patient' },
          { header: 'Therapy', field: 'therapy' },
          { header: 'Status', field: 'status' },
          { header: 'Date', field: 'date' }
        ];
        break;
  
  
      // -----------------------------
      // 8. Cleaning Efficiency
      // -----------------------------
      case 'cleaning':
        this.popupTitle = 'Cleaning Efficiency – Details';
        data = this.filtered.map(a => ({
          room: a.roomNumber,
          therapy: a.therapy?.name,
          cleaned: a.cleanedAfterUse ? 'Yes' : 'No',
          date: a.date
        }));
        this.popupTableColumns = [
          { header: 'Room', field: 'room' },
          { header: 'Therapy', field: 'therapy' },
          { header: 'Cleaned?', field: 'cleaned' },
          { header: 'Date', field: 'date' }
        ];
        break;
  
  
      // -----------------------------
      // 9. Check-In Analysis
      // -----------------------------
      case 'checkin':
        this.popupTitle = 'Check-In Analysis – Details';
        data = this.filtered.map(a => ({
          patient: a.name,
          checkedIn: a.checkedIn ? 'Yes' : 'No',
          therapy: a.therapy?.name,
          date: a.date
        }));
        this.popupTableColumns = [
          { header: 'Patient', field: 'patient' },
          { header: 'Therapy', field: 'therapy' },
          { header: 'Checked In?', field: 'checkedIn' },
          { header: 'Date', field: 'date' }
        ];
        break;
    }
  
    this.popupOriginalData = [...data];
    this.popupTableData = [...data];
    this.popupDateRange = null;
  
    this.showPopup = true;
  }
  
  
  showTherapyMore(type: string) {
    this.currentChartType = type;
    const last30 = this.filterLastDays(30);
  
    let labels: string[] = [];
    let values: number[] = [];
  
    switch (type) {
  
      case 'therapyType':
        const tt = this.groupBy(last30, (a: any) => a.therapy?.name);
        labels = Object.keys(tt);
        values = Object.values(tt).map((a: any) => a.length);
        this.chartPopupTitle = 'Therapy Type – Last 30 Days';
        break;
  
      case 'therapistWise':
        const tw = this.groupByMultiple(last30);
        labels = Object.keys(tw);
        values = Object.values(tw).map((a: any) => a.length);
        this.chartPopupTitle = 'Therapists – Last 30 Days';
        break;
  
      case 'roomWise':
        const rw = this.groupBy(last30, (a: any) => a.roomNumber);
        labels = Object.keys(rw);
        values = Object.values(rw).map((a: any) => a.length);
        this.chartPopupTitle = 'Room Usage – Last 30 Days';
        break;
  
      case 'genderWise':
        const gw = this.groupBy(last30, (a: any) => a.gender);
        labels = Object.keys(gw);
        values = Object.values(gw).map((a: any) => a.length);
        this.chartPopupTitle = 'Gender – Last 30 Days';
        break;
  
      case 'dailyTrend':
        const dt = this.groupBy(last30, (a: any) => new Date(a.date).toLocaleDateString());
        labels = Object.keys(dt);
        values = Object.values(dt).map((a:any)=>a.length);
        this.chartPopupTitle = 'Daily Trend – Last 30 Days';
        break;
  
      case 'avgDuration':
        const durationMap: any = {};
        last30.forEach(a => {
          if (a.startedAt && a.finishedAt) {
            const diff = Math.round((new Date(a.finishedAt).getTime() - new Date(a.startedAt).getTime()) / 60000);
            const name = a.therapy?.name;
            if (!durationMap[name]) durationMap[name] = [];
            durationMap[name].push(diff);
          }
        });
        labels = Object.keys(durationMap);
        values = Object.values(durationMap).map((a:any)=> Math.round(a.reduce((x:number,y:number)=>x+y,0) / a.length));
        this.chartPopupTitle = 'Avg Duration – Last 30 Days';
        break;
  
      case 'completion':
        labels = ['Completed', 'Cancelled', 'Postponed'];
        values = [
          last30.filter(a=>a.therapyFinished).length,
          last30.filter(a=>a.cancelledAt).length,
          last30.filter(a=>a.postponed).length,
        ];
        this.chartPopupTitle = 'Completion – Last 30 Days';
        break;
  
      case 'cleaning':
        labels = ['Cleaned', 'Not Cleaned'];
        values = [
          last30.filter(a=>a.cleanedAfterUse).length,
          last30.filter(a=>!a.cleanedAfterUse && a.therapyFinished).length
        ];
        this.chartPopupTitle = 'Cleaning – Last 30 Days';
        break;
  
      case 'checkin':
        labels = ['Checked In', 'No Show'];
        values = [
          last30.filter(a=>a.checkedIn).length,
          last30.filter(a=>!a.checkedIn).length
        ];
        this.chartPopupTitle = 'Check-in – Last 30 Days';
        break;
    }
  
    this.chartPopupData = {
      labels,
      datasets: [{ data: values }]
    };
  
    this.chartPopupDisplayType = 'bar';
    this.showChartPopup = true;
  }
  
  
  
  filterLastDays(days: number) {
    const today = new Date();
    const past = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    return this.allAppointments.filter(a => new Date(a.date) >= past);
  }
  
  groupBy(arr: any[], keyFn: any) {
    return arr.reduce((acc, obj) => {
      const key = keyFn(obj) || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(obj);
      return acc;
    }, {});
  }
  
  groupByMultiple(arr: any[]) {
    const map: any = {};
    arr.forEach(a => {
      a.therapists.forEach((t: any) => {
        const name = t.therapist.name || 'Unknown';
        if (!map[name]) map[name] = [];
        map[name].push(a);
      });
    });
    return map;
  }
  applyPopupFilters() {
    if (!this.popupDateRange || this.popupDateRange.length === 0) {
      this.popupTableData = [...this.popupOriginalData];
      return;
    }
  
    const [start, end] = this.popupDateRange;
    const to = end ? new Date(end) : new Date(start);
    to.setHours(23,59,59,999);
  
    this.popupTableData = this.popupOriginalData.filter(row => {
      const d = new Date(row.date);
      return d >= new Date(start) && d <= to;
    });
  }
  
  
  applyChartPopupFilters() {
    if (!this.chartPopupDateRange || this.chartPopupDateRange.length !== 2) return;
  
    const [start, end] = this.chartPopupDateRange;
  
    const filtered = this.allAppointments.filter(a => {
      const d = new Date(a.date);
      return d >= start && d <= end;
    });
  
    // Regenerate popup chart based on current popup chart type
    this.showTherapyMore(this.currentChartType);
  }
    
  resetChartPopupFilters() {
    this.chartPopupDateRange = [];
    this.showTherapyMore(this.currentChartType)
  }
  resetPopupFilters() {
    this.popupDateRange = null;
    this.popupTableData = [...this.popupOriginalData];
  }
  
  filterDashboard() {
    if (!this.dashboardDateRange || this.dashboardDateRange.length === 0) {
      this.filtered = this.filterLastDays(7);
    } else {
      const [start, end] = this.dashboardDateRange;
      const to = end ? new Date(end) : new Date(start);
      to.setHours(23,59,59,999);
  
      this.filtered = this.allAppointments.filter(a => {
        const d = new Date(a.date);
        return d >= new Date(start) && d <= to;
      });
    }
  
    // refresh all charts
    this.generateTherapyAnalytics(this.filtered);
    this.generateTherapistAnalytics(this.filtered);
    this.generateRoomAnalytics(this.filtered);
    this.generateCompletionAnalytics(this.filtered);
    this.generateAvgDurationAnalytics(this.filtered);
    this.generateDailyTrend(this.filtered);
    this.generateGenderAnalytics(this.filtered);
    this.generateCleaningAnalytics(this.filtered);
    this.generateCheckinAnalytics(this.filtered);
  }
  
}