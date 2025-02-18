import { Component, Output, EventEmitter, Input, output, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { EstimationService } from '../../services/estimation/estimation.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { map } from 'rxjs/operators';
import { utcToIstDate, getYesterdayDate } from '../functions'
import { error } from 'console';

@Component({
  selector: 'app-opd-estimation-pie',
  templateUrl: './opd-estimation-pie.component.html',
  styleUrl: './opd-estimation-pie.component.css'
})
export class OpdEstimationPieComponent implements OnChanges {

  // chart variables
  option: any
  estimatedOPD: any
  NoEstimations: any
  estimatedCount: any
  @Input() selectedDate: any[] = [];
  @Input() selectedDoctor : any
  isLoading : boolean = true

  // report variables
  reportAppointmentData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();

  constructor(private estimation: EstimationService, private appoinment: AppointmentConfirmService) { }
  // const 

  ngOnInit() {
    this.selectedDate = [getYesterdayDate()]
    this.loadEstimations()
    // console.log(this.selectedDoctor, "selectedDOctor")
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['selectedDate'] && !changes['selectedDate'].firstChange) || (changes['selectedDoctor'] && !changes['selectedDoctor'].firstChange))  {
      this.loadEstimations()
      // console.log(this.selectedDoctor, "selectedDOctor")
    }
  }

  initChart(): void {
    const chartDom = document.getElementById('pie-chart')!;
    const myChart = echarts.init(chartDom);
    this.option = {
      tooltip: {
        trigger: 'item'
      },
      color: ['#3366CC', '#20AA68'],
      series: [
        {
          name: 'OPD - Estimation',
          type: 'pie',
          radius: ['80%'],
          // avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: this.NoEstimations, name: 'Non EST OPD' },
            { value: this.estimatedCount, name: 'EST OPD' },
          ]
        }
      ]
    };
    myChart.setOption(this.option);
  }

  loadEstimations(): void {
    this.isLoading = true
    this.appoinment.getAllAppointments().subscribe({
      next : (data) => {
        this.estimation.getAllEstimation().subscribe((est: any) => {
          const estimationPnr = est.filter((entry: any) => entry.patientUHID !== null).map((entry: any) => entry.patientUHID)
  
          const estimatedOpd = data.filter((entry: any) => {
            const formattedDate = new Date(entry.date).toISOString().slice(0, 10);
            const matchFound = this.selectedDate.includes(formattedDate);
            const prn = estimationPnr.includes(entry.prnNumber);
            return matchFound && prn && (this.selectedDoctor === 'all' ? entry : this.selectedDoctor === entry.doctorId) ;
          }).map((entry: any) => {
            return {
              date: new Date(entry.date).toISOString().slice(0, 10),
              prnNumber: entry.prnNumber
            };
          });        
  
          const noEstimations = data.filter((entry: any) => {
            const formattedDate = new Date(entry.date).toISOString().slice(0, 10);
            const matchFound = this.selectedDate.includes(formattedDate);
            const prn = !estimationPnr.includes(entry.prnNumber);
            return matchFound && prn && (this.selectedDoctor === 'all' ? entry : this.selectedDoctor === entry.doctorId) ;
          }).map((entry: any) => {
            return {
              date: new Date(entry.date).toISOString().slice(0, 10),
              prnNumber: entry.prnNumber
            };
          });
          // console.log(estimatedOpd, "estimated Data")
          // console.log(noEstimations, "no estimation data")
          this.estimatedCount = estimatedOpd.length
          this.NoEstimations = noEstimations.length
  
          this.initChart()
  
        })
      },
      error : (error:any) => {
        console.log(error)
      },
      complete : () => {
        this.isLoading = false
      }

    });
  }


  loadreport() {

    let appointmentsByDate: { [key: string]: number } = {};

    this.appoinment.getAllAppointments().subscribe((data) => {
      this.reportAppointmentData = data.filter((entry: any) => (entry.date !== null) && (entry.pnrNumber !== null))
      const totalAppointments = this.reportAppointmentData.length
      this.reportAppointmentData.forEach((entry: any) => {
        const date = entry.date; // Assuming `date` is in the format we want to group by

        if (!appointmentsByDate[date]) {
          appointmentsByDate[date] = 0;
        }
        appointmentsByDate[date]++;
      });


      this.estimation.getAllEstimation().pipe(
        // Transform the data
        map((data: any) => {
          const groupedByDate: { [key: string]: any } = {};

          data.forEach((item: any) => {
            const date = utcToIstDate(item.estimationCreatedTime)

            // Initialize the date group if it doesn't exist
            if (!groupedByDate[date]) {
              groupedByDate[date] = {
                date: date,
                total: 0,
                medicalManagement: 0,
                SurgicalManagement: 0,
                immediate: 0,
                planned: 0
              };
            }

            if (item.estimationType === 'MM') {
              groupedByDate[date].medicalManagement++;
            }

            if (item.estimationType === 'SM') {
              groupedByDate[date].SurgicalManagement++;
            }

            if (item.estimationStatus === "immediate") {
              groupedByDate[date].immediate++;
            }

            if (item.estimationStatus === "planned") {
              groupedByDate[date].planned++;
            }

            groupedByDate[date].total = groupedByDate[date].medicalManagement + groupedByDate[date].SurgicalManagement;
          });

          const result = Object.values(groupedByDate);
          result.forEach((item: any) => {
            item.appointmentCount = appointmentsByDate[item.date] || 0; // Add appointment count (0 if no appointments)
          });

          // console.log(result, "result")

          return Object.values(groupedByDate);
        })
      ).subscribe({
        next: (groupedData) => {
          this.reportData.emit(groupedData)
          // console.log(groupedData, "groupdata")
        },
        error: (err) => {
          console.error('Error fetching estimations:', err);
        },
        complete: () => {
          const reportColumn = [
            // {header : "S. No", key : "id"},
            { header: "Date", key: "date" },
            { header: "Estimation Raised", key: "total" },
            { header: "Medical Management", key: "medicalManagement" },
            { header: "Surgical Management", key: "SurgicalManagement" },
            { header: "Immediate", key: "immediate" },
            { header: "Planned", key: "planned" }
          ]

          this.reportsColumn.emit(reportColumn)
          this.reportView.emit({ onoff: true, range: "range" })
        }
      });
    })
  }

}
