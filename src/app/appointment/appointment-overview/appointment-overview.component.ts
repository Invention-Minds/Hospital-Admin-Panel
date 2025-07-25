import { Component, ViewChild, AfterViewInit, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MessageService } from 'primeng/api';
import { AppointmentConfirmComponent } from '../appointment-confirm/appointment-confirm.component';
import { AppointmentCompleteComponent } from '../appointment-complete/appointment-complete.component';
import { AppointmentCancelComponent } from '../appointment-cancel/appointment-cancel.component';

@Component({
  selector: 'app-appointment-overview',
  templateUrl: './appointment-overview.component.html',
  styleUrl: './appointment-overview.component.css',
  providers: [provideNativeDateAdapter(), MessageService],
})
export class AppointmentOverviewComponent implements AfterViewInit {
  constructor(private router: Router, private messageService: MessageService, private elementRef: ElementRef) { }
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' },
    { label: 'Doctor Name', value: 'doctorName' },
    { label: 'Department', value: 'department' },
  ];
  @ViewChild('appointmentConfirmComponent') appointmentConfirmComponent?: AppointmentConfirmComponent;
  @ViewChild('appointmentCompleteComponent') appointmentCompleteComponent?: AppointmentCompleteComponent;
  @ViewChild('appointmentCancelComponent') appointmentCancelComponent?: AppointmentCancelComponent;

  selectedSearchOption: any = this.searchOptions[0];
  selectedDateRange: Date[] = [];

  searchValue: string = '';

  selectedDate: Date | null = null;

  showForm: boolean = false;

  ngAfterViewInit() {
  }

  onSearch() {
    if (this.selectedSearchOption && this.searchValue) {
    } else {
      console.error('Please select a search option and enter a value');
    }
  }
  downloadData(): void {
    if (this.selectedDateRange && this.selectedDateRange.length > 0 && this.activeComponent === 'confirmed') {
      this.appointmentConfirmComponent?.downloadFilteredData();
    }
    else if (this.activeComponent === 'completed' && this.selectedDateRange && this.selectedDateRange.length > 0) {
      this.appointmentCompleteComponent?.downloadFilteredData();
    }
    else if (this.activeComponent === 'cancelled' && this.selectedDateRange && this.selectedDateRange.length > 0) {
      this.appointmentCancelComponent?.downloadFilteredData();
    }
    else if (this.selectedDateRange && this.selectedDateRange.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Select a date to download the report' });
    }

  }
  printData(): void {
    if (this.selectedDateRange && this.selectedDateRange.length > 0 && this.activeComponent === 'confirmed') {
      this.appointmentConfirmComponent?.printAppointmentDetails();
    }
    else if (this.activeComponent === 'completed' && this.selectedDateRange && this.selectedDateRange.length > 0) {

      this.appointmentCompleteComponent?.printAppointmentDetails();
    }
    else if (this.activeComponent === 'cancelled' && this.selectedDateRange && this.selectedDateRange.length > 0) {
      this.appointmentCancelComponent?.printAppointmentDetails();
    }
    else if (this.selectedDateRange && this.selectedDateRange.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Select a date to download the report' });
    }

  }

  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = this.searchOptions[0];
  }
  setActiveComponent(componentName: string): void {
    this.activeComponent = componentName;
  }
  activeComponent: string = 'request';

  showAppointmentRequests() {
    this.activeComponent = 'request';
  }

  showConfirmedAppointments() {
    this.activeComponent = 'confirmed';
  }

  showCancelledAppointments() {
    this.activeComponent = 'cancelled';
  }
  showNewAppointmentForm() {
    this.activeComponent = 'appointment';
    this.showForm = true;
  }
  showCompletedAppointments() {
    this.activeComponent = 'completed';
  }
  showTransferAppointments() {
    this.activeComponent = 'transfer'
  }
  showCCAppointments() {
    this.activeComponent = 'cc'
  }
  showFollowupAppointments() {
    this.activeComponent = 'followup'
  }
  closeForm() {
    this.showForm = false;
    this.activeComponent = 'request'; 
  }
  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: Event): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.closeForm()
    }
  }


  getDynamicPlaceholder(searchValue: any): string {
    return searchValue ? `Enter the ${searchValue}...` : 'Enter your search query';
  }



  refresh() {
    this.selectedDateRange = [];

  }

  convertDateToISO(dateString: string): string {
    const [month, day, year] = dateString.split('/');
    return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

}
