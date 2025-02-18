import { Component, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { getYesterdayDate, lastSelectedSevenDays } from '../functions';
import * as echarts from 'echarts'

@Component({
  selector: 'app-opd-type',
  templateUrl: './opd-type.component.html',
  styleUrl: './opd-type.component.css'
})
export class OpdTypeComponent {

  constructor(private appointment: AppointmentConfirmService) { }

  @Input() selectedDate: any[] = []
  @Input() doctorId: any
  processedData: any
  option: any
  chartInstance: any
  processedChartData: any

  // isLoading : boolean = true

  ngOnInit() {
    const yesterdayDate = getYesterdayDate()
    this.selectedDate = [yesterdayDate]
    this.loadAppointment()
  }

  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['doctorId'] && !changes['doctorId'].firstChange && this.doctorId != null) ||
      (changes['selectedDate'] && !changes['selectedDate'].firstChange && this.selectedDate != null)
    ) {
      this.loadAppointment();
    }
  }

  loadAppointment(): void {
    this.appointment.getAllAppointments().subscribe({
      next : (data) => {
        const mappedData = data.filter((data: any) => data.type !== null).map((entry: any) => {
          return {
            date: entry.date,
            type: entry.type,
            doctorId: entry.doctorId,
            doctor: entry.doctorName,
          }
        })
        console.log(mappedData, "mapped data")
  
        this.processData(mappedData)
        this.processChartData(mappedData)
      },
      error : (error) => {
        console.log(error)
      },
      complete : () => {
        // this.isLoading = false
      }
    })
  }

  inItChart(data: any): void {
    const chartContainer = document.getElementById('pieOpdType') as HTMLElement;
    this.chartInstance = echarts.init(chartContainer);

    this.option = {
      angleAxis: {},
      radiusAxis: {
        type: 'category',
        data: data.map((entry: any) => entry.date),
        z: 10
      },
      polar: {},
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          type: 'bar',
          data: data.map((entry: any) => entry.followUp),
          coordinateSystem: 'polar',
          name: 'Follow-up',
          stack: 'a',
          emphasis: {
            focus: 'series'
          },
          itemStyle: {
            color: '#FAC858'
          }
        },
        {
          type: 'bar',
          data: data.map((entry: any) => entry.paid),
          coordinateSystem: 'polar',
          name: 'Paid',
          stack: 'a',
          emphasis: {
            focus: 'series'
          },
          itemStyle: {
            color : '#91CC75'
          }
        },
        {
          type: 'bar',
          data: data.map((entry: any) => entry.camp),
          coordinateSystem: 'polar',
          name: 'Camp',
          stack: 'a',
          emphasis: {
            focus: 'series'
          },
          itemStyle: {
            color : '#5470C6'
          }
        },
        {
          type: 'bar',
          data: data.map((entry: any) => entry.mhc),
          coordinateSystem: 'polar',
          name: 'MHC',
          stack: 'a',
          emphasis: {
            focus: 'series'
          },
          itemStyle: {
            color : '#FF4545'
          }
        }
      ]
    };

    this.chartInstance.setOption(this.option);
  }


  processData(rawData: any[]): void {
    const result = rawData.reduce((acc: any, entry: any) => {
      const { date, doctorId, doctor, type } = entry;

      // Create a unique key combining date and doctorId
      const key = `${date}-${doctorId}`;

      // Initialize the result structure if it doesn't exist for the key
      if (!acc[key]) {
        acc[key] = {
          doctorId: doctorId,
          date: date,
          doctorName: doctor,
          followUp: 0,
          paid: 0,
          camp: 0,
          mhc: 0
        };
      }

      // Increment the count for the respective type
      if (type === 'followUp') {
        acc[key].followUp += 1;
      } else if (type === 'paid') {
        acc[key].paid += 1;
      } else if (type === 'camp') {
        acc[key].camp += 1;
      } else if (type === 'mhc') {
        acc[key].mhc += 1;
      }

      return acc;
    }, {});

    // Convert the result object into an array for easier use
    this.processedData = Object.values(result);
    console.log(this.processedData);
    this.chartData(this.processedData);
  }

  processChartData(rawData: any[]): void {
    const result = rawData.reduce((acc: any, entry: any) => {
      const { date, type } = entry;

      // Initialize the result structure for the date if it doesn't exist
      if (!acc[date]) {
        acc[date] = {
          date: date,
          followUp: 0,
          paid: 0,
          camp: 0,
          mhc: 0
        };
      }

      // Increment the count for the respective type
      if (type === 'followUp') {
        acc[date].followUp += 1;
      } else if (type === 'paid') {
        acc[date].paid += 1;
      } else if (type === 'camp') {
        acc[date].camp += 1;
      } else if (type === 'mhc') {
        acc[date].mhc += 1;
      }

      return acc;
    }, {});

    // Convert the result object into an array for easier use
    this.processedChartData = Object.values(result);
    console.log(this.processedChartData), "processed data";

    // Now call chartData with the processed data
    this.chartData(this.processedChartData);
  }


  chartData(data: any): void {
    console.log(this.doctorId, "doctor id")
    const lastSevenDays = lastSelectedSevenDays(this.selectedDate[0])
    console.log(lastSevenDays, "last seven days from opd type")
    const filterredData = data.filter((data: any) => lastSevenDays.includes(data.date))
    console.log(filterredData, "filtered data from chart data")
    this.inItChart(filterredData)
  }

  report(): void {
    this.reportData.emit(this.processedData);

    const reportColumn = [
      { header: 'Date', key: 'date' },
      { header: 'Doctor Name', key: 'doctorName' },
      { header: 'Follow-Up', key: 'followUp' },
      { header: 'Paid', key: 'paid' },
      { header: 'MHC', key: 'mhc' },
      { header: 'Camp', key: 'camp' },
    ];

    this.reportsColumn.emit(reportColumn);
    this.reportView.emit({ onoff: true, range: 'range' });
  };
}



