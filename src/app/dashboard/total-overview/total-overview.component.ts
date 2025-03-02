
import { Component, OnInit } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import * as XLSX from 'xlsx';

import * as moment from 'moment-timezone';

@Component({
  selector: 'app-total-overview',
  templateUrl: './total-overview.component.html',
  styleUrls: ['./total-overview.component.css'],
})
export class TotalOverviewComponent implements OnInit {
  totalAppointmentsToday: number = 0;
  pendingRequestsToday: number = 0;
  checkinAppointmentsToday: number = 0;
  availableDoctorsToday: number = 0;
  unavailableDoctorsToday: number = 0;
  absentDoctorsToday: number = 0;
  leaveDoctorsCount: number = 0;
  totalDoctorsToday: number = 0;

  doctors: any[] = [];
  availableDoctors: any[] = [];
  unavailableDoctors: any[] = [];
  absentDoctors: any[] = [];
  leaveDoctors: any[] = [];
  appointments: any[] = [];
  todayAppointments: any[] = []
  date: string = '';
  showAvailableDoctors: boolean = false;
  showUnavailableDoctors: boolean = false;
  showAbsentDoctors: boolean = false;
  showLeaveDoctors: boolean = false;

  private timeCache: { [key: string]: number } = {};
  private timeStringCache: { [key: number]: string } = {};

  constructor(
    private appointmentService: AppointmentConfirmService,
    private doctorService: DoctorServiceService
  ) { }

  ngOnInit(): void {
    this.date = this.formatDate(new Date());
    this.fetchStatistics();
    this.fetchDoctorsWithAvailability();
  }

  private fetchStatistics(): void {
    const currentDate = this.date;

    // this.appointmentService
    //   .getTotalAppointmentsCountForToday(currentDate)
    //   .subscribe(
    //     (totalAppointments) => {
    //       this.totalAppointmentsToday = totalAppointments.count;
    //     },
    //     (error) => {
    //       console.error('Error fetching total appointments:', error);
    //     }
    //   );

    // this.appointmentService.fetchPendingAppointmentsCount().subscribe(
    //   (pendingRequests) => {
    //     this.pendingRequestsToday = pendingRequests;
    //   },
    //   (error) => {
    //     console.error('Error fetching pending requests:', error);
    //   }
    // );
    this.appointmentService.getAllAppointments().subscribe({
      next: (services: any[]) => {

        // Process the services when the API call is successful
        this.totalAppointmentsToday = services.filter(
          (service) => service.date === currentDate
        ).length;
        this.pendingRequestsToday = services.filter(
          (service) => service.date === currentDate && service.status === 'pending'
        ).length;
        this.checkinAppointmentsToday = services.filter(
          (service) => service.date === currentDate && service.checkedIn === true
        ).length;
        this.appointments = services.filter(
          (service) => service.date === currentDate && service.checkedIn === true
        )
        this.todayAppointments = services.filter(
          (service) => service.date === currentDate
        )

        // console.log('Services processed successfully.');
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      },
      complete: () => {

        // Optional: Actions to perform once the API call completes
        // console.log('Service fetching process completed.');
      }
    });
  }

  // private fetchDoctorsWithAvailability(): void {
  //   this.doctorService.getAllDoctors().subscribe(
  //     (doctors) => {
  //       const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5));
  //       const currentDay = new Date(this.date)
  //         .toLocaleString('en-us', { weekday: 'short' })
  //         .toLowerCase();
  //       const selectedDate = this.date;

  //       // Initialize counts
  //       let availableCount = 0;
  //       let unavailableCount = 0;
  //       let absentCount = 0;

  //       this.doctors = doctors
  //         .filter((doctor) => {
  //           // Filter for Visiting Consultants
  //           if (doctor.doctorType === 'Visiting Consultant') {
  //             return doctor.bookedSlots && doctor.bookedSlots.length > 0; // Include only if booked slots exist
  //           }
  //           return true; // Include all other doctors
  //         })
  //         .map((doctor) => {
  //           const unavailableSlots = doctor.unavailableSlots || [];
  //           const formattedUnavailableSlots = unavailableSlots.map((slot) => ({
  //             time: slot.time,
  //             duration: slot.duration || 20, // Default to 20 minutes if not provided
  //           }));

