import { Component, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { countByDate, processAppointmentData } from '../functions';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { map } from 'rxjs/operators';
import { getLastSevenDays, getIndividualDates, getLastThirtyDaysFromSelected, reorderDateFormat, captureScreenshot  } from '../functions';
import { error } from 'console';
import * as echarts from 'echarts';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-opd-overview',
  templateUrl: './opd-overview.component.html',
  styleUrl: './opd-overview.component.css'
})
export class OpdOverviewComponent {
  constructor(private appointment: AppointmentConfirmService, private docDetails :  DoctorServiceService, private messageService : MessageService) { }

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
  @Input() importedRawData : any

  // report variables
  reportAppointmentData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();
  @Output() reportDoctorId = new EventEmitter<any[]>()
  @Output() blockFilters = new EventEmitter<boolean[]>();
  @Output() reportName = new EventEmitter<string>();

  // viewmore
  department: any
  departmentValue: any
  doctors: any
  filteredDoctors: any
  showViewMore : boolean = false
  dateInput : any
  selectedViewDate : any[] =[]
  selectedViewDoctor : any = 'all'
  selectedViewDepartment : any = 'all';
  allDoctors:any[]=[]


  // loading
  isLoading: boolean = true

  // screen shot
  screenShot : Function = captureScreenshot

