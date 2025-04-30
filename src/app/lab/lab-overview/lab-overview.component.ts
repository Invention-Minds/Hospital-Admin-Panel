import { Component } from '@angular/core';

@Component({
  selector: 'app-lab-overview',
  templateUrl: './lab-overview.component.html',
  styleUrl: './lab-overview.component.css'
})
export class LabOverviewComponent {
  activeComponent: string = 'confirmed';

  constructor(){}
  
  showConfirmedAppointments(){
      this.activeComponent = 'confirmed'
  }
}
