import { Component, OnInit } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { MessageService } from 'primeng/api';
import { Workbook } from 'exceljs';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-doctor-report',
  templateUrl: './doctor-report.component.html',
  styleUrl: './doctor-report.component.css',
  providers: [MessageService],
})
export class DoctorReportComponent implements OnInit {
  services: any[] = []; // Stores all services fetched from the API
  combinedReport: any[] = []; // Combined admin-wise and package-wise report
  selectedDateRange: Date[] = []; // Selected date range for filtering
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof any | undefined = undefined;
  sortDirection: 'asc' | 'desc' = 'asc';
  today = new Date();
  isLoading: boolean = false;

  constructor(private serviceApi: HealthCheckupServiceService, private messageService: MessageService ) {}

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.isLoading=true
    this.serviceApi.getAllServices().subscribe(
      (data) => {
        this.services = data;
        // this.filterTodayAppointments();
        this.generateCombinedReport();
      },
      (error) => {
        console.error('Error fetching services:', error);
      },
      () => {
        this.isLoading = false;
      }
    );
  }

  filterTodayAppointments(): void {
    const todayStart = new Date(this.today);
    todayStart.setHours(0, 0, 0, 0); // Start of today
    const todayEnd = new Date(this.today);
    todayEnd.setHours(23, 59, 59, 999); // End of today

    // Filter today's appointments
    this.services = this.services.filter((service) => {
      const serviceDate = new Date(service.createdAt || service.appointmentDate);
      return serviceDate >= todayStart && serviceDate <= todayEnd;
    });
  }


//   generateCombinedReport(): void {

    
//     const adminSummary: { [key: string]: any } = {};
//     const packageSummary: { [key: string]: any } = {};

//     // Process services data
//     this.services.forEach((service) => {
//       const adminKey = service.userId || 'Unknown Admin';
//       const packageKey = service.packageName || 'Unknown Package';
//       let role = service.role || 'Unknown Role';
//       let userNames = service.username || 'Unknown User';
//       if(userNames){
//         userNames = this.extractName(userNames);
//         console.log(userNames);
//       }

//       // Admin summary
//       if (!adminSummary[adminKey]) {
//         adminSummary[adminKey] = {
//           username: userNames,
//           role: role,
//           totalHandled: 0,
//           Confirm: 0,
//           Cancel: 0,
//           complete: 0,
//           online: 0,
//           call: 0,
//           walkin: 0,
//           userId: service.userId,
//         };
//       }

//       adminSummary[adminKey].totalHandled++;
//       adminSummary[adminKey][service.appointmentStatus]++;
//       const normalizedRequestTypes = service.requestVia.toLowerCase().replace('-', '');
//       if (adminSummary[adminKey][normalizedRequestTypes] !== undefined) {
//         adminSummary[adminKey][normalizedRequestTypes]++;
//       } else {
//         console.warn(`Unknown request type: ${service.requestVia}`);
//       }
      

//       // Package summary
//       if (!packageSummary[packageKey]) {
//         packageSummary[packageKey] = {
//           username: packageKey,
//           role: 'Package',
//           totalHandled: 0,
//           Confirm: 0,
//           Cancel: 0,
//           complete: 0,
//           online: 0,
//           call: 0,
//           walkin: 0,
//           packageId: service.packageId,
//         };
//       }

//       packageSummary[packageKey].totalHandled++;
//       packageSummary[packageKey][service.appointmentStatus]++;
//       const normalizedRequestType = service.requestVia.toLowerCase().replace('-', '');
// if (packageSummary[packageKey][normalizedRequestType] !== undefined) {
//   packageSummary[packageKey][normalizedRequestType]++;
// } else {
//   console.warn(`Unknown request type: ${service.requestVia}`);
// }

//     });

