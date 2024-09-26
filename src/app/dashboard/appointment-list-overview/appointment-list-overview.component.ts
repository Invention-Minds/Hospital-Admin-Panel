import { Component } from '@angular/core';

@Component({
  selector: 'app-appointment-list-overview',
  templateUrl: './appointment-list-overview.component.html',
  styleUrl: './appointment-list-overview.component.css'
})
export class AppointmentListOverviewComponent {
  appointments = [
    { patientName: 'Ramesh Kumar', doctorName: 'Dr. Jacob Ryan', apptDate: '2024-07-12', apptTime: '10:00 to 10:15' },
    { patientName: 'Ramesh Kumar', doctorName: 'Dr. Jacob Ryan', apptDate: '2024-07-12', apptTime: '10:00 to 10:15' },
    { patientName: 'Ramesh Kumar', doctorName: 'Dr. Jacob Ryan', apptDate: '2024-07-12', apptTime: '10:00 to 10:15' },
    { patientName: 'Ramesh Kumar', doctorName: 'Dr. Jacob Ryan', apptDate: '2024-07-12', apptTime: '10:00 to 10:15' },
  ];
}
