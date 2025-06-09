import { Component, ViewChild } from '@angular/core';
import { HealthCheckupConfirmedComponent } from "../../../health-checkup-service/health-checkup-confirmed/health-checkup-confirmed/health-checkup-confirmed.component";
import { EstimationSubmitComponent } from "../../estimation-submit/estimation-submit/estimation-submit.component";
import { EstimationApprovedComponent } from '../../estimation-approved/estimation-approved/estimation-approved.component';
import { MaternityEstimationComponent } from "../../maternity-estimation/maternity-estimation.component";
import { EstimationService } from '../../../services/estimation/estimation.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import { DateTime } from 'luxon';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-estimation-overview',
  templateUrl: './estimation-overview.component.html',
  styleUrl: './estimation-overview.component.css',
  providers: [MessageService],
})
export class EstimationOverviewComponent {
  activeComponent: string = 'form';
  selectedEstimation: any = null; // Store the service data to pass to the form
  service: any;
  role: string = '';
  totalEstimations: number = 0;
  pendingEstimations: number = 0;
  approvedEstimations: number = 0;
  confirmedEstimations: number = 0;
  completedEstimations: number = 0;
  cancelledEstimations: number = 0;
  overDueEstimations: number = 0;
  estimations: any[] = []; // Store all fetched estimations

  doctorSummaryList: any[] = [];
  selectedDept: string = '';
  departmentList: string[] = []; // Populate this from estimations or static list
  consultants: any[] = [];
  showDoctorSummary: boolean = false;
  selectedDoctorName: string = '';
  filteredDoctorNames: string[] = [];
  completedEstimationsList: number = 0;
  nonCompletedEstimationsList: number = 0;
  showDWSummary: boolean = false;
  grandTotalCompleted: number = 0;
  grandTotalMM: number = 0;
  grandTotalSM: number = 0;
  grandTotalMaternity: number = 0;
  grandPACDone: number = 0;
  grandPACNotDone: number = 0;
  grandTotalNonCompleted: number = 0;
  grandTotalNCMM: number = 0;
  grandTotalNCSM: number = 0;
  grandTotalNCMaternity: number = 0;
  doctorWiseSummary: any[] = [];
  selectedDateRange: Date[] = [];
  nonCompletedEstimations: any[] = [];
  showFollowUps: boolean = false;
  followUps: any[] = [];
  selectedStatus: string = ''; // Default (no filter)
  statusOptions: string[] = ['pending', 'overDue', 'approved', 'rejected', 'submitted', 'confirmed', 'cancelled']; // adjust as per your app's actual statuses
  estimationTypeOptions: string[] = ['MM', 'SM', 'Maternity'];
  selectedEstimationType: string = ''; // Default (no filter)
  monthWiseRaisedEST: any[] = [];
  totalMonthWiseRaisedEST: number = 0;
  showMonthWiseDate: boolean = false;
  currentMonth: string = '';
  totalOverallEstimations: number = 0;
  totalEstimationsOverall:any[]= []
  filteredEstimations:any[]=[];
  totalFollowUp:number = 0;
  totalMaternity:number = 0;


  




  @ViewChild('estimationApproved') EstimationApprovedComponent?: EstimationApprovedComponent;
  constructor(private estimationService: EstimationService, private doctorService: DoctorServiceService, private messageService: MessageService) { }

