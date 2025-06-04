import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { EstimationService } from '../../services/estimation/estimation.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { DatePipe } from '@angular/common';
import { formatDate } from '@angular/common';
import { error } from 'console';
import { getIndividualDates, getYesterdayDate, getLastThirtyDaysFromSelected, reorderDateFormat, getLastSevenDays, getTodayDate, captureScreenshot } from '../functions'
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-estimation-bar',
  templateUrl: './estimation-bar.component.html',
  styleUrl: './estimation-bar.component.css'
})
export class EstimationBarComponent implements OnChanges {

  constructor(private estimation: EstimationService, private datePipe: DatePipe, private docDetails: DoctorServiceService, private messageService : MessageService) { }

  option: any;
  estimationData: any = {
    date: '',
    totalRaised: 0,
    approved: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    overdue: 0
  };
  modJson: any;
  filteredData: any;
  date: any = 'all';
  doctorID: any = 'all';
  data: any;
  lastSevenDaysData: any[] = []

  tableData: any[] = [];
  monthDates: string[] = [];

  @Input() selectedDate: any

  isLoading: boolean = true

  // report variables
  reportAppointmentData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();
  @Output() blockFilters = new EventEmitter<boolean[]>();
  @Output() reportName = new EventEmitter<string>()


  // viewmore
  rawData: any
  department: any
  viewModJson: any
  departmentValue: any
  doctors: any
  filteredDoctors: any
  showViewMore: boolean = false
  dateInput: any
  selectedViewDate: any[] = []
  selectedViewDoctor: any = 'all'
  viewMoreoption: any
  viewMonthDates: any
  allDoctors: any[] = []

  // screenshot
  screenShot : Function = captureScreenshot

