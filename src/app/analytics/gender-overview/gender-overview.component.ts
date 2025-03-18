import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as echarts from 'echarts'
import { getYesterdayDate, getIndividualDates, getLastSevenDays, getLastThirtyDaysFromSelected, reorderDateFormat } from '../functions'
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-gender-overview',
  templateUrl: './gender-overview.component.html',
  styleUrl: './gender-overview.component.css'
})
export class GenderOverviewComponent implements OnChanges {

  constructor(private appointment: AppointmentConfirmService, private docDetails: DoctorServiceService, private messageService: MessageService) { }

  option: any
  isLoading: boolean = false

  @Input() selectedDate: any
  @Input() selectedDoctor: any = 'all'

  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();
  @Output() reportInitializeDate = new EventEmitter<any[]>();
  @Output() blockFilters = new EventEmitter<boolean[]>();
  @Output() reportName = new EventEmitter<string>();


  // viewmore
  rawData: any
  viewMoreDepartment: any
  selectedViewMoreDepartment: any = 'all'
  x: any = 'all'
  doctors: any
  filteredDoctors: any
  showViewMore: boolean = false
  dateInput: any
  selectedViewDate: any[] = []
  selectedViewDoctor: any = 'all'
  viewMoreChart: any
  departmentValue: any = 'all'

