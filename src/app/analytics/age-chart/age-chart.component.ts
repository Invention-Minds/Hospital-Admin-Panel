import { Component } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

@Component({
  selector: 'app-age-chart',
  templateUrl: './age-chart.component.html',
  styleUrl: './age-chart.component.css'
})
export class AgeChartComponent {

  constructor(private appointment : AppointmentConfirmService){}

  ngOnInit(){

  }

  loadAge():void{
    this.appointment.getAllAppointments().subscribe({
      next : (data:any) => {
        const filteredData = data.filter
      },
      error : (error) => {
        console.log(error)
      },
      complete : () => {

      }
    })
  }
}
