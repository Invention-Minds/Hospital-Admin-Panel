import { Component } from '@angular/core';

@Component({
  selector: 'app-doctors-list-overview',
  templateUrl: './doctors-list-overview.component.html',
  styleUrl: './doctors-list-overview.component.css'
})
export class DoctorsListOverviewComponent {
  doctors = [
    { name: 'Dr. Jacob Ryan', status: 'Available', image: '/icons/male-doctor.png' },
    { name: 'Dr. Rubina Delayer', status: 'Available', image: '/icons/female-doctor.png' },
    { name: 'Dr. Smith Rayen', status: 'Available', image: '/icons/female-doctor.png' },
    { name: 'Dr. Jacob Ryan', status: 'Unavailable', image: '/icons/male-doctor.png' },
  ];
}
