import { Component,Input, OnChanges, SimpleChanges } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as echarts from 'echarts';
import { download, countByDate, filteredAppointments } from '../data';

@Component({
  selector: 'app-opd-request',
  templateUrl: './opd-request.component.html',
  styleUrl: './opd-request.component.css'
})
export class OpdRequestComponent implements OnChanges{
  constructor(private appointment : AppointmentConfirmService){}

  appVia : any
  walkIn : any
  call : any
  online : any 
  chartInstance : any
  @Input() doctorId :any
  @Input() date:any
  requestType = {
    WALK_IN: 'Walk-In',
    CALL: 'Call',
    ONLINE: 'Online',
  }as const

  ngOnInit(){
    this.appointmentData()
    console.log(this.doctorId)
    console.log(this.date)
    console.log(this.doctorId)
  }
  
  appointmentData(): void {
    this.appointment.getAllAppointments().subscribe((data) => {
      const walkInData = filteredAppointments(data, this.requestType.WALK_IN, this.doctorId, this.date);
      const callData = filteredAppointments(data, this.requestType.CALL, this.doctorId, this.date);
      const onlineData = filteredAppointments(data, this.requestType.ONLINE, this.doctorId, this.date);
  
      console.log(walkInData, "walkin");
      console.log(callData, "call");
      console.log(onlineData, "online");
  
      this.walkIn = Object.values(countByDate(walkInData, 'requestVia'));
      this.online = Object.values(countByDate(onlineData, 'requestVia'));
      this.call = Object.values(countByDate(callData, 'requestVia'));
  
      this.chart();

      console.log(this.date)
    });
  }

  chart(): void {
    const chartContainer = document.getElementById('chart-container') as HTMLElement;
    this.chartInstance = echarts.init(chartContainer);


    const chartOptions = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        top: '5%',
        left: 'center'
      },
      series: [
        {
          name: 'Access From',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 25,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: this.call, name: 'Call' },
            { value: this.online, name: 'Online' },
            { value: this.walkIn, name: 'Walk-in' },
          ]
        }
      ]
    };

    this.chartInstance.setOption(chartOptions);
  }

  downloadChart() {
    download("pie-chart",this.chartInstance)
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('Changes detected:', changes);
    console.log('Current date:', this.date, 'Type:', typeof this.date);
  
    if (
      (changes['doctorId'] && !changes['doctorId'].firstChange && this.doctorId != null) ||
      (changes['date'] && !changes['date'].firstChange && this.date != null)
    ) {
      this.appointmentData();
      console.log(this.date)
    }
  }
}
