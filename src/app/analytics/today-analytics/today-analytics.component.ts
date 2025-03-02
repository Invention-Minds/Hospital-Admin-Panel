import { Component, Input } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import * as echarts from 'echarts/core';
import { utcToIstDate, getLast14Days, getPositiveNegative, getTodayDate } from '../functions'
import { EstimationService } from '../../services/estimation/estimation.service';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import * as XLSX from 'xlsx';  // Import xlsx library

@Component({
  selector: 'app-today-analytics',
  templateUrl: './today-analytics.component.html',
  styleUrl: './today-analytics.component.css'
})
export class TodayAnalyticsComponent {
  constructor(private doctor: DoctorServiceService, private estimations: EstimationService, private healthCheckUp : HealthCheckupServiceService, private appointment : AppointmentConfirmService) { }
  date: any = '';
  doctors: any[] = [];
  availableDoctorsToday: number = 0;
  availableDoctors : any[] = []
  unavailableDoctors : any[] = []
  absentDoctors : any[] = []
  absentDoctorsToday: number = 0;
  estimation: any = {
    liveConfirmedEstimating: 0,
    lastSevenDays: [],
    percentage : 0
  }
  availlableRoom : any
  healthCheck : any = {
    liveCount : 0,
    lastSevenDays: [],
    percentage : 0
  }
  checkIn : any
  checkinData : any

  // report
  popUpPresentReport : boolean = false
  popUpAbsentReport : boolean = false
  reportColumn : any
  reportData : any
  availableDoctor : any

  private timeCache: { [key: string]: number } = {};

  ngOnInit(): void {
    this.date = getTodayDate()
    this.fetchDoctorsWithAvailability();
    this.confirmedEstimations();
    this.roomAvailability();
    this.mhcConfirmed()
    this.getTodayCheckin()
    this.popUpPresentReport  = false
    this.popUpAbsentReport = false
  }