  ngOnInit() {
    const yesterdayDate = getYesterdayDate()
    // this.selectedDate = getLastSevenDays()
    console.log(this.selectedDate, "from estimation")
    // Ensure this is called
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    // this.loadEstimation();

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']) {
      this.loadEstimation();
    }
  }

  initChart(): void {
    const chartDom = document.getElementById('bar-chart')!;
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
          data: reorderDateFormat(this.lastSevenDaysData.map((date: any) => date.date)),
          axisLabel: {
            rotate: 0
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
          name: 'Pending',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: this.lastSevenDaysData.map((data: any) => data.pending),
          itemStyle: {
            color: '#FB9C2A'
          },
          label: {
            show: true, // Enable labels
            position: 'inside', // Place inside the bars
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
            fontSize: 12, // Adjust font size
            color: '#fff' // White text for contrast
          }
        },
        {
          name: 'Submitted',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: this.lastSevenDaysData.map((data: any) => data.submitted),
          itemStyle: {
            color: '#0096F0'
          },
          label: {
            show: true, // Enable labels
            position: 'inside', // Place inside the bars
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
            fontSize: 12, // Adjust font size
            color: '#fff' // White text for contrast
          }
        },
        {
          name: 'Approved',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: this.lastSevenDaysData.map((data: any) => data.approved),
          itemStyle: {
            color: '#700E10'
          },
          label: {
            show: true, // Enable labels
            position: 'inside', // Place inside the bars
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
            fontSize: 12, // Adjust font size
            color: '#fff' // White text for contrast
          }
        },
        {
          name: 'Confirmed',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: this.lastSevenDaysData.map((data: any) => data.confirmed),
          itemStyle: {
            color: '#00EBEB'
          },
          label: {
            show: true, // Enable labels
            position: 'inside', // Place inside the bars
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
            fontSize: 12, // Adjust font size
            color: '#fff' // White text for contrast
          }
        },
        {
          name: 'Completed',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: this.lastSevenDaysData.map((data: any) => data.completed),
          itemStyle: {
            color: '#169458'
          },
          label: {
            show: true, // Enable labels
            position: 'inside', // Place inside the bars
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
            fontSize: 12, // Adjust font size
            color: '#fff' // White text for contrast
          }
        },
        {
          name: 'Cancelled',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: this.lastSevenDaysData.map((data: any) => data.cancelled),
          itemStyle: {
            color: '#FF4545'
          },
          label: {
            show: true, // Enable labels
            position: 'inside', // Place inside the bars
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
            fontSize: 12, // Adjust font size
            color: '#fff' // White text for contrast
          }
        },
        {
          name: 'Over Due',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: this.lastSevenDaysData.map((data: any) => data.overdue),
          itemStyle: {
            color: '#959595'
          },
          label: {
            show: true, // Enable labels
            position: 'inside', // Place inside the bars
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
            fontSize: 12, // Adjust font size
            color: '#fff' // White text for contrast
          }
        },
      ],

    };
    myChart.setOption(this.option);
  }

  loadEstimation(): void {
    this.estimation.getStatusEstimation().subscribe({
      next: (data) => {

        this.rawData = data

        this.modJson = data.map((entry: any) => {
          return {
            estimationDate: entry.estimationCreatedTime ? this.datePipe.transform(entry.estimationCreatedTime, 'yyyy-MM-dd') : null,
            approvedDate: entry.approvedDateAndTime ? this.datePipe.transform(entry.approvedDateAndTime, 'yyyy-MM-dd') : null,
            confirmedDate: entry.confirmedDateAndTime ? this.datePipe.transform(entry.confirmedDateAndTime, 'yyyy-MM-dd') : null,
            cancelledDate: entry.cancellationDateAndTime ? this.datePipe.transform(entry.cancellationDateAndTime, 'yyyy-MM-dd') : null,
            overDueDate: entry.overDueDateAndTIme ? this.datePipe.transform(entry.overDueDateAndTIme, 'yyyy-MM-dd') : null, // Fixed mapping
            completedDate: entry.completedDateAndTime ? this.datePipe.transform(entry.completedDateAndTime, 'yyyy-MM-dd') : null, // Fixed mapping
            submittedDate: entry.submittedDateAndTime ? this.datePipe.transform(entry.submittedDateAndTime, 'yyyy-MM-dd') : null, // Fixed mapping
            status: entry.statusOfEstimation,
            estimationId: entry.estimationId
          };
        });

        console.log(this.modJson)

        this.generateMonthDates();
        this.mapStatusesToDates();
      },
      error: (error) => {
        console.error('Error locking the appointment:', error);
      },
      complete: () => {
        this.isLoading = false
      },
    })
  }

  generateMonthDates() {
    const todayDate = getTodayDate()
    const dates = this.modJson.filter((date: any) => date.estimationDate !== null).map((date: any) => date.estimationDate)
    const sort = dates.sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());
    const startDate = new Date(sort[0])
    const endDate = todayDate
    this.monthDates = getIndividualDates(new Date(startDate), new Date(endDate))
  }

  mapStatusesToDates() {
    const statusCount: any = {};

    console.log(this.modJson)
    console.log(this.monthDates)

    if (this.monthDates) {
      for (let date of this.monthDates) {
        // Initialize count for each date
        statusCount[date] = { cancelled: 0, approved: 0, confirmed: 0, overdue: 0, completed: 0, pending: 0, submitted: 0 };

        if (this.modJson) {
          for (let entry of this.modJson) {
            const formattedDate = date;
            const cancelledDate = entry.cancelledDate;
            const approvedDate = entry.approvedDate;
            const confirmedDate = entry.confirmedDate;
            const overdueDate = entry.overDueDate;
            const completedDate = entry.completedDate;
            const pendingDate = entry.estimationDate;
            const submittedDate = entry.submittedDate;

            console.log(formattedDate,overdueDate)

            if (entry.status === 'cancelled' && formattedDate === cancelledDate) {
              // console.log('Cancelled matched:', entry);
              statusCount[date].cancelled += 1;
            }

            if (entry.status === 'approved' && formattedDate === approvedDate) {
              // console.log('Approved matched:', entry);
              statusCount[date].approved += 1;
            }

            if (entry.status === 'confirmed' && formattedDate === confirmedDate) {
              // console.log('Confirmed matched:', entry);
              statusCount[date].confirmed += 1;
            }

            if (entry.status === 'overDue' && formattedDate === overdueDate) {
              console.log('Overdue matched:', entry);
              statusCount[date].overdue += 1;
            }

            if (entry.status === 'completed' && formattedDate === completedDate) {
              // console.log('Overdue matched:', entry);
              statusCount[date].completed += 1;
            }

            if (entry.status === 'pending' && formattedDate === pendingDate) {
              // console.log('Overdue matched:', entry);
              statusCount[date].pending += 1;
            }

            if (entry.status === 'submitted' && formattedDate === submittedDate) {
              // console.log('Overdue matched:', entry);
              statusCount[date].submitted += 1;
            }
          }
        }
      }
    }

    this.tableData = [];
    for (let date in statusCount) {
      this.tableData.push({
        date: date,
        cancelled: statusCount[date].cancelled,
        submitted: statusCount[date].submitted,
        approved: statusCount[date].approved,
        confirmed: statusCount[date].confirmed,
        overdue: statusCount[date].overdue,
        completed: statusCount[date].completed,
        pending: statusCount[date].pending,
      });
    }

    // Sort the data by date (ensure date is a string)
    this.tableData.sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());

    // const today = new Date(this.selectedDate[6] || this.selectedDate[this.selectedDate.length - 1]);
    // const lastWeek = new Date(today);
    // lastWeek.setDate(today.getDate() - 7);

    // this.lastSevenDaysData = this.tableData.filter((item) => {
    //   const itemDate = new Date(item.date as string);
    //   return itemDate >= lastWeek && itemDate <= today; // Include only dates within the last 7 days
    // });

    // this.lastSevenDaysData = this.tableData.filter((entry:any) => this.selectedDate.includes(entry.date))
    this.lastSevenDaysData = this.selectedDate.map((date:any) => {
      const existingEntry = this.tableData.find(entry => entry.date === date);
      return existingEntry || { date, cancelled: 0, submitted: 0, approved: 0, confirmed: 0, overdue: 0, completed: 0, pending: 0 };
    });
    
    console.log(this.selectedDate, "from estimation bar")

    this.initChart();

    console.log(this.tableData, "tabledaat")
  }

  report(): void {
    this.isLoading = true
    const reportColumn = [
      { header: "Date", key: "date" },
      { header: "Pending", key: "pending" },
      { header: "Submitted", key: "submitted" },
      { header: "Approved", key: "approved" },
      { header: "Confimed", key: "confirmed" },
      { header: "Competed", key: "completed" },
      { header: "Cancelled", key: "cancelled" },
      { header: "Overdue", key: "overdue" },
    ]
    this.reportsColumn.emit(reportColumn)
    this.reportView.emit({ onoff: true, range: "range" })
    this.reportData.emit(this.tableData)
    this.reportInitializeDate.emit(this.selectedDate)
    this.blockFilters.emit([false, false])
    this.reportName.emit("Estimation Status Overview")
    this.isLoading = false
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
    const chartDom = document.getElementById('viewMoreEstChart')!;
    const myChart = echarts.init(chartDom);

    this.viewMoreoption = {
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
          data: reorderDateFormat(data.map((date: any) => date.date)),
          axisLabel: {
            rotate: 0
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
          name: 'Pending',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: data.map((data: any) => data.pending),
          itemStyle: {
            color: '#FB9C2A'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: function (params:any) {
              return params.value > 0 ? params.value : '';
            },
            fontSize: 12,
            color: '#fff'
          }
        },
        {
          name: 'Submitted',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: data.map((data: any) => data.submitted),
          itemStyle: {
            color: '#0096F0'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: function (params:any) {
              return params.value > 0 ? params.value : '';
            },
            fontSize: 12,
            color: '#fff'
          }
        },
        {
          name: 'Approved',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: data.map((data: any) => data.approved),
          itemStyle: {
            color: '#700E10'
          },
          label: {
            show: true, // Enable labels
            position: 'inside', // Place inside the bars
            formatter: function (params:any) {
              return params.value > 0 ? params.value : ''; // Show value only if > 0
            },
            fontSize: 12, // Adjust font size
            color: '#fff' // White text for contrast
          }
        },
        {
          name: 'Confirmed',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: data.map((data: any) => data.confirmed),
          itemStyle: {
            color: '#00EBEB'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: function (params:any) {
              return params.value > 0 ? params.value : '';
            },
            fontSize: 12,
            color: '#000' // Black text for lighter background
          }
        },
        {
          name: 'Completed',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: data.map((data: any) => data.completed),
          itemStyle: {
            color: '#169458'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: function (params:any) {
              return params.value > 0 ? params.value : '';
            },
            fontSize: 12,
            color: '#fff'
          }
        },
        {
          name: 'Cancelled',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: data.map((data: any) => data.cancelled),
          itemStyle: {
            color: '#FF4545'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: function (params:any) {
              return params.value > 0 ? params.value : '';
            },
            fontSize: 12,
            color: '#fff'
          }
        },
        {
          name: 'Over Due',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: data.map((data: any) => data.overdue),
          itemStyle: {
            color: '#959595'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: function (params:any) {
              return params.value > 0 ? params.value : '';
            },
            fontSize: 12,
            color: '#000' // Black text for lighter background
          }
        },
      ]
    };

    myChart.setOption(this.viewMoreoption); // Render the chart
  }

  viewMoreData(): void {
    this.loadDepartments();
    this.fetchDoctors();

    this.viewModJson = this.rawData.filter((entry:any) => this.selectedViewDoctor === 'all' ? entry : entry.consultantId === this.selectedViewDoctor).map((entry: any) => {
      return {
        estimationDate: entry.estimationCreatedTime ? this.datePipe.transform(entry.estimationCreatedTime, 'yyyy-MM-dd') : null,
        approvedDate: entry.approvedDateAndTime ? this.datePipe.transform(entry.approvedDateAndTime, 'yyyy-MM-dd') : null,
        confirmedDate: entry.confirmedDateAndTime ? this.datePipe.transform(entry.confirmedDateAndTime, 'yyyy-MM-dd') : null,
        cancelledDate: entry.cancellationDateAndTime ? this.datePipe.transform(entry.cancellationDateAndTime, 'yyyy-MM-dd') : null,
        overDueDate: entry.overDueDateAndTIme ? this.datePipe.transform(entry.overDueDateAndTIme, 'yyyy-MM-dd') : null, // Fixed mapping
        completedDate: entry.completedDateAndTime ? this.datePipe.transform(entry.completedDateAndTime, 'yyyy-MM-dd') : null, // Fixed mapping
        submittedDate: entry.submittedDateAndTime ? this.datePipe.transform(entry.submittedDateAndTime, 'yyyy-MM-dd') : null, // Fixed mapping
        status: entry.statusOfEstimation,
        estimationId: entry.estimationId
      };
    });

    console.log(this.viewModJson, "mod")

    this.viewGenerateMonthDates();
    this.viewMapStatusesToDates();
  }

  viewMapStatusesToDates() {
    const statusCount: any = {};

    if (this.viewMonthDates) {
      for (let date of this.viewMonthDates) {
        // Initialize count for each date
        statusCount[date] = { cancelled: 0, approved: 0, confirmed: 0, overdue: 0, completed: 0, pending: 0, submitted: 0 };

        if (this.viewModJson) {
          for (let entry of this.viewModJson) {
            const formattedDate = date;
            const cancelledDate = entry.cancelledDate;
            const approvedDate = entry.approvedDate;
            const confirmedDate = entry.confirmedDate;
            const overdueDate = entry.overDueDate;
            const completedDate = entry.completedDate;
            const pendingDate = entry.estimationDate
            const submittedDate = entry.submittedDate

            if (entry.status === 'cancelled' && formattedDate === cancelledDate) {
              // console.log('Cancelled matched:', entry);
              statusCount[date].cancelled += 1;
            }

            if (entry.status === 'approved' && formattedDate === approvedDate) {
              // console.log('Approved matched:', entry);
              statusCount[date].approved += 1;
            }

            if (entry.status === 'confirmed' && formattedDate === confirmedDate) {
              // console.log('Confirmed matched:', entry);
              statusCount[date].confirmed += 1;
            }

            if (entry.status === 'overDue' && formattedDate === overdueDate) {
              // console.log('Overdue matched:', entry);
              statusCount[date].overdue += 1;
            }

            if (entry.status === 'completed' && formattedDate === completedDate) {
              // console.log('Overdue matched:', entry);
              statusCount[date].completed += 1;
            }

            if (entry.status === 'pending' && formattedDate === pendingDate) {
              // console.log('Overdue matched:', entry);
              statusCount[date].pending += 1;
            }

            if (entry.status === 'submitted' && formattedDate === submittedDate) {
              // console.log('Overdue matched:', entry);
              statusCount[date].submitted += 1;
            }
          }
        }
      }
    }

    const tableData: any = [];
    for (let date in statusCount) {
      tableData.push({
        date: date,
        cancelled: statusCount[date].cancelled,
        submitted: statusCount[date].submitted,
        approved: statusCount[date].approved,
        confirmed: statusCount[date].confirmed,
        overdue: statusCount[date].overdue,
        completed: statusCount[date].completed,
        pending: statusCount[date].pending,
      });
    }

    // Sort the data by date (ensure date is a string)
    tableData.sort((a: any, b: any) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());

    const today = new Date(this.selectedDate[7] || this.selectedDate[this.selectedDate.length - 1]);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const filterdata = tableData.filter((item: any) => this.selectedViewDate.includes(item.date));
    console.log(tableData, "filtered data")

    this.ViewMorechart(filterdata);
  }

  viewGenerateMonthDates() {
    const dates = this.viewModJson.filter((date: any) => date.estimationDate !== null).map((date: any) => date.estimationDate)
    const sort = dates.sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());
    const startDate = new Date(sort[0])
    const endDate = sort[sort.length - 1]
    this.viewMonthDates = getIndividualDates(new Date(startDate), new Date(endDate))
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
    this.viewmore()
    this.dateInput = []
  }
}