import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { getYesterdayDate, getIndividualDates, utcToIstTime, getLastThirtyDaysFromSelected, getLastSevenDays, captureScreenshot } from '../functions';
import { error } from 'console';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Header } from 'primeng/api';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
@Component({
  selector: 'app-average-waiting-time',
  templateUrl: './average-waiting-time.component.html',
  styleUrls: ['./average-waiting-time.component.css']
})
export class AverageWaitingTimeComponent implements OnInit, OnChanges {

  constructor(private appointment: AppointmentConfirmService, private docDetails: DoctorServiceService, private messageService: MessageService) { }

  option: any;
  @Input() department: any
  @Input() date: any[] = [];
  waitingData: any = {
    doctorNames: [], // Renamed for clarity
    more_than_twenty_min: [] // Should hold counts for the chart
  };

  isLoading: boolean = true

  initDepartments : any

  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();
  @Output() blockFilters = new EventEmitter<boolean[]>();
  @Output() reportName = new EventEmitter<string>();


  // viewmore
  rawData: any
  viewMoreDepartment: any
  selectedViewMoreDepartment: any
  departmentValue: any = 'all'
  doctors: any
  filteredDoctors: any
  showViewMore: boolean = false
  dateInput: any
  selectedViewDate: any[] = []
  selectedViewDoctor: any = 'all'
  viewMoreChart: any
  mt_40_min: any
  allDoctors:any[]=[]

  // screenshot
  screenShot : Function = captureScreenshot

