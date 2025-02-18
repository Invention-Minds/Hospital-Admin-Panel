import { Component, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { countByDate, processAppointmentData } from '../functions';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { map } from 'rxjs/operators';
import { getLastSevenDays } from '../functions';
import { error } from 'console';
import * as echarts from 'echarts';

@Component({
  selector: 'app-opd-overview',
  templateUrl: './opd-overview.component.html',
  styleUrl: './opd-overview.component.css'
})
export class OpdOverviewComponent {
constructor(private appointment: AppointmentConfirmService) { }

  dates: any
  appointmentCount: any = {
    request: '',
    confirm: '',
    completed: '',
    cancelled: '',
    pending: ''
  }
  doctor: any
  chartoption: any
  @Input() selectedDate : any[] = [""]
  @Input() doctorId: any

  // report variables
  reportAppointmentData : any;
  @Output() reportView = new EventEmitter<{onoff: boolean, range: any}>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();

  // loading
  isLoading : boolean = true

  ngOnInit(): void {
    this.appointmentData()
    // console.log(this.doctor + "from analytics")
    this.selectedDate = getLastSevenDays()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if((changes['doctorId'] && !changes['doctorId'].firstChange) || (changes['selectedDate'] && !changes['selectedDate'].firstChange)){
      this.appointmentData()
    }
  }

  appointmentData(): void {
    this.isLoading = true
    this.appointment.getAllAppointments().subscribe({

      next : (data) => {
        const dateFilteredAppointments = data.filter((data:any) => this.selectedDate.includes(data.date))

        const completedDate = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "completed") : (appointment.status === 'completed' && this.doctorId === appointment.doctorId))
        const requestData = dateFilteredAppointments.filter((appointment : any) => this.doctorId === 'all' ? appointment : this.doctorId === appointment.doctorId)
        const comfirmData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "confirmed") : (appointment.status === 'confirmed' && this.doctorId === appointment.doctorId))
        const cancelData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "cancelled") : (appointment.status === 'cancelled' && this.doctorId === appointment.doctorId))
        const pendingData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "pending") : (appointment.status === 'pending' && this.doctorId === appointment.doctorId))
  
        const requests = countByDate(requestData, 'date');
        this.dates = Object.keys(requests).sort();
  
        this.appointmentCount.request = processAppointmentData(requestData, this.dates);
        this.appointmentCount.completed = processAppointmentData(completedDate, this.dates);
        this.appointmentCount.confirm = processAppointmentData(comfirmData, this.dates);
        this.appointmentCount.cancelled = processAppointmentData(cancelData, this.dates);
        this.appointmentCount.pending = processAppointmentData(pendingData, this.dates);
  
        this.chart()
      },
      error:(error) => {
        console.log(error)
      },
      complete:() => {
        this.isLoading = false
      }
    } 
    )
  }

  chart(): void {
    const chartDom = document.getElementById('opdOverview')!;
    const myChart = echarts.init(chartDom);
    this.chartoption = {
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
        type: 'value',
      },
      dataZoom: [
        {
          type: 'slider',   // Allows users to zoom in/out manually
          start: 0,         // Show all data from the beginning
          end: 100,         // Ensure full range is visible
          xAxisIndex: 0,    // Apply zooming on x-axis
          top : 15,
          left : 15,
          height: 15, 
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
          itemStyle : {
            color : "#2CAFFE"
          }
        },
        {
          name: 'Confirmed',
          type: 'line',
          data: this.appointmentCount.confirm,
          itemStyle : {
            color : "#00E272"
          }
        },
        {
          name: 'Completed',
          type: 'line',
          data: this.appointmentCount.completed,
          itemStyle : {
            color : "#544FC5"
          }
        },
        {
          name: 'Cancelled',
          type: 'line',
          data: this.appointmentCount.cancelled,
          itemStyle : {
            color : "#6B8ABC"
          }
        },
        {
          name: 'Pending',
          type: 'line',
          data: this.appointmentCount.pending,
          itemStyle : {
            color : "yellow"
          }
        },
      ]
    };
    myChart.setOption(this.chartoption); // Render the chart
  }

  overviewReport() {
    this.appointment.getAllAppointments().pipe(
      map((data: any) => {
        const groupedByDate: { [key: string]: any } = {};
  
        data.forEach((item: any) => {
          const date = item.date;
          const doctorId = item.doctorId;
          const doctorName = item.doctorName;
  
          if (!groupedByDate[date]) {
            groupedByDate[date] = {}; 
          }
  
          if (!groupedByDate[date][doctorId]) {
            groupedByDate[date][doctorId] = {}; 
          }
  
          if (!groupedByDate[date][doctorId][doctorName]) {
            groupedByDate[date][doctorId][doctorName] = {
              date: date,
              doctorId: doctorId,
              doctorName: doctorName,
              totalRequest: 0,
              confirmed: 0,
              cancelled: 0,
              completed: 0,
              pending : 0,
            };
          }
  
          // Increment the respective status count
          groupedByDate[date][doctorId][doctorName].totalRequest += 1; // Increment total requests
  
          if (item.status === 'confirmed') {
            groupedByDate[date][doctorId][doctorName].confirmed += 1;
          }
  
          if (item.status === 'cancelled') {
            groupedByDate[date][doctorId][doctorName].cancelled += 1;
          }
  
          if (item.status === 'completed') {
            groupedByDate[date][doctorId][doctorName].completed += 1;
          }

          if (item.status === 'pending'){
            groupedByDate[date][doctorId][doctorName].pending += 1;
          }
        });
  
        // Flatten the grouped data for easier display
        const groupedData = [];
        for (const date in groupedByDate) {
          for (const doctorId in groupedByDate[date]) {
            for (const doctorName in groupedByDate[date][doctorId]) {
              groupedData.push(groupedByDate[date][doctorId][doctorName]);
            }
          }
        }
  
        return groupedData;
      })
    )
    .subscribe({
      next: (groupedData) => {
        this.reportData.emit(groupedData)
        // console.log(groupedData)
      },
      error: (error) => {
        console.error(error); // Handle errors
      },
      complete: () => {
        const reportColumn = [
          {header : "Date", key : "date"},
          {header : "Total Appointments", key : "totalRequest"},
          {header : "Doctor Name", key : "doctorName"},
          {header : "Confirmed", key : "confirmed"},
          {header : "Cancelled", key : "cancelled"},
          {header : "Completed", key : "completed"},
          {header : "Pending", key : "pending"}
        ]

        this.reportsColumn.emit(reportColumn)
        this.reportView.emit({onoff : true, range : "range"})
      }
    });
  }

}
