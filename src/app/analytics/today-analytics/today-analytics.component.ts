import { Component, Input } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import * as echarts from 'echarts';
import { utcToIstDate, getLast14Days, getPositiveNegative, getTodayDate } from '../functions'
import { EstimationService } from '../../services/estimation/estimation.service';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';

@Component({
  selector: 'app-today-analytics',
  templateUrl: './today-analytics.component.html',
  styleUrl: './today-analytics.component.css'
})
export class TodayAnalyticsComponent {
  constructor(private doctor: DoctorServiceService, private estimations: EstimationService, private healthCheckUp : HealthCheckupServiceService) { }
  date: any = '';
  doctors: any[] = [];
  availableDoctorsToday: number = 0;
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

  private timeCache: { [key: string]: number } = {};

  ngOnInit(): void {
    this.date = getTodayDate()
    this.fetchDoctorsWithAvailability();
    this.confirmedEstimations();
    this.roomAvailability();
    this.mhcConfirmed()
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

      },
      (error) => {
        console.error('Error fetching doctors:', error);
      }
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


  // getDoctorDetails():void{
  //   this.doctor.getAllDoctors(this.date).subscribe((data) => {
  //     console.log(data)
  //     const availability = data.map((entry) => entry.availability)
  //     const unavailability = data.map((entry) => entry.unavailableDates)

  //     const unavailableDates = unavailability.filter((entry:any) => entry.date === this.date).map((entry:any) => entry.docId)
  //     // const availableDates = 


  //   })
  // }

  // loadAvailableDoctors(date:string):void{

  //     const dayOfWeek = getDayOfWeek(date)

  //     const unAvailableDoctors = unavailableDates.filter((entry) => entry.date === date).map((entry) => entry.docId)
  //     const availableDoctors = availability.filter((entry) => entry.availableDay === dayOfWeek).map((entry) => entry.docId)

  //     this.availableDoctors = doctors.filter((entry) => !unAvailableDoctors.includes(entry.docId) && availableDoctors.includes(entry.docId))
  //     this.unAvailableDoctors = doctors.filter((entry) => unAvailableDoctors.includes(entry.docId) && !availableDoctors.includes(entry.docId))
  //     // console.log(this.availableDoctors)
  //   }


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
        // console.log(this.estimation.lastSevedays);
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

        // console.log(firstHalfCount, secondHalfCount, "counts")
        this.estimation.percentage = getPositiveNegative(((secondHalfCount - firstHalfCount) / secondHalfCount) * 100);
        // console.log(`Percentage Change: ${this.estimation.percentage.toFixed(2)}%`);
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
        const comfirmedMhc = data.filter((entry:any) => this.date === entry.appointmentDate && entry.appointmentStatus === "Confirm").map((entry:any) => {
          return {
            date : entry.appointmentDate,
            status : entry.appointmentStatus
          }
        })
        this.healthCheck.liveCount = comfirmedMhc.length 
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
        this.healthCheck.percentage = getPositiveNegative(((secondHalfCount - firstHalfCount) / secondHalfCount) * 100);
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


}