  ngOnInit() {
    this.selectedDate = getLastSevenDays()
    // console.log(this.selectedDate)
    this.loadDetails()
    this.selectedViewDate = getLastThirtyDaysFromSelected()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate']) {
      this.loadDetails()
    }
  }

  initChart(data: any): void {

    const chartDom = document.getElementById('genderLineChart')!;
    const myChart = echarts.init(chartDom);

    this.option = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: reorderDateFormat(data.map((entry: any) => entry.date)) },
      yAxis: { type: 'value', name: 'Count' },
      series: [
        { name: 'Male', type: 'line', data: data.map((entry: any) => entry.male), smooth: true, lineStyle: { color: '#1f77b4' }, itemStyle: { color: '#1f77b4' } },
        { name: 'Female', type: 'line', data: data.map((entry: any) => entry.female), smooth: true, lineStyle: { color: '#ff69b4' }, itemStyle: { color: '#ff69b4' } }
      ]
    };

    myChart.setOption(this.option);
  }

  loadDetails(): void {
    this.isLoading = true
    this.appointment.getAllAppointments().subscribe({
      next: (data) => {
        this.rawData = data;
        const startedDate = Array.isArray(this.selectedDate) && this.selectedDate.length > 0
          ? (this.selectedDate.length >= 7 ? this.selectedDate[6] : this.selectedDate[this.selectedDate.length - 1])
          : new Date().toISOString().split('T')[0]; // Fallback to today if undefined
        // console.log(startedDate, "start date");

        const sevendays = this.getLastSevenDays(startedDate);

        console.log(sevendays, "sevenddays")

        const mappedData = this.rawData
          .filter((entry: any) =>
            entry.gender !== null &&
            entry.gender !== '' &&
            this.selectedDate.includes(entry.date) &&
            (this.selectedDoctor === 'all' || this.selectedDoctor === entry.doctorId)
          )
          .map((entry: any) => ({
            date: entry.date,
            gender: entry.gender,
            doctorId: entry.doctorId,
            doctorName: entry.doctorName
          }));

        const groupedData = Object.values(
          mappedData.reduce((acc: any, entry: any) => {
            const date = entry.date;
            if (!acc[date]) {
              acc[date] = { date: date, male: 0, female: 0 };
            }
            if (entry.gender.toLowerCase() === 'male') {
              acc[date].male += 1;
            } else if (entry.gender.toLowerCase() === 'female') {
              acc[date].female += 1;
            }
            return acc;
          }, {})
        );

        // console.log(groupedData, "gender overview by date");
        const sortedData = groupedData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        this.initChart(sortedData);
      },
      error: (error) => console.log(error),
      complete: () => {
        this.isLoading = false
      }
    });
  }

  // report(data: any): void {

  //   const mappedData = data.filter((entry: any) => entry.gender !== null || '').map((entry: any) => {
  //     return {
  //       date: entry.date,
  //       gender: entry.gender,
  //       doctorId: entry.doctorId,
  //       doctorName: entry.doctorName,
  //       departmentName : entry.department
  //     };
  //   });

  //   const groupedData = mappedData.reduce((acc: any, entry: any) => {
  //     const date = entry.date;
  //     const doctor = entry.doctorId;
  //     const departmentName = entry.departmentName
  //     // const doctorName = entry.doctorName

  //     if (!acc[date]) {
  //       acc[date] = {};
  //     }

  //     if (!acc[date][doctor][departmentName]) {
  //       acc[date][doctor][departmentName] = {
  //         date: date,
  //         doctorId: doctor,
  //         doctorName: entry.doctorName,
  //         departmentName : entry.departmentName,
  //         male: 0,
  //         female: 0
  //       };
  //     }

  //     if (entry.gender.toLowerCase() === 'male') {
  //       acc[date][doctor].male += 1;
  //     } else if (entry.gender.toLowerCase() === 'female') {
  //       acc[date][doctor].female += 1;
  //     }

  //     return acc;
  //   }, {});

  //   const flattenedData = Object.values(groupedData)
  //     .flatMap((dateGroup: any) => Object.values(dateGroup));
  //   // console.log(flattenedData, "gender report by date and doctorId");

  //   const reportColumn = [
  //     { header: "Date", key: "date" },
  //     { header: "Doctor Name", key: "doctorName" },
  //     { header : "Department", key: "departmentName" },
  //     { header: "Male", key: "male" },
  //     { header: "Female", key: "female" },
  //   ]

  //   this.reportsColumn.emit(reportColumn)
  //   this.reportData.emit(flattenedData)
  //   this.reportView.emit({ onoff: true, range: "range" })
  //   this.reportInitializeDate.emit(this.selectedDate)

  //   // this.isLoading = false
  // }

  report(data: any): void {
    const mappedData = data.filter((entry: any) => entry.gender !== null && entry.gender !== '').map((entry: any) => {
      return {
        date: entry.date,
        gender: entry.gender,
        doctorId: entry.doctorId,
        doctorName: entry.doctorName,
        departmentName: entry.department
      };
    });

    const groupedData = mappedData.reduce((acc: any, entry: any) => {
      const date = entry.date;
      const doctor = entry.doctorId;
      const departmentName = entry.departmentName;

      // Initialize date object if it doesn't exist
      if (!acc[date]) {
        acc[date] = {};
      }

      // Initialize doctor object if it doesn't exist
      if (!acc[date][doctor]) {
        acc[date][doctor] = {};
      }

      // Initialize department object if it doesn't exist
      if (!acc[date][doctor][departmentName]) {
        acc[date][doctor][departmentName] = {
          date: date,
          doctorId: doctor,
          doctorName: entry.doctorName,
          departmentName: departmentName,
          male: 0,
          female: 0
        };
      }

      // Count genders correctly
      if (entry.gender.toLowerCase() === 'male') {
        acc[date][doctor][departmentName].male += 1;
      } else if (entry.gender.toLowerCase() === 'female') {
        acc[date][doctor][departmentName].female += 1;
      }

      return acc;
    }, {});

    const flattenedData = Object.values(groupedData)
      .flatMap((dateGroup: any) =>
        Object.values(dateGroup)
          .flatMap((doctorGroup: any) => Object.values(doctorGroup))
      );

    const reportColumn = [
      { header: "Date", key: "date" },
      { header: "Doctor Name", key: "doctorName" },
      { header: "Department", key: "departmentName" },
      { header: "Male", key: "male" },
      { header: "Female", key: "female" },
    ];

    this.reportsColumn.emit(reportColumn);
    this.reportData.emit(flattenedData);
    this.reportView.emit({ onoff: true, range: "range" });
    this.reportInitializeDate.emit(this.selectedDate);
    this.blockFilters.emit([false, false])
    this.reportName.emit("Gender Overview")
  }

  getLastSevenDays(startDate: string): string[] {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) throw new Error('Invalid date string');
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(d);
      date.setDate(d.getDate() - i);
      return date.toISOString().split('T')[0];
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
  }

  closeViewMore(): void {
    this.showViewMore = false
  }

  departmentOnchange(event: any): void {

    this.docDetails.getDoctors().subscribe(({
      next: (data: any) => {
        this.filteredDoctors = data.filter((doc: any) => doc.departmentId === parseInt(event.target.value))
        this.selectedViewDoctor = 'all'
        this.selectedViewMoreDepartment = this.viewMoreDepartment.filter((entry: any) => entry.id === parseInt(event.target.value))[0].name
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
    const chartDom = document.getElementById('viewMoreGender')!;
    const myChart = echarts.init(chartDom);

    // console.log(data)

    this.viewMoreChart = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: reorderDateFormat(data.map((entry: any) => entry.date)) },
      yAxis: { type: 'value', name: 'Count' },
      series: [
        { name: 'Male', type: 'line', data: data.map((entry: any) => entry.male), smooth: true, lineStyle: { color: '#1f77b4' }, itemStyle: { color: '#1f77b4' } },
        { name: 'Female', type: 'line', data: data.map((entry: any) => entry.female), smooth: true, lineStyle: { color: '#ff69b4' }, itemStyle: { color: '#ff69b4' } }
      ]
    };
    myChart.setOption(this.viewMoreChart); // Render the chart
  }

  viewMoreData(): void {
    const mappedData = this.rawData
      .filter((entry: any) =>
        entry.gender !== null &&
        entry.gender !== '' &&
        this.selectedViewDate.includes(entry.date) &&
        (this.selectedViewDoctor === 'all' || this.selectedViewDoctor === entry.doctorId) &&
        (this.selectedViewMoreDepartment === 'all' || this.selectedViewMoreDepartment === entry.department)
      )
      .map((entry: any) => ({
        date: entry.date,
        gender: entry.gender,
        doctorId: entry.doctorId,
        doctorName: entry.doctorName
      }));

    const groupedData = Object.values(
      mappedData.reduce((acc: any, entry: any) => {
        const date = entry.date;
        if (!acc[date]) {
          acc[date] = { date: date, male: 0, female: 0 };
        }
        if (entry.gender.toLowerCase() === 'male') {
          acc[date].male += 1;
        } else if (entry.gender.toLowerCase() === 'female') {
          acc[date].female += 1;
        }
        return acc;
      }, {})
    );

    const sortedData = groupedData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // console.log(sortedData, "gender overview by date");

    this.ViewMorechart(groupedData);
    console.log(mappedData, "from gender")
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
    // console.log(event)
    this.selectedViewDoctor = parseInt(event.target.value) || 'all'
    this.viewMoreData()
  }

  refresh(): void {
    this.loadDepartments()
    this.filteredDoctors = []
    this.selectedViewDate = []
    this.selectedViewDate = getLastThirtyDaysFromSelected()
    this.selectedViewDoctor = 'all'
    this.viewmore()
    this.dateInput = []
  }

}
