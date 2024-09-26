import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.css'
})
export class DashboardOverviewComponent {
  overview = [
    {
      iconPath: 'opd.png',
      number: 40,
      label: 'No. of Req Arrived',
      backgroundColor: '#8CC152'
    },
    {
      iconPath: 'calendar.png',
      number: 40,
      label: 'No. of Confirmed',
      backgroundColor: '#FFFFFF'
    },
    {
      iconPath: 'stethoscope.png',
      number: 12,
      label: 'No. of Cancelled',
      backgroundColor: '#FFD700'
    },

  ];
}
