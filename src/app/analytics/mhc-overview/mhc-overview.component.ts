import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { getYesterdayDate, getIndividualDates, getLastThirtyDaysFromSelected } from '../functions'
import { TextAlignment } from 'pdf-lib';

@Component({
  selector: 'app-mhc-overview',
  templateUrl: './mhc-overview.component.html',
  styleUrls: ['./mhc-overview.component.css'] // Fixed typo from styleUrl to styleUrls
})
export class MhcOverviewComponent implements OnChanges {

  constructor(private healthCheckup: HealthCheckupServiceService, private docDetails: DoctorServiceService) { }

  option: any;
  overViewData: any;
  dataForPiehart: any;
  @Input() selectedDate: any[] = []

  isLoading: boolean = true

  // report data
  reportAppointmentData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();

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
  packagesName : any

  ngOnInit() {
    this.selectedDate = [getYesterdayDate()]
    this.getAllPackages();
    this.selectedViewDate = getLastThirtyDaysFromSelected()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']) {
      this.getAllPackages()
    }
  }


  initChart(): void {
    const chartDom = document.getElementById('mhc-chart')!;
    const myChart = echarts.init(chartDom);

    // Use the dataForPiechart array directly, which includes name, value, and itemStyle.color
    const chartData = this.dataForPiehart;

    this.option = {
      tooltip: {
        trigger: 'item',
      },

      series: [
        {
          name: 'Health Checkups',
          type: 'pie',
          radius: '70%',
          center: ['50%', '60%'],
          data: chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: true,
            formatter: '{c}',
            position: 'inside',
            fontSize: 14,
            color: '#fff',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            TextAlignment: 'center',
          },
          labelLine: {
            show: false
          }
        }
      ]
    };

    myChart.setOption(this.option); // Render the chart
  }

  getAllPackages(): void {
    this.isLoading = true
    this.healthCheckup.getPackages().subscribe({
      next: (pack) => {
        this.packagesName = pack.map((name:any) => {
          return{
            id : name.id,
            name : name.name,
          }
        })
        // console.log(this.packagesName, "mhc poackages")
        this.healthCheckup.getAllServices().subscribe((data: any) => {

          const formatDate = (date: string): string => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          const packageMap = pack.reduce((map: any, entry: any) => {
            map[entry.id] = entry.name;
            return map;
          }, {});

          const result: any = {};

          data.forEach((entry: any) => {
            const { appointmentDate, appointmentStatus, packageId } = entry;
            const date = appointmentDate;

            const key = `${date}-${packageId}`;

            if (!result[key]) {
              result[key] = {
                date: date,
                packageId: packageId,
                packageName: packageMap[packageId],
                confirmed: 0,
                cancelled: 0,
                pending: 0,
                completed: 0,
                total: 0,
              };
            }

            if (appointmentStatus === "Confirm") {
              result[key].confirmed += 1;
            } else if (appointmentStatus === "Cancel") {
              result[key].cancelled += 1;
            } else if (appointmentStatus === "pending") {
              result[key].pending += 1;
            } else if (appointmentStatus === "complete") {
              result[key].completed += 1;
            }

            result[key].total += 1
          });

          // console.log('Formatted Result:', Object.values(result));
          this.overViewData = Object.values(result);
          this.chartData(); // Call chartData after data is processed
        });
      },
      error: (error) => {
        console.log(error)
      },
      complete: () => {
        this.isLoading = false
      }

    });
  }

  report(): void {
    this.isLoading = true
    this.reportData.emit(this.overViewData)
    const reportColumn = [
      { header: "Date", key: "date" },
      { header: "Total", key: "total" },
      { header: "Package Name", key: "packageName" },
      { header: "Confirmed", key: "confirmed" },
      { header: "Cancelled", key: "cancelled" },
      { header: "Pending", key: "pending" },
      { header: "Completed", key: "completed" }
    ]
    this.reportsColumn.emit(reportColumn)
    this.reportView.emit({ onoff: true, range: "range" })
    this.reportInitializeDate.emit(this.selectedDate)
    this.isLoading = false
  }

  chartData(): void {
    const rawData = this.overViewData
      .filter((data: any) => data.completed !== null && this.selectedDate.includes(data.date))
      .map((entry: any) => ({
        date: entry.date,
        package: entry.packageName,
        confirmed: entry.completed
      }));

    // Define package colors based on the image
    const packageColors: { [key: string]: string } = {
      'Integrated Diabetic Care': '#FB9C2A', // Orange
      'Annual Master Diabetes Care': '#0E2970', // Dark Blue
      'Senior Citizen Health (Male)': '#FF4545', // Red
      'Senior Citizen Health Check (Female)': '#169458', // Green
      'Basic Health Check Up': '#FFC23A', // Yellow
      'Executive Health Check Up (Male)': '#001345', // Dark Blue
      'Master Health Check Up': '#544FC5', // Purple
      'Executive Health Check Up (Female)': '#00E272', // Green
      'Well Women check up': '#A52B0E', // Dark Red/Maroon
      'Comprehensive Diabetic check': '#9747FF' // Purple
    };

    // Aggregate confirmed counts per package and include colors
    const packageConfirmedCounts = rawData.reduce((acc: any, entry: any) => {
      if (acc[entry.package]) {
        acc[entry.package].value += entry.confirmed;
      } else {
        acc[entry.package] = {
          value: entry.confirmed,
          color: packageColors[entry.package] || '#000000' // Default to black if package not found
        };
      }
      return acc;
    }, {});

    // Convert to array format for pie chart (optional, depending on initChart)
    this.dataForPiehart = Object.entries(packageConfirmedCounts).map(([name, details]: [string, any]) => ({
      name: name,
      value: details.value,
      itemStyle: { color: details.color }
    }));

    // console.log(this.dataForPiehart)

    // console.log('Total Confirmed Counts for Each Package:', this.dataForPiechart);
    this.initChart();
  }


  // viewmore

  // async loadDepartments(): Promise<void> {
  //   try {
  //     const data = await this.docDetails.getDepartments().toPromise()
  //     this.department = data;
  //     // console.log(this.department)
  //   } catch (err) {
  //     console.error(err)
  //   }
  // }

  viewmore(): void {
    this.showViewMore = true
    this.viewMoreData()
  }

  closeViewMore(): void {
    this.showViewMore = false
  }

  // departmentOnchange(event: any): void {
  //   this.docDetails.getDoctors().subscribe(({
  //     next: (data: any) => {
  //       this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
  //     },
  //     error: (error: any) => {
  //       console.error(error)
  //     },
  //     complete: () => {

  //     }
  //   }))
  // }

  ViewMorechart(data: any): void {
    const chartDom = document.getElementById('viewMoreMHCoverview');
    const myChart = echarts.init(chartDom);

    const chartData = data

    this.viewMoreoption = {
      tooltip: {
        trigger: 'item',
      },

      series: [
        {
          name: 'Health Checkups',
          type: 'pie',
          radius: '70%',
          center: ['50%', '60%'],
          data: chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: true,
            formatter: '{c}',
            position: 'outside',
            fontSize: 14,
            color: '#000',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            TextAlignment: 'center',
          },
          labelLine: {
            show: true
          }
        }
      ]
    };

    myChart.setOption(this.viewMoreoption); // Render the chart
  }

  viewMoreData(): void {
    const rawData = this.overViewData
      .filter((data: any) => data.completed !== null && this.selectedViewDate.includes(data.date)  && this.selectedViewDoctor === 'all' ? this.selectedViewDate.includes(data.date) : (this.selectedViewDoctor === data.packageId && this.selectedViewDate.includes(data.date)))
      .map((entry: any) => ({
        date: entry.date,
        package: entry.packageName,
        confirmed: entry.completed
      }));

    // console.log(rawData, "mhc packages")

    const packageColors: { [key: string]: string } = {
      'Integrated Diabetic Care': '#FB9C2A',
      'Annual Master Diabetes Care': '#0E2970',
      'Senior Citizen Health (Male)': '#FF4545',
      'Senior Citizen Health Check (Female)': '#169458',
      'Basic Health Check Up': '#FFC23A',
      'Executive Health Check Up (Male)': '#001345',
      'Master Health Check Up': '#544FC5',
      'Executive Health Check Up (Female)': '#00E272',
      'Well Women check up': '#A52B0E',
      'Comprehensive Diabetic check': '#9747FF'
    };

    // Aggregate confirmed counts per package and include colors
    const packageConfirmedCounts = rawData.reduce((acc: any, entry: any) => {
      if (acc[entry.package]) {
        acc[entry.package].value += entry.confirmed;
      } else {
        acc[entry.package] = {
          value: entry.confirmed,
          color: packageColors[entry.package] || '#000000' // Default to black if package not found
        };
      }
      return acc;
    }, {});

    // Convert to array format for pie chart (optional, depending on initChart)
    const data: any = Object.entries(packageConfirmedCounts).map(([name, details]: [string, any]) => ({
      name: name,
      value: details.value,
      itemStyle: { color: details.color }
    }));

    this.ViewMorechart(data)

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

  viewPackageONchange(event: any): void {
    console.log(event)
    this.selectedViewDoctor = parseInt(event.target.value) || 'all'
    this.viewMoreData()
  }

  refresh():void{
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.viewmore()
    this.dateInput = []
    this.packagesName = []
    this.selectedViewDoctor = 'all'
  }
}
