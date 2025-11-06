import { Component } from '@angular/core';
import { TherapistApptsComponent } from "../therapist-appts/therapist-appts.component";

@Component({
  selector: 'app-therapist-overview',
  templateUrl: './therapist-overview.component.html',
  styleUrl: './therapist-overview.component.css',
})
export class TherapistOverviewComponent {
  activeComponent: string = 'confirmed';

  constructor(){}
  
  showConfirmedAppointments(){
      this.activeComponent = 'confirmed'
  }
}
