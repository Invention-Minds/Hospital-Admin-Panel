import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service'; 
import { getYesterdayDate } from '../functions';
import { error } from 'console';

@Component({
  selector: 'app-average-waiting-time',
  templateUrl: './average-waiting-time.component.html',
  styleUrls: ['./average-waiting-time.component.css']
})
export class AverageWaitingTimeComponent implements OnInit, OnChanges {

  constructor(private appointment: AppointmentConfirmService) {}

  option: any;
  @Input() department: string = 'EMERGENCY MEDICINE';
  @Input() date: any[] = [];
  waitingData: any = {
    doctorNames: [], // Renamed for clarity
    more_than_twenty_min: [] // Should hold counts for the chart
  };

  isLoading : boolean = true

  @Output() reportView = new EventEmitter<{onoff: boolean, range: any}>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();

  ngOnInit(): void {
    const yersterDay = getYesterdayDate()
    this.date = [yersterDay]
    this.loadWaitingTime(this.date);
    this.department = ''
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes["date"] || changes["department"]) {
      this.loadWaitingTime(this.date);
    }
  }

  initChart(): void {
    const chartDom = document.getElementById('horizontal-bar-charts')!;
    const myChart = echarts.init(chartDom);

    this.option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: this.waitingData.doctorNames, // Using doctorNames for categories
          axisTick: {
            alignWithLabel: true
          }
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: [
        {
          name: 'More than 40 min',
          type: 'bar',
          barWidth: '60%',
          data: this.waitingData.more_than_twenty_min // Correct data array for the chart
        }
      ]
    };

    myChart.setOption(this.option);
  }

  loadWaitingTime(date: any[]): void {
    this.isLoading = true
    this.appointment.getAllAppointments().subscribe({
      next : (data) => {
        const filteredData = data.filter((entry: any) => date.includes(entry.date) && entry.department === this.department);
        const formattedData: any[] = [];
    
        filteredData.forEach((entry: any) => {
          if (entry.waitingTime !== null) {
            let range: string;
  
            // Categorize waiting times into the correct range
            if (entry.waitingTime <= 5) {
              range = 'five_min';
            } else if (entry.waitingTime <= 10) {
              range = 'ten_min';
            } else if (entry.waitingTime <= 15) {
              range = 'fifteen_min';
            } else if (entry.waitingTime <= 40) {
              range = 'twenty_min';
            } else {
              range = 'more_than_twenty_min';
            }
  
            const existingEntry = formattedData.find(
              (entryData) => entryData.date === entry.date && entryData.doctorId === entry.doctorId && entryData.departmentName === this.department && entryData.doctorName === entry.doctorName
            );
  
            if (existingEntry) {
              existingEntry[range] += 1; // Increment the count for the range
            } else {
              formattedData.push({
                date: entry.date,
                doctorId: entry.doctorId,
                doctorName: entry.doctorName,
                departmentName: entry.department,
                five_min: range === 'five_min' ? 1 : 0,
                ten_min: range === 'ten_min' ? 1 : 0,
                fifteen_min: range === 'fifteen_min' ? 1 : 0,
                twenty_min: range === 'twenty_min' ? 1 : 0,
                more_than_twenty_min: range === 'more_than_twenty_min' ? 1 : 0
              });
            }
          }
        });
        // Format the data for the chart
        this.waitingData.doctorNames = formattedData.map((entry: any) => entry.doctorName);
        this.waitingData.more_than_twenty_min = formattedData.map((entry: any) => entry.more_than_twenty_min);
        this.initChart();
      },
      error:(error) => {
        console.log(error)
      },
      complete:() => {
        this.isLoading = false
      }
    });
  }

  report(): void {
    this.appointment.getAllAppointments().subscribe((data) => {
      const formattedData: any[] = [];
  
      data.forEach((entry: any) => {
        if (entry.waitingTime !== null) {
          let range: string;
          if (entry.waitingTime <= 5) {
            range = 'five_min';
          } else if (entry.waitingTime <= 10) {
            range = 'ten_min';
          } else if (entry.waitingTime <= 15) {
            range = 'fifteen_min';
          } else if (entry.waitingTime <= 20) {
            range = 'twenty_min';
          } else {
            range = 'more_than_twenty_min';
          }

          const existingEntry = formattedData.find(
            (entryData) => entryData.date === entry.date && entryData.doctorId === entry.doctorId && entryData.departmentName === this.department && entryData.doctorName === entry.doctorName
          );

          if (existingEntry) {
            existingEntry[range] += 1;
          } else {
            formattedData.push({
              date: entry.date,
              doctorId: entry.doctorId,
              doctorName: entry.doctorName,
              departmentName: entry.department,
              five_min: range === 'five_min' ? 1 : 0,
              ten_min: range === 'ten_min' ? 1 : 0,
              fifteen_min: range === 'fifteen_min' ? 1 : 0,
              twenty_min: range === 'twenty_min' ? 1 : 0,
              more_than_twenty_min: range === 'more_than_twenty_min' ? 1 : 0
            });
          }
        }
      });

      this.reportData.emit(formattedData);

      const reportColumn = [
        { header: 'Date', key: 'date' },
        { header: 'Doctor', key: 'doctorName' },
        { header: 'Department', key: 'departmentName' },
        { header: '0 - 5 min', key: 'five_min' },
        { header: '5 - 10 min', key: 'ten_min' },
        { header: '10 - 15 min', key: 'fifteen_min' },
        { header: '15 - 20 min', key: 'twenty_min' },
        { header: 'More than 20 mins', key: 'more_than_twenty_min' }
      ];

      this.reportsColumn.emit(reportColumn);
      this.reportView.emit({ onoff: true, range: 'range' });
    });
  }
}
