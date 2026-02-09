import { Component } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { Workbook } from 'exceljs';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';



interface CheckedInAppointment {
  id: number;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  requestVia: string;
  created_at: string;
  checkedInTime: string;
  checkedInBy: string;
  type: string;
  user?: {
    username: string;
  };
  doctor?: {
    name: string;
  };
}

@Component({
  selector: 'app-checkin-report',
  templateUrl: './checkin-report.component.html',
  styleUrl: './checkin-report.component.css',
  providers: [MessageService]
})
export class CheckinReportComponent {
  appointments: CheckedInAppointment[] = [];
  selectedDateRange: Date[] = [];
  isLoading = false;

  currentPage = 1;
  itemsPerPage = 10;

  constructor(private appointmentService: AppointmentConfirmService, private messageService: MessageService) { }

  ngOnInit(): void {
    this.loadCheckedInAppointments();
  }

  loadCheckedInAppointments(): void {

    if (this.isFutureDateSelected()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Date Range',
        detail: 'Future dates are not allowed.',
        life: 4000,
      });

      this.appointments = [];
      this.isLoading = false;
      return;

    }

    this.isLoading = true;

    let startDate = '';
    let endDate = '';

    if (this.selectedDateRange && this.selectedDateRange.length > 0) {
      startDate = this.formatDate(this.selectedDateRange[0]);
      endDate = this.selectedDateRange[1]
        ? this.formatDate(this.selectedDateRange[1])
        : startDate;
    } else {
      const today = new Date();
      startDate = this.formatDate(today);
      endDate = startDate;
    }

    this.appointmentService
      .getCheckedInAppointments(startDate, endDate)
      .subscribe({
        next: (data) => {
          this.appointments = data;
        },
        error: (err) => {
          console.error(err);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  isFutureDateSelected(): boolean {
    if (!this.selectedDateRange || this.selectedDateRange.length === 0) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(this.selectedDateRange[0]);
    startDate.setHours(0, 0, 0, 0);

    const endDate = this.selectedDateRange[1]
      ? new Date(this.selectedDateRange[1])
      : startDate;

    endDate.setHours(0, 0, 0, 0);

    return startDate > today || endDate > today;
  }


  // formatDate(date: Date): string {
  //   return date.toISOString().split('T')[0];
  // }
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  refresh() {
    this.selectedDateRange = [];
    this.loadCheckedInAppointments();
  }

  get paginatedAppointments() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.appointments.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.appointments.length / this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }
  onPageChange() {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  download(): void {
    if (!this.appointments || this.appointments.length === 0) {
      return;
    }

    if (this.isFutureDateSelected()) {
  this.messageService.add({
    severity: 'warn',
    summary: 'Invalid Date Range',
    detail: 'Future dates cannot be downloaded.',
    life: 4000,
  });
  return;
}


    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Checked-in Appointments');

    // Same headings as table
    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Patient', key: 'patientName', width: 25 },
      { header: 'Doctor', key: 'doctorName', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 12 },
      { header: 'Request Via', key: 'requestVia', width: 15 },
      { header: 'Created Date', key: 'createdAt', width: 22 },
      { header: 'Created By', key: 'createdBy', width: 20 },
      { header: 'Checked-in Time', key: 'checkedInTime', width: 22 },
      { header: 'Checked-in By', key: 'checkedInBy', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
    ];

    // Add rows
    this.appointments.forEach((appt, index) => {
      worksheet.addRow({
        no: index + 1,
        patientName: appt.patientName,
        doctorName: appt.doctor?.name || '',
        date: appt.date,
        time: appt.time,
        requestVia: appt.requestVia,
        createdAt: this.formatDateTime(appt.created_at),
        createdBy: this.formatUsername(appt.user?.username),
        checkedInTime: this.formatDateTime(appt.checkedInTime),
        checkedInBy: this.formatUsername(appt.checkedInBy),
        type: appt.type || '',
      });
    });

    // Generate file
    workbook.xlsx.writeBuffer().then((buffer) => {
      const today = new Date();
      const fileDate = this.formatDate(today);
      FileSaver.saveAs(
        new Blob([buffer]),
        `CheckedIn_Report_${fileDate}.xlsx`
      );
    });
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }


  //   getHandledByName(): string {
  //   const storedUsername = localStorage.getItem('username');
  //   const storedRole = localStorage.getItem('role');

  //   if (!storedUsername || !storedRole) return '';

  //   // Step 1: remove domain part
  //   let namePart = storedUsername.split('@')[0];

  //   // Step 2: remove role suffix
  //   const role = storedRole.replace(/_/g, '');
  //   namePart = namePart.replace(`_${role}`, '');

  //   // Step 3: special case for doctor
  //   if (storedRole === 'doctor') {
  //     namePart = `Dr. ${namePart.replace('_doctor', '')}`;
  //   }

  //   // Step 4: replace underscores with space
  //   return namePart.replace(/_/g, ' ').trim();
  // }
  formatUsername(username?: string): string {
    if (!username) return '';

    // Step 1: remove domain part
    let namePart = username.split('@')[0];

    // Step 2: remove role suffix
    const parts = namePart.split('_');
    if (parts.length > 1) {
      parts.pop(); // remove role part
      namePart = parts.join('_');
    }

    // Step 3: replace underscores with spaces
    return namePart.replace(/_/g, ' ').trim();
  }


}