  //           const isAbsent =
  //             !doctor.availability?.some(
  //               (avail: any) => avail.day.toLowerCase() === currentDay
  //             ) ||
  //             (doctor.unavailableDates || []).some((unavailableDate: any) => {
  //               const formattedUnavailableDate = new Date(
  //                 unavailableDate.date
  //               ).toISOString().split('T')[0];
  //               return formattedUnavailableDate === selectedDate;
  //             });

  //           let status: string;
  //           if (doctor.doctorType === 'Visiting Consultant') {
  //             if(doctor.bookedSlots)
  //             // Visiting Consultant with booked slots is marked as Available
  //             availableCount++;
  //             status = 'Available';
  //           }
  //           if (isAbsent) {
  //             absentCount++;
  //             status = 'Absent';
  //           } else if (
  //             this.isDoctorUnavailable(currentTime, formattedUnavailableSlots)
  //           ) {
  //             unavailableCount++;
  //             status = 'Unavailable';
  //           } else {
  //             availableCount++;
  //             status = 'Available';
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


  downloadFilteredData(): void {
    // console.log('Downloading completed appointments data...');
    if (this.appointments && this.appointments.length > 0) {
      // console.log('Downloading filtered data...');

      // const selectedFields = this.appointments.map((appointment: Appointment) => ({
      //   'Patient Name': appointment.patientName,
      //   'Patient Phone Number': appointment.phoneNumber,
      //   'Patient Email': appointment.email,
      //   'Doctor Name': appointment.doctorName,
      //   'Department': appointment.department,
      //   'Appointment Date': appointment.date,
      //   'Appointment Time': appointment.time,
      //   'Appointment Created Time': appointment.created_at,
      //   'Request Via': appointment.requestVia,
      //   'SMS Sent': appointment.smsSent ? 'Yes' : 'No',
      //   'Email Sent': appointment.emailSent ? 'Yes' : 'No',
      //   'Status': appointment.status,
      //   'Appointment Handled By': appointment.user!.username
      // }));
      const selectedFields = this.appointments.map((appointment: any) => {
        if (appointment.created_at) {
          const createdAt = new Date(appointment?.created_at);
          const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");

          // Store the date and time in two separate variables
          const indianDate = indianTime.format('YYYY-MM-DD');
          const indianTimeOnly = indianTime.format('HH:mm:ss');

          // const createdDate = createdAt.toISOString().split('T')[0]; // Extract the date part in YYYY-MM-DD format
          // const createdTime = createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // Extract time in HH:mm (24-hour format)


          appointment.created_at = indianDate + ' ' + indianTimeOnly;
        }
        return {
          'Patient Name': appointment.patientName,
          'Patient Phone Number': appointment.phoneNumber,
          'Patient Email': appointment.email,
          'Doctor Name': appointment.doctorName,
          'Department': appointment.department,
          'Appointment Date': appointment.date,
          'Appointment Time': appointment.time,
          'Appointment Created Time': appointment.created_at,
          'Request Via': appointment.requestVia,
          'Whatsapp Sent': appointment.smsSent ? 'Yes' : 'No',
          'Email Sent': appointment.emailSent ? 'Yes' : 'No',
          'SMS Sent': appointment.messageSent ? 'Yes' : 'No',
          'Status': appointment.status,
          'Appointment Handled By': appointment.user!.username,
          'CheckedIn By': appointment.checkedInBy
        };

      });
      // Step 1: Convert the filtered data to a worksheet
      const worksheet = XLSX.utils.json_to_sheet(selectedFields);
      // Step 3: Generate the sheet name with truncation if necessary
      const startDate = this.date;
      //  console.log(this.formatDate(this.selectedDateRange[0])); 
      const endDate = startDate;
      let sheetName = `Check In Appointments`;
      // console.log('Sheet name:', sheetName);

      // Truncate sheet name to 31 characters
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);  // Ensure name is 31 characters or fewer
      }

