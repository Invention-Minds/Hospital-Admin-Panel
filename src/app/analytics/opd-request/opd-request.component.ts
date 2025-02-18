import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as echarts from 'echarts';
import { download, countByDate, filteredAppointments } from '../functions';
import { Console, error } from 'console';
import { doctors } from '../../Analytics-Folder/data';

@Component({
  selector: 'app-opd-request',
  templateUrl: './opd-request.component.html',
  styleUrl: './opd-request.component.css'
})
export class OpdRequestComponent {
  constructor(private appointment: AppointmentConfirmService) { }

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

  // report data
  tableData: any;
  @Output() reportView = new EventEmitter<{ onoff: boolean, range: any }>();
  @Output() reportData = new EventEmitter<any[]>();
  @Output() reportsColumn = new EventEmitter<any[]>();

  ngOnInit() {
    this.date = ["2025-02-12"]
    this.appointmentData()
    console.log(this.doctorId, "docId")
    console.log(this.date, "date")
  }

appointmentData(): void {
  this.isLoading = true; // Set loading to true before making the API call

  this.appointment.getAllAppointments().subscribe({
    next: (data) => {
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


  report() {
    this.appointment.getAllAppointments().subscribe((data: any[]) => {
      // console.log(data, "📌 Raw API Data");

      // ✅ Step 1: Transform data into a structured format with Doctor ID & Name
      let reportData = data.map((entry: any) => ({
        date: entry.date,
        doctorId: entry.doctorId,   // Include Doctor ID
        doctorName: entry.doctorName, // Include Doctor Name
        requestVia: entry.requestVia // Type of request (Online, Call, Walk-In)
      }));

      // console.log(reportData, "📌 Mapped Report Data");

      // ✅ Step 2: Group data by date & doctor
      let requestVia: {
        [key: string]: {
          date: string;
          doctorId: number;
          doctorName: string;
          online: number;
          call: number;
          walkIn: number;
        };
      } = {};

      for (let entry of reportData) {
        if (!entry.date || !entry.doctorId) continue; // Skip if no date or doctorId

        const key = `${entry.date}-${entry.doctorId}`; // Unique key per doctor per date

        if (!requestVia[key]) {
          requestVia[key] = {
            date: entry.date,
            doctorId: entry.doctorId,
            doctorName: entry.doctorName,
            online: 0,
            call: 0,
            walkIn: 0
          };
        }

        // ✅ Step 3: Count occurrences of each request type
        if (entry.requestVia === 'Call') {
          requestVia[key].call += 1;
        } else if (entry.requestVia === 'Walk-In') {
          requestVia[key].walkIn += 1;
        } else if (entry.requestVia === 'Online') {
          requestVia[key].online += 1;
        }
      }

      // ✅ Step 4: Convert object to array for easier display
      const tableData = Object.values(requestVia);
      this.tableData = tableData;
      console.log(tableData)

      // console.log(tableData, "📌 Final Processed Data");

      const reportColumn = [
        { header: "Date", key: "date" },
        { header: "Doctor", key: "doctorName" },
        { header: "Online", key: "online" },
        { header: "Call", key: "call" },
        { header: "Walk-In", key: "walkIn" },
      ]

      this.reportsColumn.emit(reportColumn)
      this.reportData.emit(tableData)
      this.reportView.emit({ onoff: true, range: "range" })

      // ✅ Step 5: Display the data or export it for reports
      this.displayReport(tableData);
    });
  }


  displayReport(report: any[]) {
    // console.log("📊 Final Report Data: ", report);
  }

  chart(): void {

    const chartContainer = document.getElementById('chart-container') as HTMLElement;
    this.chartInstance = echarts.init(chartContainer);

    const chartOptions = {
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          name: 'Access From',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 25,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          itemStyle: {
            borderRadius: 5, // Adjust the border radius for rounded corners
            borderColor: '#fff', // Optional: Add a border color to separate slices
            borderWidth: 1 // Optional: Add a border width
          },
          data: [
            { value: this.appVia.walkIn, name: 'Walk-in' },
            { value: this.appVia.online, name: 'Online' },
            { value: this.appVia.call, name: 'Call' },
          ]
        }
      ]
    };

    this.chartInstance.setOption(chartOptions);
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
}