  ngOnInit() {
    const date = new Date();
    this.currentMonth = date.toLocaleString('en-US', { month: 'long' }); // "May"
    this.role = localStorage.getItem('role')!;
    if (this.role === 'sub_admin') {
      this.activeComponent = 'request'
    }
    else {
      this.activeComponent = 'submitted'
    }
    this.estimationService.getAllEstimation().subscribe({
      next: (estimations: any[]) => {
        console.log(estimations);
        this.estimations = estimations;
        this.totalEstimationsOverall = estimations.sort((a, b) => {
          const dateA = new Date(a.submittedDateAndTime).getTime() || 0;
          const dateB = new Date(b.submittedDateAndTime).getTime() || 0;
          return dateB - dateA;
        });
        
        this.totalOverallEstimations = this.totalEstimationsOverall.length;
        this.totalMaternity = this.estimations.filter(e => e.estimationType === 'Maternity').length;
        this.totalFollowUp = this.estimations.filter(e =>
          Array.isArray(e.followUpDates) && e.followUpDates.length > 0
        ).length;        
        this.processTodayEstimations(estimations);
        this.processMonthlyRaised(this.estimations)
        this.doctorService.getDepartments().subscribe((departments: any[]) => {
          this.departmentList = departments.map(d => d.name);
        });
        this.nonCompletedEstimationsList = this.estimations.filter(e => e.statusOfEstimation !== 'completed').length;
        this.doctorService.getDoctorWithDepartment().subscribe((data: any[]) => {
          this.consultants = data;
          this.filteredDoctorNames = [...new Set(data.map(c => c.name).filter(Boolean))]

          // Now that consultants are ready, call the summary function
          this.doctorWiseCompletedSummary(this.estimations, this.selectedDept, this.selectedDoctorName);
          this.doctorWiseNonCompletedSummary(this.estimations, this.selectedDept, this.selectedDoctorName);
        });

        console.log(this.departmentList);
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      },
      complete: () => {
        // Optional: Actions to perform once the API call completes
        console.log('Service fetching process completed.');
      }
    });
  }
  processMonthlyRaised(estimationList: any[]) {
    const currentMonth = new Date().getMonth(); // 0 = Jan, 11 = Dec
    const currentYear = new Date().getFullYear();
  
    this.monthWiseRaisedEST = estimationList.filter(est => {
      const created = est.estimationCreatedTime ? new Date(est.estimationCreatedTime) : null;
      const submitted = est.submittedDateAndTime ? new Date(est.submittedDateAndTime) : null;
  
      const dateToCheck = created || submitted;
  
      return (
        dateToCheck &&
        dateToCheck.getMonth() === currentMonth &&
        dateToCheck.getFullYear() === currentYear
      );
    });
    console.log(this.monthWiseRaisedEST)
    this.totalMonthWiseRaisedEST = this.monthWiseRaisedEST.length
  
    // Optional: total count
    console.log('Total estimations raised this month:', this.monthWiseRaisedEST.length);
  }
  
  applyDeptFilter() {
    if (this.selectedDept) {
      const filtered = this.consultants.filter(c => c.departmentName === this.selectedDept);
      this.filteredDoctorNames = [...new Set(filtered.map(c => c.name))];
    } else {
      // If no department is selected, show all doctor names
      this.filteredDoctorNames = [...new Set(this.consultants.map(c => c.name))];
    }
    // Reset selected doctor if it's no longer valid
    if (!this.filteredDoctorNames.includes(this.selectedDoctorName)) {
      this.selectedDoctorName = '';
    }

    // Refresh summary based on both filters
    this.doctorWiseCompletedSummary(this.estimations, this.selectedDept, this.selectedDoctorName);
    this.doctorWiseNonCompletedSummary(this.estimations, this.selectedDept, this.selectedDoctorName);
    this.overAllESTSummary(this.estimations, this.selectedDoctorName)

  }

  openAppointmentForm(service: any): void {
    this.selectedEstimation = service; // Store the selected service
    console.log(this.selectedEstimation);
    this.service = service
    this.activeComponent = 'form'; // Switch to the form view
  }


  closeForm(): void {
    if (this.role === 'sub_admin') {
      this.showAppointmentRequests()
    } else {
      this.showSubmittedRequest()
    }// Switch back to the confirmed view
    this.selectedEstimation = null; // Clear the selected service
    setTimeout(() => {
      if (this.EstimationApprovedComponent) {
        this.EstimationApprovedComponent.activeServiceId = this.service?.id || null; // Reset activeServiceId
        console.log(this.service.id)
        this.EstimationApprovedComponent.unlockService();
        console.log("Service unlocked");
      } else {
        console.log("issues");
      }
    }, 0); // Delay execution to allow component rendering
    console.log("closing", this.activeComponent)
  }
  // Show the Appointment Request component when the "No. of Req Arrived" card is clicked
  showAppointmentRequests() {
    this.activeComponent = 'request';
  }

