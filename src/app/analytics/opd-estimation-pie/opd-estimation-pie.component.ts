import { Component, Output, EventEmitter, Input, output, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { EstimationService } from '../../services/estimation/estimation.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { map } from 'rxjs/operators';
import { utcToIstDate, getYesterdayDate, getIndividualDates, getLastThirtyDaysFromSelected, getLast7Days, formatDate, reorderDateFormat } from '../functions'
import { error } from 'console';
import { MessageService } from 'primeng/api';
import { constants } from 'buffer';

@Component({
  selector: 'app-opd-estimation-pie',
  templateUrl: './opd-estimation-pie.component.html',
  styleUrl: './opd-estimation-pie.component.css'
})
export class OpdEstimationPieComponent implements OnChanges {

  constructor(private appointment: AppointmentConfirmService, private estimation: EstimationService, private doctor: DoctorServiceService, private messageService: MessageService) { }

  rawData: any
  prnNumber: any
  prnFilteredData: any
  selecetedDepartment: any = 'all'
  filteredData: any
  chartInstance: any
  isLoading: boolean = false
  @Input() selectedDate: any
  @Input() selectedDoctor: any

  // viewmore
  department: any
  departmentValue: any = 'all'
  departmentDocs: any = 'all'
  doctors: any
  filteredDoctors: any
  showViewMore: boolean = false
  dateInput: any
  selectedViewDate: any[] = []
  selectedViewDoctor: any = 'all'
  viewMoreoption: any

  // report
  reportData: any
  @Output() viewReportSection = new EventEmitter<any>
  @Output() sendReportData = new EventEmitter<any>
  @Output() reportInitializeDate = new EventEmitter<any>

  ngOnInit() {
    this.selectedDate = getLast7Days()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.fetchingData()
    this.loadDepartments()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']) {
      this.fetchingData()
    }
  }

  fetchingData(): void {
    this.estimation.getAllEstimation().subscribe((data: any) => {
      this.rawData = data
      console.log(this.rawData, "rawdata")
      this.appointment.getAllAppointments().subscribe((data: any) => {
        this.prnNumber = data.filter((entry: any) => entry.prnNumber !== null).map((entry: any) => entry.prnNumber)
        console.log(this.prnNumber)
        this.chartData(this.prnNumber)
      })
    })
  }

  initChart(data: any): void {
    const chartContainer = document.getElementById('pie-chart') as HTMLElement;
    this.chartInstance = echarts.init(chartContainer);

    // Filter out data points where value is 0
    const filteredData = [
      { value: data.sm, name: 'SM' },
      { value: data.mm, name: 'MM' },
      { value: data.mater, name: 'Maternity' }
    ].filter(item => item.value !== 0); // Removes items with value 0

    const chartOptions = {
      tooltip: {
        trigger: 'item',
      },
      series: [
        {
          name: 'Health Checkups',
          type: 'pie',
          radius: '70%',
          center: ['50%', '60%'],
          data: filteredData, // Use filtered data
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: true,
            formatter: '{c}', // Display only values
            position: 'outside',
            fontSize: 14,
            color: '#000',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center', // Corrected from 'TextAlignment'
          },
          labelLine: {
            show: true
          }
        }
      ]
    };

    this.chartInstance.setOption(chartOptions);
  }

  chartData(prn: any): void {
    this.isLoading = true
    const prnFilteredData = this.rawData.filter((entry: any) => prn.includes(entry.patientUHID) && this.selectedDate.includes(utcToIstDate(entry.estimationCreatedTime))).map((entry: any) => {
      return {
        date: utcToIstDate(entry.estimationCreatedTime),
        estimationType: entry.estimationType,
        doctorId: entry.consuconsultantId
      }
    })

    const chartData = {
      sm: prnFilteredData.filter((entry: any) => entry.estimationType === 'SM').length,
      mm: prnFilteredData.filter((entry: any) => entry.estimationType === 'MM').length,
      mater: prnFilteredData.filter((entry: any) => entry.estimationType === 'Maternity').length
    }

    this.initChart(chartData)

    console.log(chartData, "chartData")
    this.isLoading = false
  }

  fetchDepartmentDocs(depId: any): void {
    this.doctor.getAllDoctors().subscribe((data: any) => {
      this.departmentDocs = data.filter((entry: any) => depId === 'all' ? true : entry.departmentId === depId).map((entry: any) => entry.id)
      console.log(this.departmentDocs)
    })
    this.viewMoreData()
  }

  loadreport(): void {
    const prnFilteredData = this.rawData
      .filter((entry: any) => this.prnNumber.includes(entry.patientUHID))
      .map((entry: any) => ({
        date: utcToIstDate(entry.estimationCreatedTime),
        estimationType: entry.estimationType, // sm, mm, maternity
        estimationStatus: entry.estimationStatus, // planned, immediate
        consultantId: entry.consultantId,
      }));

    // Group and aggregate the data
    const processedData = Object.values(
      prnFilteredData.reduce((acc: any, entry: any) => {
        const key = `${entry.date}_${entry.consultantId}`; // Unique key for grouping by date and consultantId

        // Initialize the group if it doesn't exist
        if (!acc[key]) {
          acc[key] = {
            date: entry.date,
            consultantId: entry.consultantId,
            sm: 0,
            immediateSm: 0,
            plannedSm: 0,
            smTotal: 0,
            mm: 0,
            immediateMm: 0,
            plannedMm: 0,
            mmTotal: 0,
            maternity: 0,
            immediateMatenity: 0,
            plannedMatenity: 0,
            totalMaternity: 0,
            totalPlannedEstimation: 0,
            totalImmediateEstimation: 0,
            grandTotal: 0,
          };
        }

        // Increment counts based on estimationType and estimationStatus
        const group = acc[key];
        if (entry.estimationType === 'SM') {
          group.sm++;
          if (entry.estimationStatus === 'immediate') {
            group.immediateSm++;
          } else if (entry.estimationStatus === 'planned') {
            group.plannedSm++;
          }
          group.smTotal = group.immediateSm + group.plannedSm;
        } else if (entry.estimationType === 'MM') {
          group.mm++;
          if (entry.estimationStatus === 'immediate') {
            group.immediateMm++;
          } else if (entry.estimationStatus === 'planned') {
            group.plannedMm++;
          }
          group.mmTotal = group.immediateMm + group.plannedMm;
        } else if (entry.estimationType === 'Maternity') {
          group.maternity++;
          if (entry.estimationStatus === 'immediate') {
            group.immediateMatenity++;
          } else if (entry.estimationStatus === 'planned') {
            group.plannedMatenity++;
          }
          group.totalMaternity = group.immediateMatenity + group.plannedMatenity;
        }

        // Update aggregated totals
        group.totalPlannedEstimation = group.plannedSm + group.plannedMm + group.plannedMatenity;
        group.totalImmediateEstimation = group.immediateSm + group.immediateMm + group.immediateMatenity;
        group.grandTotal = group.smTotal + group.mmTotal + group.totalMaternity;

        return acc;
      }, {})
    );

    // Optional: Log the result for debugging
    console.log('Processed Data:', processedData);
    this.reportData = processedData
    this.viewReportSection.emit(true)
    this.sendReportData.emit(this.reportData)
    this.reportInitializeDate.emit(this.selectedDate)

  }

  // viewmore

  async loadDepartments(): Promise<void> {
    try {
      const data = await this.doctor.getDepartments().toPromise()
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
    this.doctor.getDoctors().subscribe(({
      next: (data: any) => {
        this.selectedViewDoctor = 'all'
        this.departmentValue = this.department.filter((entry: any) => entry.id === parseInt(event.target.value))[0].name
        this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
        this.fetchDepartmentDocs(this.departmentValue)
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
    const chartContainer = document.getElementById('viewMoreOpdEst') as HTMLElement;
    this.chartInstance = echarts.init(chartContainer);

    const chartOptions = {
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
            { value: data.sm, name: 'SM' },
            { value: data.mm, name: 'MM' },
            { value: data.mater, name: 'Maternity' },
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
            formatter: '{c}', // Display only values
            position: 'outside',
            fontSize: 14,
            color: '#000',
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center', // Corrected from 'TextAlignment'
          },
          labelLine: {
            show: true
          }
        }
      ]
    };

    this.chartInstance.setOption(chartOptions);
  }

  viewMoreData(): void {
    const prnFilteredData = this.rawData
      .filter((entry: any) => {
        const matchesPrn = this.prnNumber.includes(entry.patientUHID);
        const matchesDate = this.selectedViewDate.includes(utcToIstDate(entry.estimationCreatedTime));
        const matchesDoctor = this.selectedViewDoctor === 'all' || this.selectedViewDoctor === entry.consultantId;
        return matchesPrn && matchesDate && matchesDoctor;
      })
      .map((entry: any) => ({
        date: utcToIstDate(entry.estimationCreatedTime),
        estimationType: entry.estimationType,
        doctorId: entry.consultantId // Fixed typo
      }));

    const chartData = {
      sm: prnFilteredData.filter((entry: any) => entry.estimationType === 'SM').length,
      mm: prnFilteredData.filter((entry: any) => entry.estimationType === 'MM').length,
      mater: prnFilteredData.filter((entry: any) => entry.estimationType === 'Maternity').length
    }

    this.ViewMorechart(chartData)
  }

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
    const value = parseInt(event.target.value)
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