import { Component, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as echarts from 'echarts'
import { request } from 'http';
import { countByDate, processAppointmentData } from '../data';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnChanges{
  constructor(private appointment: AppointmentConfirmService) { }

  dates: any
  appointmentCount: any = {
    request: '',
    confirm: '',
    completed: '',
    cancelled: ''
  }
  doctor: any
  chartoption: any
  @Input() doctorId: any

  ngOnInit(): void {
    // this.doctor = 'all'
    this.appointmentData()
    console.log(this.doctor + "from analytics")
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['doctorId']){
      this.appointmentData()
    }
  }

  appointmentData(): void {
    this.appointment.getAllAppointments().subscribe((data) => {

      const completedDate = data.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "completed") : (appointment.status === 'completed' && this.doctorId === appointment.doctorId))
      const requestData = data.filter((appointment : any) => this.doctorId === 'all' ? appointment : this.doctorId === appointment.doctorId)
      const comfirmData = data.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "confirmed") : (appointment.status === 'confirmed' && this.doctorId === appointment.doctorId))
      const cancelData = data.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "cancelled") : (appointment.status === 'cancelled' && this.doctorId === appointment.doctorId))

      const requests = countByDate(requestData, 'date');
      this.dates = Object.keys(requests).sort();  // Sort dates only once

      this.appointmentCount.request = processAppointmentData(requestData, this.dates);
      this.appointmentCount.completed = processAppointmentData(completedDate, this.dates);
      this.appointmentCount.confirm = processAppointmentData(comfirmData, this.dates);
      this.appointmentCount.cancelled = processAppointmentData(cancelData, this.dates);

      console.log(this.dates)
      console.log(this.appointmentCount)
      console.log(requestData + " request data")

      this.chart()
    })
  }

  chart(): void {
    this.chartoption = {
      title: {
        text: 'OPD Count',
        left: '1%'
      },
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '5%',
        right: '15%',
        bottom: '10%'
      },
      xAxis: {
        type: 'category',
        data: this.dates
      },
      yAxis: {
        type: 'value'
      },
      toolbox: {
        right: 10,
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          restore: {},
          saveAsImage: {}
        }
      },
      dataZoom: [
        {
          type: 'slider',   // Allows users to zoom in/out manually
          start: 0,         // Show all data from the beginning
          end: 100,         // Ensure full range is visible
          xAxisIndex: 0     // Apply zooming on x-axis
        },
        {
          type: 'inside'    // Allows zooming via scrolling
        }
      ],
      series: [
        {
          name: 'Total',
          type: 'line',
          data: this.appointmentCount.request,
        },
        {
          name: 'Confirmed',
          type: 'line',
          data: this.appointmentCount.confirm,
        },
        {
          name: 'Completed',
          type: 'line',
          data: this.appointmentCount.completed,
        },
        {
          name: 'Cancelled',
          type: 'line',
          data: this.appointmentCount.cancelled,
        },
      ]
    };
  }

}