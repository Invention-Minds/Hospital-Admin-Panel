import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import * as echarts from 'echarts';
import { download, countByDate, filteredAppointments, getLastThirtyDaysFromSelected, getLastSevenDays, captureScreenshot } from '../functions';
import { Console, error } from 'console';
import { doctors } from '../../Analytics-Folder/data';
import { MessageService } from 'primeng/api';
import { title } from 'process';


@Component({
  selector: 'app-opd-request',
  templateUrl: './opd-request.component.html',
  styleUrl: './opd-request.component.css'
})
export class OpdRequestComponent {
  constructor(private appointment: AppointmentConfirmService, private docDetails: DoctorServiceService, private messageService : MessageService) { }

  appVia: any = {
    walkIn: 0,
    call: 0,
    online: 0,
  }

  chartInstance: any
  @Input() doctorId: any[] = []
  @Input() date: any
  requestType = {
    WALK_IN: 'Walk-In',
    CALL: 'Call',
    ONLINE: 'Online',
  } as const

  isLoading: boolean = true
  @Output() reportInitializeDate = new EventEmitter<any[]>();


  // report data
  tableData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
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
    this.date = getLastSevenDays()
    this.appointmentData()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
  }

  screenShot : Function = captureScreenshot

  appointmentData(): void {
    this.isLoading = true; // Set loading to true before making the API call

    this.appointment.getAllAppointments().subscribe({
      next: (data) => {
        this.rawData = data
        const filteredData = data.filter((appoint: any) => this.date.includes(appoint.date));
        const walkInData = filteredAppointments(filteredData, this.requestType.WALK_IN, this.doctorId, this.date);
        const callData = filteredAppointments(filteredData, this.requestType.CALL, this.doctorId, this.date);
        const onlineData = filteredAppointments(filteredData, this.requestType.ONLINE, this.doctorId, this.date);

        this.appVia.walkIn = Object.values(countByDate(walkInData, 'requestVia'));
        this.appVia.online = Object.values(countByDate(onlineData, 'requestVia'));
        this.appVia.call = Object.values(countByDate(callData, 'requestVia'));

        if (this.appVia) {
          this.chart();
        }
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false; // Set loading to false if there's an error
      },
      complete: () => {
        this.isLoading = false; // Set loading to false when the subscription is complete
      }
    });
  }

  // report() {
  //   this.isLoading = true
  //   this.appointment.getAllAppointments().subscribe((data: any[]) => {
  //     // console.log(data, "📌 Raw API Data");

  //     // ✅ Step 1: Transform data into a structured format with Doctor ID & Name
  //     let reportData = data.map((entry: any) => ({
  //       date: entry.date,
  //       doctorId: entry.doctorId,   // Include Doctor ID
  //       departmentName : entry.department,
  //       doctorName: entry.doctorName, // Include Doctor Name
  //       requestVia: entry.requestVia // Type of request (Online, Call, Walk-In)
  //     }));

  //     // console.log(reportData, "📌 Mapped Report Data");

  //     // ✅ Step 2: Group data by date & doctor
  //     let requestVia: {
  //       [key: string]: {
  //         date: string;
  //         doctorId: number;
  //         doctorName: string;
  //         online: number;
  //         call: number;
  //         walkIn: number;
  //       };
  //     } = {};

  //     for (let entry of reportData) {
  //       if (!entry.date || !entry.doctorId) continue; // Skip if no date or doctorId

  //       const key = `${entry.date}-${entry.doctorId}`; // Unique key per doctor per date

  //       if (!requestVia[key]) {
  //         requestVia[key] = {
  //           date: entry.date,
  //           doctorId: entry.doctorId,
  //           doctorName: entry.doctorName,
  //           online: 0,
  //           call: 0,
  //           walkIn: 0
  //         };
  //       }

  //       // ✅ Step 3: Count occurrences of each request type
  //       if (entry.requestVia === 'Call') {
  //         requestVia[key].call += 1;
  //       } else if (entry.requestVia === 'Walk-In') {
  //         requestVia[key].walkIn += 1;
  //       } else if (entry.requestVia === 'Online') {
  //         requestVia[key].online += 1;
  //       }
  //     }

  //     // ✅ Step 4: Convert object to array for easier display
  //     const tableData = Object.values(requestVia);
  //     this.tableData = tableData;
  //     console.log(tableData)

  //     // console.log(tableData, "📌 Final Processed Data");

  //     const reportColumn = [
  //       { header: "Date", key: "date" },
  //       { header: "Doctor", key: "doctorName" },
  //       { header: "Online", key: "online" },
  //       { header: "Call", key: "call" },
  //       { header: "Walk-In", key: "walkIn" },
  //     ]

  //     this.reportsColumn.emit(reportColumn)
  //     this.reportData.emit(tableData)
  //     this.reportView.emit({ onoff: true, range: "range" })
  //     this.reportInitializeDate.emit(this.date)

  //     // ✅ Step 5: Display the data or export it for reports
  //     this.isLoading = false
  //   });
  // }

  // 

  chart(): void {

    const chartContainer = document.getElementById('chart-container') as HTMLElement;
    this.chartInstance = echarts.init(chartContainer);

    const viewMoreOption = {
      // title :{
      //   text : "OPD Request Via"
      // },
      tooltip: {
          trigger: 'item'
      },
      series: [{
          name: 'Access From',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
              show: true,
              position: 'outside',
              formatter: '{c}',
              fontSize: 16,
              color: '#000'
          },
          emphasis: {
              label: {
                  show: true,
                  fontSize: 25,
                  fontWeight: 'bold'
              }
          },
          labelLine: {
              show: true
          },
          itemStyle: {
              borderRadius: 5,
              borderColor: '#fff',
              borderWidth: 1
          },
          data: [
            { value: this.appVia.walkIn, name: 'Walk-in' },
            { value: this.appVia.online, name: 'Online' },
            { value: this.appVia.call, name: 'Call' },
          ]
      }]
  };

    this.chartInstance.setOption(viewMoreOption);
  }

  report() {
    this.isLoading = true;
    this.appointment.getAllAppointments().subscribe((data: any[]) => {
      // Step 1: Transform data into a structured format with Doctor ID, Name, and Department
      let reportData = data.map((entry: any) => ({
        date: entry.date,
        doctorId: entry.doctorId,
        departmentName: entry.department,
        doctorName: entry.doctorName,
        requestVia: entry.requestVia
      }));
  
      // Step 2: Group data by date, doctor, and department
      let requestVia: {
        [key: string]: {
          date: string;
          doctorId: number;
          departmentName: string;
          doctorName: string;
          online: number;
          call: number;
          walkIn: number;
        };
      } = {};
  
      for (let entry of reportData) {
        if (!entry.date || !entry.doctorId || !entry.departmentName) continue; // Skip if no date, doctorId, or departmentName
  
        // Updated key to include departmentName
        const key = `${entry.date}-${entry.doctorId}-${entry.departmentName}`;
  
        if (!requestVia[key]) {
          requestVia[key] = {
            date: entry.date,
            doctorId: entry.doctorId,
            departmentName: entry.departmentName,
            doctorName: entry.doctorName,
            online: 0,
            call: 0,
            walkIn: 0
          };
        }
  
        // Step 3: Count occurrences of each request type
        if (entry.requestVia === 'Call') {
          requestVia[key].call += 1;
        } else if (entry.requestVia === 'Walk-In') {
          requestVia[key].walkIn += 1;
        } else if (entry.requestVia === 'Online') {
          requestVia[key].online += 1;
        }
      }
  
      // Step 4: Convert object to array for easier display
      const tableData = Object.values(requestVia);
      this.tableData = tableData;
      console.log(tableData);
  
      // Updated reportColumn to include Department
      const reportColumn = [
        { header: "Date", key: "date" },
        { header: "Department", key: "departmentName" },
        { header: "Doctor", key: "doctorName" },
        { header: "Online", key: "online" },
        { header: "Call", key: "call" },
        { header: "Walk-In", key: "walkIn" },
      ];
  
      this.reportsColumn.emit(reportColumn);
      this.reportData.emit(tableData);
      this.reportView.emit({ onoff: true, range: "range" });
      this.reportInitializeDate.emit(this.date);
      this.blockFilters.emit([false, false])
      this.reportName.emit("OPD Request Via")
  
      console.log(tableData, "table data")
      // Step 5: Display the data or export it for reports
      this.isLoading = false;
    });
  }

  downloadChart() {
    download("pie-chart", this.chartInstance)
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('Current date:', this.date, 'Type:', typeof this.date);
    if (
      (changes['doctorId'] && !changes['doctorId'].firstChange && this.doctorId != null) ||
      (changes['date'] && !changes['date'].firstChange && this.date != null)
    ) {
      this.appointmentData();
      console.log(this.date)
    }
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
        if(event.target.value === 'all'){
          this.departmentValue = 'all'
        }
        else{
          this.departmentValue = this.department.filter((entry:any) => entry.id === parseInt(event.target.value))[0].name
          this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
          this.viewMoreData()
        }
      },
      error: (error: any) => {
        console.error(error)
      },
      complete: () => {
      }
    }))
  }

  ViewMorechart(data: any): void {
    // Add null check for chartDom
    const chartDom = document.getElementById('viewMoreOpdReq');
    if (!chartDom) {
        console.error('Chart container element not found');
        return;
    }

    // Ensure echarts is available
    if (!echarts) {
        console.error('ECharts library not found');
        return;
    }

    const myChart = echarts.init(chartDom);

    // Define the option with proper typing and remove duplicate label property
    const viewMoreOption = {
        tooltip: {
            trigger: 'item'
        },
        series: [{
            name: 'Access From',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            label: {
                show: true,
                position: 'outside',
                formatter: '{c}',
                fontSize: 16,
                color: '#000'
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 25,
                    fontWeight: 'bold'
                }
            },
            labelLine: {
                show: true
            },
            itemStyle: {
                borderRadius: 5,
                borderColor: '#fff',
                borderWidth: 1
            },
            data: [
                { value: data?.walkIn ?? 0, name: 'Walk-in' },
                { value: data?.online ?? 0, name: 'Online' },
                { value: data?.call ?? 0, name: 'Call' }
            ]
        }]
    };

    myChart.setOption(viewMoreOption);
  }

  viewMoreData(): void {
    const filteredData = this.rawData.filter((appoint: any) => this.selectedViewDate.includes(appoint.date) && this.departmentValue === 'all' ? true : this.departmentValue === appoint.department);
    const walkInData = filteredAppointments(filteredData, this.requestType.WALK_IN, this.selectedViewDoctor, this.selectedViewDate);
    const callData = filteredAppointments(filteredData, this.requestType.CALL, this.selectedViewDoctor, this.selectedViewDate);
    const onlineData = filteredAppointments(filteredData, this.requestType.ONLINE, this.selectedViewDoctor, this.selectedViewDate);
    console.log(this.departmentValue)
    console.log(walkInData)

    const appVia: any = { 
      walkIn: '',
      online: '',
      call: ''
    }

    appVia.walkIn = Object.values(countByDate(walkInData, 'requestVia'));
    appVia.online = Object.values(countByDate(onlineData, 'requestVia'));
    appVia.call = Object.values(countByDate(callData, 'requestVia'));

    // this.isLoading = true 

    this.ViewMorechart(appVia)

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
