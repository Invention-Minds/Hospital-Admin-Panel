import { Component } from '@angular/core';

@Component({
  selector: 'app-overview-radiology',
  templateUrl: './overview-radiology.component.html',
  styleUrl: './overview-radiology.component.css'
})
export class OverviewRadiologyComponent {
activeComponent: string = 'confirmed';

constructor(){}

showConfirmedAppointments(){
    this.activeComponent = 'confirmed'
}
}