  showSubmittedRequest() {
    this.activeComponent = 'submitted'
  }

  // Show the Confirmed Appointments component when the "No. of Confirmed" card is clicked
  showConfirmedAppointments() {
    this.activeComponent = 'confirmed';
  }
  showApprovedAppointments() {
    this.activeComponent = 'approved'
  }

  // Show the Cancelled Appointments component when the "No. of Cancelled" card is clicked
  showCancelledAppointments() {
    this.activeComponent = 'cancelled';
  }
  showNewAppointmentForm() {
    this.activeComponent = 'form';
    // this.router.navigate(['/new-appointment']);


  }
  showCompletedAppointments() {
    this.activeComponent = 'completed';
  }
  showRepeatAppointments() {
    this.activeComponent = 'repeated';
  }
  showOverDueAppointment() {
    this.activeComponent = 'overdue'
  }
  showMaternityEstimation() {
    this.activeComponent = 'maternity'
  }
  showFollowUpEstimation() {
    this.activeComponent = 'follow-up'
  }
  showCancelEstimation() {
    this.activeComponent = 'cancelled'
  }

  processTodayEstimations(estimations: any[]) {
    const today = new Date();

    const isSameDate = (dateStr: string | Date | null | undefined): boolean => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    };
    const getCreationDate = (e: any): Date | null => {
      return e.estimationCreatedTime || e.submittedDateAndTime || null;
    };

    this.totalEstimations = estimations.filter(e =>
      isSameDate(getCreationDate(e))
    ).length;

    this.pendingEstimations = estimations.filter(e =>
      (e.statusOfEstimation === 'pending' || e.statusOfEstimation === 'submitted') && isSameDate(getCreationDate(e))
    ).length;

