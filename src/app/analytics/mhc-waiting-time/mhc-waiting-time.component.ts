
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { RadiologyService } from '../../services/radiology/radiology.service';
import * as echarts from 'echarts';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { getLast7Days, getLastThirtyDaysFromSelected } from '../functions'

@Component({
  selector: 'app-mhc-waiting-time',
  templateUrl: './mhc-waiting-time.component.html',
  styleUrl: './mhc-waiting-time.component.css'
})
export class MhcWaitingTimeComponent implements OnChanges {
  constructor(private healthCheckupService: HealthCheckupServiceService, private messageService: MessageService, private router: Router, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private radiologyService: RadiologyService) { }

  rawData: any
  isLoading: any
  confirmedAppointments: any
  filteredServices: any
  option: any

  @Input() selectedDate: any

  // data for chart Data
  appointmentData: any
  radiologyServiceData: any
  servicesData: any

  // viewmore
  department: any
  packages: any
  departmentValue: any = 'all'
  doctors: any
  filteredDoctors: any
  showViewMore: boolean = false
  dateInput: any
  selectedViewDate: any[] = []
  selectedViewDoctor: any = 'all'
  viewMoreoption: any

  //report variables
  tableData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();
  @Output() blockFilters = new EventEmitter<boolean[]>();
  @Output() reportName = new EventEmitter<string>();