  private fetchDoctorsWithAvailability(): void {
    this.doctor.getAllDoctors().subscribe(
      (doctors) => {
        const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5)); // Current time in minutes
        const selectedDate = this.date;

        // Initialize counts
        let availableCount = 0;
        let unavailableCount = 0;
        let absentCount = 0;

        this.doctors = doctors
          .filter((doctor) => {
            if (doctor.doctorType === 'Visiting Consultant') {
              // Include only if booked slots exist for today
              return (
                doctor.bookedSlots &&
                doctor.bookedSlots.some(
                  (slot: any) =>
                    new Date(slot.date).toISOString().split('T')[0] === selectedDate
                )
              );
            }
            return true; // Include all other doctors
          })
          .map((doctor) => {
            const unavailableSlots = doctor.unavailableSlots || [];
            const formattedUnavailableSlots = unavailableSlots.map((slot) => ({
              time: slot.time,
              duration: slot.duration || 20, // Default to 20 minutes if not provided
            }));

            let status: string;
            const allUpdatedAtNull = doctor.availability?.every(avail => !avail.updatedAt);

            // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
            const latestTimestamp = allUpdatedAtNull
              ? null // If all are null, treat it as the "latest"
              : doctor.availability?.reduce((latest, curr) => {
                return curr.updatedAt && new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
                  ? curr.updatedAt
                  : latest;
              }, doctor.availability.find(avail => avail.updatedAt)?.updatedAt || '');

            // Step 3: Filter availability data based on the latest timestamp
            const latestAvailability = allUpdatedAtNull
              ? doctor.availability // If all are null, consider the entire availability as "latest"
              : doctor.availability?.filter(avail => avail.updatedAt === latestTimestamp);
            // console.log(latestAvailability)

            if (doctor.doctorType === 'Visiting Consultant') {
              // Visiting Consultant with booked slots for today is Available
              availableCount++;
              status = 'Available';
            } else {
              const isAbsent =
                latestAvailability?.length > 0 &&
                !latestAvailability?.some(
                  (avail: any) =>
                    avail.day.toLowerCase() ===
                    new Date(selectedDate)
                      .toLocaleString('en-us', { weekday: 'short' })
                      .toLowerCase()
                ) ||
                (doctor.unavailableDates || []).some((unavailableDate: any) => {
                  const formattedUnavailableDate = new Date(
                    unavailableDate.date
                  ).toISOString().split('T')[0];
                  return formattedUnavailableDate === selectedDate;
                });

              if (isAbsent) {
                absentCount++;
                status = 'Absent';
              } else {
                availableCount++;
                status = 'Available';
              }
            }

            return { ...doctor, status };
          });

        // Update counts
        this.availableDoctorsToday = availableCount;
        this.absentDoctorsToday = absentCount;
        // console.log(this.availableDoctorsToday, this.absentDoctorsToday)

        this.updateDoctorLists()
      },
      (error) => {
        console.error('Error fetching doctors:', error);
      }
    );
  }

  private updateDoctorLists(): void {
    this.availableDoctors = this.doctors.filter(
      (doctor) => doctor.status === 'Available'
    );
    this.unavailableDoctors = this.doctors.filter(
      (doctor) => doctor.status === 'Unavailable'
    );
    this.absentDoctors = this.doctors.filter(
      (doctor) => doctor.status === 'Absent'
    );
  }

  private timeToMinutes(time: string): number {
    if (!time || (!time.includes(':') && !time.includes(' '))) {
      // console.error('Invalid time format:', time);
      return NaN;
    }

    if (this.timeCache[time]) return this.timeCache[time];

    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      // console.error('Invalid time components:', time);
      return NaN;
    }

    let totalMinutes = hours * 60 + minutes;

    // Adjust for 12-hour clock if AM/PM is present
    if (period?.toUpperCase() === 'PM' && hours < 12) {
      totalMinutes += 12 * 60;
    } else if (period?.toUpperCase() === 'AM' && hours === 12) {
      totalMinutes -= 12 * 60;
    }

    this.timeCache[time] = totalMinutes;
    return totalMinutes;
  }

  initChart(data: any, containerId: any, color: string, name : string): void {
    const chartDom = document.getElementById(containerId)!;
    const myChart = echarts.init(chartDom);

    // console.log(data, "form chart")

    const dates = [];
    const counts = [];
    for (let date in data) {
      if (data.hasOwnProperty(date)) {
        dates.push(date); // Push the date
        counts.push(data[date].count); // Push the count value
      }
    }

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br/>{a0}: {c0}',
        show: true  // Hide the tooltip if that's the intent
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { show: false }, // Hide axis line if necessary
        axisTick: { show: false }, // Hide axis ticks if necessary
        axisLabel: { show: false }, // Hide axis labels if necessary
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false }, // Hide axis line if necessary
        axisTick: { show: false }, // Hide axis ticks if necessary
        axisLabel: { show: false }, // Hide axis labels if necessary
      },
      grid: {
        show: false,  // Hide the grid
      },
      series: [
        {
          name: name,
          type: 'line',
          data: counts, // Assuming count is the key for data
          smooth: true,
          lineStyle: {
            color: color,
          },
          symbol: 'none',
        }
      ],
      graphic: {
        type: 'text',
        left: 'center',
        top: '40%',
        style: {
          textAlign: 'center',
          fill: '#d9534f',
          fontSize: 40
        }
      }
    };

    myChart.setOption(option);
  }

  confirmedEstimations(): void {
    this.estimations.getAllEstimation().subscribe((data: any) => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');  
      const month = String(today.getMonth() + 1).padStart(2, '0'); 
      const year = today.getFullYear();
      const date = `${day}/${month}/${year}`;

      try {
        this.estimation.liveConfirmedEstimating = data.filter((confirm: any) => this.date === utcToIstDate(confirm.confirmedDateAndTime) && confirm.statusOfEstimation === 'confirmed').length

        const mapconfirmedEstimation = data.filter((data: any) => data.statusOfEstimation === 'confirmed').map((confirm: any) => {
          return {
            date: utcToIstDate(confirm.confirmedDateAndTime),
            status: confirm.statusOfEstimation,
          }
        }
        )
        // console.log(mapconfirmedEstimation)

        const today = new Date();
        const lastSevenDays = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          lastSevenDays.push(date.toISOString().split('T')[0]);
        }

        lastSevenDays.reverse()

        const groupBydate: any = {};

        for (let date of lastSevenDays) {
          if (!groupBydate[date]) {
            groupBydate[date] = { count: 0 };
          }

          for (let entry of mapconfirmedEstimation) {
            if (date === entry.date) {
              groupBydate[date].count++;
            }
          }
        }

        this.estimation.lastSevedays = groupBydate
        console.log(this.estimation.lastSevedays);
        this.initChart(this.estimation.lastSevedays, "estimation", "#FB9C2A", "EST Confirmed");

        const last14Days = getLast14Days()
        const firstHalf = last14Days.slice(0, 7);
        const secondHalf = last14Days.slice(7);
        const last14daysData:any = {}

        for (let date of last14Days) {
          if (!last14daysData[date]) {
            last14daysData[date] = { count: 0 };
          }

          for (let entry of mapconfirmedEstimation) {
            if (date === entry.date) {
              last14daysData[date].count++;
            }
          }
        }

        let firstHalfCount = 0
        let secondHalfCount = 0

        for (let date in last14daysData) {
          if (last14daysData.hasOwnProperty(date)) {
            const count = last14daysData[date].count;
            
            if (firstHalf.includes(date)) {
              firstHalfCount += count;
            } else if (secondHalf.includes(date)) {
              secondHalfCount += count;
            }
          }
        }

        console.log(firstHalfCount, secondHalfCount, "first and second half")

        this.estimation.percentage = getPositiveNegative(((firstHalfCount - secondHalfCount) / secondHalfCount) * 100);
      }
      catch (error) {
        console.log(error, "error")
      }
    })
  }

  roomAvailability():void{
    this.doctor.getAllDoctors().subscribe((data:any) => {
      this.availlableRoom = data.filter((room:any) => room.roomNo !== null && room.roomNo !== '').length
    })
  }

  mhcConfirmed():void{
    this.healthCheckUp.getAllServices().subscribe((data:any) => {
      try{
        const comfirmedMhc = data.filter((entry:any) => entry.appointmentStatus === "Confirm").map((entry:any) => {
          return {
            date : entry.appointmentDate,
            status : entry.appointmentStatus
          }
        })
        this.healthCheck.liveCount = comfirmedMhc.filter((entry:any) => entry.date === this.date).length 
        // console.log(comfirmedMhc, "confirmed MHC")

        const last14Days = getLast14Days()
        const firstHalf = last14Days.slice(0, 7);
        const secondHalf = last14Days.slice(7);
        const last14daysData:any = {}

        for (let date of last14Days) {
          if (!last14daysData[date]) {
            last14daysData[date] = { count: 0 };
          }

          for (let entry of comfirmedMhc) {
            if (date === entry.date) {
              last14daysData[date].count++;
            }
          }
        }

        // console.log(last14daysData, "last fourteenday mhc")

        let firstHalfCount = 0
        let secondHalfCount = 0

        for (let date in last14daysData) {
          if (last14daysData.hasOwnProperty(date)) {
            const count = last14daysData[date].count;
            
            if (firstHalf.includes(date)) {
              firstHalfCount += count;
            } else if (secondHalf.includes(date)) {
              secondHalfCount += count;
            }
          }
        }

        // console.log(firstHalfCount, secondHalfCount, "counts")
        this.healthCheck.percentage = getPositiveNegative(((secondHalfCount - firstHalfCount) / firstHalfCount) * 100);
        // console.log(`Percentage mhc Change: ${this.healthCheck.percentage.toFixed(2)}%`);
        const groupBydate: any = {};

        for (let date of secondHalf) {
          if (!groupBydate[date]) {
            groupBydate[date] = { count: 0 };
          }

          for (let entry of comfirmedMhc) {
            if (date === entry.date) {
              groupBydate[date].count++;
            }
          }
        }
        // console.log(groupBydate, "group data of mhc")
        this.initChart(groupBydate, "healthCheckUp", "#6F46C1", "MHC Confirmed");      
      }
      catch(error){
        console.error("health checkup error : ", error)
      }
    })
  }

  // mhcConfirmed(): void {
  //   this.healthCheckUp.getAllServices().subscribe(
  //     (data: any) => {
  //       try {
  //         // console.log(data, "Raw data from database");
  //           const confirmedMhc = data.filter((entry: any) => {
  //           return this.date === entry.appointmentDate && entry.appointmentStatus === "Confirm";
  //         }).map((entry: any) => {
  //           return {
  //             date: entry.appointmentDate,
  //             status: entry.appointmentStatus,
  //           };
  //         });
  //         console.log(confirmedMhc, "Filtered confirmed MHC data");
  //         this.healthCheck.liveCount = confirmedMhc.length;
  
  //         const last14Days = getLast14Days();
  //         console.log(last14Days, "Last 14 days");
  //         // Split into first and second halves
  //         const firstHalf = last14Days.slice(0, 7);
  //         const secondHalf = last14Days.slice(7);
  
  //         // Initialize an object to store counts for each date
  //         const last14daysData: any = {};
  
  //         // Populate last14daysData with counts for each date
  //         for (let date of last14Days) {
  //           last14daysData[date] = { count: 0 }; // Initialize count to 0 for each date
  //         }
  
  //         // Count confirmed appointments for each date
  //         for (let entry of confirmedMhc) {
  //           if (last14daysData[entry.date]) {
  //             last14daysData[entry.date].count++;
  //           }
  //         }
  
  //         // Log last14daysData to verify counts
  //         console.log(last14daysData, "Last 14 days data");
  
  //         // Calculate counts for first and second halves
  //         let firstHalfCount = 0;
  //         let secondHalfCount = 0;
  
  //         for (let date in last14daysData) {
  //           if (last14daysData.hasOwnProperty(date)) {
  //             const count = last14daysData[date].count;
  
  //             if (firstHalf.includes(date)) {
  //               firstHalfCount += count;
  //             } else if (secondHalf.includes(date)) {
  //               secondHalfCount += count;
  //             }
  //           }
  //         }
  
  //         console.log(firstHalfCount, "First half count");
  //         console.log(secondHalfCount, "Second half count");
  
  //         // Calculate percentage change (handle division by zero)
  //         let percentageChange = 0;
  //         if (secondHalfCount !== 0) {
  //           percentageChange = ((secondHalfCount - firstHalfCount) / secondHalfCount) * 100;
  //         }
  //         this.healthCheck.percentage = getPositiveNegative(percentageChange);
  
  //         // Log percentage change
  //         console.log(`Percentage MHC Change: ${this.healthCheck.percentage.toFixed(2)}%`);
  
  //         // Group data by date for the second half
  //         const groupByDate: any = {};
  //         for (let date of secondHalf) {
  //           groupByDate[date] = { count: 0 }; // Initialize count to 0 for each date
  //         }
  
  //         // Populate groupByDate with counts for the second half
  //         for (let entry of confirmedMhc) {
  //           if (groupByDate[entry.date]) {
  //             groupByDate[entry.date].count++;
  //           }
  //         }
  
  //         // Log grouped data for the second half
  //         console.log(groupByDate, "Grouped data for the second half");
  
  //         // Initialize the chart with the grouped data
  //         this.initChart(groupByDate, "healthCheckUp", "#6F46C1", "MHC Confirmed");
  //       } catch (error:any) {
  //         // Log detailed error message
  //         console.error("Health checkup error:", error.message, error.stack);
  //       }
  //     },
  //     (error) => {
  //       // Log API call errors
  //       console.error("API call error:", error.message, error.stack);
  //     }
  //   );
  // }


  getTodayCheckin():any{
    this.appointment.getAllAppointments().subscribe({
      next : (data:any) => {
        const filteredData = data.filter((entry:any) => entry.checkedIn !== false && entry.date === this.date).map((entry:any) => {
          return {
            patientName : entry.patientName,
            phoneNumber : entry.phoneNumber,
            patinetEmail : entry.email,
            DoctorName : entry.doctorName,
            Department : entry.department,
            AppointmentDate : entry.date,
            AppointmentTime : entry.time,
            AppointmentRequestVIa : entry.requestVia,
            whatsAppSent : entry.smsSent === true ? 'yes' : 'No',
            EmailSent : entry.emailSent === true ? 'yes' : 'No',
            SmsSent : entry.messageSent === true ? 'yes' : 'No',
            status : entry.status,
            AppointmentHandledBy : entry.user.username,
            CheckInBy : entry.checkedInBy
          }
        })
        // console.log(filteredData, "filteredCheckin Data")
        this.checkIn = filteredData.length
        this.checkinData = filteredData
      },
      error : (error) => {
        console.log(error)
      }, 
      complete : () => {

      }
    })
  }

  checkInReportDownload(): void {
    const columns = [
        'Patient Name', 'Phone Number', 'Patient Email', 'Doctor Name',
        'Department', 'Appointment Date', 'Appointment Time', 'Appointment Request Via',
        'Whatsapp Sent', 'Email Sent', 'SMS Sent', 'Status',
        'Appointment Handled By', 'Check-in By'
    ];
    
    const header = columns;

    // Map checkinData to the rows based on the column names
    const rows = this.checkinData.map((entry: any) => [
        entry.patientName,
        entry.phoneNumber,
        entry.patinetEmail,
        entry.DoctorName,
        entry.Department,
        entry.AppointmentDate,
        entry.AppointmentTime,
        entry.AppointmentRequestVIa,
        entry.whatsAppSent,
        entry.EmailSent,
        entry.SmsSent,
        entry.status,
        entry.AppointmentHandledBy,
        entry.CheckInBy
    ]);

    // Create a worksheet from the header and rows
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    
    // Create a workbook and append the sheet
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    // Trigger the file download
    XLSX.writeFile(wb, 'today_checkin_report.xlsx');
  }

  // reports function
  docAvailReport():void{
    this.popUpPresentReport = true
    this.reportColumn = [
      {header : 'Doctor Name', key : 'doctorName'},
    ]
  }

  docAbsentReport():void{
    this.popUpAbsentReport = true
    this.reportColumn = [
      {header : 'Doctor Name', key : 'doctorName'},
    ]
  }

  closeDocAvailReport():any{
    this.popUpPresentReport = false
  }

  closeDocAbsentReport():any{
    this.popUpAbsentReport = false
  }

  // private fetchDoctorsWithAvailability(): void {
  //   this.doctorService.getAllDoctors().subscribe(
  //     (doctors) => {
  //       const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5)); // Current time in minutes
  //       const selectedDate = this.date;

  //       // Initialize counts
  //       let availableCount = 0;
  //       let unavailableCount = 0;
  //       let absentCount = 0;

  //       this.doctors = doctors
  //         .filter((doctor) => {
  //           if (doctor.doctorType === 'Visiting Consultant') {
  //             // Include only if booked slots exist for today
  //             return (
  //               doctor.bookedSlots &&
  //               doctor.bookedSlots.some(
  //                 (slot: any) =>
  //                   new Date(slot.date).toISOString().split('T')[0] === selectedDate
  //               )
  //             );
  //           }
  //           return true; // Include all other doctors
  //         })
  //         .map((doctor) => {
  //           const unavailableSlots = doctor.unavailableSlots || [];
  //           const formattedUnavailableSlots = unavailableSlots.map((slot) => ({
  //             time: slot.time,
  //             duration: slot.duration || 20, // Default to 20 minutes if not provided
  //           }));

  //           let status: string;
  //           const allUpdatedAtNull = doctor.availability?.every(avail => !avail.updatedAt);

  //           // Step 2: Calculate the latest timestamp if any `updatedAt` is not null
  //           const latestTimestamp = allUpdatedAtNull
  //             ? null // If all are null, treat it as the "latest"
  //             : doctor.availability?.reduce((latest, curr) => {
  //               return curr.updatedAt && new Date(curr.updatedAt).getTime() > new Date(latest).getTime()
  //                 ? curr.updatedAt
  //                 : latest;
  //             }, doctor.availability.find(avail => avail.updatedAt)?.updatedAt || '');

  //           // Step 3: Filter availability data based on the latest timestamp
  //           const latestAvailability = allUpdatedAtNull
  //             ? doctor.availability // If all are null, consider the entire availability as "latest"
  //             : doctor.availability?.filter(avail => avail.updatedAt === latestTimestamp);
  //             // console.log(latestAvailability)
  //             const dayOfWeek = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
  //             const availableDay = latestAvailability?.find(avail => avail.day.toLowerCase() === dayOfWeek);
  //             doctor.availableFrom = availableDay?.availableFrom!
  //           if (doctor.doctorType === 'Visiting Consultant') {
  //             // Visiting Consultant with booked slots for today is Available
  //             availableCount++;
  //             status = 'Available';
  //           } else {
  //             const isAbsent =
  //             latestAvailability?.length > 0 &&
  //               !latestAvailability?.some(
  //                 (avail: any) =>
  //                   avail.day.toLowerCase() ===
  //                   new Date(selectedDate)
  //                     .toLocaleString('en-us', { weekday: 'short' })
  //                     .toLowerCase()
  //               ) ||
  //               (doctor.unavailableDates || []).some((unavailableDate: any) => {
  //                 const formattedUnavailableDate = new Date(
  //                   unavailableDate.date
  //                 ).toISOString().split('T')[0];
  //                 return formattedUnavailableDate === selectedDate;
  //               });

  //             if (isAbsent) {
  //               absentCount++;
  //               status = 'Absent';
  //             } else if (
  //               this.isDoctorUnavailable(currentTime, formattedUnavailableSlots)
  //             ) {
  //               unavailableCount++;
  //               status = 'Unavailable';
  //             } else {
  //               availableCount++;
  //               status = 'Available';
  //             }
  //           }

  //           return { ...doctor, status };
  //         });

  //       // Update counts
  //       this.availableDoctorsToday = availableCount;
  //       this.unavailableDoctorsToday = unavailableCount;
  //       this.absentDoctorsToday = absentCount;

  //       this.updateDoctorLists();
  //     },
  //     (error) => {
  //       console.error('Error fetching doctors:', error);
  //     }
  //   );
  // }
}