  ngOnInit(): void {
    const yersterDay = getYesterdayDate()
    this.date = getLastSevenDays()
    // this.loadWaitingTime(this.date);
    this.department = 'INTERNAL MEDICINE'
    this.selectedViewMoreDepartment = 'INTERNAL MEDICINE'
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.initLoadDepartments()
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes["date"] || changes["department"]) {
      this.loadWaitingTime(this.date);
    }
  }

  initChart(): void {
    const chartDom = document.getElementById('horizontal-bar-charts')!;
    const myChart = echarts.init(chartDom);

    this.option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: this.waitingData.doctorNames, // Using doctorNames for categories
          axisTick: {
            alignWithLabel: true
          }
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: [
        {
          name: 'More than 40 min',
          type: 'bar',
          barWidth: '60%',
          data: this.waitingData.more_than_twenty_min // Correct data array for the chart
        }
      ]
    };

    myChart.setOption(this.option);
  }

  async initLoadDepartments(): Promise<void> {
    try {
      const data = await this.docDetails.getDepartments().toPromise()
      this.initDepartments = data;
      // console.log(this.viewMoreDepartment)
    } catch (err) {
      console.error(err)
    }
  }

  onInitDepartmentChange(event:any):void{
    this.department = this.initDepartments.filter((entry: any) => entry.id === parseInt(event.target.value))[0].name
    this.loadWaitingTime(this.date)
  }

  loadWaitingTime(date: any[]): void {
    this.isLoading = true;
    this.appointment.getAllAppointments().subscribe({

      next: (data) => {
        console.log(this.department)
        this.rawData = data
        const filteredData = data.filter(
          (entry: any) => date.includes(entry.date) && entry.department === this.department
        );
        const groupedData = new Map();  // Use a Map to group data by doctorId

        filteredData.forEach((entry: any) => {
          if (entry.waitingTime !== null) {
            let range: string;

            // Categorize waiting times into the correct range
            if (entry.waitingTime <= 5) {
              range = 'five_min';
            } else if (entry.waitingTime <= 10) {
              range = 'ten_min';
            } else if (entry.waitingTime <= 15) {
              range = 'fifteen_min';
            } else if (entry.waitingTime <= 40) {
              range = 'twenty_min';
            } else {
              range = 'more_than_twenty_min';
            }

            const key = `${entry.doctorId}`;  // Key using doctorId and date

            if (!groupedData.has(key)) {
              groupedData.set(key, {
                date: entry.date,
                doctorId: entry.doctorId,
                doctorName: entry.doctorName,
                departmentName: entry.department,
                five_min: 0,
                ten_min: 0,
                fifteen_min: 0,
                twenty_min: 0,
                more_than_twenty_min: 0,
              });
            }

            const doctorEntry = groupedData.get(key);
            doctorEntry[range] += 1;  // Increment the count for the range
          }
        });

        // Convert the grouped data to an array
        const formattedData = Array.from(groupedData.values());

        // Format the data for the chart
        this.waitingData.doctorNames = formattedData.map((entry: any) => entry.doctorName);
        this.waitingData.more_than_twenty_min = formattedData.map(
          (entry: any) => entry.more_than_twenty_min
        );
        this.initChart();
      },
      error: (error) => {
        console.log(error);
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  report(): void {
    this.isLoading = true;
    this.appointment.getAllAppointments().subscribe((data) => {
      const groupedData = new Map<string, any>();  // Use a Map to group by date and doctorId

      data.forEach((entry: any) => {
        if (entry.waitingTime !== null) {
          let range: string;

          // Categorize waiting times into the correct range
          if (entry.waitingTime <= 5) {
            range = 'five_min';
          } else if (entry.waitingTime <= 10) {
            range = 'ten_min';
          } else if (entry.waitingTime <= 15) {
            range = 'fifteen_min';
          } else if (entry.waitingTime <= 20) {
            range = 'twenty_min';
          } else if (entry.waitingTime <= 40) {
            range = 'fourty_min'
          } else {
            range = 'more_than_fourty_min';
          }

          const key = `${entry.date}-${entry.doctorId}`;  // Key using date and doctorId

          // If the key doesn't exist, initialize an entry in the Map
          if (!groupedData.has(key)) {
            groupedData.set(key, {
              date: entry.date,
              doctorId: entry.doctorId,
              doctorName: entry.doctorName,
              departmentName: entry.department,
              five_min: 0,
              ten_min: 0,
              fifteen_min: 0,
              twenty_min: 0,
              fourty_min: 0,
              more_than_fourty_min: 0,
            });
          }

          // Get the existing entry and increment the range count
          const doctorEntry = groupedData.get(key);
          doctorEntry[range] += 1;
        }
      });

      // Convert the grouped data to an array for reporting
      const formattedData = Array.from(groupedData.values());

      this.reportData.emit(formattedData);

      const reportColumn = [
        { header: 'Date', key: 'date' },
        { header: 'Doctor', key: 'doctorName' },
        { header: 'Department', key: 'departmentName' },
        { header: '0 - 5 min', key: 'five_min' },
        { header: '5 - 10 min', key: 'ten_min' },
        { header: '10 - 15 min', key: 'fifteen_min' },
        { header: '15 - 20 min', key: 'twenty_min' },
        { header: '20 - 40 min', key: 'fourty_min' },
        { header: 'More than 40 mins', key: 'more_than_fourty_min' },
      ];

      console.log(reportColumn, "reportCloumn")

      this.reportsColumn.emit(reportColumn);
      this.reportView.emit({ onoff: true, range: 'range' });
      this.reportInitializeDate.emit(this.date);
      this.blockFilters.emit([false, false])
      this.reportName.emit("Average Waiting time")

      this.isLoading = false;
    });
  }

  // viewmore

  async loadDepartments(): Promise<void> {
    try {
      const data = await this.docDetails.getDepartments().toPromise()
      this.viewMoreDepartment = data;
      // console.log(this.viewMoreDepartment)
    } catch (err) {
      console.error(err)
    }
  }

  viewmore(): void {
    this.showViewMore = true
    this.loadDepartments()
    this.viewMoreData()
    this.fetchDoctors()
  }

  closeViewMore(): void {
    this.showViewMore = false
  }

  // departmentOnchange(event: any): void {

  //   this.docDetails.getDoctors().subscribe(({
  //     next: (data: any) => {
  //       this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
  //       this.selectedViewMoreDepartment = this.viewMoreDepartment.filter((entry: any) => entry.id === parseInt(event.target.value))[0].name
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
      const selectedDept = this.viewMoreDepartment.find((entry: any) => entry.id === selectedDeptId);
  
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

  // ViewMorechart(data: any): void {
  //   const chartDom = document.getElementById('viewMoreAverageWaitingTime')!;
  //   const myChart = echarts.init(chartDom);

  //   // console.log(data)

  //   this.viewMoreChart = {
  //     tooltip: {
  //       trigger: 'axis',
  //       axisPointer: {
  //         type: 'shadow'
  //       }
  //     },
  //     grid: {
  //       left: '3%',
  //       right: '4%',
  //       bottom: '3%',
  //       containLabel: true
  //     },
  //     xAxis: [
  //       {
  //         type: 'category',
  //         data: data.doctorNames, // Using doctorNames for categories
  //         axisTick: {
  //           alignWithLabel: true
  //         }
  //       }
  //     ],
  //     yAxis: [
  //       {
  //         type: 'value'
  //       }
  //     ],
  //     series: [
  //       {
  //         name: 'More than 40 min',
  //         type: 'bar',
  //         barWidth: '60%',
  //         data: data.more_than_twenty_min // Correct data array for the chart
  //       }
  //     ]
  //   };
  //   myChart.setOption(this.viewMoreChart); // Render the chart


  // }

  ViewMorechart(data: any): void {
    const chartDom = document.getElementById('viewMoreAverageWaitingTime')!;
    const myChart = echarts.init(chartDom);

    this.viewMoreChart = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: data.doctorNames, // Doctor names for categories
          axisTick: {
            alignWithLabel: true
          }
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: [
        {
          name: 'More than 40 min',
          type: 'bar',
          barWidth: '60%',
          data: data.more_than_twenty_min // Chart data
        }
      ]
    };

    myChart.setOption(this.viewMoreChart); // Render the chart

    myChart.off('click');

    myChart.on('click', (params) => {
      if (params.seriesType === 'bar') {
        this.downloadReport(params.name);
      }
    });
  }

  downloadReport(event: any): void {
    console.log(event);
    console.log(this.rawData, "raw data");

    const processedData = this.rawData.filter((entry: any) =>
      event === entry.doctorName &&
      this.selectedViewDate.includes(entry.date) &&
      entry.waitingTime >= 40
    ).map((entry: any) => {
      return {
        "Patient Name": entry.patientName,
        "Appointment Date": entry.date,
        "Appointment Time": entry.time,
        "Doctor Name": entry.doctorName,
        "Age": entry.age,
        "Waiting Time": entry.waitingTime,
        "Checked-In Time": utcToIstTime(entry.checkedInTime),
        "Checked-Out Time": utcToIstTime(entry.checkedOutTime)
      };
    });

    console.log(processedData, `${event}_patient_waiting_time_report`);

    if (processedData.length === 0) {
      console.warn("No data to export");
      return;
    }

    // Create a new worksheet with the formatted headers
    const worksheet = XLSX.utils.json_to_sheet(processedData, {
      header: [
        "Patient Name", "Appointment Date", "Appointment Time",
        "Doctor Name", "Age", "Waiting Time", "Checked-In Time", "Checked-Out Time"
      ]
    });

    // Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patient Report");

    // Generate an Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Convert buffer to Blob and trigger download
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(data, "Patient_Report.xlsx");
  }


  viewMoreData(): void {
    const filteredData = this.rawData.filter(
      (entry: any) => this.selectedViewDate.includes(entry.date) && entry.department === this.selectedViewMoreDepartment
    );
    const groupedData = new Map();  // Use a Map to group data by doctorId

    const viewReportData = groupedData

    filteredData.forEach((entry: any) => {
      if (entry.waitingTime !== null) {
        let range: string;

        // Categorize waiting times into the correct range
        if (entry.waitingTime <= 5) {
          range = 'five_min';
        } else if (entry.waitingTime <= 10) {
          range = 'ten_min';
        } else if (entry.waitingTime <= 15) {
          range = 'fifteen_min';
        } else if (entry.waitingTime <= 40) {
          range = 'twenty_min';
        } else {
          range = 'more_than_twenty_min';
        }

        const key = `${entry.doctorId}`;  // Key using doctorId and date

        if (!groupedData.has(key)) {
          groupedData.set(key, {
            date: entry.date,
            doctorId: entry.doctorId,
            doctorName: entry.doctorName,
            departmentName: entry.department,
            five_min: 0,
            ten_min: 0,
            fifteen_min: 0,
            twenty_min: 0,
            more_than_twenty_min: 0,
          });
        }

        const doctorEntry = groupedData.get(key);
        doctorEntry[range] += 1;  // Increment the count for the range
      }

    });

    // Convert the grouped data to an array
    const formattedData = Array.from(groupedData.values());

    const data: any = {
      doctorNames: '',
      more_than_twenty_min: ''
    }

    // Format the data for the chart
    data.doctorNames = formattedData.map((entry: any) => entry.doctorName);
    data.more_than_twenty_min = formattedData.map(
      (entry: any) => entry.more_than_twenty_min
    );
    this.ViewMorechart(data)
    this.mt_40_min = data
  }

  // viewOnDatechange(event: any): void {
  //   if (Array.isArray(event) && event.length === 2) {
  //     const startDate = new Date(event[0]);
  //     let endDate = event[1] !== null ? new Date(event[1]) : new Date(event[0]);

  //     // Calculate the difference in days
  //     const timeDifference = endDate.getTime() - startDate.getTime();
  //     const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

  //     // Check if difference exceeds 30 days
  //     if (dayDifference > 30) {
  //       // Show alert
  //       alert("You can only view 30 days of data at a time. Showing first 30 days from selected start date.");

  //       // Set endDate to 30 days from startDate
  //       const adjustedEndDate = new Date(startDate);
  //       adjustedEndDate.setDate(startDate.getDate() + 29); // +29 because we include start date
  //       this.selectedViewDate = getIndividualDates(startDate, adjustedEndDate);
  //     } else {
  //       // Use original dates if within 30 days
  //       this.selectedViewDate = getIndividualDates(startDate, endDate);
  //     }

  //     this.viewMoreData();
  //   }
  // }

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
    // console.log(event)
    this.selectedViewDoctor = parseInt(event.target.value) || 'all'
    this.viewMoreData()
  }

  refresh(): void {
    this.selectedViewDate = []
    this.selectedViewMoreDepartment = 'INTERNAL MEDICINE'
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.selectedViewDoctor = 'all'
    this.filteredDoctors = []
    this.viewmore()
    this.dateInput = []
  }

}