  ngOnInit() {
    this.loadChartData()
    this.selectedDate = getLast7Days()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']) {
      this.loadChartData()
    }
  }

  fetchConfirmedAppointments(): void {
    this.isLoading = true;

    this.healthCheckupService.getAllServices().subscribe({
      next: (services: any[]) => {
        this.appointmentService.getAllAppointments().subscribe({
          next: (appointments: any[]) => {

            // ✅ Step 3: Calculate total waiting time per serviceId (Consultation)
            const waitingTimeByServiceId: { [serviceId: string]: number } = {};
            const consultationDetailsByServiceId: { [serviceId: string]: any[] } = {};

            appointments.forEach(appt => {
              if (appt.serviceId) {
                if (!waitingTimeByServiceId[appt.serviceId]) {
                  waitingTimeByServiceId[appt.serviceId] = 0;
                  consultationDetailsByServiceId[appt.serviceId] = [];
                }
                waitingTimeByServiceId[appt.serviceId] += Number(appt.waitingTime) || 0; // Add waiting time
                // Store department name with consultation time
                if (appt.department && appt.waitingTime) {
                  consultationDetailsByServiceId[appt.serviceId].push({
                    department: appt.department,
                    waitingTime: appt.waitingTime
                  });
                }
              }
            });

            console.log("Consultation Time Per Service:", waitingTimeByServiceId);
            console.log("Consultation Details Per Service:", consultationDetailsByServiceId);

            // ✅ Step 4: Fetch Radiology Services and Compute Radiology Time
            this.radiologyService.getAllServices().subscribe({
              next: (radiologyServices: any[]) => {

                // Store Radiology Time per serviceId
                const radiologyTimeByServiceId: { [serviceId: string]: number } = {};
                const radiologyDetailsByServiceId: { [serviceId: string]: any[] } = {};

                // ✅ Compute Total Radiology Time per Service ID
                radiologyServices.forEach(appt => {
                  if (appt.serviceId && appt.entryTime && appt.checkedOutTime) {
                    const entryTime = new Date(appt.entryTime).getTime();
                    const checkedOutTime = new Date(appt.checkedOutTime).getTime();
                    const timeDifference = Math.abs((checkedOutTime - entryTime) / 60000); // Convert to minutes

                    if (!radiologyTimeByServiceId[appt.serviceId]) {
                      radiologyTimeByServiceId[appt.serviceId] = 0;
                      radiologyDetailsByServiceId[appt.serviceId] = [];
                    }
                    radiologyTimeByServiceId[appt.serviceId] += timeDifference;

                    // Store radiology service name with waiting time
                    if (appt.radioServiceName) {
                      radiologyDetailsByServiceId[appt.serviceId].push({
                        radioServiceName: appt.radioServiceName,
                        waitingTime: timeDifference
                      });
                    }
                  }
                });

                console.log("Radiology Time Per Service:", radiologyTimeByServiceId);
                console.log("Radiology Details Per Service:", radiologyDetailsByServiceId);

                // ✅ Function to Format Time in `hr/min` format
                function formatDuration(minutes: number): string {
                  if (!minutes || minutes <= 0) return "-"; // Handle missing values

                  if (minutes >= 60) {
                    const hours = Math.floor(minutes / 60);
                    const mins = Math.round(minutes % 60);
                    return mins > 0 ? `${hours} hr ${mins} mins` : `${hours} hr`;
                  } else {
                    return `${Math.round(minutes)} mins`;
                  }
                }
                function extractMinutes(timeString: string): number {
                  if (!timeString || timeString === "-") return 0; // Handle missing values

                  const timeParts = timeString.match(/(\d+)\s*hr\s*(\d*)\s*min?/);
                  if (timeParts) {
                    const hours = parseInt(timeParts[1] || "0", 10);
                    const minutes = parseInt(timeParts[2] || "0", 10);
                    return hours * 60 + minutes;
                  } else if (timeString.includes("mins")) {
                    return parseInt(timeString, 10);
                  } else {
                    return 0;
                  }
                }
                // ✅ Step 5: Process and Format Confirmed Appointments
                this.confirmedAppointments = services
                  .filter(service =>
                    (service.appointmentStatus === 'Confirm' || service.appointmentStatus === 'completed') &&
                    service.checkedIn === true
                  )
                  .map(service => {
                    // ✅ Calculate Lab Time
                    const labTime = service.isLabEntryTime && service.isLabTime
                      ? formatDuration(Math.abs((new Date(service.isLabTime).getTime() - new Date(service.isLabEntryTime).getTime()) / 60000))
                      : "-";

                    // ✅ Calculate Radiology Time & Details
                    const radiologyTime = service.id
                      ? formatDuration(radiologyTimeByServiceId[service.id] || 0)
                      : "-";
                    const radiologyDetails = radiologyDetailsByServiceId[service.id] || [];

                    // ✅ Calculate Consultation Time & Details
                    const consultationTime = service.id
                      ? formatDuration(waitingTimeByServiceId[service.id] || 0)
                      : "-";
                    const consultationDetails = consultationDetailsByServiceId[service.id] || [];
                    const totalMinutes = extractMinutes(labTime) + extractMinutes(radiologyTime) + extractMinutes(consultationTime);

                    // ✅ Convert total minutes to `X hr Y min` format
                    const total = formatDuration(totalMinutes);

                    return {
                      ...service,
                      labTime,
                      radiologyTime, // ✅ Adding Radiology Time
                      consultationTime, // ✅ Adding Consultation Time
                      radiologyDetails, // ✅ Storing individual radiology services
                      consultationDetails, // ✅ Storing individual consultation details
                      total
                    };
                  });
                this.confirmedAppointments.sort((a: any, b: any) => {
                  const dateA = new Date(a.createdAt!).getTime();
                  const dateB = new Date(b.createdAt!).getTime();
                  return dateB - dateA;
                });
                this.filteredServices = [...this.confirmedAppointments];

                console.log("Final Confirmed Appointments:", this.confirmedAppointments);
              },
              error: (err) => {
                console.error("Error fetching radiology services:", err);
              }
            });
          },
          error: (err) => {
            console.error("Error fetching appointments:", err);
          }
        });
      },
      error: (err) => {
        console.error("Error fetching services:", err);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadChartData(): any {
    this.healthCheckupService.getAllServices().subscribe({
      next: (healthData) => {
        // Map health checkup service data
        const healthServiceData = healthData.map((entry: any) => ({
          id: entry.id,
          isLabEntry: entry.isLabTime,
          isLabEntryTime: entry.isLabEntryTime,
          packageId: entry.packageId,
          packageName: entry.packageName,
          date: entry.appointmentDate,
          healthWaitingTime: this.calculateTimeDifference(entry.isLabTime, entry.isLabEntryTime)
        }));

        this.radiologyService.getAllServices().subscribe({
          next: (radioData) => {
            // Map radiology service data
            const radiologyServiceData = radioData.map((entry: any) => ({
              serviceId: entry.serviceId,
              entryTime: entry.entryTime,
              checkedOutTime: entry.checkedOutTime,
              radioWaitingTime: this.calculateTimeDifference(entry.entryTime, entry.checkedOutTime)
            }));

            this.appointmentService.getAllAppointments().subscribe({
              next: (appointments) => {
                // Map appointment service data
                const appointmentData = appointments.map((entry: any) => ({
                  serviceId: entry.serviceId,
                  apptWaitingTime: entry.waitingTime
                }));

                // Combine data where serviceId matches healthServiceData.id
                const combinedData = healthServiceData.map(health => {
                  const matchingRadio = radiologyServiceData.find(radio => radio.serviceId === health.id);
                  const matchingAppt = appointmentData.find(appt => appt.serviceId === health.id);

                  return {
                    serviceId: health.id,
                    packageId: health.packageId,
                    packageName: health.packageName,
                    date: health.date,
                    healthWaitingTime: health.healthWaitingTime || 0,
                    radioWaitingTime: matchingRadio?.radioWaitingTime || 0,
                    apptWaitingTime: matchingAppt?.apptWaitingTime || 0
                  };
                }).filter(item =>
                  item.healthWaitingTime !== undefined ||
                  item.radioWaitingTime !== undefined ||
                  item.apptWaitingTime !== undefined
                );

                // Group the combined data
                const groupedData = combinedData.reduce((acc: any, entry: any) => {
                  const key = `${entry.serviceId}-${entry.packageId}-${entry.packageName}-${entry.date}`;

                  if (!acc[key]) {
                    acc[key] = {
                      serviceId: entry.serviceId,
                      packageId: entry.packageId,
                      packageName: entry.packageName,
                      date: entry.date,
                      sumOfThreeWaitingTime: 0
                    };
                  }

                  // Sum all three waiting times
                  acc[key].sumOfThreeWaitingTime =
                    (entry.healthWaitingTime || 0) +
                    (entry.radioWaitingTime || 0) +
                    (entry.apptWaitingTime || 0);

                  return acc;
                }, {});

                const result = Object.values(groupedData);
                console.log(result, "Final Grouped Data");

                this.rawData = result;

                console.log(this.rawData)

                // Filter for chart (keeping your original filter logic)
                const filteredGroupedData: any = Object.values(groupedData).filter(
                  (entry: any) => entry.sumOfThreeWaitingTime >= 30 && this.selectedDate.includes(entry.date)
                );

                const chartData = {
                  p1: filteredGroupedData.filter((entry: any) => entry.packageId === 1).length,
                  p2: filteredGroupedData.filter((entry: any) => entry.packageId === 2).length,
                  p3: filteredGroupedData.filter((entry: any) => entry.packageId === 3).length,
                  p4: filteredGroupedData.filter((entry: any) => entry.packageId === 4).length,
                  p5: filteredGroupedData.filter((entry: any) => entry.packageId === 5).length,
                  p6: filteredGroupedData.filter((entry: any) => entry.packageId === 6).length,
                  p7: filteredGroupedData.filter((entry: any) => entry.packageId === 7).length,
                  p8: filteredGroupedData.filter((entry: any) => entry.packageId === 8).length,
                  p9: filteredGroupedData.filter((entry: any) => entry.packageId === 9).length,
                  p10: filteredGroupedData.filter((entry: any) => entry.packageId === 10).length,
                };

                this.initChart(chartData);
              },
              error: () => { },
              complete: () => { }
            });
          },
          error: () => { },
          complete: () => { }
        });
      },
      error: () => { },
      complete: () => { }
    });
  }

  initChart(data: any): void {
    const chartDom = document.getElementById('MhcWaitingTime');
    const myChart = echarts.init(chartDom);

    console.log(data, "chart data")
    this.option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          return `${params[0].name}: ${params[0].value}`;
        }
      },

      xAxis: {
        type: 'category',
        data: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
      },

      yAxis: {
        type: 'value'
      },

      series: [
        {
          data: Object.values(data),
          type: 'bar',
          // Set the bar color
          itemStyle: {
            color: '#A52B0E',         // Custom color for all bars
            borderRadius: [5, 5, 0, 0],
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          },
          animation: true,
          animationDuration: 1000,
          animationEasing: 'elasticOut'
        }
      ],

      animation: true,
      animationThreshold: 2000,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    };
    myChart.setOption(this.option);
  }

  calculateTimeDifference(startDateTime: string, endDateTime: string): number {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error("Invalid date format");
      return 0;
    }

    const differenceInMs = end.getTime() - start.getTime(); // Difference in milliseconds
    const differenceInMinutes = Math.floor(differenceInMs / (1000 * 60)); // Convert to minutes

    return differenceInMinutes;
  }

  report(): void {
    const groupedData = this.rawData.reduce((acc: any, entry: any) => {
      const key = `${entry.date}_${entry.packageId}_${entry.packageName}`;

      if (!acc[key]) {
        acc[key] = {
          date: entry.date,
          packageId: entry.packageId,
          packageName: entry.packageName,
          five_min: 0,
          ten_min: 0,
          tweenty_min: 0,
          thirty_min: 0,
          more_than_thirty_min: 0,
        };
      }

      // Categorize sumOfThreeWaitingTime
      if (entry.sumOfThreeWaitingTime <= 5) {
        acc[key].five_min += 1;
      } else if (entry.sumOfThreeWaitingTime <= 10) {
        acc[key].ten_min += 1;
      } else if (entry.sumOfThreeWaitingTime <= 20) {
        acc[key].tweenty_min += 1;
      } else if (entry.sumOfThreeWaitingTime <= 30) {
        acc[key].thirty_min += 1;
      } else {
        acc[key].more_than_thirty_min += 1;
      }

      return acc;
    }, {});

    // Convert object to array
    const result = Object.values(groupedData);
    console.log(result)

    this.isLoading = true
    this.reportData.emit(result)
    const reportColumn = [
      { header: "Date", key: "date" },
      { header: "Package Name", key: "packageName" },
      { header: "0 - 5 min", key: "five_min" },
      { header: "5 - 10 min", key: "ten_min" },
      { header: "10 - 20 min", key: "tweenty_min" },
      { header: "20 - 30 min", key: "thirty_min" },
      { header: "More than 30 min", key: "more_than_thirty_min" },

    ]
    this.blockFilters.emit([true, true])
    this.reportsColumn.emit(reportColumn)
    this.reportView.emit({ onoff: true, range: "range" })
    this.reportInitializeDate.emit(this.selectedDate)
    this.reportName.emit("MHC Waiting Time")
    this.isLoading = false
  }

  // viewmore

  loadPackages(): any {
    this.healthCheckupService.getPackages().subscribe((data: any) => {
      this.packages = data
    })
  }

  viewmore(): void {
    this.showViewMore = true
    this.viewMoreData()
  }

  closeViewMore(): void {
    this.showViewMore = false
  }

  ViewMorechart(data: any): void {
    const chartDom = document.getElementById('viewMoreMhcWaitingTime');
    const myChart = echarts.init(chartDom);

    this.viewMoreoption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          return `${params[0].name}: ${params[0].value}`;
        }
      },

      xAxis: {
        type: 'category',
        data: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
      },

      yAxis: {
        type: 'value'
      },

      series: [
        {
          data: Object.values(data),
          type: 'bar',
          // Set the bar color
          itemStyle: {
            color: '#A52B0E',         // Custom color for all bars
            borderRadius: [5, 5, 0, 0],
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          },
          animation: true,
          animationDuration: 1000,
          animationEasing: 'elasticOut'
        }
      ],

      animation: true,
      animationThreshold: 2000,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    };

    myChart.setOption(this.viewMoreoption); // Render the chart
  }

  viewMoreData(): void {
    const filteredGroupedData: any = this.rawData.filter(
      (entry: any) => entry.sumOfThreeWaitingTime >= 30 && this.selectedViewDate.includes(entry.date) && this.selectedViewDoctor === 'all' ? true : this.selectedViewDoctor === entry.packageId
    );

    const chartData = {
      p1: filteredGroupedData.filter((entry: any) => entry.packageId === 1).length,
      p2: filteredGroupedData.filter((entry: any) => entry.packageId === 2).length,
      p3: filteredGroupedData.filter((entry: any) => entry.packageId === 3).length,
      p4: filteredGroupedData.filter((entry: any) => entry.packageId === 4).length,
      p5: filteredGroupedData.filter((entry: any) => entry.packageId === 5).length,
      p6: filteredGroupedData.filter((entry: any) => entry.packageId === 6).length,
      p7: filteredGroupedData.filter((entry: any) => entry.packageId === 7).length,
      p8: filteredGroupedData.filter((entry: any) => entry.packageId === 8).length,
      p9: filteredGroupedData.filter((entry: any) => entry.packageId === 9).length,
      p10: filteredGroupedData.filter((entry: any) => entry.packageId === 10).length,
    };

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

  viewPackageONchange(event: any): void {
    console.log(event)
    this.selectedViewDoctor = parseInt(event.target.value) || 'all'
    this.viewMoreData()
  }

  refresh(): void {
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.viewmore()
    this.dateInput = []
    this.selectedViewDoctor = 'all'
  }

}



// this.rawData = [
//   {
//   date: entry.date,
//   packageId: entry.packageId,
//   packageName: entry.packageName,
//   sumOfThreeWaitingTime: 0,
//   }
// ]

// this.groupeddata = {
//   date: entry.date,
//   packageId: entry.packageId,
//   packageName: entry.packageName,
//   five_min : 0, //count of sumOfThreeWaitingTime, which is lesthan or equal to 5 min,
//   ten_min : 0, //count of sumOfThreeWaitingTime, which is lesthan or equal to 10 min,
//   tweenty_min : 0, //count of sumOfThreeWaitingTime, which is lesthan or equal to 20 min,
//   thirty_min : 0, //count of sumOfThreeWaitingTime, which is lesthan or equal to 30 min,
//   more_than_thirty_min : 0, //count of sumOfThreeWaitingTime, which is greater than 30 min,
// }