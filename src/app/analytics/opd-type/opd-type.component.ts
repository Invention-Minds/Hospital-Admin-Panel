import { Component, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { getYesterdayDate, lastSelectedSevenDays, getIndividualDates, getLastThirtyDaysFromSelected } from '../functions';
import * as echarts from 'echarts'
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';

@Component({
  selector: 'app-opd-type',
  templateUrl: './opd-type.component.html',
  styleUrl: './opd-type.component.css'
})
export class OpdTypeComponent {

  constructor(private appointment: AppointmentConfirmService, private docDetails: DoctorServiceService) { }

  @Input() selectedDate: any[] = []
  @Input() doctorId: any
  processedData: any
  option: any
  chartInstance: any
  processedChartData: any

  isLoading: boolean = true

  // viewmore
  rawData: any
  department: any
  departmentValue: any
  doctors: any
  filteredDoctors: any
  showViewMore: boolean = false
  dateInput: any
  selectedViewDate: any[] = []
  selectedViewDoctor: any = 'all'
  viewMoreoption: any

  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>()

  ngOnInit() {
    const yesterdayDate = getYesterdayDate()
    this.selectedDate = [yesterdayDate]
    this.loadAppointment()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
  }
  ;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['doctorId'] && !changes['doctorId'].firstChange && this.doctorId != null) ||
      (changes['selectedDate'] && !changes['selectedDate'].firstChange && this.selectedDate != null)
    ) {
      this.loadAppointment();
    }
  }

  loadAppointment(): void {
    this.isLoading = true
    this.appointment.getAllAppointments().subscribe({
      next: (data) => {
        const mappedData = data.filter((data: any) => data.type !== null).map((entry: any) => {
          return {
            date: entry.date,
            type: entry.type,
            doctorId: entry.doctorId,
            doctor: entry.doctorName,
          }
        })
        // console.log(mappedData, "mapped data")
        this.rawData = mappedData
        this.processData(mappedData)
        this.processChartData(mappedData)
      },
      error: (error) => {
        console.log(error)
      },
      complete: () => {
        this.isLoading = false
      }
    })
  }

  inItChart(data: any): void {
    const chartContainer = document.getElementById('pieOpdType') as HTMLElement;
    this.chartInstance = echarts.init(chartContainer);

    this.option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          // Use axis to trigger tooltip
          type: 'shadow' // 'shadow' as default; can also be 'line' or 'shadow'
        }
      },
      // legend: {},
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: data.map((entry: any) => entry.date)
      },
      color : ['#91CC75', '#FAC858', '#5470C6', '#36B8B8'],
      series: [
        {
          name: 'Paid',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
          },
          emphasis: {
            focus: 'series'
          },
          data: data.map((entry: any) => entry.paid)
        },
        {
          name: 'FollowUp',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
          },
          emphasis: {
            focus: 'series'
          },
          data: data.map((entry: any) => entry.followUp)
        },
        {
          name: 'Camp',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
          },
          emphasis: {
            focus: 'series'
          },
          data: data.map((entry: any) => entry.camp)
        },
        {
          name: 'MHC',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
          },
          emphasis: {
            focus: 'series'
          },
          data: data.map((entry: any) => entry.mhc)
        },
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
    // console.log(this.processedData);
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

    this.processedChartData = Object.values(result);
    this.chartData(this.processedChartData);
  }


  chartData(data: any): void {
    const lastSevenDays = lastSelectedSevenDays(this.selectedDate[0])
    const filterredData = data.filter((data: any) => lastSevenDays.includes(data.date))
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
    this.reportInitializeDate.emit(this.selectedDate)
  };

  // viewmore

  async loadDepartments(): Promise<void> {
    try {
      const data = await this.docDetails.getDepartments().toPromise()
      this.department = data;
      // console.log(this.department)
    } catch (err) {
      console.error(err)
    }
  }

  viewmore(): void {
    this.showViewMore = true
    this.viewMoreData()
  }

  closeViewMore(): void {
    this.showViewMore = false
  }

  departmentOnchange(event: any): void {
    this.docDetails.getDoctors().subscribe(({
      next: (data: any) => {
        this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
      },
      error: (error: any) => {
        console.error(error)
      },
      complete: () => {

      }
    }))
  }

  ViewMorechart(data: any): void {
    const chartDom = document.getElementById('viewMoreEstType');
    const myChart = echarts.init(chartDom);

    this.viewMoreoption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          // Use axis to trigger tooltip
          type: 'shadow' // 'shadow' as default; can also be 'line' or 'shadow'
        }
      },
      // legend: {},
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: data.map((entry: any) => entry.date)
      },
      color : ['#91CC75', '#FAC858', '#5470C6', '#36B8B8'],
      series: [
        {
          name: 'Paid',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
          },
          emphasis: {
            focus: 'series'
          },
          data: data.map((entry: any) => entry.paid)
        },
        {
          name: 'FollowUp',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
          },
          emphasis: {
            focus: 'series'
          },
          data: data.map((entry: any) => entry.followUp)
        },
        {
          name: 'Camp',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
          },
          emphasis: {
            focus: 'series'
          },
          data: data.map((entry: any) => entry.camp)
        },
        {
          name: 'MHC',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
          },
          emphasis: {
            focus: 'series'
          },
          data: data.map((entry: any) => entry.mhc)
        },
      ]
    };

    myChart.setOption(this.viewMoreoption); // Render the chart
  }

  viewMoreData(): void {
    this.loadDepartments();

    const result = this.rawData.reduce((acc: any, entry: any) => {
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

    const processedChartData = Object.values(result);
    const filteredData = processedChartData.filter((entry:any) => this.selectedViewDate.includes(entry.date) && this.selectedViewDoctor === 'all' ? entry : this.selectedViewDoctor === entry.date)

    console.log(filteredData, "processed data")
    this.ViewMorechart(filteredData) 
   }

  viewOnDatechange(event: any): void {
    // console.log(event, 'dates')
    if (Array.isArray(event) && event.length === 2) {
      const startDate = event[0];
      let endDate;
      event[1] !== null ? endDate = event[1] : endDate = event[0]
      this.selectedViewDate = getIndividualDates(startDate, endDate);
      this.viewMoreData()
    }
  }

  viewDoctorsOnchange(event: any): void {
    console.log(event)
    this.selectedViewDoctor = parseInt(event.target.value) || 'all'
    this.viewMoreData()
  }

}



