import { Component, Output, EventEmitter } from '@angular/core';
import { EstimationService } from '../../../services/estimation/estimation.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';


@Component({
  selector: 'app-estimation-approved',
  templateUrl: './estimation-approved.component.html',
  styleUrl: './estimation-approved.component.css'
})

  export class EstimationApprovedComponent {


    constructor(private estimationService: EstimationService, private messageService: MessageService,private router: Router) { }
    pendingEstimations: any[] = [];
    filteredEstimations: any[] = [];
    currentPage = 1;
    itemsPerPage = 10;
    sortColumn: keyof any | undefined = undefined;  // No sorting initially
    sortDirection: string = 'asc';  // Default sorting direction
    searchOptions = [
      { label: 'Patient Name', value: 'patientName' },
      { label: 'Estimation ID', value: 'estimationId' },
      { label: 'Doctor Name', value: 'consultantName' },
    ];
    isLoading = false;
    selectedSearchOption: any = this.searchOptions[0];
    selectedDateRange: Date[] = [];
    activeServiceId: number | null = null;
    isLockedDialogVisible: boolean = false;
    userId: any = 0;
    activeComponent: string = 'cancelled'; // Default to the cancelled appointments view
    messageSent: boolean = false;
  
    @Output() reschedule = new EventEmitter<any>();
    // Value entered by the user (could be Patient ID or Phone Number based on selection)
    searchValue: string = '';
    showAdvancePopup = false;
    selectedEstimation: any= {};
    showFollowUps: boolean = false;
    followUpDate: string = ''
    feedback: string = ''
    followUps: any[] =[];
    followUpDateArray: any[]= [];

    advanceAmount: any = '';
    receiptNumber: any = '';
  
    // Selected date from calendar
    selectedDate: Date | null = null;
    ngOnInit(): void {
      this.userId = localStorage.getItem('userid')
    this.activeComponent = 'request';
  
  this.fetchPendingEstimations();
    }
    fetchPendingEstimations(): void {
      this.isLoading = true
      this.estimationService.getAllEstimation().subscribe({
        next: (estimation: any[]) => {
          // console.log(estimation)
          
          // Process the services when the API call is successful
          this.pendingEstimations = estimation.filter(
            (estimation) => estimation.statusOfEstimation === 'approved' || estimation.statusOfEstimation === 'accepted'
          );
          // this.followUpDateArray = this.pendingEstimations.map((estimation) =>
          //   estimation.followUpDates.map((followUp: any) => followUp.date)
          // );
          // console.log(this.followUpDateArray)
          // console.log(this.pendingEstimations)
          this.pendingEstimations.sort((a, b) => {
            const dateA = new Date(a.submittedDateAndTime!);
            const dateB = new Date(b.submittedDateAndTime!);
            return dateB.getTime() - dateA.getTime();
          });
          this.filteredEstimations = [...this.pendingEstimations];
          // console.log('Services processed successfully.');
        },
        error: (err) => {
          // Handle the error if the API call fails
          console.error('Error fetching services:', err);
        },
        complete: () => {
          this.isLoading=false
          // Optional: Actions to perform once the API call completes
          // console.log('Service fetching process completed.');
        }
      });
      
    }
    getFollowUpDates(estimation: any): string[] {
      return estimation.followUpDates ? estimation.followUpDates.map((followUp: any) => followUp.date) : [];
    }
    
    openAdvancePopup(estimation: any): void {
      this.selectedEstimation = estimation
      this.showAdvancePopup = true;
    }
  
    closeAdvancePopup(): void {
      this.showAdvancePopup = false;
      this.advanceAmount = '',
      this.receiptNumber = ''

    }
    saveEstimation(): void {
     const estimationData ={
      estimationId: this.selectedEstimation.estimationId,
        advanceAmountPaid: Number(this.advanceAmount),
        receiptNumber: this.receiptNumber,

      
      
     }
     this.estimationService.updateAdvanceDetails(estimationData.estimationId, estimationData).subscribe(
      (response) => {
        // console.log('Estimation updated successfully:', response);
        this.closeAdvancePopup();
        this.fetchPendingEstimations()
      },
      (error) => {
        console.error('Error updating estimation:', error);
      }
    );
  
    }
    openFollowUpPopup(estimation: any){
      this.selectedEstimation = estimation
      this.showFollowUps = true;
      this.followUps = estimation.followUpDates || [];
    }
    closeFollowUpPopup(){
      this.showFollowUps = false;
      this.feedback = ''
      this.followUpDate = ''
    }
    saveFollowUp(): void {
      if (!this.followUpDate || !this.feedback) {
          alert('Please fill in all fields!');
          return;
      }
  
      if (this.followUps.length >= 5) {
          alert('You can only add up to 5 follow-ups.');
          return;
      }
  
      const newFollowUp = { date: this.followUpDate, remarks: this.feedback };
      // console.log(newFollowUp)
      this.estimationService.updateFollowUps(this.selectedEstimation.estimationId, newFollowUp)
        .subscribe(
            (response: any) => {
                this.followUps.push(response.followUp); // Update the UI with the new follow-up
                this.followUpDate = '';
                this.feedback = '';
                alert('Follow-up saved successfully!');
            },
            (error) => {
                console.error('Error saving follow-up:', error);
                alert('Error saving follow-up. Please try again.');
            }
        );
    }
    resend(estimation: any){
      this.selectedEstimation = estimation;
      const estimationData = {
        estimationId: this.selectedEstimation.estimationId, // Use selectedEstimation
        updateFields: {
          patientUHID: this.selectedEstimation.patientUHID,
          patientName: this.selectedEstimation.patientName,
          ageOfPatient: this.selectedEstimation.ageOfPatient,
          genderOfPatient: this.selectedEstimation.genderOfPatient,
          consultantName: this.selectedEstimation.consultantName,
          estimationPreferredDate: this.selectedEstimation.estimationPreferredDate,
          icuStay: this.selectedEstimation.icuStay,
          wardStay: this.selectedEstimation.wardStay,
          estimationCost: this.selectedEstimation.estimationCost,
          estimationName: this.selectedEstimation.estimationName,
          remarks: this.selectedEstimation.remarks,
          roomType: this.selectedEstimation.roomType,
          estimatedDate: this.selectedEstimation.estimatedDate,
          discountPercentage: this.selectedEstimation.discountPercentage,
          totalEstimationAmount: this.selectedEstimation.totalEstimationAmount,
          signatureOf: this.selectedEstimation.signatureOf,
          employeeName: this.selectedEstimation.employeeName,
          approverName: this.selectedEstimation.approverName,
          patientSign: this.selectedEstimation.patientSign,
          employeeSign: this.selectedEstimation.employeeSign,
          approverSign: this.selectedEstimation.approverSign,
          statusOfEstimation: this.selectedEstimation.statusOfEstimation,
          employeeId: this.selectedEstimation.employeeId,
          approverId: this.selectedEstimation.approverId,
          totalDaysStay: this.selectedEstimation.totalDaysStay,
          attenderName: this.selectedEstimation.attenderName,
          approvedDateAndTime: new Date(),
          pdfLink: this.selectedEstimation.pdfLink,  // Including PDF link
          estimationType: this.selectedEstimation.estimationType,
          advanceAmountPaid: this.selectedEstimation.advanceAmountPaid,
          ageBucketOfSurgery: this.selectedEstimation.ageBucketOfSurgery,
          messageSent: this.selectedEstimation.messageSent,
          messageSentDateAndTime: this.selectedEstimation.messageSentDateAndTime,
          pacDone: this.selectedEstimation.pacDone,
          receiptNumber: this.selectedEstimation.receiptNumber,
          userId: this.selectedEstimation.userId,
          cancellerId: this.selectedEstimation.cancellerId,
          cancellerName: this.selectedEstimation.cancellerName,
          lockedBy: this.selectedEstimation.lockedBy,
          patientPhoneNumber:this.selectedEstimation.patientPhoneNumber
        },
        // Extract only the description values
        inclusions: this.selectedEstimation.inclusions.map((item:any) => item.description),
        exclusions: this.selectedEstimation.exclusions.map((item:any) => item.description),
      };
      // console.log(estimationData)
      this.estimationService.generateAndSendPdf(estimationData.estimationId, estimationData).subscribe(
        (pdfResponse) => {
          // console.log("✅ PDF Generated & Sent via WhatsApp:", pdfResponse);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'PDF Generated & Sent PDF via WhatsApp:!' });
        },
        (pdfError) => {
          console.error("❌ Error generating PDF:", pdfError);
        }
      );
      
    }
    print(estimation: any): void {
      if (estimation.pdfLink) {
        const pdfWindow = window.open(estimation.pdfLink, '_blank'); // Open the PDF in a new tab
        if (pdfWindow) {
          pdfWindow.onload = () => {
            pdfWindow.print(); // Automatically triggers the print dialog
          };
        }
      } else {
        console.error("No PDF link available for this estimation.");
      }
    }
    
    onSearch(): void {

      this.filteredEstimations = this.pendingEstimations.filter((service) => {
        // console.log(service)
        let matches = true;
        // console.log(this.searchValue, this.selectedSearchOption)
  
        // Filter by search option
        if (this.selectedSearchOption && this.searchValue && service) {
          switch (this.selectedSearchOption) {
            case 'patientName':
              matches = service.patientName
                ?.toLowerCase()
                .includes(this.searchValue.toLowerCase());
              break;
            case 'estimationId':
              matches = service.estimationId?.toLowerCase().includes(this.searchValue.toLowerCase());
              break;
            case 'consultantName':
              matches = !!service.consultantName
                ?.toLowerCase()
                .includes(this.searchValue.toLowerCase());
              break;
          }
          
        }
  
        // Filter by date range
        if (this.selectedDateRange && this.selectedDateRange.length) {
          const serviceDate = new Date(service.estimatedDate);
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
            new Date(service.estimationDate).toDateString() === singleDate.toDateString();
        }
        
        // console.log(matches);
        return matches;
        
      });
    }
    refresh() {
      this.selectedDateRange = []
      this.filteredEstimations = [...this.pendingEstimations]
    }
    downloadData(): void {
      // if (this.selectedDateRange && this.selectedDateRange.length > 0 && this.activeComponent === 'confirmed') {
      //   // Call the download method in the appointment confirm component
      //   this.appointmentConfirmComponent?.downloadFilteredData();
      // } 
      // else if(this.selectedDateRange && this.selectedDateRange.length > 0) {
      //   // console.log('Downloading completed appointments data...');
      //   // console.log(this.appointmentCompleteComponent)
      //   this.appointmentCompleteComponent?.downloadFilteredData();
      // }
      // else if(this.activeComponent === 'cancelled' && this.selectedDateRange && this.selectedDateRange.length > 0) {
      //   // console.log('Downloading cancelled appointments data...');
      //   this.appointmentCancelComponent?.downloadFilteredData();
      // }
      // else if(this.selectedDateRange && this.selectedDateRange.length === 0) {
      //   // Download last week's data if no component is active
      //   this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Select a date to download the report' });
      // }
  
    }
    // downloadLastWeekData(): void {
    //   // Implement logic to download last week's data
    //   console.log('Downloading last week\'s data...');
    // }
  
    // Method to clear input fields
    onClear() {
      this.searchValue = '';
      this.selectedSearchOption = this.searchOptions[0];
      // this.selectedDateRange = [];
    }
  
    sortedAppointments() {
  
      if (!this.sortColumn) {
        // If no sorting column is selected, return the appointments as is (unsorted)
        return [...this.filteredEstimations];
      }
  
  
      return [...this.filteredEstimations].sort((a, b) => {
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
      return Math.ceil(this.pendingEstimations.length / this.itemsPerPage);
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
  
      this.filteredEstimations.sort((a, b) => {
        const valueA = a[column];
        const valueB = b[column];
  
        // Handle appointmentDate separately
        if (column === 'estimationName') {
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
    completeAppointment(appointment: any): void { }
    openAppointmentForm(service: any): void {
      // this.router.navigate(['/reschedule', service.id], {
      //   state: { data: service }, // Passing full service object using state
      // });
      // this.lockService(service);
      this.openAppointmentFormAfterLocked(service)
    }
    openAppointmentFormAfterLocked(service: any): void {
      this.reschedule.emit(service);
      // console.log('Opening appointment form:', service);
    }
  
    lockService(service: any): void {
      if (!service.id) return;
  
      // this.healthCheckupService.lockService(service.id, this.userId).subscribe({
      //   next: (response) => {
      //     console.log('Service locked:', response);
      //     this.activeServiceId = service.id!;
      //     this.messageService.add({
      //       severity: 'success',
      //       summary: 'Locked',
      //       detail: `Service ID ${service.id} has been locked successfully.`,
      //     });
      //     this.openAppointmentFormAfterLocked(service);
      //     this.activeComponent = 'form';
      //   },
      //   error: (error) => {
      //     if (error.status === 409) {
      //       this.isLockedDialogVisible = true; // Show dialog if locked by another user
      //       console.warn('Service is already locked by another user.');
      //     } else {
      //       console.error('Error locking service:', error);
      //       this.messageService.add({
      //         severity: 'error',
      //         summary: 'Error',
      //         detail: 'Failed to lock the service.',
      //       });
      //     }
      //   },
      // });
    }
    handleLockedDialogClose(){
      this.isLockedDialogVisible = false;
    }
    // Unlock a service
    unlockService(): void {
      // console.log('Estimation service:', this.activeServiceId);
      if (!this.activeServiceId) return;
  
      this.estimationService.unlockService(this.activeServiceId).subscribe({
        next: (response) => {
          // console.log('Estimation unlocked:', response);
          this.activeServiceId = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Unlocked',
            detail: 'Estimation has been unlocked successfully.',
          });
          this.activeComponent = 'confirmed'; // Navigate back to the confirmed appointments
        },
        error: (error) => {
          console.error('Error unlocking Estimation:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to unlock the Estimation.',
          });
        },
      });
    }
    ngOnDestroy(): void {
      // Unlock the service on component destroy if locked
      // console.log('Destroying confirmed component...', this.activeComponent);
      if(this.activeServiceId && this.activeComponent !== 'form'){ 
        this.unlockService();
      }
    }
  
  
  }
