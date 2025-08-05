import { Component } from '@angular/core';


@Component({
  selector: 'app-ot-overview',
  templateUrl: './ot-overview.component.html',
  styleUrl: './ot-overview.component.css'
})
export class OtOverviewComponent {
  activeComponent: string = 'today';
  showConfirmedAppointments(){
    this.activeComponent = 'today'
}
}
