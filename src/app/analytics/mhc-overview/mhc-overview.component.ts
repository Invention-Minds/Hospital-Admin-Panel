import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges  } from '@angular/core';
import * as echarts from 'echarts';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { getYesterdayDate } from '../functions'

@Component({
  selector: 'app-mhc-overview',
  templateUrl: './mhc-overview.component.html',
  styleUrls: ['./mhc-overview.component.css'] // Fixed typo from styleUrl to styleUrls
})
export class MhcOverviewComponent implements OnChanges {

  constructor(private healthCheckup: HealthCheckupServiceService) { }

  option: any;
  overViewData: any;
  dataForPiehart : any;
  @Input() selectedDate : any[] = []

  isLoading : boolean = true

  // report data
  reportAppointmentData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();

  ngOnInit() {
    this.selectedDate = [getYesterdayDate()]
    this.getAllPackages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['selectedDate']){
      this.getAllPackages()
    }
  }

  // Initialize chart
  initChart(): void {
    const chartDom = document.getElementById('mhc-chart')!;
    const myChart = echarts.init(chartDom);
  
    const chartData = Object.entries(this.dataForPiehart).map(([name, value]) => {
      return { name, value };
    });
    console.log(chartData, "form chart");
  
    this.option = {
      tooltip: {
        trigger: 'item',
        // formatter: '{a} <br/>{b} : {c} ({d}%)'
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 20,  // Add space to the right side
        top: 'center',  // Center vertically
        bottom: 'center',  // Ensure the legend fits properly
        data: chartData.map((entry: any) => entry.name) // Dynamically set legend
      },
      series: [
        {
          name: 'Health Checkups',
          type: 'pie',
          radius: '90%',
          center: ['40%', '50%'],  // Shift the pie chart slightly to the left to make space for the legend
          data: chartData, // Pass the formatted data
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: false // This hides the labels
          },
          labelLine: {
            show: false // This hides the connecting lines
          }
        }
      ]
    };
  
    myChart.setOption(this.option); // Render the chart
  }
  
  getAllPackages(): void {
    this.isLoading = true
    this.healthCheckup.getPackages().subscribe({
      next : (pack) => {
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
            const { createdAt, appointmentStatus, packageId } = entry;
            const date = formatDate(createdAt);
  
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
                total : 0,
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

            result[key].total +=1
          });
  
          console.log('Formatted Result:', Object.values(result));
          this.overViewData = Object.values(result);
          this.chartData(); // Call chartData after data is processed
        });
      },
      error : (error) => {
        console.log(error)
      },
      complete : () => {
        this.isLoading = false
      }

    });
  }

  report():void{

    this.reportData.emit(this.overViewData)
    const reportColumn = [
      { header: "Date", key: "date" },
      { header : "Total", key : "total" },
      { header: "Package Name", key: "packageName" },
      { header: "Confirmed", key: "confirmed" },
      { header: "Cancelled", key: "cancelled" },
      { header: "Pending", key: "pending" },
      { header: "Completed", key: "completed" }   
    ]
    this.reportsColumn.emit(reportColumn)
    this.reportView.emit({ onoff: true, range: "range" })
  }

  // Process chart data for confirmed counts
  chartData(): void {
    const rawdata = this.overViewData.filter((data: any) => data.confirmed !== null && this.selectedDate.includes(data.date)).map((entry: any) => {
      return {
        date: entry.date,
        package: entry.packageName,
        confirmed: entry.confirmed
      };
    });

    // Aggregate confirmed counts per package
    const packageConfirmedCounts = rawdata.reduce((acc: any, entry: any) => {
      if (acc[entry.package]) {
        acc[entry.package] += entry.confirmed;
      } else {
        acc[entry.package] = entry.confirmed;
      }
      return acc;
    }, {});

    this.dataForPiehart = packageConfirmedCounts

    console.log('Total Confirmed Counts for Each Package:', this.dataForPiehart);
    this.initChart();
  }
}