    this.approvedEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'approved' && isSameDate(e.approvedDateAndTime)
    ).length;

    this.confirmedEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'confirmed' && isSameDate(e.confirmedDateAndTime)
    ).length;

    this.completedEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'completed' && isSameDate(e.completedDateAndTime)
    ).length;

    this.cancelledEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'cancelled' && isSameDate(e.cancellationDateAndTime)
    ).length;

    this.overDueEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'overDue' && isSameDate(e.overDueDateAndTIme)
    ).length;
  }
  doctorWiseCompletedSummary(
    estimations: any[],
    selectedDept?: string,
    selectedDoctorName?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const summary: Record<number, any> = {};

    const completedEstimations = estimations.filter(e => {
      let matches = true;
      if (e.statusOfEstimation !== 'completed') return false;

      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(e.completedDateAndTime); // use completedDateAndTime
        const startDate = new Date(this.selectedDateRange[0]);

        // If end date is missing (i.e., single date selected), treat both as the same
        const endDate = this.selectedDateRange[1]
          ? new Date(this.selectedDateRange[1])
          : new Date(this.selectedDateRange[0]);

        // Normalize start date (remove time)
        startDate.setHours(0, 0, 0, 0);

        // Normalize end date to the end of the day
        endDate.setHours(23, 59, 59, 999);

        // Final comparison (inclusive)
        matches = matches && serviceDate >= startDate && serviceDate <= endDate;

      }
      return matches
    });

    this.completedEstimationsList = completedEstimations.length;
    console.log(completedEstimations);

    // const summary: Record<number, any> = {};

    completedEstimations.forEach(e => {
      const docId = e.consultantId;
      const consultant = this.consultants.find(c => c.id === docId);

      if (!consultant) return; // skip if doctor not found

      // Apply department and doctor name filters
      if (selectedDept && consultant.departmentName !== selectedDept) return;
      if (selectedDoctorName && consultant.name !== selectedDoctorName) return;

      const type = e.estimationType;

      if (!summary[docId]) {
        summary[docId] = {
          consultantName: consultant.name,
          department: consultant.departmentName,
          totalCompleted: 0,
          MM: 0,
          SM: 0,
          Maternity: 0,
          PACDone: 0,
          PACNotDone: 0,
        };
      }

      summary[docId].totalCompleted += 1;

      if (['MM', 'SM', 'Maternity'].includes(type)) {
        summary[docId][type] += 1;
      }
      if (e.pacDone) {
        summary[docId].PACDone += 1;
      } else {
        summary[docId].PACNotDone += 1;
      }
    });

    this.doctorSummaryList = Object.values(summary);
    this.grandTotalCompleted = 0;
    this.grandTotalMM = 0;
    this.grandTotalSM = 0;
    this.grandTotalMaternity = 0;
    this.grandPACDone = 0;
    this.grandPACNotDone = 0;

    // this.doctorSummaryList = Object.values(summary);

    for (const doc of this.doctorSummaryList) {
      this.grandTotalCompleted += doc.totalCompleted || 0;
      this.grandTotalMM += doc.MM || 0;
      this.grandTotalSM += doc.SM || 0;
      this.grandTotalMaternity += doc.Maternity || 0;
      this.grandPACDone += doc.PACDone || 0;
      this.grandPACNotDone += doc.PACNotDone || 0;
    }

    console.log(this.doctorSummaryList, completedEstimations);
  }
  closeDoctorSummary() {
    this.showDoctorSummary = false;
    this.selectedDateRange = [];
    this.selectedDept = '';
    this.selectedDoctorName = '';
    this.selectedStatus = '';
    this.selectedEstimationType = '';
    this.onNonCompleteSearch(); // reloads with no date filter
  }
  closeDWSummary() {
    this.showDWSummary = false;
    this.selectedDept = '';
    this.selectedDoctorName = '';
    this.selectedDateRange = [];
    this.selectedDept = '';
    this.selectedDoctorName = '';
    this.selectedStatus = '';
    this.selectedEstimationType = '';
    this.onSearch(); 
  }
  totalSummaryClose() {
    this.showMonthWiseDate = false;
    this.selectedDept = '';
    this.selectedDoctorName = '';
    this.selectedDateRange = [];
    this.selectedDept = '';
    this.selectedDoctorName = '';
    this.selectedStatus = '';
    this.selectedEstimationType = '';
    this.totalSearch(); 
  }
  // doctorWiseNonCompletedSummary(estimations: any[], selectedDept?: string, selectedDoctorName?: string) {
  //   console.log(estimations, selectedDept);
  //   const completedEstimations = estimations.filter(e => e.statusOfEstimation !== 'completed');
  //   this.nonCompletedEstimationsList = completedEstimations.length;
  //   console.log(completedEstimations);

  //   const summary: Record<number, any> = {};

  //   completedEstimations.forEach(e => {
  //     const docId = e.consultantId;
  //     const consultant = this.consultants.find(c => c.id === docId);

  //     if (!consultant) return; // skip if doctor not found

  //     // Apply department and doctor name filters
  //     if (selectedDept && consultant.departmentName !== selectedDept) return;
  //     if (selectedDoctorName && consultant.name !== selectedDoctorName) return;

  //     const type = e.estimationType;

  //     if (!summary[docId]) {
  //       summary[docId] = {
  //         consultantName: consultant.name,
  //         department: consultant.departmentName,
  //         totalCompleted: 0,
  //         MM: 0,
  //         SM: 0,
  //         Maternity: 0,
  //         statusOfEstimation: e.statusOfEstimation
  //       };
  //     }

  //     summary[docId].totalCompleted += 1;

  //     if (['MM', 'SM', 'Maternity'].includes(type)) {
  //       summary[docId][type] += 1;
  //     }
  //   });

  //   this.doctorWiseSummary = Object.values(summary);
  //   this.grandTotalNonCompleted = 0;
  //   this.grandTotalNCMM = 0;
  //   this.grandTotalNCSM = 0;
  //   this.grandTotalNCMaternity = 0;

  //   // this.doctorSummaryList = Object.values(summary);

  //   for (const doc of this.doctorWiseSummary) {
  //     this.grandTotalNonCompleted += doc.totalCompleted || 0;
  //     this.grandTotalNCMM += doc.MM || 0;
  //     this.grandTotalNCSM += doc.SM || 0;
  //     this.grandTotalNCMaternity += doc.Maternity || 0;
  //   }

  //   console.log(this.doctorWiseSummary, completedEstimations);
  // }
  doctorWiseNonCompletedSummary(estimations: any[], selectedDept?: string, selectedDoctorName?: string) {
    const nonCompletedEstimations = estimations.filter(e => {
      let matches = true;
      if (e.statusOfEstimation === 'completed') return false;

      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(e.estimatedDate); // use completedDateAndTime
        const startDate = new Date(this.selectedDateRange[0]);

        // If end date is missing (i.e., single date selected), treat both as the same
        const endDate = this.selectedDateRange[1]
          ? new Date(this.selectedDateRange[1])
          : new Date(this.selectedDateRange[0]);

        // Normalize start date (remove time)
        startDate.setHours(0, 0, 0, 0);

        // Normalize end date to the end of the day
        endDate.setHours(23, 59, 59, 999);

        // Final comparison (inclusive)
        matches = matches && serviceDate >= startDate && serviceDate <= endDate;
      }
      // Status filter
      if (this.selectedStatus && e.statusOfEstimation !== this.selectedStatus) {
        return false;
      }
      // Estimation type filter
      if (this.selectedEstimationType && e.estimationType !== this.selectedEstimationType) {
        return false;
      }
      return matches
    });

    this.nonCompletedEstimations = nonCompletedEstimations
      .map(e => {
        const consultant = this.consultants.find(c => c.id === e.consultantId);
        if (!consultant) return null;

        if (selectedDept && consultant.departmentName !== selectedDept) return null;
        if (selectedDoctorName && consultant.name !== selectedDoctorName) return null;

        return {
          consultantName: consultant.name,
          department: consultant.departmentName,
          statusOfEstimation: e.statusOfEstimation,
          estimationType: e.estimationType,
          estimatedDate: e.estimatedDate,
          patientName: e.patientName,
          followUps: e.followUpDates,
          estimationId: e.estimationId,
        };
      })
      .filter(item => item !== null);

    console.log(this.nonCompletedEstimations);
  }
  onSearch() {
    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;


    if (this.selectedDateRange instanceof Date) {
      startDate = new Date(this.selectedDateRange);
      endDate = new Date(this.selectedDateRange);
    } else if (Array.isArray(this.selectedDateRange)) {
      if (this.selectedDateRange[0]) {
        startDate = new Date(this.selectedDateRange[0]);
      }
      if (this.selectedDateRange[1]) {
        endDate = new Date(this.selectedDateRange[1]);
      }
    }
    console.log(startDate, endDate);

    this.doctorWiseCompletedSummary(
      this.estimations,
      this.selectedDept,
      this.selectedDoctorName,
      startDate,
      endDate
    );
  }
  refresh() {
    this.selectedDateRange = [];
    this.onSearch(); // reloads with no date filter
    this.selectedDept = '';
    this.selectedDoctorName = '';
  }
  toLocalDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  openFollowUpPopup(estimation: any) {
    this.followUps = estimation.followUpDates || [];
    if (this.followUps.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Follow Up Dates',
        detail: 'No follow-up dates available for this estimation.',
      });
      return;
    }
    this.selectedEstimation = estimation
    this.showFollowUps = true;
    console.log(this.followUps);

  }
  onNonCompleteSearch() {
    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;


    if (this.selectedDateRange instanceof Date) {
      startDate = new Date(this.selectedDateRange);
      endDate = new Date(this.selectedDateRange);
    } else if (Array.isArray(this.selectedDateRange)) {
      if (this.selectedDateRange[0]) {
        startDate = new Date(this.selectedDateRange[0]);
      }
      if (this.selectedDateRange[1]) {
        endDate = new Date(this.selectedDateRange[1]);
      }
    }
    console.log(startDate, endDate);

    this.doctorWiseNonCompletedSummary(
      this.estimations,
      this.selectedDept,
      this.selectedDoctorName,
    );
  }
  refreshNonComplete() {
    this.selectedDateRange = [];
    this.selectedDept = '';
    this.selectedDoctorName = '';
    this.selectedStatus = '';
    this.selectedEstimationType = '';
    this.onNonCompleteSearch(); // reloads with no date filter
  }
  totalSearch() {
    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;


    if (this.selectedDateRange instanceof Date) {
      startDate = new Date(this.selectedDateRange);
      endDate = new Date(this.selectedDateRange);
    } else if (Array.isArray(this.selectedDateRange)) {
      if (this.selectedDateRange[0]) {
        startDate = new Date(this.selectedDateRange[0]);
      }
      if (this.selectedDateRange[1]) {
        endDate = new Date(this.selectedDateRange[1]);
      }
    }
    console.log(startDate, endDate);

    this.overAllESTSummary(
      this.estimations,
      this.selectedDoctorName,
    );
  }
  totalRefresh() {
    this.selectedDateRange = [];
    this.selectedDept = '';
    this.selectedDoctorName = '';
    this.selectedStatus = '';
    this.selectedEstimationType = '';
    this.totalSearch(); // reloads with no date filter
  }
  showOverall(){
    this.showMonthWiseDate = true
    this.activeComponent = 'overAll'
    console.log('open')
  }
  overAllESTSummary(estimations: any[],selectedDoctorName?: string) {
    console.log('filtering')
    const overAllSummary = estimations.filter(e => {
      let matches = true;

      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(e.estimatedDate); // use completedDateAndTime
        const startDate = new Date(this.selectedDateRange[0]);

        // If end date is missing (i.e., single date selected), treat both as the same
        const endDate = this.selectedDateRange[1]
          ? new Date(this.selectedDateRange[1])
          : new Date(this.selectedDateRange[0]);

        // Normalize start date (remove time)
        startDate.setHours(0, 0, 0, 0);

        // Normalize end date to the end of the day
        endDate.setHours(23, 59, 59, 999);

        // Final comparison (inclusive)
        matches = matches && serviceDate >= startDate && serviceDate <= endDate;
      }
      // Status filter
      if (this.selectedStatus && e.statusOfEstimation !== this.selectedStatus) {
        return false;
      }
      if( selectedDoctorName && e.consultantName !== selectedDoctorName){
        return false;
      }
      // Estimation type filter
      if (this.selectedEstimationType && e.estimationType !== this.selectedEstimationType) {
        return false;
      }
      return matches
    });
    this.totalEstimationsOverall = overAllSummary

}
downloadEstimationSummary() {
  if (this.selectedDateRange && this.selectedDateRange.length) {
    const startDate = new Date(this.selectedDateRange[0]);
    const endDate = new Date(
      this.selectedDateRange[1] || this.selectedDateRange[0]
    );

    const diffInMs = endDate.getTime() - startDate.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInDays > 62) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a date range of 62 days or less for download.',
        life: 5000,
      });
      // alert('You can only download estimation summary for up to 62 days. Please reduce the date range.');
      return; // Stop export
    }
  }

  // Proceed to export
  this.exportToExcel(this.totalEstimationsOverall, 'Estimation-Summary');
}

