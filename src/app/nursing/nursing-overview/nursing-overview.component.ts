import { Component } from '@angular/core';

@Component({
  selector: 'app-nursing-overview',
  templateUrl: './nursing-overview.component.html',
  styleUrl: './nursing-overview.component.css'
})

export class NursingOverviewComponent {
  activeComponent: string = 'vitals';

  showAppointmentRequests() {
    this.activeComponent = 'vitals';
  }




}