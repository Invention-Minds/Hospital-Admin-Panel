import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CallbackServiceService } from '../../services/callback/callback-service.service';
import { Output, EventEmitter } from '@angular/core';


@Component({
  selector: 'app-call-back',
  templateUrl: './call-back.component.html',
  styleUrl: './call-back.component.css'
})
export class CallBackComponent {
  callbacks: any[] = [];
  filteredCallbacks: any[] = [];

  currentPage = 1;
  itemsPerPage = 10;

  searchOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Phone', value: 'mobile' },
    { label: 'SUrgery', value: 'pageName' }
  ];
  selectedDate: string = '';
  selectedDateRange: any


  searchValue = '';

  isLoading = false;

  // Popups
  showNotesPopup = false;
  showCancelPopup = false;

  selectedCallback: any;
  noteText = '';
  cancelReason = '';

  selectedEstimation: any;
  prefillEstimationData: any;

  selectedSearchOption = this.searchOptions[0].value;



  userName = localStorage.getItem('username') || 'Admin';


  @Output() openEstimationForm = new EventEmitter<any>();

  constructor(
    private callbackService: CallbackServiceService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.fetchCallbacks();
  }

  fetchCallbacks() {
    this.isLoading = true;
    this.callbackService.getAllCallbacks().subscribe({
      next: (res) => {
        this.callbacks = res;
        this.filteredCallbacks = [...res];
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  onSearch(): void {

    this.filteredCallbacks = this.callbacks.filter((service) => {
      console.log(service)
      let matches = true;
      console.log(this.searchValue, this.selectedSearchOption)

      // Filter by search option
      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'name':
            matches = service.name
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          case 'mobile':
            matches = service.mobile.includes(this.searchValue);
            break;
          case 'pageName':
            matches = !!service.pageName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
        }

      }

      // Filter by date range
      if (this.selectedDateRange && this.selectedDateRange.length) {
        const serviceDate = new Date(service.createdAt);
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
          new Date(service.createdAt).toDateString() === singleDate.toDateString();
      }

      console.log(matches);
      return matches;

    });
  }
  refresh() {
    this.selectedDateRange = []
    this.filteredCallbacks = [...this.callbacks]
  }

  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = this.searchOptions[0].value;
    this.filteredCallbacks = this.callbacks
    // this.selectedDateRange = [];
  }

  getPaginatedData() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredCallbacks.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredCallbacks.length / this.itemsPerPage);
  }

  // ----- ACTIONS -----

  markHandled(callback: any) {
    this.userName = this.getHandledByName()
    this.callbackService.markHandled(callback.id, this.userName).subscribe(() => {
      callback.status = 'contacted';
      callback.handledBy = this.userName;
      callback.handledAt = new Date();
      this.messageService.add({ severity: 'success', summary: 'Handled' });
    });
  }

  fillForm(cb: any) {
    const prefillData = {
      name: cb.name,
      phone: cb.mobile,
      surgeryName: cb.pageName
    };

    // ✅ Emit to parent
    this.openEstimationForm.emit(prefillData);
  }

  openNotesPopup(callback: any) {
    this.selectedCallback = callback;
    this.noteText = '';
    this.showNotesPopup = true;
  }
  get callbackNotes(): any[] {
    return Array.isArray(this.selectedCallback?.notes)
      ? [...this.selectedCallback.notes].reverse() // latest first
      : [];
  }


  saveNote() {
    this.callbackService.addNote(
      this.selectedCallback.id,
      this.noteText,
      this.userName = this.getHandledByName()
    ).subscribe(() => {
      this.messageService.add({ severity: 'success', summary: 'Note added' });
      this.showNotesPopup = false;
      this.fetchCallbacks();
    });
  }

  openCancelPopup(callback: any) {
    this.selectedCallback = callback;
    this.cancelReason = '';
    this.showCancelPopup = true;
  }

  cancelCallback() {
    this.callbackService.cancelCallback(
      this.selectedCallback.id,
      this.userName = this.getHandledByName(),
      this.cancelReason
    ).subscribe(() => {
      this.messageService.add({ severity: 'success', summary: 'Cancelled' });
      this.showCancelPopup = false;
      this.fetchCallbacks();
    });
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

  getHandledByName(): string {
    const storedUsername = localStorage.getItem('username');
    const storedRole = localStorage.getItem('role');

    if (!storedUsername || !storedRole) return '';

    const role = storedRole.replace(/_/g, '');
    let displayName = storedUsername;

    if (role !== 'doctor') {
      displayName = storedUsername.split(`_${role}`)[0];
    } else {
      displayName = `Dr. ${storedUsername.split('_doctor')[0]}`;
    }

    return displayName.replace(/_/g, ' ').trim();
  }

}
