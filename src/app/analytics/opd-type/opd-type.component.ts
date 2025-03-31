import { Component, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { getYesterdayDate, lastSelectedSevenDays, getIndividualDates, getLastThirtyDaysFromSelected, reorderDateFormat, sortByDateOldToNew, getLastSevenDays, captureScreenshot } from '../functions';
import * as echarts from 'echarts'
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-opd-type',
  templateUrl: './opd-type.component.html',
  styleUrl: './opd-type.component.css'
})
export class OpdTypeComponent {

  constructor(private appointment: AppointmentConfirmService, private docDetails: DoctorServiceService, private messageService : MessageService) { }

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
  departmentValue: any = 'all'
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
  @Output() blockFilters = new EventEmitter<boolean[]>();
  @Output() reportName = new EventEmitter<string>();

  // screenshot

  screenShot : Function = captureScreenshot

  ngOnInit() {
    const yesterdayDate = getYesterdayDate()
    this.selectedDate = getLastSevenDays()
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
            department: entry.department
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
        data: reorderDateFormat(data.map((entry: any) => entry.date)),
        axisLabel: {
          fontSize: 10,
          margin: 10,
          rotate: 30
        }
      },
      color: ['#91CC75', '#FAC858', '#5470C6', '#FF4545'],
      series: [
        {
          name: 'Paid',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params: any) {
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
            formatter: function (params: any) {
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
            formatter: function (params: any) {
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
            formatter: function (params: any) {
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
      const { date, doctorId, doctor, type, department } = entry;

      // Create a unique key combining date and doctorId
      const key = `${date}-${doctorId}-${department}`;

      // Initialize the result structure if it doesn't exist for the key
      if (!acc[key]) {
        acc[key] = {
          doctorId: doctorId,
          date: date,
          doctorName: doctor,
          departmentName: department,
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
    const lastSevenDays = this.selectedDate
    const completedData = this.fillMissingDates(data, lastSevenDays);
    this.inItChart(completedData);
  }
  
  // Helper function to ensure missing dates have zero values
  fillMissingDates(data: any[], lastSevenDays: string[]): any[] {
    return lastSevenDays.map((date) => {
      const existingEntry = data.find((entry) => entry.date === date);
      return existingEntry ? existingEntry : { date, followUp: 0, paid: 0, camp: 0, mhc: 0 };
    });
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
    this.blockFilters.emit([false, false])
    this.reportName.emit('OPD Type')
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
    this.loadDepartments();
    this.viewMoreData()
  }

  closeViewMore(): void {
    this.showViewMore = false
  }

  departmentOnchange(event: any): void {
    this.docDetails.getDoctors().subscribe(({
      next: (data: any) => {
        this.selectedViewDoctor = 'all'
        this.departmentValue = this.department.filter((entry: any) => entry.id === parseInt(event.target.value))[0].name
        this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
        console.log(this.departmentValue)
        this.viewMoreData()
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
        data: reorderDateFormat(data.map((entry: any) => entry.date))
      },
      color: ['#91CC75', '#FAC858', '#5470C6', '#FF4545'],
      series: [
        {
          name: 'Paid',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            formatter: function (params: any) {
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
            formatter: function (params: any) {
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
            formatter: function (params: any) {
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
            formatter: function (params: any) {
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
    const filter = this.rawData.filter((entry: any) =>
      this.selectedViewDate.includes(entry.date) &&
      (this.departmentValue === 'all' ? true : this.departmentValue === entry.department) &&
      (this.selectedViewDoctor === 'all' ? true : this.selectedViewDoctor === entry.doctorId)
    );

    console.log(this.rawData.map((entry: any) => entry.department))

    const result = filter.reduce((acc: any, entry: any) => {
      const { date, type } = entry;
      ;
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
    const sorteddata = sortByDateOldToNew(processedChartData, 'date')
    console.log(sorteddata, "sortedData")
    // const filteredData = sorteddata.filter((entry:any) => this.selectedViewDate.includes(entry.date) && this.selectedViewDoctor === 'all' ? this.selectedViewDate.includes(entry.date) : this.selectedViewDoctor === entry.doctorId)

    console.log(sorteddata, "processed data")
    this.ViewMorechart(sorteddata)
  }

  // viewOnDatechange(event: any): void {
  //   if (Array.isArray(event) && event.length === 2) {
  //     const startDate = event[0];
  //     let endDate;
  //     event[1] !== null ? endDate = event[1] : endDate = event[0]
  //     this.selectedViewDate = getIndividualDates(startDate, endDate);
  //     this.viewMoreData()
  //   }
  // }

  viewOnDatechange(event: any): void {
    if (Array.isArray(event)) {
      if (event.length === 2) {
        const startDate = new Date(event[0]);
        let endDate = event[1] !== null ? new Date(event[1]) : new Date(event[0]);

        // Calculate the difference in days (just for validation, should not exceed 30 due to maxDate)
        const timeDifference = endDate.getTime() - startDate.getTime();
        const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

        if (dayDifference > 30) {
          // This should not happen due to maxDate restriction, but keeping as fallback
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 29); // +29 for 30-day range including start
          this.showToast("Date range cannot exceed 30 days. To view more, click on the 'Details' button.", 'warn');
          this.dateInput = [startDate, endDate]; // Update the range
        }

        this.selectedViewDate = this.getIndividualDates(startDate, endDate);
        console.log(this.selectedViewDate);
      } else if (event.length === 1) {
        const startDate = new Date(event[0]);
        const endDate = startDate;
        this.selectedViewDate = this.getIndividualDates(startDate, endDate);
        this.dateInput = [startDate, endDate];
        console.log(this.selectedViewDate);
      }
      this.viewMoreData()
    }
  }

  showToast(message: string, type: string) {
    this.messageService.add({ severity: type, summary: message });
  }

  getIndividualDates(startDate: Date, endDate: Date): string[] {
    const dates = [];
    let currentDate = new Date(startDate);

    // Loop through dates from startDate to endDate
    while (currentDate <= endDate) {
      const formattedDate = this.formatDate(currentDate); // Format each date
      dates.push(formattedDate);
      currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }
    return dates;
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based, so add 1
    const day = date.getDate().toString().padStart(2, '0'); // Pad single digits with a leading zero

    return `${year}-${month}-${day}`;
  }

  viewDoctorsOnchange(event: any): void {
    console.log(event)
    this.selectedViewDoctor = parseInt(event.target.value) || 'all'
    this.viewMoreData()
  }

  refresh(): void {
    this.loadDepartments()
    this.filteredDoctors = []
    this.selectedViewDate = []
    this.departmentValue = 'all'
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.selectedViewDoctor = 'all'
    this.viewmore()
    this.dateInput = []
  }

}



