import { Component, Output, EventEmitter, Input, output, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { EstimationService } from '../../services/estimation/estimation.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { map } from 'rxjs/operators';
import { utcToIstDate, getYesterdayDate, getIndividualDates, getLastThirtyDaysFromSelected } from '../functions'
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
  @Input() selectedDoctor: any
  isLoading: boolean = true

  // report variables
  reportAppointmentData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();
  @Output() reportDoctorId = new EventEmitter<any[]>()

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


  constructor(private estimation: EstimationService, private appoinment: AppointmentConfirmService, private docDetails: DoctorServiceService) { }
  // const 

  ngOnInit() {
    this.selectedDate = [getYesterdayDate()]
    this.loadEstimations()
    // console.log(this.selectedDoctor, "selectedDOctor")
    this.selectedViewDate = getLastThirtyDaysFromSelected()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['selectedDate'] && !changes['selectedDate'].firstChange) || (changes['selectedDoctor'] && !changes['selectedDoctor'].firstChange)) {
      this.loadEstimations()
      // console.log(this.selectedDoctor, "selectedDOctor")
    }
  }

  initChart(): void {
    const chartDom = document.getElementById('pie-chart')!;
    const myChart = echarts.init(chartDom);
    // this.option = {
    //   tooltip: {
    //     trigger: 'item'
    //   },
    //   color: ['#3366CC', '#20AA68'],
    //   series: [
    //     {
    //       name: 'OPD - Estimation',
    //       type: 'pie',
    //       radius: ['80%'],
    //       // emphasis: {
    //       //   label: {
    //       //     show: true,
    //       //     fontSize: 20,
    //       //   }
    //       // },
    //       data: [
    //         { value: this.NoEstimations, name: 'Non EST OPD' },
    //         { value: this.estimatedCount, name: 'EST OPD' },
    //       ],
    //       label: {
    //         show: true, // Ensure labels are visible
    //         formatter: '{c}', // Show the value (count) for each slice
    //         // position: 'inside', // Keep labels inside the pie slices
    //         fontSize: 14, // Set font size for labels
    //         color: '#000', // Set label color (e.g., white for contrast against dark slices)
    //         fontWeight: 'bold', // Make labels bold (optional)
    //         fontFamily: 'Arial, sans-serif', // Specify font family
    //         align: 'center' // Center-align the text horizontally
    //       },
    //       labelLine: {
    //         // show: true // Hide connecting lines (not needed for inside labels)
    //       },
    //     }
    //   ]
    // };

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
          data: [
            { value: this.NoEstimations, name: 'Non EST OPD' },
            { value: this.estimatedCount, name: 'EST OPD' },
          ],
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
            color: '#FFFFFF',
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
    myChart.setOption(this.option);
  }

  loadEstimations(): void {
    this.isLoading = true
    this.appoinment.getAllAppointments().subscribe({
      next: (data) => {
        this.rawData = data
        this.estimation.getAllEstimation().subscribe((est: any) => {
          const estimationPnr = est.filter((entry: any) => entry.patientUHID !== null).map((entry: any) => entry.patientUHID)

          const estimatedOpd = data.filter((entry: any) => {
            const formattedDate = new Date(entry.date).toISOString().slice(0, 10);
            const matchFound = this.selectedDate.includes(formattedDate);
            const prn = estimationPnr.includes(entry.prnNumber);
            return matchFound && prn && (this.selectedDoctor === 'all' ? entry : this.selectedDoctor === entry.doctorId);
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
            return matchFound && prn && (this.selectedDoctor === 'all' ? entry : this.selectedDoctor === entry.doctorId);
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
      error: (error: any) => {
        console.log(error)
      },
      complete: () => {
        this.isLoading = false
      }

    });
  }

  loadreport() {
    this.isLoading = true
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
          this.reportInitializeDate.emit(this.selectedDate)

          this.isLoading = false
        }
      });
    })
  }


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
    const chartDom = document.getElementById('viewMoreOpdEst')!;
    const myChart = echarts.init(chartDom);

    // this.viewMoreoption = {
    //   tooltip: {
    //     trigger: 'item'
    //   },
    //   color: ['#3366CC', '#20AA68'], // Global colors for the two slices
    //   series: [
    //     {
    //       name: 'OPD - Estimation',
    //       type: 'pie',
    //       radius: ['80%'],
    //       data: [
    //         { value: data.NoEstimations, name: 'Non EST OPD' },
    //         { value: data.estimatedCount, name: 'EST OPD' },
    //       ],
    //       label: {
    //         show: true, // Enable labels
    //         position: 'inside', // Place labels inside the slices
    //         formatter: '{c}', // Show only the value (count)
    //         fontSize: 16, // Adjust font size as needed
    //         color: '#fff' // White text for contrast (adjust as needed)
    //       }
    //     }
    //   ]
    // };

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
          data: [
            { value: data.NoEstimations, name: 'Non EST OPD' },
            { value: data.estimatedCount, name: 'EST OPD' },
          ],
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
            color: '#FFFFFF',
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
    myChart.setOption(this.viewMoreoption); // Render the chart
  }

  viewMoreData(): void {
    this.loadDepartments();

    this.isLoading = true
    this.appoinment.getAllAppointments().subscribe({
      next: (data) => {
        this.rawData = data
        this.estimation.getAllEstimation().subscribe((est: any) => {
          const estimationPnr = est.filter((entry: any) => entry.patientUHID !== null).map((entry: any) => entry.patientUHID)

          const estimatedOpd = data.filter((entry: any) => {
            const formattedDate = new Date(entry.date).toISOString().slice(0, 10);
            const matchFound = this.selectedViewDate.includes(formattedDate);
            const prn = estimationPnr.includes(entry.prnNumber);
            return matchFound && prn && (this.selectedViewDoctor === 'all' ? entry : this.selectedViewDoctor === entry.doctorId);
          }).map((entry: any) => {
            return {
              date: new Date(entry.date).toISOString().slice(0, 10),
              prnNumber: entry.prnNumber
            };
          });

          const noEstimations = data.filter((entry: any) => {
            const formattedDate = new Date(entry.date).toISOString().slice(0, 10);
            const matchFound = this.selectedViewDate.includes(formattedDate);
            const prn = !estimationPnr.includes(entry.prnNumber);
            return matchFound && prn && (this.selectedViewDoctor === 'all' ? entry : this.selectedViewDoctor === entry.doctorId);
          }).map((entry: any) => {
            return {
              date: new Date(entry.date).toISOString().slice(0, 10),
              prnNumber: entry.prnNumber
            };
          });
          // console.log(estimatedOpd, "estimated Data")
          // console.log(noEstimations, "no estimation data")
          const counts = {
            estimatedCount: estimatedOpd.length,
            NoEstimations: noEstimations.length
          }

          this.ViewMorechart(counts)
        })
      },
      error: (error: any) => {
        console.log(error)
      },
      complete: () => {
        this.isLoading = false
      }

    });
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

  refresh():void{
    this.loadDepartments()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.selectedViewDoctor = 'all'
    this.viewmore()
  }

}