//     // Combine admin and package summaries
//     this.combinedReport = [...Object.values(adminSummary), ...Object.values(packageSummary)];
//   }
generateCombinedReport(): void {
  const adminSummary: { [key: string]: any } = {};
  const packageSummary: { [key: string]: any } = {};

  let startDate: Date;
  let endDate: Date;

  // Determine the selected date range or default to today's date
  if (this.selectedDateRange && this.selectedDateRange.length > 0) {
    startDate = new Date(this.selectedDateRange[0]);
    if (this.selectedDateRange.length === 2) {
      endDate = new Date(this.selectedDateRange[1] || startDate);
    } else {
      endDate = new Date(startDate);
    }
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  }

  // Process services data
  this.services.forEach((service) => {
    const adminKey = service.userId || 'Unknown Admin';
    const packageKey = service.packageName || 'Unknown Package';
    const role = service.role || 'Unknown Role';
    let userNames = service.username || 'Unknown User';

    if (userNames) {
      userNames = this.extractName(userNames);
    }
    // console.log(startDate, endDate);
    const createdAt = service.createdAt ? new Date(service.createdAt) : null;
    // console.log(service.appointmentDate, new Date(service.appointmentDate));
    const appointmentDate = service.appointmentDate ? new Date(service.appointmentDate) : null;

    // Filter by dates
    const isAdminInRange = createdAt && createdAt >= startDate && createdAt <= endDate;
    const isPackageInRange = appointmentDate && appointmentDate >= startDate && appointmentDate <= endDate;
    // console.log(isPackageInRange, startDate, endDate, createdAt, appointmentDate);

    // Admin summary (filter by createdAt)
    if (role !== 'Package' && isAdminInRange) {
      if (!adminSummary[adminKey]) {
        adminSummary[adminKey] = {
          username: userNames,
          role: role,
          totalHandled: 0,
          Confirm: 0,
          Cancel: 0,
          complete: 0,
          online: 0,
          call: 0,
          walkin: 0,
          userId: service.userId,
        };
      }

      adminSummary[adminKey].totalHandled++;
      adminSummary[adminKey][service.appointmentStatus]++;
      const normalizedRequestType = service.requestVia.toLowerCase().replace('-', '');
      if (adminSummary[adminKey][normalizedRequestType] !== undefined) {
        adminSummary[adminKey][normalizedRequestType]++;
      } else {
        console.warn(`Unknown request type: ${service.requestVia}`);
      }
    }

    // Package summary (filter by appointmentDate)
    if (isPackageInRange) {
      if (!packageSummary[packageKey]) {
        packageSummary[packageKey] = {
          username: packageKey,
          role: 'Package',
          totalHandled: 0,
          Confirm: 0,
          Cancel: 0,
          complete: 0,
          online: 0,
          call: 0,
          walkin: 0,
          packageId: service.packageId,
        };
      }

      packageSummary[packageKey].totalHandled++;
      packageSummary[packageKey][service.appointmentStatus]++;
      const normalizedRequestType = service.requestVia.toLowerCase().replace('-', '');
      if (packageSummary[packageKey][normalizedRequestType] !== undefined) {
        packageSummary[packageKey][normalizedRequestType]++;
      } else {
        console.warn(`Unknown request type: ${service.requestVia}`);
      }
    }
  });

  // Combine admin and package summaries
  this.combinedReport = [...Object.values(adminSummary), ...Object.values(packageSummary)];
}

  sortBy(column: keyof any): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }
  getPaginatedData(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.combinedReport.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.combinedReport.length / this.itemsPerPage);
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  downloadReport(): void {
    // Download logic for combinedReport
  }
  download() {
    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] || startDate;
  
      const timeDifference = Math.abs(endDate.getTime() - startDate.getTime());
      const dayDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  
      if (dayDifference > 7) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Please select a date range of 7 days or less for download.',
          life: 5000,
        });
        return;
      }
    }
  
    // Filter services based on the selected date range
    let filteredServices = this.services;
  
    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] || startDate;
  
      const normalizedEndDate = new Date(endDate);
      normalizedEndDate.setHours(23, 59, 59, 999);
  
      filteredServices = filteredServices.filter((service) => {
        const serviceDate = new Date(service.appointmentDate);
        return serviceDate >= startDate && serviceDate <= normalizedEndDate;
      });
    }
  
    // Sort filtered services by created_at timestamp
    const sortedServices = filteredServices.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  
    // Create workbook and worksheet
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Services Report');
  
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Email', key: 'email', width: 20 },
      { header: 'Package Name', key: 'packageName', width: 20 },
      { header: 'Appointment Date', key: 'appointmentDate', width: 15 },
      { header: 'Appointment Time', key: 'appointmentTime', width: 10 },
      { header: 'Request Via', key: 'requestVia', width: 15 },
      { header: 'Status', key: 'appointmentStatus', width: 10 },
      { header: 'User Role', key: 'role', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
  
    // Add rows to the worksheet
    sortedServices.forEach((service, index) => {
      worksheet.addRow({
        no: index + 1,
        firstName: service.firstName,
        lastName: service.lastName || 'N/A',
        phoneNumber: service.phoneNumber,
        email: service.email || 'N/A',
        packageName: service.packageName,
        appointmentDate: service.appointmentDate,
        appointmentTime: service.appointmentTime || 'N/A',
        requestVia: service.requestVia,
        appointmentStatus: service.appointmentStatus,
        role: service.role || 'Admin',
        createdAt: service.createdAt,
      });
    });
  
    // Download the file
    workbook.xlsx.writeBuffer().then((buffer) => {
      const today = new Date().toISOString().split('T')[0];
      FileSaver.saveAs(new Blob([buffer]), `Services_Report_${today}.xlsx`);
    });
  }
  
  refresh(){
this.selectedDateRange = [];
this.loadServices();
  }

  filterByDateRange(): void {
    if (this.selectedDateRange && this.selectedDateRange.length > 0) {
      const startDate = new Date(this.selectedDateRange[0]);
      let endDate = new Date(this.selectedDateRange[1] || this.selectedDateRange[0]);
  
      // Normalize startDate and endDate
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  
      this.services = this.services.filter((service) => {
        // Check if it's a package or admin record
        if (['super_admin', 'sub_admin', 'admin', 'doctor'].includes(service.role)){
          // Filter by appointmentDate for packages
          console.log('packageId');
          const serviceCreatedDate = new Date(service.createdAt);
          return serviceCreatedDate >= startDate && serviceCreatedDate <= endDate;
        } else {
          // Filter by createdAt for admins
          console.log('userId');
          const serviceAppointmentDate = new Date(service.appointmentDate);
          return serviceAppointmentDate >= startDate && serviceAppointmentDate <= endDate;
        }
      });
  
      console.log("Filtered Services:", this.services, "Start Date:", startDate, "End Date:", endDate);
      this.generateCombinedReport();
    } else {
      console.log("No valid date range selected. Showing all services.");
      this.generateCombinedReport();
    }
  }
  
  sortedAppointments() {
    if (!this.sortColumn) {
      return [...this.combinedReport];
    }
    return [...this.combinedReport].sort((a, b) => {
      const valueA = a[this.sortColumn!];
      const valueB = b[this.sortColumn!];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0; // Default to no sorting if types are not strings
    });
  }
  downloadAppointments(userId: number | string, role: string): void {
    let filteredData: any[];
  
    // Filter data based on role
    if (role === 'Package') {
      filteredData = this.filterAppointmentsByPackage(userId);
      console.log(filteredData);
    } else {
      filteredData = this.filterAppointmentsByUser(userId, role);
      console.log(filteredData, userId);
    }
  
    // Generate the Excel file
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(`${role} Report`);
  
    // Define the worksheet columns
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Package Name', key: 'packageName', width: 30 },
      { header: 'Appointment Date', key: 'appointmentDate', width: 15 },
      { header: 'Appointment Time', key: 'appointmentTime', width: 15 },
      { header: 'Request Via', key: 'requestVia', width: 15 },
      { header: 'Status', key: 'appointmentStatus', width: 15 },
      { header: 'Handled By', key: 'handledBy', width: 20 },
    ];
  
    // Populate the worksheet with filtered data
    filteredData.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        firstName: item.firstName,
        lastName: item.lastName,
        phoneNumber: item.phoneNumber,
        email: item.email,
        packageName: item.packageName,
        appointmentDate: item.appointmentDate,
        appointmentTime: item.appointmentTime,
        requestVia: item.requestVia,
        appointmentStatus: item.appointmentStatus,
        handledBy: item.username,
      });
    });
  
    // Generate and download the Excel file
    workbook.xlsx.writeBuffer().then((buffer) => {
      const fileName = `${role}_Report_${userId}.xlsx`;
      FileSaver.saveAs(new Blob([buffer]), fileName);
    });
  }
  
  filterAppointmentsByUser(userId: number | string, role: string): any[] {
    // Filter services by userId and role
    return this.services.filter(
      (service) => service.userId === userId && service.role === role
    );
  }
  
  filterAppointmentsByPackage(packageId: number | string): any[] {
    let startDate: Date;
    let endDate: Date;
  
    // Handle selectedDateRange or default to today's range
    if (this.selectedDateRange && this.selectedDateRange.length > 0) {
      // Start date is always the first date
      startDate = new Date(this.selectedDateRange[0]);
      startDate.setHours(0, 0, 0, 0); // Start of the day
  
      // If a second date exists, use it as the end date; otherwise, use start date as end date
      if (this.selectedDateRange.length === 2 && this.selectedDateRange[1]) {
        endDate = new Date(this.selectedDateRange[1]);
      } else {
        endDate = new Date(startDate); // If no second date, endDate is the same as startDate
      }
      endDate.setHours(23, 59, 59, 999); // End of the day
    } else {
      // Default to today's range
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }
  
    // Debugging dates
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
  
    // Filter services by packageId and appointmentDate within the range
    return this.services.filter((service) => {
      const appointmentDate = new Date(service.appointmentDate);
      return (
        service.packageId === packageId &&
        appointmentDate >= startDate &&
        appointmentDate <= endDate
      );
    });
  }
  
  
  
  printAppointments(userId: number | string, role: string): void {
    let filteredData: any[];
  
    // Filter data based on role
    if (role === 'Package') {
      filteredData = this.filterAppointmentsByPackage(userId);
      console.log(filteredData);
    } else {
      filteredData = this.filterAppointmentsByUser(userId, role);
    }
  
    // Start building the print content
    let printContents = `
      <h1>${role} Report for ${userId}</h1>
      <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 8px;">No</th>
            <th style="border: 1px solid #000; padding: 8px;">First Name</th>
            <th style="border: 1px solid #000; padding: 8px;">Last Name</th>
            <th style="border: 1px solid #000; padding: 8px;">Phone Number</th>
            <th style="border: 1px solid #000; padding: 8px;">Email</th>
            <th style="border: 1px solid #000; padding: 8px;">Package Name</th>
            <th style="border: 1px solid #000; padding: 8px;">Appointment Date</th>
            <th style="border: 1px solid #000; padding: 8px;">Appointment Time</th>
            <th style="border: 1px solid #000; padding: 8px;">Request Via</th>
            <th style="border: 1px solid #000; padding: 8px;">Status</th>
            <th style="border: 1px solid #000; padding: 8px;">Handled By</th>
          </tr>
        </thead>
        <tbody>
    `;
  
    // Add rows to the table
    filteredData.forEach((item, index) => {
      printContents += `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.firstName}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.lastName}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.phoneNumber}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.email || 'N/A'}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.packageName}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.appointmentDate}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.appointmentTime || 'N/A'}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.requestVia}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.appointmentStatus}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.username}</td>
        </tr>
      `;
    });
  
    printContents += `
        </tbody>
      </table>
    `;
  
    // Open a new browser window and print the content
    const popupWin = window.open('', '_blank', 'width=800,height=600');
    popupWin?.document.open();
    popupWin?.document.write(`
      <html>
        <head>
          <title>${role} Report</title>
          <style>
            body { font-family: Kanit, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body onload="window.print()">
          ${printContents}
        </body>
      </html>
    `);
    popupWin?.document.close();
  }
  
  onPageChange() {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }
  private extractName(username: string): string {
    // Extract the part before the first underscore or '@'
    return username.split(/[_@]/)[0];
  }

}