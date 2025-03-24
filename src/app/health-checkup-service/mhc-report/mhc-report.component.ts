
import { Component, Output, EventEmitter } from '@angular/core';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { RadiologyService } from '../../services/radiology/radiology.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { MhcFormComponent } from "../mhc-form/mhc-form.component";

@Component({
  selector: 'app-mhc-report',
  templateUrl: './mhc-report.component.html',
  styleUrl: './mhc-report.component.css'
})
export class MhcReportComponent {



  constructor(private healthCheckupService: HealthCheckupServiceService, private messageService: MessageService, private router: Router, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private radiologyService: RadiologyService) {

  }
  confirmedAppointments: any[] = [];
  filteredServices: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof any | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Package Name', value: 'packageName' },
  ];
  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];
  isLoading = false;
  activeServiceId: number | null = null;
  isLockedDialogVisible: boolean = false;
  userId: any = 0;
  @Output() reschedule = new EventEmitter<any>();
  activeComponent: string = 'confirmed';
  confirmedServices: any[] = [];
  today: any = new Date().toLocaleDateString('en-CA');
  selectedAppointment: any;
  showForm: boolean = false;
  showLabPopup: boolean = false;


  // Value entered by the user (could be Patient ID or Phone Number based on selection)
  searchValue: string = '';

  // Selected date from calendar
  selectedDate: Date | null = null;
  isCheckedIn: boolean = false; // ✅ Tracks whether Checked In has been clicked
  isReportDone: boolean = false; // ✅ Tracks whether Report Done has been clicked

  // ✅ Stores entry and report times
  radiologyTimes: any = {
    chestXRayEntryTime: null,
    chestXRayTime: null,
    ultrasoundEntryTime: null,
    ultrasoundTime: null,
    boneDensitometryEntryTime: null,
    boneDensitometryTime: null,
    mammographyEntryTime: null,
    mammographyTime: null,
    ecgEntryTime: null,
    ecgTime: null,
    echoTMTEntryTime: null,
    echoTMTTime: null,
  };
  ngOnInit(): void {
    this.fetchConfirmedAppointments();
    this.userId = localStorage.getItem('userid')
    this.activeComponent = 'appointments';
    const today = new Date().toLocaleDateString('en-CA');
    // const year = today.getFullYear();
    // const month = (today.getMonth() + 1).toString().padStart(2, '0');
    // const day = today.getDate().toString().padStart(2, '0');
    // this.today = `${year}-${month}-${day}`;
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
                this.confirmedAppointments.sort((a, b) => {
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

  formatDuration(minutes: any): string {
    const mins = Number(minutes); // Convert to number
  
    if (isNaN(mins) || mins <= 0) return "-"; // Handle invalid values
  
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = (mins % 60).toFixed(1); // Keep one decimal place
      return parseFloat(remainingMins) > 0
        ? `${hours} hr ${remainingMins} mins`
        : `${hours} hr`;
    } else {
      return `${mins.toFixed(1)} mins`; // Keep one decimal for minutes
    }
  }
  
  
  openForm(service: any): void {
    this.selectedAppointment = service; // Store selected service
    this.showForm = true; // Show the form modal
  }

  onSearch(): void {

    this.filteredServices = this.confirmedAppointments.filter((service) => {
      let matches = true;

      // Filter by search option
      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'patientName':
            matches = service.firstName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          // case 'doctorName':
          //   matches = !!service.doctorName
          //     ?.toLowerCase()
          //     .includes(this.searchValue.toLowerCase());
          //   break;
          // case 'departmentName':
          //   matches = !!service.department
          //     ?.toLowerCase()
          //     .includes(this.searchValue.toLowerCase());
          //   break;
          case 'packageName':
            matches = service.packageName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
        }

      }

      // Filter by date range
      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(service.appointmentDate);
        const startDate = new Date(this.selectedDateRange[0]);
        const endDate = this.selectedDateRange[1]
          ? new Date(this.selectedDateRange[1])
          : startDate; // Use the same date for both start and end if it's a single date

        // Normalize endDate to include the full day
        const normalizedEndDate = new Date(endDate);
        normalizedEndDate.setHours(23, 59, 59, 999);

        if (startDate.getTime() === normalizedEndDate.getTime()) {
          // Single date selected
          matches =
            matches &&
            serviceDate.toDateString() === startDate.toDateString(); // Match only the date part
        } else {
          // Date range selected
          matches =
            matches &&
            serviceDate >= startDate &&
            serviceDate <= normalizedEndDate; // Match within the range
        }
      }

      // Filter by specific date
      if (this.selectedDate) {
        const singleDate = new Date(this.selectedDate);
        matches =
          matches &&
          new Date(service.appointmentDate).toDateString() === singleDate.toDateString();
      }

      // console.log(matches);
      return matches;

    });
  }


  refresh() {
    this.selectedDateRange = [];
    this.filteredServices = [...this.confirmedAppointments];
  }
  downloadData(): void {
    if (this.filteredServices.length === 0) {
      console.warn('No data to download');
      return;
    }
  
    // ✅ Find unique Radiology and Consultation service names
    const allRadiologyNames = new Set<string>();
    const allConsultationNames = new Set<string>();
  
    this.filteredServices.forEach(service => {
      service.radiologyDetails?.forEach((rd: any) => allRadiologyNames.add(rd.radioServiceName));
      service.consultationDetails?.forEach((cd: any) => allConsultationNames.add(cd.department));
    });
  
    // ✅ Prepare header row dynamically
    let headers = [
      "AppointmentDate", "PNR", "Name", "Age", "Gender", "Package", "LabTime"
    ];
  
    // Add Radiology and Consultation as separate columns
    allRadiologyNames.forEach(name => headers.push(`Radiology - ${name}`));
    allConsultationNames.forEach(name => headers.push(`Consultation - ${name}`));
  
    headers.push("TotalTime"); // Add final column
  
    // ✅ Map data to match new structure
    const filteredData = this.filteredServices.map(service => {
      let row: any = {
        AppointmentDate: service.appointmentDate || "-",
        PNR: service.pnrNumber || "-",
        Name: `${service.firstName} ${service.lastName}`.trim(),
        Age: service.age || "-",
        Gender: service.gender || "-",
        Package: service.packageName || "-",
        LabTime: service.labTime || "-",
        TotalTime: service.total || "-"
      };
  
      // ✅ Fill in Radiology details per column
      allRadiologyNames.forEach(name => {
        const radioService = service.radiologyDetails?.find((rd: any) => rd.radioServiceName === name);
        const waitingTime = radioService ? Number(radioService.waitingTime) : null;
        row[`Radiology - ${name}`] = waitingTime !== null && !isNaN(waitingTime) ? waitingTime.toFixed(1) + " mins" : "-";
      });
  
      // ✅ Fill in Consultation details per column
      allConsultationNames.forEach(name => {
        const consultService = service.consultationDetails?.find((cd: any) => cd.department === name);
        const waitingTime = consultService ? Number(consultService.waitingTime) : null;
        row[`Consultation - ${name}`] = waitingTime !== null && !isNaN(waitingTime) ? waitingTime.toFixed(1) + " mins" : "-";
      });
  
      return row;
    });
  
    // ✅ Convert to CSV format
    const csvContent = this.convertToCSV(headers, filteredData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    FileSaver.saveAs(blob, 'summary_report.csv');
  }
  
  // ✅ Updated convertToCSV function to handle dynamic headers
  private convertToCSV(headers: string[], data: any[]): string {
    const headerRow = headers.join(',');
    const rows = data.map(row =>
      headers.map(header => `"${row[header] || "-"}"`).join(',')
    ).join('\n');
  
    return `${headerRow}\n${rows}`;
  }
  

  // Utility to Convert JSON to CSV
  // private convertToCSV(data: any[]): string {
  //   const headers = Object.keys(data[0]).join(',');
  //   const rows = data
  //     .map((row) =>
  //       Object.values(row)
  //         .map((value) => `"${value}"`)
  //         .join(',')
  //     )
  //     .join('\n');

  //   return `${headers}\n${rows}`;
  // }
  // downloadLastWeekData(): void {
  //   // Implement logic to download last week's data
  //   console.log('Downloading last week\'s data...');
  // }
  // printSummary() {
  //   if (this.filteredServices.length === 0) {
  //     console.warn('No data to print');
  //     return;
  //   }

  //   let printContent = `
  //     <html>
  //     <head>
  //       <title>Summary Report</title>
  //       <style>
  //         table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
  //         th, td { border: 1px solid black; padding: 8px; text-align: left; }
  //         th { background-color: #f2f2f2; }
  //       </style>
  //     </head>
  //     <body>
  //       <h2>Summary Report</h2>
  //       <table>
  //         <thead>
  //           <tr>
  //             <th>Appointment Date</th>
  //             <th>PNR</th>
  //             <th>Name</th>
  //             <th>Age</th>
  //             <th>Gender</th>
  //             <th>Package</th>
  //             <th>Lab Time</th>
  //             <th>Radiology Time</th>
  //             <th>Consultation Time</th>
  //             <th>Total Time</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //   `;

  //   this.filteredServices.forEach(service => {
  //     // Format Radiology Details
  //     const radiologyDetails = service.radiologyDetails
  //       ?.map((rd: any) => `${rd.radioServiceName}: ${this.formatDuration(rd.waitingTime)}`)
  //       .join("<br>") || "-";

  //     // Format Consultation Details
  //     const consultationDetails = service.consultationDetails
  //       ?.map((cd: any) => `${cd.department}: ${this.formatDuration(cd.waitingTime)}`)
  //       .join("<br>") || "-";

  //     printContent += `
  //       <tr>
  //         <td>${service.appointmentDate || "-"}</td>
  //         <td>${service.pnrNumber || "-"}</td>
  //         <td>${service.firstName} ${service.lastName}</td>
  //         <td>${service.age || "-"}</td>
  //         <td>${service.gender || "-"}</td>
  //         <td>${service.packageName || "-"}</td>
  //         <td>${service.labTime || "-"}</td>
  //         <td>${radiologyDetails}</td>
  //         <td>${consultationDetails}</td>
  //         <td>${service.total || "-"}</td>
  //       </tr>
  //     `;
  //   });

  //   printContent += `</tbody></table></body></html>`;

  //   const popupWin = window.open('', '_blank', 'width=800,height=600');
  //   popupWin?.document.open();
  //   popupWin?.document.write(printContent);
  //   popupWin?.document.close();
  // }

  printSummary() {
    if (this.filteredServices.length === 0) {
      console.warn('No data to print');
      return;
    }
  
    // Get unique Radiology & Consultation service names
    const allRadiologyNames = new Set<string>();
    const allConsultationNames = new Set<string>();
  
    this.filteredServices.forEach(service => {
      service.radiologyDetails?.forEach((rd: any) => allRadiologyNames.add(rd.radioServiceName));
      service.consultationDetails?.forEach((cd: any) => allConsultationNames.add(cd.department));
    });
  
    let printContent = `
      <html>
      <head>
        <title>Summary Report</title>
        <style>
          table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h2>Summary Report</h2>
        <table>
          <thead>
            <tr>
              <th>Appointment Date</th>
              <th>PNR</th>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Package</th>
              <th>Lab Time</th>
    `;
  
    // Add dynamic Radiology columns
    allRadiologyNames.forEach(name => {
      printContent += `<th>Radiology - ${name}</th>`;
    });
  
    // Add dynamic Consultation columns
    allConsultationNames.forEach(name => {
      printContent += `<th>Consultation - ${name}</th>`;
    });
  
    printContent += `
              <th>Total Time</th>
            </tr>
          </thead>
          <tbody>
    `;
  
    // Add data for each service
    this.filteredServices.forEach(service => {
      printContent += `
        <tr>
          <td>${service.appointmentDate || "-"}</td>
          <td>${service.pnrNumber || "-"}</td>
          <td>${service.firstName} ${service.lastName}</td>
          <td>${service.age || "-"}</td>
          <td>${service.gender || "-"}</td>
          <td>${service.packageName || "-"}</td>
          <td>${service.labTime || "-"}</td>
      `;
  
      // Add Radiology Times
      allRadiologyNames.forEach(name => {
        const radioService = service.radiologyDetails?.find((rd: any) => rd.radioServiceName === name);
        const waitingTime = radioService ? Number(radioService.waitingTime) : null;
    
        printContent += `<td>${waitingTime !== null && !isNaN(waitingTime) ? waitingTime.toFixed(1) + " mins" : "-"}</td>`;
      });
  
      // Add Consultation Times
      allConsultationNames.forEach(name => {
        const consultService = service.consultationDetails?.find((cd: any) => cd.department === name);
        const waitingTime = consultService ? Number(consultService.waitingTime) : null;
    
        printContent += `<td>${waitingTime !== null && !isNaN(waitingTime) ? waitingTime.toFixed(1) + " mins" : "-"}</td>`;
      });
  
      printContent += `<td>${service.total || "-"}</td></tr>`;
    });
  
    printContent += `</tbody></table></body></html>`;
  
    const popupWin = window.open('', '_blank', 'width=800,height=600');
    popupWin?.document.open();
    popupWin?.document.write(printContent);
    popupWin?.document.close();
  }
  

  // Method to clear input fields
  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = 'firstName';
    this.selectedDateRange = [];
    this.filteredServices = [...this.confirmedAppointments];
  }

  sortedAppointments() {

    if (!this.sortColumn) {
      // If no sorting column is selected, return the appointments as is (unsorted)
      return [...this.filteredServices];
    }


    return [...this.filteredServices].sort((a, b) => {
      const valueA = a[this.sortColumn!]; // Use the non-null assertion operator (!) to tell TypeScript sortColumn is defined
      const valueB = b[this.sortColumn!];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0; // Default to no sorting if types are not strings
    });
  }

  // Method to return paginated appointments after sorting
  getPaginatedAppointments() {
    const sorted = this.sortedAppointments();  // First, sort the data (or not)
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage); // Return paginated data
  }

  // Method to calculate total pages
  get totalPages() {
    return Math.ceil(this.confirmedAppointments.length / this.itemsPerPage);
  }

  // Method to go to the previous page
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Method to go to the next page
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Handle page number change
  onPageChange() {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }
  sortBy(column: keyof any): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredServices.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      // Handle appointmentDate separately
      if (column === 'appointmentDate') {
        const dateA = new Date(valueA as string); // Convert string to Date
        const dateB = new Date(valueB as string);

        return this.sortDirection === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      // Sort strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // Sort numbers
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      return 0; // Default case
    });

    this.currentPage = 1; // Reset to the first page after sorting
  }
  completeAppointment(appointment: any): void {
    const { id: serviceId } = appointment;
    const payload = {
      ...appointment,
      status: 'completed',
    }
    if (!serviceId) return;

    this.appointmentService.individualComplete(payload).subscribe({
      next: (response) => {
        console.log('WhatsApp message sent successfully:', response);
        this.fetchConfirmedAppointments()
      },
      error: (error) => {
        console.error('Error sending WhatsApp message:', error);
      }
    });



    // Update UI

  }
  labTime(): void {
    const { id, package: packageDate, packageId, consultationCount, ...withoutServiceId } = this.selectedService;

    const payload = {
      ...withoutServiceId,
      isLab: true,
      isLabTime: new Date(),
    }
    if (!id) return;
    this.healthCheckupService.updateService(id, payload).subscribe({
      next: (response) => {
        console.log('Service marked as completed:', response);
        this.fetchConfirmedAppointments()
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Lab is updated successfully!' });

      }
    })
  }
  labEntryTime(): void {
    const { id, package: packageDate, packageId, consultationCount, ...withoutServiceId } = this.selectedService;

    const payload = {
      ...withoutServiceId,
      isLabEntryTime: new Date(),
    }
    if (!id) return;
    this.healthCheckupService.updateService(id, payload).subscribe({
      next: (response) => {
        console.log('Service marked as completed:', response);
        this.fetchConfirmedAppointments()
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Lab is updated successfully!' });

      }
    })
  }
  openAppointmentForm(service: any): void {
    // this.router.navigate(['/reschedule', service.id], {
    //   state: { data: service }, // Passing full service object using state
    // });
    this.lockService(service);
  }
  openAppointmentFormAfterLocked(service: any): void {
    this.reschedule.emit(service);
  }
  cancelAppointment(appointment: any) {
    // appointment.date = this.convertDateToISO(appointment.date);
    const cancel: any = {
      ...appointment,
      status: 'cancelled',
      requestVia: appointment.requestVia
    };

    this.appointmentService.addCancelledAppointment(cancel);
    // this.appointmentService.sendWhatsAppMessage(cancel).subscribe({
    //   next: (response) => {
    //     console.log('WhatsApp message sent successfully:', response);
    //   },
    //   error: (error) => {
    //     console.error('Error sending WhatsApp message:', error);
    //   }
    // });
    this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
      next: (response) => {
        const doctorPhoneNumber = response?.phone_number;
        const appointmentDetails = {
          patientName: appointment?.patientName,
          doctorName: appointment?.doctorName,
          date: appointment?.date,
          time: appointment?.time,
          doctorPhoneNumber: doctorPhoneNumber,
          patientPhoneNumber: appointment?.phoneNumber,
          status: 'cancelled',
          prefix: appointment.prefix
        }

        this.appointmentService.sendSmsMessage(appointmentDetails).subscribe({
          next: (response) => {
            // console.log('SMS message sent successfully:', response);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMS message sent successfully!' });
          },
          error: (error) => {
            console.error('Error sending SMS message:', error);
          }
        });
        this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
          next: (response) => {
            // console.log('WhatsApp message sent successfully:', response);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'WhatsApp message sent successfully!' });
          },
          error: (error) => {
            console.error('Error sending WhatsApp message:', error);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending WhatsApp message!' });
          }
        });
      }

    });
    const appointmentDetails = {
      patientName: appointment?.patientName,
      doctorName: appointment?.doctorName,
      date: appointment?.date,
      time: appointment?.time,
    };
    const patientEmail = appointment.email;

    const emailStatus = 'cancelled';
    this.appointmentService.sendEmail(patientEmail, emailStatus, appointmentDetails, 'patient').subscribe({
      next: (response) => {
        // console.log('Email sent to patient successfully:', response);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully!' });
      },
      error: (error) => {
        console.error('Error sending email to patient:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to patient!' });
      },
    });
    this.fetchConfirmedAppointments()

  }
  // Lock a service
  lockService(service: any): void {
    if (!service.id) return;
    this.isLoading = true;
    this.healthCheckupService.lockService(service.id, this.userId).subscribe({
      next: (response) => {
        // console.log('Service locked:', response);
        this.activeServiceId = service.id!;
        this.messageService.add({
          severity: 'success',
          summary: 'Locked',
          detail: `Service ID ${service.id} has been locked successfully.`,
        });
        this.openAppointmentFormAfterLocked(service);
        this.activeComponent = 'form';
      },
      error: (error) => {
        if (error.status === 409) {
          this.isLockedDialogVisible = true; // Show dialog if locked by another user
          console.warn('Service is already locked by another user.');
        } else {
          console.error('Error locking service:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to lock the service.',
          });
        }
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
  handleLockedDialogClose() {
    this.isLockedDialogVisible = false;
  }
  // Unlock a service
  unlockService(): void {
    // console.log('Unlocking service:', this.activeServiceId);
    if (!this.activeServiceId) return;
    this.isLoading = true;
    this.healthCheckupService.unlockService(this.activeServiceId).subscribe({
      next: (response) => {
        // console.log('Service unlocked:', response);
        this.activeServiceId = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Unlocked',
          detail: 'Service has been unlocked successfully.',
        });
        this.activeComponent = 'confirmed'; // Navigate back to the confirmed appointments
      },
      error: (error) => {
        console.error('Error unlocking service:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to unlock the service.',
        });
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    // Unlock the service on component destroy if locked
    // console.log('Destroying confirmed component...', this.activeComponent);
    if (this.activeServiceId && this.activeComponent !== 'form') {
      this.unlockService();
    }
  }
  showPopup: boolean = false;
  selectedService: any = null;

  // Radiology test states (each service will have its own)
  chestXRay: boolean = false;
  ultrasound: boolean = false;
  boneDensitometry: boolean = false;
  mammography: boolean = false;
  ecg: boolean = false;
  echoTMT: boolean = false;
  // usgEcho: boolean = false;

  // Timestamps
  chestXRayTime: any | null = null;
  ultrasoundTime: any | null = null;
  boneDensitometryTime: any | null = null;
  mammographyTime: any | null = null;
  ecgTime: any | null = null;
  echoTMTTime: any | null = null;
  // usgEchoTime: string | null = null;



  /** Open popup for the selected service */
  openPopup(service: any) {
    this.selectedService = service;
    this.showPopup = true;

    // ✅ Load previously selected values if the service was updated before
    this.chestXRay = service.chestXRay || false;
    this.ultrasound = service.ultrasound || false;
    this.boneDensitometry = service.boneDensitometry || false;
    this.mammography = service.mammography || false;
    this.ecg = service.ecg || false;
    this.echoTMT = service.echoTMT || false;
    // this.usgEcho = service.usgEcho || false;

    this.chestXRayTime = service.chestXRayTime || null;
    this.ultrasoundTime = service.ultrasoundTime || null;
    this.boneDensitometryTime = service.boneDensitometryTime || null;
    this.mammographyTime = service.mammographyTime || null;
    this.ecgTime = service.ecgTime || null;
    this.echoTMTTime = service.echoTMTTime || null;
    // this.usgEchoTime = service.usgEchoTime || null;
  }
  openLabPopup(service: any) {
    this.selectedService = service;
    this.showLabPopup = true;
  }

  /** Close the popup */
  closePopup() {
    this.showPopup = false;
    this.selectedService = null;
  }

  closeLabPopup() {
    this.showLabPopup = false;
    this.selectedService = null;
  }

  /** Submit the selected radiology tests */
  submitSelection() {
    if (!this.selectedService) return;

    const currentTime = new Date().toLocaleString(); // Capture timestamp

    // ✅ Set timestamps only for newly selected tests
    if (this.chestXRay && !this.chestXRayTime) this.chestXRayTime = new Date();
    if (this.ultrasound && !this.ultrasoundTime) this.ultrasoundTime = new Date();
    if (this.boneDensitometry && !this.boneDensitometryTime) this.boneDensitometryTime = new Date();
    if (this.mammography && !this.mammographyTime) this.mammographyTime = new Date();
    if (this.ecg && !this.ecgTime) this.ecgTime = new Date();
    if (this.echoTMT && !this.echoTMTTime) this.echoTMTTime = new Date();
    // if (this.usgEcho && !this.usgEchoTime) this.usgEchoTime = currentTime;

    const { id: serviceId } = this.selectedService;
    if (!serviceId) return;
    const { id, package: packageDate, packageId, consultationCount, ...withoutServiceId } = this.selectedService;
    const payload = {
      ...withoutServiceId,
      chestXRay: this.chestXRay,
      ultrasound: this.ultrasound,
      boneDensitometry: this.boneDensitometry,
      mammography: this.mammography,
      ecg: this.ecg,
      echoTMT: this.echoTMT,
      // usgEcho: this.usgEcho,
      chestXRayTime: this.chestXRayTime,
      ultrasoundTime: this.ultrasoundTime,
      boneDensitometryTime: this.boneDensitometryTime,
      mammographyTime: this.mammographyTime,
      ecgTime: this.ecgTime,
      echoTMTTime: this.echoTMTTime,
      // usgEchoTime: this.usgEchoTime
    };

    // ✅ Update service via API
    this.healthCheckupService.updateService(serviceId, payload).subscribe({
      next: (response) => {
        console.log('Service updated:', response);
        this.closePopup(); // Close popup after update
        this.fetchConfirmedAppointments()
      }
    });
  }
  // markCheckedIn() {
  //   if (!this.isCheckedIn) {
  //     const currentTime = new Date().toISOString();

  //     // ✅ Set all "EntryTime" fields with current time
  //     Object.keys(this.radiologyTimes).forEach((key) => {
  //       if (key.includes("EntryTime") && !this.radiologyTimes[key]) {
  //         this.radiologyTimes[key] = currentTime;
  //       }
  //     });

  //     this.isCheckedIn = true; // ✅ Disable Checked In button
  //     console.log("Checked In at:", this.radiologyTimes);

  //   }
  // }

  // // ✅ Function for Report Done
  // markReportDone() {
  //   if (this.isCheckedIn && !this.isReportDone) {
  //     const currentTime = new Date().toISOString();

  //     // ✅ Set all "Time" fields with current time
  //     Object.keys(this.radiologyTimes).forEach((key) => {
  //       if (key.includes("Time") && !this.radiologyTimes[key]) {
  //         this.radiologyTimes[key] = currentTime;
  //       }
  //     });

  //     this.isReportDone = true; // ✅ Disable Report Done button
  //     console.log("Report Done at:", this.radiologyTimes);
  //   }
  // }
  markCheckedIn() {
    if (!this.isCheckedIn) {
      const currentTime = new Date().toISOString();

      // ✅ Create a copy of the service object to preserve all fields
      let payload: any = { ...this.selectedService };

      // ✅ Update all "EntryTime" fields
      Object.keys(payload).forEach((key) => {
        if (key.includes("EntryTime") && !payload[key]) {
          payload[key] = currentTime;
        }
      });
      payload.chestXRayEntryTime = currentTime
      payload.ultrasoundEntryTime = currentTime
      payload.boneDensitometryEntryTime = currentTime
      payload.mammographyEntryTime = currentTime
      payload.ecgEntryTime = currentTime
      payload.echoTMTEntryTime = currentTime
      payload.usgEchoEntryTime = currentTime

      // payload.checkedIn = true; // ✅ Mark service as checked in
      // payload.checkedInTime = currentTime; // ✅ Set general checked-in time

      console.log("Checked In Payload:", payload);
      const { id, package: packageDate, packageId, consultationCount, ...withoutServiceId } = payload;

      // ✅ Update Service in Backend
      this.healthCheckupService.updateService(this.selectedService.id, withoutServiceId).subscribe({
        next: (response) => {
          console.log('Service Updated:', response);
          this.closePopup(); // ✅ Close popup after update
          this.fetchConfirmedAppointments(); // ✅ Refresh data
        },
        error: (error) => {
          console.error('Error updating service:', error);
        }
      });

      this.isCheckedIn = true; // ✅ Disable Checked In button
    }
  }

  markReportDone() {
    console.log(this.selectedService)
    if (this.selectedService.chestXRayEntryTime && this.selectedService.chestXRayTime != null) {
      const currentTime = new Date().toISOString();

      // ✅ Create a copy of the service object to preserve all fields
      let payload: any = { ...this.selectedService };

      // ✅ Update all "Time" fields
      // Object.keys(payload).forEach((key) => {
      //   // ✅ Update only if the key ends exactly with "Time" (e.g., chestXRayTime, ultrasoundTime)
      //   if (key.endsWith("Time") && typeof payload[key] === "string" && !payload[key]) {
      //     payload[key] = currentTime;
      //   }
      // });
      payload.chestXRayTime = currentTime
      payload.ultrasoundTime = currentTime
      payload.boneDensitometryTime = currentTime
      payload.mammographyTime = currentTime
      payload.ecgTime = currentTime
      payload.echoTMTTime = currentTime
      payload.usgEchoTime = currentTime


      console.log("Report Done Payload:", payload);
      const { id, package: packageDate, packageId, consultationCount, ...withoutServiceId } = payload;

      // ✅ Update Service in Backend
      this.healthCheckupService.updateService(this.selectedService.id, withoutServiceId).subscribe({
        next: (response) => {
          console.log('Service Updated:', response);
          this.closePopup(); // ✅ Close popup after update
          this.fetchConfirmedAppointments(); // ✅ Refresh data
        },
        error: (error) => {
          console.error('Error updating service:', error);
        }
      });

      this.isReportDone = true; // ✅ Disable Report Done button
    }
  }
  isMissingTime(service: any): boolean {
    return [service.labTime, service.radiologyTime, service.consultationTime, service.total].some(
      val => !val || val === '-'
    );
  }
  

}
