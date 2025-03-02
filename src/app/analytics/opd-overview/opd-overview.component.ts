import { Component, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { countByDate, processAppointmentData } from '../functions';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { map } from 'rxjs/operators';
import { getLastSevenDays, getIndividualDates, getLastThirtyDaysFromSelected } from '../functions';
import { error } from 'console';
import * as echarts from 'echarts';

@Component({
  selector: 'app-opd-overview',
  templateUrl: './opd-overview.component.html',
  styleUrl: './opd-overview.component.css'
})
export class OpdOverviewComponent {
  constructor(private appointment: AppointmentConfirmService, private docDetails :  DoctorServiceService) { }

  dates: any
  appointmentCount: any = {
    request: '',
    confirm: '',
    completed: '',
    cancelled: '',
    pending: ''
  }
  doctor: any
  chartoption: any
  viewMoreChart: any
  rawData: any
  @Input() selectedDate: any[] = [""]
  @Input() doctorId: any

  // report variables
  reportAppointmentData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();
  @Output() reportDoctorId = new EventEmitter<any[]>()

  // viewmore
  department: any
  departmentValue: any
  doctors: any
  filteredDoctors: any
  showViewMore : boolean = false
  dateInput : any
  selectedViewDate : any[] =[]
  selectedViewDoctor : any = 'all'


  // loading
  isLoading: boolean = true

  ngOnInit(): void {
    this.appointmentData()
    this.selectedDate = getLastSevenDays()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['doctorId'] && !changes['doctorId'].firstChange) || (changes['selectedDate'] && !changes['selectedDate'].firstChange)) {
      this.appointmentData()
    }
  }

  appointmentData(): void {
    this.isLoading = true
    this.appointment.getAllAppointments().subscribe({

      next: (data) => {
        this.rawData = data
        const dateFilteredAppointments = data.filter((data: any) => this.selectedDate.includes(data.date))

        const completedDate = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "completed") : (appointment.status === 'completed' && this.doctorId === appointment.doctorId))
        const requestData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? appointment : this.doctorId === appointment.doctorId)
        const comfirmData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "confirmed") : (appointment.status === 'confirmed' && this.doctorId === appointment.doctorId))
        const cancelData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "cancelled") : (appointment.status === 'cancelled' && this.doctorId === appointment.doctorId))
        const pendingData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "pending") : (appointment.status === 'pending' && this.doctorId === appointment.doctorId))

        const requests = countByDate(requestData, 'date');
        this.dates = Object.keys(requests).sort();

        this.appointmentCount.request = processAppointmentData(requestData, this.dates);
        this.appointmentCount.completed = processAppointmentData(completedDate, this.dates);
        this.appointmentCount.confirm = processAppointmentData(comfirmData, this.dates);
        this.appointmentCount.cancelled = processAppointmentData(cancelData, this.dates);
        this.appointmentCount.pending = processAppointmentData(pendingData, this.dates);

        this.chart()
      },
      error: (error) => {
        console.log(error)
      },
      complete: () => {
        this.isLoading = false
      }
    }
    )
  }

  chart(): void {
    const chartDom = document.getElementById('opdOverview')!;
    const myChart = echarts.init(chartDom);
    this.chartoption = {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '5%',
        right: '15%',
        bottom: '10%'
      },
      xAxis: {
        type: 'category',
        data: this.dates
      },
      yAxis: {
        type: 'value',
      },
      dataZoom: [
        {
          type: 'slider',   // Allows users to zoom in/out manually
          start: 0,         // Show all data from the beginning
          end: 100,         // Ensure full range is visible
          xAxisIndex: 0,    // Apply zooming on x-axis
          top: 15,
          left: 15,
          height: 15,
        },
        {
          type: 'inside'    // Allows zooming via scrolling
        }
      ],
      series: [
        {
          name: 'Total',
          type: 'line',
          data: this.appointmentCount.request,
          itemStyle: {
            color: "#2CAFFE"
          }
        },
        {
          name: 'Confirmed',
          type: 'line',
          data: this.appointmentCount.confirm,
          itemStyle: {
            color: "#00E272"
          }
        },
        {
          name: 'Completed',
          type: 'line',
          data: this.appointmentCount.completed,
          itemStyle: {
            color: "#544FC5"
          }
        },
        {
          name: 'Cancelled',
          type: 'line',
          data: this.appointmentCount.cancelled,
          itemStyle: {
            color: "#6B8ABC"
          }
        },
        {
          name: 'Pending',
          type: 'line',
          data: this.appointmentCount.pending,
          itemStyle: {
            color: "yellow"
          }
        },
      ]
    };
    myChart.setOption(this.chartoption); // Render the chart
  }

  overviewReport() {
    this.isLoading = true
    this.appointment.getAllAppointments().pipe(
      map((data: any) => {
        const groupedByDate: { [key: string]: any } = {};

        data.forEach((item: any) => {
          const date = item.date;
          const doctorId = item.doctorId;
          const doctorName = item.doctorName;

          if (!groupedByDate[date]) {
            groupedByDate[date] = {};
          }

          if (!groupedByDate[date][doctorId]) {
            groupedByDate[date][doctorId] = {};
          }

          if (!groupedByDate[date][doctorId][doctorName]) {
            groupedByDate[date][doctorId][doctorName] = {
              date: date,
              doctorId: doctorId,
              doctorName: doctorName,
              totalRequest: 0,
              confirmed: 0,
              cancelled: 0,
              completed: 0,
              pending: 0,
            };
          }

          // Increment the respective status count
          groupedByDate[date][doctorId][doctorName].totalRequest += 1; // Increment total requests

          if (item.status === 'confirmed') {
            groupedByDate[date][doctorId][doctorName].confirmed += 1;
          }

          if (item.status === 'cancelled') {
            groupedByDate[date][doctorId][doctorName].cancelled += 1;
          }

          if (item.status === 'completed') {
            groupedByDate[date][doctorId][doctorName].completed += 1;
          }

          if (item.status === 'pending') {
            groupedByDate[date][doctorId][doctorName].pending += 1;
          }
        });

        // Flatten the grouped data for easier display
        const groupedData = [];
        for (const date in groupedByDate) {
          for (const doctorId in groupedByDate[date]) {
            for (const doctorName in groupedByDate[date][doctorId]) {
              groupedData.push(groupedByDate[date][doctorId][doctorName]);
            }
          }
        }

        return groupedData;
      })
    )
      .subscribe({
        next: (groupedData) => {
          this.reportData.emit(groupedData)
          // console.log(groupedData)
        },
        error: (error) => {
          console.error(error); // Handle errors
        },
        complete: () => {
          const reportColumn = [
            { header: "Date", key: "date" },
            { header: "Total Appointments", key: "totalRequest" },
            { header: "Doctor Name", key: "doctorName" },
            { header: "Confirmed", key: "confirmed" },
            { header: "Cancelled", key: "cancelled" },
            { header: "Completed", key: "completed" },
            { header: "Pending", key: "pending" }
          ]

          this.reportsColumn.emit(reportColumn)
          this.reportView.emit({ onoff: true, range: "range", })
          this.reportInitializeDate.emit(this.selectedDate)
          this.reportDoctorId.emit(this.doctorId)

          this.isLoading = false
        }
      });
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

  viewmore():void{
    this.showViewMore = true
    this.viewMoreData()
  }

  closeViewMore():void{
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
    const chartDom = document.getElementById('viewMoreOpdOverview')!;
    const myChart = echarts.init(chartDom);

    // console.log(data)

    this.viewMoreChart = {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '5%',
        right: '15%',
        bottom: '10%'
      },
      xAxis: {
        type: 'category',
        data: data.date
      },
      yAxis: {
        type: 'value',
      },
      dataZoom: [
        {
          type: 'slider',   // Allows users to zoom in/out manually
          start: 0,         // Show all data from the beginning
          end: 100,         // Ensure full range is visible
          xAxisIndex: 0,    // Apply zooming on x-axis
          top: 15,
          left: 15,
          height: 15,
        },
        {
          type: 'inside'    // Allows zooming via scrolling
        }
      ],
      series: [
        {
          name: 'Total',
          type: 'line',
          data: data.request,
          itemStyle: {
            color: "#2CAFFE"
          }
        },
        {
          name: 'Confirmed',
          type: 'line',
          data: data.confirm,
          itemStyle: {
            color: "#00E272"
          }
        },
        {
          name: 'Completed',
          type: 'line',
          data: data.completed,
          itemStyle: {
            color: "#544FC5"
          }
        },
        {
          name: 'Cancelled',
          type: 'line',
          data: data.cancelled,
          itemStyle: {
            color: "#6B8ABC"
          }
        },
        {
          name: 'Pending',
          type: 'line',
          data: data.pending,
          itemStyle: {
            color: "yellow"
          }
        },
      ]
    };
    myChart.setOption(this.viewMoreChart); // Render the chart
  }

  viewMoreData(): void {
    this.loadDepartments();
    const dateFilteredAppointments = this.rawData.filter((data: any) => this.selectedViewDate.includes(data.date));

    const completedData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.status === "completed") : (appointment.status === 'completed' && this.selectedViewDoctor === appointment.doctorId));
    const requestData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? appointment : this.selectedViewDoctor === appointment.doctorId);
    const comfirmData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.status === "confirmed") : (appointment.status === 'confirmed' && this.selectedViewDoctor === appointment.doctorId));
    const cancelData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.status === "cancelled") : (appointment.status === 'cancelled' && this.selectedViewDoctor === appointment.doctorId));
    const pendingData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.status === "pending") : (appointment.status === 'pending' && this.selectedViewDoctor === appointment.doctorId));

    console.log(requestData, "request data")

    const requests = countByDate(requestData, 'date');
    const date = Object.keys(requests).sort();

    console.log(date, "requestdate")

    const appointmentCount: any = {
        date : '',
        request: '',
        completed: '',
        confirm: '',
        cancelled: '',
        pending: ''
    };

    appointmentCount.date = date
    appointmentCount.request = processAppointmentData(requestData, date);
    appointmentCount.completed = processAppointmentData(completedData, date);
    appointmentCount.confirm = processAppointmentData(comfirmData, date);
    appointmentCount.cancelled = processAppointmentData(cancelData, date);
    appointmentCount.pending = processAppointmentData(pendingData, date);

    this.ViewMorechart(appointmentCount);
    console.log(appointmentCount);
  }

  // viewMoreData(): void {
  //   this.isLoading = true
  //   this.appointment.getAllAppointments().subscribe({

  //     next: (data) => {
  //       this.rawData = data
  //       const dateFilteredAppointments = data.filter((data: any) => this.selectedDate.includes(data.date))

  //       const completedDate = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "completed") : (appointment.status === 'completed' && this.doctorId === appointment.doctorId))
  //       const requestData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? appointment : this.doctorId === appointment.doctorId)
  //       const comfirmData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "confirmed") : (appointment.status === 'confirmed' && this.doctorId === appointment.doctorId))
  //       const cancelData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "cancelled") : (appointment.status === 'cancelled' && this.doctorId === appointment.doctorId))
  //       const pendingData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "pending") : (appointment.status === 'pending' && this.doctorId === appointment.doctorId))

  //       const requests = countByDate(requestData, 'date');
  //       this.dates = Object.keys(requests).sort();

  //       this.appointmentCount.request = processAppointmentData(requestData, this.dates);
  //       this.appointmentCount.completed = processAppointmentData(completedDate, this.dates);
  //       this.appointmentCount.confirm = processAppointmentData(comfirmData, this.dates);
  //       this.appointmentCount.cancelled = processAppointmentData(cancelData, this.dates);
  //       this.appointmentCount.pending = processAppointmentData(pendingData, this.dates);

  //       this.viewMoreChart(this.appointmentCount)
  //     },
  //     error: (error) => {
  //       console.log(error)
  //     },
  //     complete: () => {
  //       this.isLoading = false
  //     }
  //   }
  //   )
  // }

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

  viewDoctorsOnchange(event:any):void{
    console.log(event)
    this.selectedViewDoctor = parseInt(event.target.value) || 'all'
    this.viewMoreData()
  }
}