exportToExcel(data: any[], fileName: string = 'Estimation-Summary') {
  const dateFieldsToConvert = [
    'estimationCreatedTime',
    'approvedDateAndTime',
    'confirmedDateAndTime',
    'cancellationDateAndTime',
    'completedDateAndTime',
    'overDueDateAndTIme',
    'submittedDateAndTime'
  ];

  const filteredData = data.map(item => {
    const {
      patientSign,
      employeeSign,
      approverSign,
      pdfLink,
      ...rest
    } = item;

    // Convert date fields from UTC to IST
    for (const field of dateFieldsToConvert) {
      if (rest[field]) {
        rest[field] = new Date(rest[field]).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      }
    }

    return rest;
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filteredData);
  const workbook: XLSX.WorkBook = {
    Sheets: { 'data': worksheet },
    SheetNames: ['data']
  };
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  const blob: Blob = new Blob([excelBuffer], {
    type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  });

  FileSaver.saveAs(blob, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
globalSearchText: string = '';
filteredEstimationsOverall: any[] = [];

applyGlobalSearch() {
  const searchText = this.globalSearchText.toLowerCase();
  this.totalEstimationsOverall = this.estimations.filter((estimation) =>
    estimation.patientUHID?.toLowerCase().includes(searchText) ||
    estimation.patientName?.toLowerCase().includes(searchText) ||
    estimation.consultantName?.toLowerCase().includes(searchText)
  );
}




}

