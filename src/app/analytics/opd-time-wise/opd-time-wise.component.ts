import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import * as echarts from 'echarts'
import { getYesterdayDate, getIndividualDates, getLastSevenDaysFromSelected, getLastThirtyDaysFromSelected, reorderDateFormat, getLast7Days, getLastSevenDays } from '../functions'
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-opd-time-wise',
  templateUrl: './opd-time-wise.component.html',
  styleUrl: './opd-time-wise.component.css'
})
export class OpdTimeWiseComponent implements OnChanges {
  constructor(private appointmentService: AppointmentConfirmService, private docDetails: DoctorServiceService, private messageService : MessageService) { }

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
  @Output() blockFilters = new EventEmitter<boolean[]>();
  @Output() reportName = new EventEmitter<string>();


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

  ngOnInit() {
    this.selectedDate = getLastSevenDays()
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
      // Group appointments by date, doctorId, and department
      const groupedAppointments = appointments.reduce((acc: any, appointment: any) => {
        const { doctorId, doctorName, date, time, department } = appointment;

        // Initialize date group if not exists
        if (!acc[date]) {
          acc[date] = {};
        }

        // Initialize doctorId group for each date if not exists
        if (!acc[date][doctorId]) {
          acc[date][doctorId] = {};
        }

        // Initialize department group for each doctorId if not exists
        if (!acc[date][doctorId][department]) {
          acc[date][doctorId][department] = {
            doctorName,
            department,
            before1PMCount: 0,
            after1PMCount: 0
          };
        }

        const appointmentTime = this.convertTo24HourFormat(time);
        const cutoffTime = 16 * 60; // 1 PM in minutes

        if (appointmentTime < cutoffTime) {
          acc[date][doctorId][department].before1PMCount++;
        } else {
          acc[date][doctorId][department].after1PMCount++;
        }

        return acc;
      }, {});

      const result = [];
      for (const date in groupedAppointments) {
        for (const doctorId in groupedAppointments[date]) {
          for (const departmentName in groupedAppointments[date][doctorId]) {
            const { doctorName, before1PMCount, after1PMCount } = groupedAppointments[date][doctorId][departmentName];
            result.push({
              date,
              doctorId,
              doctorName,
              departmentName,
              before1PMCount,
              after1PMCount
            });
          }
        }
      }

      this.appointmentsData = result;

      const reportColumn = [
        { header: "Date", key: "date" },
        { header: "Doctor Name", key: "doctorName" },
        { header: "Department", key: "departmentName" },
        { header: "Before 1 PM", key: "before1PMCount" },
        { header: "After 1 PM", key: "after1PMCount" },
      ];

      this.reportData.emit(this.appointmentsData);
      this.reportsColumn.emit(reportColumn);
      this.reportView.emit({ onoff: true, range: "range" });
      this.reportInitializeDate.emit(this.selectedDate);
      this.blockFilters.emit([false, false])
      this.reportName.emit("OPD Sessions")
      this.isLoading = false;
    });
}

  loadAppointments(): void {
    this.isLoading = true
    this.appointmentService.getAllAppointments().subscribe({
      next: (appointments: any) => {

        this.rawData = appointments
        // const getLastSevenDays = getLastSevenDaysFromSelected(this.selectedDate.length >= 7 ? this.selectedDate[6] : this.selectedDate[this.selectedDate.length - 1])
        const getLastSevenDays = this.selectedDate
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
        this.selectedViewDoctor = 'all'
        this.departmentValue = this.department.filter((entry:any) => entry.id === parseInt(event.target.value))[0].name
        this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
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
      const isValidDepartment = this.departmentValue === 'all' || this.departmentValue === entry.department
      return isWithinDateRange && isValidDoctor && isValidDepartment;
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

  refresh():void{
    this.loadDepartments()
    this.filteredDoctors = []
    this.selectedViewDate = []
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.selectedViewDoctor = 'all'
    this.departmentValue = 'all'
    this.viewmore()
    this.dateInput = []
  }
}