  ngOnInit(): void {
    this.appointmentData()
    this.selectedDate = getLastSevenDays()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['doctorId'] && !changes['doctorId'].firstChange) || (changes['selectedDate'] && !changes['selectedDate'].firstChange)) {
      this.appointmentData()
    }

    if(changes['importedRawData']){
      console.log(this.importedRawData, "form opd overview")
    }
  }

  appointmentData(): void {
    this.isLoading = true
    this.appointment.getopdStatusWise().subscribe({

      next: (data) => {
        this.rawData = data
        const dateFilteredAppointments = data.filter((data: any) => this.selectedDate.includes(data.date))

        const completedDate = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "completed") : (appointment.status === 'completed' && this.doctorId === appointment.doctorId))
        const requestData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? appointment : this.doctorId === appointment.doctorId)
        const comfirmData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "confirmed") : (appointment.status === 'confirmed' && this.doctorId === appointment.doctorId))
        const cancelData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "cancelled") : (appointment.status === 'cancelled' && this.doctorId === appointment.doctorId))
        const pendingData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.status === "pending") : (appointment.status === 'pending' && this.doctorId === appointment.doctorId))
        const checkInData = dateFilteredAppointments.filter((appointment: any) => this.doctorId === 'all' ? (appointment.checkedIn === true) : (appointment.checkedIn === true && this.doctorId === appointment.doctorId))

        const requests = countByDate(requestData, 'date');
        this.dates = Object.keys(requests).sort();

        this.appointmentCount.request = processAppointmentData(requestData, this.dates);
        this.appointmentCount.completed = processAppointmentData(completedDate, this.dates);
        this.appointmentCount.confirm = processAppointmentData(comfirmData, this.dates);
        this.appointmentCount.cancelled = processAppointmentData(cancelData, this.dates);
        // this.appointmentCount.pending = processAppointmentData(checkInData, this.dates);

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
        data: reorderDateFormat(this.dates)
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
        // {
        //   type: 'inside'    // Allows zooming via scrolling
        // }
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
          name: 'Check-In',
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


  // overviewReport() {
  //   // this.isLoading = true;
  //   this.rawData.map((data: any) => {
  //       const groupedDataMap: { [key: string]: any } = {};
  
  //       data.forEach((item: any) => {
  //         const date = item.date;
  //         const doctorId = item.doctorId;
  //         const doctorName = item.doctorName;
  //         const departmentName = item.department; // Adjust if field name is different, e.g., item.departmentName
  
  //         // Create a unique key combining all four fields
  //         const uniqueKey = `${date}-${doctorId}-${doctorName}-${departmentName}`;
  
  //         if (!groupedDataMap[uniqueKey]) {
  //           groupedDataMap[uniqueKey] = {
  //             date: date,
  //             doctorId: doctorId,
  //             doctorName: doctorName,
  //             departmentName: departmentName,
  //             totalRequest: 0,
  //             confirmed: 0,
  //             cancelled: 0,
  //             completed: 0,
  //             pending: 0,
  //           };
  //         }
  
  //         // Increment the respective status count
  //         groupedDataMap[uniqueKey].totalRequest += 1;
  
  //         if (item.status === 'confirmed') {
  //           groupedDataMap[uniqueKey].confirmed += 1;
  //         }
  
  //         if (item.status === 'cancelled') {
  //           groupedDataMap[uniqueKey].cancelled += 1;
  //         }
  
  //         if (item.status === 'completed') {
  //           groupedDataMap[uniqueKey].completed += 1;
  //         }
  
  //         if (item.checkedIn === true) {
  //           groupedDataMap[uniqueKey].pending += 1;
  //         }
  //       });
  
  //       // Convert the grouped data object to an array
  //       const groupedData = Object.values(groupedDataMap);
  
  //       this.reportData.emit(groupedData);
  //       const reportColumn = [
  //         { header: "Date", key: "date" },
  //         { header: "Doctor Name", key: "doctorName" },
  //         { header: "Total Appointments", key: "totalRequest" },
  //         { header: "Confirmed", key: "confirmed" },
  //         { header: "Cancelled", key: "cancelled" },
  //         { header: "Completed", key: "completed" },
  //         { header: "Checked-In", key: "pending" }
  //       ];

  //       this.reportsColumn.emit(reportColumn);
  //       this.reportView.emit({ onoff: true, range: "range" });
  //       this.reportInitializeDate.emit(this.selectedDate);
  //       this.reportDoctorId.emit(this.doctorId);
  //       this.blockFilters.emit([false, false])
  //       this.reportName.emit('OPD Overview')

  //       console.log(this.selectedDate);

  //       // this.isLoading = false;
        
  //     })

  //       }
  overviewReport() {
    const groupedDataMap: { [key: string]: any } = {};
  
    this.rawData.forEach((item: any) => {
      const date = item.date;
      const doctorId = item.doctorId;
      const doctorName = item.doctorName;
      const departmentName = item.department;
  
      const uniqueKey = `${date}-${doctorId}-${doctorName}-${departmentName}`;
  
      if (!groupedDataMap[uniqueKey]) {
        groupedDataMap[uniqueKey] = {
          date,
          doctorId,
          doctorName,
          departmentName,
          totalRequest: 0,
          confirmed: 0,
          cancelled: 0,
          completed: 0,
          pending: 0,
        };
      }
  
      groupedDataMap[uniqueKey].totalRequest += 1;
  
      if (item.status === 'confirmed') groupedDataMap[uniqueKey].confirmed += 1;
      if (item.status === 'cancelled') groupedDataMap[uniqueKey].cancelled += 1;
      if (item.status === 'completed') groupedDataMap[uniqueKey].completed += 1;
      if (item.checkedIn === true) groupedDataMap[uniqueKey].pending += 1;
    });
  
    const groupedData = Object.values(groupedDataMap);
  
    this.reportData.emit(groupedData);
    this.reportsColumn.emit([
      { header: "Date", key: "date" },
      { header: "Doctor Name", key: "doctorName" },
      { header: "Total Appointments", key: "totalRequest" },
      { header: "Confirmed", key: "confirmed" },
      { header: "Cancelled", key: "cancelled" },
      { header: "Completed", key: "completed" },
      { header: "Checked-In", key: "pending" }
    ]);
    this.reportView.emit({ onoff: true, range: "range" });
    this.reportInitializeDate.emit(this.selectedDate);
    this.reportDoctorId.emit(this.doctorId);
    this.blockFilters.emit([false, false]);
    this.reportName.emit('OPD Overview');
  
    console.log(this.selectedDate);
  }
  
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
    this.loadDepartments();
    this.viewMoreData();
    this.fetchDoctors()
  }

  closeViewMore():void{
    this.showViewMore = false
  }

  // departmentOnchange(event: any): void {
  //   this.docDetails.getDoctors().subscribe(({
  //     next: (data: any) => {
  //       this.selectedViewDoctor = 'all'
  //       this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
  //       this.selectedViewDepartment = this.department.filter((entry:any) => entry.id === parseInt(event.target.value))[0].name
  //       this.viewMoreData()
  //     },
  //     error: (error: any) => {
  //       console.error(error)
  //     },
  //     complete: () => {

  //     }
  //   }))
  // }
  fetchDoctors():void{
    this.docDetails.getDoctorWithDepartment().subscribe((data: any[]) => {
      this.allDoctors = data;
    });
  }
  departmentOnchange(event: any): void {
    this.selectedViewDoctor = 'all';
  
    if (event.target.value === 'all') {
      this.departmentValue = 'all';
      this.filteredDoctors = this.allDoctors; // Show all doctors
    } else {
      const selectedDeptId = parseInt(event.target.value);
      const selectedDept = this.department.find((entry: any) => entry.id === selectedDeptId);
  
      if (selectedDept) {
        this.departmentValue = selectedDept.name;
        this.filteredDoctors = this.allDoctors.filter((doc: any) => doc.departmentId === selectedDeptId);
      } else {
        this.departmentValue = '';
        this.filteredDoctors = [];
      }
    }
  
    this.viewMoreData(); // Call after filtering
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
        data: reorderDateFormat(data.date)
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
          name: 'Check-In',
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
    const dateFilteredAppointments = this.rawData.filter((data: any) => this.selectedViewDate.includes(data.date) && this.selectedViewDepartment === 'all' ? this.selectedViewDate.includes(data.date) : this.selectedViewDepartment === data.department);

    const completedData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.status === "completed") : (appointment.status === 'completed' && this.selectedViewDoctor === appointment.doctorId));
    const requestData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? appointment : this.selectedViewDoctor === appointment.doctorId);
    const comfirmData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.status === "confirmed") : (appointment.status === 'confirmed' && this.selectedViewDoctor === appointment.doctorId));
    const cancelData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.status === "cancelled") : (appointment.status === 'cancelled' && this.selectedViewDoctor === appointment.doctorId));
    const pendingData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.status === "pending") : (appointment.status === 'pending' && this.selectedViewDoctor === appointment.doctorId));
    const checkedInData = dateFilteredAppointments.filter((appointment: any) => this.selectedViewDoctor === 'all' ? (appointment.checkedIn === true) : (appointment.checkedIn === true && this.selectedViewDoctor === appointment.doctorId));

    // console.log(requestData, "request data")

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

    // appointmentCount.date = date
    // appointmentCount.request = processAppointmentData(requestData, date);
    // appointmentCount.completed = processAppointmentData(completedData, date);
    // appointmentCount.confirm = processAppointmentData(comfirmData, date);
    // appointmentCount.cancelled = processAppointmentData(cancelData, date);
    // appointmentCount.pending = processAppointmentData(checkedInData, date);

    appointmentCount.date = date
    appointmentCount.request = processAppointmentData(requestData, date);
    appointmentCount.completed = processAppointmentData(completedData, date);
    appointmentCount.confirm = processAppointmentData(comfirmData, date);
    appointmentCount.cancelled = processAppointmentData(cancelData, date);
    // appointmentCount.pending = processAppointmentData(checkedInData, date);

    this.ViewMorechart(appointmentCount);
    // console.log(appointmentCount);
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

  viewDoctorsOnchange(event:any):void{
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
    this.selectedViewDepartment = 'all'
    this.viewmore()
    this.dateInput = []
  }
}
