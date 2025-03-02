import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { getYesterdayDate, getIndividualDates, getLastThirtyDaysFromSelected } from '../functions';
import { error } from 'console';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';

@Component({
  selector: 'app-average-waiting-time',
  templateUrl: './average-waiting-time.component.html',
  styleUrls: ['./average-waiting-time.component.css']
})
export class AverageWaitingTimeComponent implements OnInit, OnChanges {

  constructor(private appointment: AppointmentConfirmService, private docDetails: DoctorServiceService) { }

  option: any;
  @Input() department: string = 'INTERNAL MEDICINE';
  @Input() date: any[] = [];
  waitingData: any = {
    doctorNames: [], // Renamed for clarity
    more_than_twenty_min: [] // Should hold counts for the chart
  };

  isLoading: boolean = true

  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();

  // viewmore
  rawData: any
  viewMoreDepartment: any
  selectedViewMoreDepartment : any
  departmentValue: any
  doctors: any
  filteredDoctors: any
  showViewMore: boolean = false
  dateInput: any
  selectedViewDate: any[] = []
  selectedViewDoctor: any = 'all'
  viewMoreChart: any

  ngOnInit(): void {
    const yersterDay = getYesterdayDate()
    this.date = [yersterDay]
    this.loadWaitingTime(this.date);
    this.department = ''
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    
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

  // loadWaitingTime(date: any[]): void {
  //   this.isLoading = true
  //   this.appointment.getAllAppointments().subscribe({
  //     next : (data) => {
  //       const filteredData = data.filter((entry: any) => date.includes(entry.date) && entry.department === this.department);
  //       const formattedData: any[] = [];

  //       filteredData.forEach((entry: any) => {
  //         if (entry.waitingTime !== null) {
  //           let range: string;

  //           // Categorize waiting times into the correct range
  //           if (entry.waitingTime <= 5) {
  //             range = 'five_min';
  //           } else if (entry.waitingTime <= 10) {
  //             range = 'ten_min';
  //           } else if (entry.waitingTime <= 15) {
  //             range = 'fifteen_min';
  //           } else if (entry.waitingTime <= 40) {
  //             range = 'twenty_min';
  //           } else {
  //             range = 'more_than_twenty_min';
  //           }

  //           const existingEntry = formattedData.find(
  //             (entryData) => entryData.date === entry.date && entryData.doctorId === entry.doctorId && entryData.departmentName === entry.department && entryData.doctorName === entry.doctorName
  //           );

  //           if (existingEntry) {
  //             existingEntry[range] += 1; // Increment the count for the range
  //           } else {
  //             formattedData.push({
  //               date: entry.date,
  //               doctorId: entry.doctorId,
  //               doctorName: entry.doctorName,
  //               departmentName: entry.department,
  //               five_min: range === 'five_min' ? 1 : 0,
  //               ten_min: range === 'ten_min' ? 1 : 0,
  //               fifteen_min: range === 'fifteen_min' ? 1 : 0,
  //               twenty_min: range === 'twenty_min' ? 1 : 0,
  //               more_than_twenty_min: range === 'more_than_twenty_min' ? 1 : 0
  //             });
  //           }
  //         }
  //       });
  //       // Format the data for the chart
  //       this.waitingData.doctorNames = formattedData.map((entry: any) => entry.doctorName);
  //       this.waitingData.more_than_twenty_min = formattedData.map((entry: any) => entry.more_than_twenty_min);
  //       this.initChart();
  //     },
  //     error:(error) => {
  //       console.log(error)
  //     },
  //     complete:() => {
  //       this.isLoading = false
  //     }
  //   });
  // }

  loadWaitingTime(date: any[]): void {
    this.isLoading = true;
    this.appointment.getAllAppointments().subscribe({

      next: (data) => {
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
          } else {
            range = 'more_than_twenty_min';
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
              more_than_twenty_min: 0,
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
        { header: 'More than 20 mins', key: 'more_than_twenty_min' }
      ];

      this.reportsColumn.emit(reportColumn);
      this.reportView.emit({ onoff: true, range: 'range' });
      this.reportInitializeDate.emit(this.date);

      this.isLoading = false;
    });
  }

  // viewmore

  async loadDepartments(): Promise<void> {
    try {
      const data = await this.docDetails.getDepartments().toPromise()
      this.viewMoreDepartment = data;
      console.log(this.viewMoreDepartment)
    } catch (err) {
      console.error(err)
    }
  }

  viewmore(): void {
    this.showViewMore = true
    this.loadDepartments()
    this.viewMoreData()
  }

  closeViewMore(): void {
    this.showViewMore = false
  }

  departmentOnchange(event: any): void {

    this.docDetails.getDoctors().subscribe(({
      next: (data: any) => {
        this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
        this.selectedViewMoreDepartment = this.viewMoreDepartment.filter((entry:any) => entry.id === parseInt(event.target.value))[0].name
        console.log(this.selectedViewMoreDepartment, "department")

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
    const chartDom = document.getElementById('viewMoreAverageWaitingTime')!;
    const myChart = echarts.init(chartDom);

    // console.log(data)

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
          data: data.doctorNames, // Using doctorNames for categories
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
          data: data.more_than_twenty_min // Correct data array for the chart
        }
      ]
    };
    myChart.setOption(this.viewMoreChart); // Render the chart
  }

  viewMoreData(): void {
    const filteredData = this.rawData.filter(
      (entry: any) => this.selectedViewDate.includes(entry.date) && entry.department === this.selectedViewMoreDepartment
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

    const data:any = {
      doctorNames : '',
      more_than_twenty_min : ''
    }

    // Format the data for the chart
    data.doctorNames = formattedData.map((entry: any) => entry.doctorName);
    data.more_than_twenty_min = formattedData.map(
      (entry: any) => entry.more_than_twenty_min
    );
    this.ViewMorechart(data)
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
  }

}
