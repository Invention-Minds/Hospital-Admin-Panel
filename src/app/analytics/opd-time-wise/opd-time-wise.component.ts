import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import * as echarts from 'echarts'
import { getYesterdayDate, getIndividualDates, getLastSevenDaysFromSelected, getLastThirtyDaysFromSelected, reorderDateFormat } from '../functions'

@Component({
  selector: 'app-opd-time-wise',
  templateUrl: './opd-time-wise.component.html',
  styleUrl: './opd-time-wise.component.css'
})
export class OpdTimeWiseComponent implements OnChanges {
  constructor(private appointmentService: AppointmentConfirmService, private docDetails: DoctorServiceService) { }

  @Input() selectedDate: any[] = [];
  @Input() selectedDoctor: any
  selectedAppointments: any[] = [];
  before1PM: number = 0;
  after1PM: number = 0;
  option: any
  appointments: any
  appointmentsData: any
  isLoading: boolean = true

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

  ngOnInit() {
    this.selectedDate = [getYesterdayDate()]
    this.loadAppointments()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] || changes['selectedDoctor']) {
      this.loadAppointments()
    }
  }

  initChart(data: any): void {
    const chartDom = document.getElementById('timeOpdChart')!;
    const myChart = echarts.init(chartDom);
    this.option = {
      tooltip: {
        trigger: 'axis'
      },
      calculable: true,
      xAxis: [
        {
          type: 'category',
          data: reorderDateFormat(data.map((entry: any) => entry.date))
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: [
        {
          name: 'Before 4 PM',
          type: 'bar',
          data: data.map((entry: any) => entry.before1PMCount),
          markPoint: {
            data: [
              { type: 'max', name: 'Max' },
              { type: 'min', name: 'Min' }
            ]
          },
          markLine: {
            data: [{ type: 'average', name: 'Avg' }]
          }
        },
        {
          name: 'After 4 PM',
          type: 'bar',
          data: data.map((entry: any) => entry.after1PMCount),
          markPoint: {
            data: [
              { type: 'max', name: 'Max' },
              { type: 'min', name: 'Min' }
            ]
          },
          markLine: {
            data: [{ type: 'average', name: 'Avg' }]
          }
        }
      ]
    };
    myChart.setOption(this.option);
  }

  convertTo24HourFormat(time12h: string): number {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) {
      hours += 12;
    }
    if (modifier === "AM" && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }

  loadReportAppointments(): void {
    this.appointmentService.getAllAppointments().subscribe((appointments: any[]) => {

      // Group appointments by doctorId and date, and count before and after 1 PM
      const groupedAppointments = appointments.reduce((acc: any, appointment: any) => {
        const { doctorId, doctorName, date, time } = appointment;

        // Initialize doctor group if not exists
        if (!acc[doctorId]) {
          acc[doctorId] = {};
        }

        // Initialize date group for each doctor if not exists
        if (!acc[doctorId][date]) {
          acc[doctorId][date] = {
            doctorName,
            before1PMCount: 0,
            after1PMCount: 0
          };
        }
        const appointmentTime = this.convertTo24HourFormat(time);
        const cutoffTime = 16 * 60;

        if (appointmentTime < cutoffTime) {
          acc[doctorId][date].before1PMCount++;
        } else {
          acc[doctorId][date].after1PMCount++;
        }

        return acc;
      }, {});

      const result = [];
      for (const doctorId in groupedAppointments) {
        for (const date in groupedAppointments[doctorId]) {
          const { doctorName, before1PMCount, after1PMCount } = groupedAppointments[doctorId][date];
          result.push({
            doctorId,
            doctorName,
            date,
            before1PMCount,
            after1PMCount
          });
        }
      }

      // console.log("Appointments grouped by doctorId and date:", JSON.stringify(result, null, 2));
      this.appointmentsData = result;

      const reportColumn = [
        { header: "Date", key: "date" },
        { header: "Doctor Name", key: "doctorName" },
        { header: "Before 1 PM", key: "before1PMCount" },
        { header: "After 1 PM", key: "after1PMCount" },
      ]
      this.reportData.emit(this.appointmentsData)
      this.reportsColumn.emit(reportColumn)
      this.reportView.emit({ onoff: true, range: "range" })
      this.reportInitializeDate.emit(this.selectedDate)

      this.isLoading = false

    });
  }

  loadAppointments(): void {
    this.isLoading = true
    this.appointmentService.getAllAppointments().subscribe({
      next: (appointments: any) => {

        this.rawData = appointments
        const getLastSevenDays = getLastSevenDaysFromSelected(this.selectedDate.length >= 7 ? this.selectedDate[6] : this.selectedDate[this.selectedDate.length - 1])
        const appointment = this.rawData.filter((entry: any) => {
          const isWithinDateRange = getLastSevenDays.includes(entry.date);
          const isValidDoctor = this.selectedDoctor === 'all' || this.selectedDoctor === entry.doctorId;
          return isWithinDateRange && isValidDoctor;
        });        const groupedAppointments = appointment.reduce((acc: any, appointment: any) => {
          const { date, time } = appointment;
          if (!acc[date]) {
            acc[date] = {
              before1PMCount: 0,
              after1PMCount: 0
            };
          }
          const appointmentTime = this.convertTo24HourFormat(time);
          const cutoffTime = 16 * 60;

          if (appointmentTime < cutoffTime) {
            acc[date].before1PMCount++;
          } else {
            acc[date].after1PMCount++;
          }

          return acc;
        }, {});
        const result = [];
        for (const date in groupedAppointments) {
          const { before1PMCount, after1PMCount } = groupedAppointments[date];
          result.push({
            date,
            before1PMCount,
            after1PMCount
          });
        }

        const sortedResult = result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        console.log(result, "sortedResult")
        this.initChart(sortedResult)

      },
      error: (error) => {
        console.log(error)
      },
      complete: () => {
        this.isLoading = false
      }
    }
    )
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
    const chartDom = document.getElementById('viewMoreTimeWise')!;
    const myChart = echarts.init(chartDom);

    this.viewMoreoption = {
      tooltip: {
        trigger: 'axis'
      },
      calculable: true,
      xAxis: [
        {
          type: 'category',
          data: reorderDateFormat(data.map((entry: any) => entry.date))
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: [
        {
          name: 'Before 4 PM',
          type: 'bar',
          data: data.map((entry: any) => entry.before1PMCount),
          markPoint: {
            data: [
              { type: 'max', name: 'Max' },
              { type: 'min', name: 'Min' }
            ]
          },
          markLine: {
            data: [{ type: 'average', name: 'Avg' }]
          }
        },
        {
          name: 'After 4 PM',
          type: 'bar',
          data: data.map((entry: any) => entry.after1PMCount),
          markPoint: {
            data: [
              { type: 'max', name: 'Max' },
              { type: 'min', name: 'Min' }
            ]
          },
          markLine: {
            data: [{ type: 'average', name: 'Avg' }]
          }
        }
      ]
    };
    myChart.setOption(this.viewMoreoption); // Render the chart
  }

  viewMoreData(): void {
    const getLastThirtyDays = this.selectedViewDate
    const appointment = this.rawData.filter((entry: any) => {
      const isWithinDateRange = getLastThirtyDays.includes(entry.date);
      const isValidDoctor = this.selectedViewDoctor === 'all' || this.selectedViewDoctor === entry.doctorId;
      return isWithinDateRange && isValidDoctor;
    });
    const groupedAppointments = appointment.reduce((acc: any, appointment: any) => {
      const { date, time } = appointment;
      if (!acc[date]) {
        acc[date] = {
          before1PMCount: 0,
          after1PMCount: 0
        };
      }

      const appointmentTime = this.convertTo24HourFormat(time);
      const cutoffTime = 16 * 60;

      if (appointmentTime < cutoffTime) {
        acc[date].before1PMCount++;
      } else {
        acc[date].after1PMCount++;
      }
      return acc;
    }, {});

    const result = [];
    for (const date in groupedAppointments) {
      const { before1PMCount, after1PMCount } = groupedAppointments[date];
      result.push({
        date,
        before1PMCount,
        after1PMCount
      });
    }
    const sortedResult = result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log(result, "sortedResult")
    this.ViewMorechart(sortedResult)
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
    this.filteredDoctors = []
    this.selectedViewDate = []
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.selectedViewDoctor = 'all'
    this.viewmore()
    this.dateInput = []
  }
}