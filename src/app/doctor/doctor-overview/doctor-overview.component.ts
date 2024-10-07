import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-doctor-overview',
  templateUrl: './doctor-overview.component.html',
  styleUrl: './doctor-overview.component.css'
})
export class DoctorOverviewComponent {
  constructor(private router: Router) {}
  activeComponent: string = 'availability';

  showDoctorAvailability() {
    this.activeComponent = 'availability';
  }
  showDoctorDetails() {
    this.activeComponent = 'details';
  }
}