      // Step 2: Create a new workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Step 3: Write the workbook to a binary string
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      // Step 4: Create a Blob from the binary string
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Step 5: Trigger the download
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = `${sheetName}.xlsx`;  // Set the download attribute to the sheet name
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.warn('No data available to download');
    }
  }

  downlaodTodayAppts(): void {
    // console.log('Downloading completed appointments data...');
    if (this.todayAppointments && this.todayAppointments.length > 0) {
      // console.log('Downloading filtered data...');

      // const selectedFields = this.todayAppointments.map((appointment: Appointment) => ({
      //   'Patient Name': appointment.patientName,
      //   'Patient Phone Number': appointment.phoneNumber,
      //   'Patient Email': appointment.email,
      //   'Doctor Name': appointment.doctorName,
      //   'Department': appointment.department,
      //   'Appointment Date': appointment.date,
      //   'Appointment Time': appointment.time,
      //   'Appointment Created Time': appointment.created_at,
      //   'Request Via': appointment.requestVia,
      //   'SMS Sent': appointment.smsSent ? 'Yes' : 'No',
      //   'Email Sent': appointment.emailSent ? 'Yes' : 'No',
      //   'Status': appointment.status,
      //   'Appointment Handled By': appointment.user!.username
      // }));
      const selectedFields = this.todayAppointments.map((appointment: any) => {
        if (appointment.created_at) {
          const createdAt = new Date(appointment?.created_at);
          const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");

          // Store the date and time in two separate variables
          const indianDate = indianTime.format('YYYY-MM-DD');
          const indianTimeOnly = indianTime.format('HH:mm:ss');

          appointment.created_at = indianDate + ' ' + indianTimeOnly;
        }
        return {
          'Patient Name': appointment.patientName,
          'Patient Phone Number': appointment.phoneNumber,
          'Patient Email': appointment.email,
          'Doctor Name': appointment.doctorName,
          'Department': appointment.department,
          'Appointment Date': appointment.date,
          'Appointment Time': appointment.time,
          'Appointment Created Time': appointment.created_at,
          'Request Via': appointment.requestVia,
          'Whatsapp Sent': appointment.smsSent ? 'Yes' : 'No',
          'Email Sent': appointment.emailSent ? 'Yes' : 'No',
          'SMS Sent': appointment.messageSent ? 'Yes' : 'No',
          'Status': appointment.checkedIn ? 'Checked-In' : appointment.status,
          'Appointment Handled By': appointment.user!.username,
          'CheckedIn By': appointment.checkedInBy
        };

      });
      // Step 1: Convert the filtered data to a worksheet
      const worksheet = XLSX.utils.json_to_sheet(selectedFields);
      // Step 3: Generate the sheet name with truncation if necessary
      const startDate = this.date;
      //  console.log(this.formatDate(this.selectedDateRange[0])); 
      const endDate = startDate;
      let sheetName = `Total Appointments ${startDate}`;
      // console.log('Sheet name:', sheetName);

      // Truncate sheet name to 31 characters
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);  // Ensure name is 31 characters or fewer
      }

      // Step 2: Create a new workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Step 3: Write the workbook to a binary string
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      // Step 4: Create a Blob from the binary string
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Step 5: Trigger the download
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = `${sheetName}.xlsx`;  // Set the download attribute to the sheet name
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.warn('No data available to download');
    }
  }

  private fetchDoctorsWithAvailability(): void {
    this.doctorService.getAllDoctors().subscribe(
      (doctors) => {
        const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5)); // Current time in minutes
        const selectedDate = this.date;

        // Initialize counts
        let availableCount = 0;
        let unavailableCount = 0;
        let absentCount = 0;
        let leaveCount = 0;



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
            const dayOfWeek = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
            const availableDay = latestAvailability?.find(avail => avail.day.toLowerCase() === dayOfWeek);
            doctor.availableFrom = availableDay?.availableFrom!
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
              } else if (
                this.isDoctorUnavailable(currentTime, formattedUnavailableSlots)
              ) {
                unavailableCount++;
                status = 'Unavailable';
              } else {
                availableCount++;
                status = 'Available';
              }
            }

            return { ...doctor, status };
          });
        this.leaveDoctors = [];

        this.leaveDoctors = doctors
        .filter((doctor) => (doctor.unavailableDates || []).length > 0)
        .map((doctor) => ({
          ...doctor,
          groupedUnavailableDates: this.groupUnavailableDates(
            doctor.unavailableDates!.map(d => d.date) // Extract only the `date` property
          ),
        }));
      
      console.log("✅ Leave Doctors with Processed Dates:", this.leaveDoctors);
      


        this.unavailableDoctors = doctors
          .filter((doctor) => (doctor.unavailableSlots || []).length > 0)
          .map((doctor) => {
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
            const dayOfWeek = new Date().toLocaleString('en-us', { weekday: 'short' }).toLowerCase();
            const availableDay = latestAvailability?.find(avail => avail.day.toLowerCase() === dayOfWeek);
            // ✅ Process and group unavailable slots
            const groupedSlots = this.groupUnavailableSlots(doctor.unavailableSlots!, availableDay!.slotDuration);

            return {
              ...doctor,
              groupedUnavailableSlots: groupedSlots, // Store grouped slot data
            };
          });
        console.log(this.unavailableDoctors)



        this.totalDoctorsToday = this.doctors.length + doctors.filter(doctor => doctor.doctorType === 'Visiting Consultant').length;
        console.log(this.totalDoctorsToday);


        // Update counts
        this.availableDoctorsToday = availableCount;
        this.unavailableDoctorsToday = unavailableCount;
        this.absentDoctorsToday = absentCount;

        this.updateDoctorLists();
        console.log("📝 Leave Doctors:", this.leaveDoctors);
        this.leaveDoctorsCount = this.leaveDoctors.length
      },
      (error) => {
        console.error('Error fetching doctors:', error);
      }
    );
  }
  private groupUnavailableSlots(slots: any[], duration: number): string[] {
    if (!slots || slots.length === 0) return [];

    // ✅ Convert time to minutes and sort slots
    const sortedSlots = slots
      .map((slot) => ({
        time: slot.time,
        timeInMinutes: this.timeToMinutes(slot.time),
        duration: duration || 20, // Default 20 min if missing
      }))
      .sort((a, b) => a.timeInMinutes - b.timeInMinutes);

    const groupedSlots: string[] = [];
    let startSlot = sortedSlots[0];
    let endSlot = sortedSlots[0];

    for (let i = 1; i < sortedSlots.length; i++) {
      const currentSlot = sortedSlots[i];
      const expectedStartTime = endSlot.timeInMinutes + endSlot.duration; // Expected next slot start time

      if (currentSlot.timeInMinutes === expectedStartTime) {
        // ✅ Continuous slot → Extend the range
        endSlot = currentSlot;
      } else {
        // ✅ Break in continuity → Save range and start new one
        if (startSlot.timeInMinutes === endSlot.timeInMinutes) {
          groupedSlots.push(this.formatTime(startSlot.time)); // Single time
        } else {
          groupedSlots.push(`${this.formatTime(startSlot.time)} to ${this.formatTime(endSlot.timeInMinutes + endSlot.duration)}`);
        }
        startSlot = currentSlot;
        endSlot = currentSlot;
      }
    }

    // ✅ Push last slot/group
    if (startSlot.timeInMinutes === endSlot.timeInMinutes) {
      groupedSlots.push(this.formatTime(startSlot.time));
    } else {
      groupedSlots.push(`${this.formatTime(startSlot.time)} to ${this.formatTime(endSlot.timeInMinutes + endSlot.duration)}`);
    }

    return groupedSlots;
  }

  private formatTime(time: string | number): string {
    if (typeof time === 'number') {
      // ✅ Convert minutes back to AM/PM format
      let hours = Math.floor(time / 60);
      let minutes = time % 60;
      const period = hours >= 12 ? 'PM' : 'AM';

      // Convert 24-hour format to 12-hour format
      hours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    if (!time || !time.includes(':')) {
      console.error('Invalid time format:', time);
      return '';
    }

    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      console.error('Invalid time components:', time);
      return '';
    }

    return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }




  private isDoctorUnavailable(
    currentTime: number,
    unavailableSlots: { time: string; duration: number }[]
  ): boolean {
    return unavailableSlots.some((slot) => {
      const slotStartMinutes = this.timeToMinutes(slot.time);
      const slotDuration = slot.duration || 20; // Default duration
      const slotEndMinutes = slotStartMinutes + slotDuration;

      if (isNaN(slotStartMinutes) || isNaN(slotEndMinutes)) {
        console.error('Invalid slot timing:', slot);
        return false;
      }

      return currentTime >= slotStartMinutes && currentTime < slotEndMinutes;
    });
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
      console.error('Invalid time format:', time);
      return NaN;
    }

    if (this.timeCache[time]) return this.timeCache[time];

    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      console.error('Invalid time components:', time);
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

  private minutesToString(minutes: number): string {
    if (this.timeStringCache[minutes]) return this.timeStringCache[minutes];

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const formattedTime = `${hrs
      .toString()
      .padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    this.timeStringCache[minutes] = formattedTime;
    return formattedTime;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleAvailableDoctors(): void {
    this.showAvailableDoctors = true;
    this.showUnavailableDoctors = false;
    this.showAbsentDoctors = false;
  }

  toggleUnavailableDoctors(): void {
    this.showAvailableDoctors = false;
    this.showUnavailableDoctors = true;
    this.showAbsentDoctors = false;
  }

  toggleAbsentDoctors(): void {
    this.showAbsentDoctors = true;
    this.showUnavailableDoctors = false;
    this.showAvailableDoctors = false;
  }

  closeDoctorList(): void {
    this.showAvailableDoctors = false;
    this.showUnavailableDoctors = false;
    this.showAbsentDoctors = false;
  }

  closeUnavailableDoctorList(): void {
    this.showUnavailableDoctors = false;
  }

  closeAbsentDoctorList(): void {
    this.showAbsentDoctors = false;
  }
  toggleLeaveDoctors(): void {
    this.showLeaveDoctors = true;
  }

  closeLeaveDoctorList(): void {
    this.showLeaveDoctors = false;
  }
  private groupUnavailableDates(dates: string[]): string[] {
    if (!dates || dates.length === 0) return [];
  
    // ✅ Convert to valid Date objects
    const parsedDates = dates.map(dateStr => {
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        console.error("❌ Invalid date found:", dateStr);
      }
      return parsedDate;
    });
  
    // ✅ Remove invalid dates
    const validDates = parsedDates.filter(date => !isNaN(date.getTime()));
  
    if (validDates.length === 0) {
      console.error("❌ No valid dates found:", dates);
      return [];
    }
  
    // ✅ Sort dates in ascending order
    validDates.sort((a, b) => a.getTime() - b.getTime());
  
    const groupedDates: string[] = [];
    let startDate = validDates[0];
    let endDate = validDates[0];
  
    for (let i = 1; i < validDates.length; i++) {
      const currentDate = validDates[i];
      const previousDate = new Date(endDate);
      previousDate.setDate(previousDate.getDate() + 1); // Expect next day
  
      if (currentDate.getTime() === previousDate.getTime()) {
        // ✅ If current date is the next day, extend the range
        endDate = currentDate;
      } else {
        // ✅ If break in dates, store the range or single date
        if (startDate.getTime() === endDate.getTime()) {
          groupedDates.push(this.formatDateUnavailable(startDate)); // Single date
        } else {
          groupedDates.push(`${this.formatDateUnavailable(startDate)} to ${this.formatDateUnavailable(endDate)}`);
        }
        startDate = currentDate;
        endDate = currentDate;
      }
    }
  
    // ✅ Add the last range or date
    if (startDate.getTime() === endDate.getTime()) {
      groupedDates.push(this.formatDateUnavailable(startDate));
    } else {
      groupedDates.push(`${this.formatDateUnavailable(startDate)} to ${this.formatDateUnavailable(endDate)}`);
    }
  
    return groupedDates;
  }
  
  
  private formatDateUnavailable(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error("❌ Invalid Date:", date);
      return "Invalid Date";
    }
    return date.toISOString().split('T')[0]; // Extract YYYY-MM-DD
  }
  
  
}
