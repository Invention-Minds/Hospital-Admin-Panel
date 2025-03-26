import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AppointmentFormComponent } from '../appointment-form/appointment-form.component';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { app } from '../../../../server';
import { ActivatedRoute } from '@angular/router';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';  // Using uuid library for generating unique IDs
import { MessageService } from 'primeng/api';




interface Appointment {
  id?: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  doctorId: number;
  department: string;
  date: string;
  time: string;
  status: string;
  email: string;
  smsSent?: boolean;
  emailSent?: boolean;
  messageSent?: boolean;
  requestVia?: string; // Optional property
  [key: string]: any;  // Add this line to allow indexing by string
  created_at?: string;
  isAccepted?:boolean;
  prnNumber?:any;
  prefix?:string;
}
const lockedAppointments = new Map<number, { userId: string; lockTime: number }>();
@Component({
  selector: 'app-appointment-request',
  templateUrl: './appointment-request.component.html',
  styleUrl: './appointment-request.component.css',
  providers: [MessageService]
})
export class AppointmentRequestComponent implements OnInit {
 selectedDate: Date | null = null;
 selectedValue: string = '';
 selectedSearchOption: string = ''; 
 selectedDateRange: Date[] | null = null;
  pendingAppointments: Appointment[] = [];
  activeAppointmentId: number | null | undefined = null;
  userId: any = 0;
  isLockedDialogVisible: boolean = false; // To control the visibility of the lock dialog
  showDeleteConfirmDialog: boolean = false;
  appointmentToDelete: Appointment | null = null;
  isLoading: boolean = false;
  searchValue: string = '';
  activeComponent: string = 'confirmed';
  lockedUser: string = ''

  filteredServices:any[] = []

  private userSubscription: Subscription | undefined;
  private lockSubscription: Subscription | undefined;

  // showModal: boolean = false;
  // @Input() selectedOption: string = '';
  constructor(public dialog: MatDialog, private appointmentService: AppointmentConfirmService, private route: ActivatedRoute, private doctorService: DoctorServiceService,
    private authService: AuthServiceService, private messageService: MessageService
  ) {
    this.userId = localStorage.getItem('userid')
  }

  ngOnInit(): void {
    this.fetchPendingAppointments();  // Fetch pending appointments on initialization
    
  }


  fetchPendingAppointments(): void {
    this.isLoading = true;
    this.appointmentService.fetchPendingAppointments().subscribe((appointments) => {
      this.isLoading = false;
      this.pendingAppointments = appointments;
      this.pendingAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredAppointments = [...this.pendingAppointments];
      // this.filterAppointmentsByDate(new Date());
    });
  }
  // Dropdown options for filtering
  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];

  // selectedSearchOption: string = this.selectedOption; // Default option to search by ID
  showAppointmentForm = false;  // Controls the visibility of the modal
  selectedAppointment: Appointment | null = null;

  openAppointmentForm(appointment: Appointment): void {

    // this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
    // this.showAppointmentForm = true;
    // console.log('Selected appointment:', this.selectedAppointment);
    this.lockAndAccessAppointment(appointment);
  }
  confirmAppointment(appointment: Appointment) {
    appointment.status = 'confirmed';  // Mark as confirmed
    // this.confirmedAppointments.push(appointment);  // Add to confirmed list
    // this.closeAppointmentForm();  // Close the form
    this.pendingAppointments = this.pendingAppointments.filter(a => a.id !== appointment.id);  // Remove from pending list
    // console.log(appointment, "in req component");
    this.appointmentService.addConfirmedAppointment(appointment);  // Add to the confirmed appointments
    this.closeAppointmentForm();
    this.filterAppointment();  // Refresh the filtered appointments
  }
  closeAppointmentForm() {
    this.showAppointmentForm = false;
    if (this.activeAppointmentId !== null) {
      // Call backend to unlock the appointment
      this.appointmentService.unlockAppointment(this.activeAppointmentId!).subscribe({
        next: () => {

          this.activeAppointmentId = null;
          this.selectedAppointment = null; // Close the form
        },
        error: (error) => {
          console.error('Error unlocking appointment:', error);
        }
      });
    }

  }
  confirmedAppointments: Appointment[] = [];  // To hold confirmed appointments
  canceledAppointments: Appointment[] = [];
  currentPage = 1;
  rowsPerPage = 10;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;  // Default sorting column
  sortDirection: string = 'asc';       // Default sorting direction
  // Method to handle sorting by a specific column
  sortBy(column: keyof Appointment) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; // Toggle direction
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc'; // Default to ascending when a new column is clicked
    }
    if (column === 'date') {
      this.filteredAppointments.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return this.sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
    }
    this.currentPage = 1; // Reset to the first page when sorting changes
  }

  // Method to sort appointments based on the selected column and direction
  sortedAppointments() {
    if (!this.sortColumn) {
      // If no sorting column is selected, return the appointments as is
      return [...this.filteredAppointments];
    }

    return [...this.filteredAppointments].sort((a, b) => {
      const valueA = a[this.sortColumn!];
      const valueB = b[this.sortColumn!];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0; // Default to no sorting if types are not strings
    });
  }

  // Method to handle pagination by returning the sorted and paginated data
  getPaginatedAppointments() {
    const sorted = this.sortedAppointments();  // First, sort the data

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return sorted.slice(startIndex, endIndex); // Return the paginated data
  }

  // Method to handle changing the page
  onPageChange() {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  // Calculate the total number of pages
  get totalPages() {
    return Math.ceil(this.filteredAppointments.length / this.itemsPerPage);
  }

  // Navigate to the previous page
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Navigate to the next page
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  filteredAppointments: Appointment[] = [...this.pendingAppointments];

  ngOnChanges() {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
    // if(this.selectedDateRange && this.selectedDateRange.length === 0){
    //   this.filterAppointmentsByDate(new Date());
    // }
  }
  onClear() {
    this.searchValue = '';
    this.selectedSearchOption = 'firstName';
    this.selectedDateRange = [];
    this.filteredServices = [...this.pendingAppointments];
  }
  onSearch(): void {
    this.filteredAppointments = [...this.pendingAppointments]

    console.log(this.searchValue, this.selectedDateRange)

    this.filteredServices = this.pendingAppointments.filter((service) => {
      let matches = true;

      // Filter by search option
      if (this.selectedSearchOption && this.searchValue && service) {
        switch (this.selectedSearchOption) {
          case 'patientName':
            matches = service.patientName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          case 'doctorName':
            matches = !!service.doctorName
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
          case 'departmentName':
            matches = !!service.department
              ?.toLowerCase()
              .includes(this.searchValue.toLowerCase());
            break;
        case 'prnNumber':
                const prnNumber = Number(service.prnNumber); // Convert to Number
                const searchNumber = Number(this.searchValue); // Convert to Number
                // ✅ Check if searchValue is a valid number and matches the prnNumber
                matches = !isNaN(searchNumber) && prnNumber === searchNumber;
                break;
        }

      }
      if (this.selectedDateRange && this.selectedDateRange.length) {
        // ✅ Convert service date to a Date object and remove time component
        const serviceDate = new Date(service.date);
        // serviceDate.setHours(0, 0, 0, 0); // Normalize time to avoid mismatches
    
        // ✅ Ensure selected start date is a Date object
        let startDate = new Date(this.selectedDateRange[0]);
        startDate.setHours(0, 0, 0, 0); // Normalize time
    
        // ✅ Ensure endDate is assigned correctly
        let endDate = this.selectedDateRange[1] ? new Date(this.selectedDateRange[1]) : startDate;
        endDate.setHours(23, 59, 59, 999); // Ensure full-day range

    
        if (startDate=== endDate) {
            // ✅ Single date selected - Exact match
            matches = serviceDate.toISOString().split('T')[0] === startDate.toISOString().split('T')[0];
            console.log(matches)
        } else {
            // ✅ Date range selected - Match within range
            matches = matches && serviceDate.getTime() >= startDate.getTime() && serviceDate.getTime() <= endDate.getTime();
        }
    }
    
    
    
    
    
    
    
    // ✅ Filter by single specific date
    if (this.selectedDate) {
        const singleDate = new Date(this.selectedDate).toISOString().split('T')[0]; // ✅ Extract YYYY-MM-DD only
        console.log(singleDate, "Selected Date (Date Only)");
    
        matches = matches && new Date(service.date).toDateString() === singleDate;
    }
    

      // console.log(matches);
      return matches;
    });

    this.filteredAppointments = this.filteredServices
    console.log(this.filteredAppointments)


  }


  refresh() {
    this.selectedDateRange = [];
    this.filteredAppointments = this.pendingAppointments
  }


  // Method to filter appointments by the selected date
  filterAppointment() {
    let filteredList = [...this.pendingAppointments];

    // if (this.selectedDate) {
    //   const formattedDate = this.formatDate(this.selectedDate);
    //   // console.log('Formatted date:', formattedDate);
    //   filteredList = filteredList.filter(appointment => appointment.date === formattedDate);
    // }
    if (this.selectedDateRange && this.selectedDateRange.length === 2) {
      const startDate = this.selectedDateRange[0];
      const endDate = this.selectedDateRange[1] ? this.selectedDateRange[1] : startDate; // Use endDate if provided, otherwise use startDate
  
      if (startDate && endDate) {
        if(startDate.getTime() !== endDate.getTime()) {
        // Filtering appointments by the selected date range
        // console.log('Start date:', startDate, 'End date:', endDate);
        const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);  // Set to the last millisecond of the day

        filteredList = filteredList.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.date);  // Assuming 'date' is in string format like 'YYYY-MM-DD'
          return appointmentDate >= startDate && appointmentDate <= normalizedEndDate;
        });
        // console.log('Filtered list:', this.filteredList);
      }
      else if (startDate.getTime() === endDate.getTime()) {
        // console.log('Single date selected:');
        const startDate = this.selectedDateRange[0];
    
        filteredList = filteredList.filter((appointment: Appointment) => {
          const appointmentDate = new Date(appointment.date);
          return appointmentDate.toDateString() === startDate.toDateString();  // Compare the date portion only
        });
        // console.log('Filtered list:', this.filteredList);
      }
    }
    // else{
    //   this.filteredAppointments = []
    // }
    }
     else {
      // If no valid range is selected, show all appointments
      this.filteredAppointments = [...this.pendingAppointments];
    }
    if (this.selectedValue.trim() !== '') {
      // const searchLower = this.selectedValue.toLowerCase();
      // filteredList = this.filteredAppointments.filter(appointment =>
      //   appointment.patientName.toLowerCase().includes(searchLower) ||
      //   appointment.phoneNumber.toLowerCase().includes(searchLower)
      // );
      const searchLower = this.selectedValue.toLowerCase();
      filteredList = this.filteredAppointments.filter((appointment) => {
        // console.log('Selected search option:', this.selectedSearchOption);
        // console.log('Selected value:', this.selectedValue);
       
        // console.log('Search lower:', searchLower);
        // console.log('Appointment:', appointment);
        // console.log('Filtered list:', filteredList);
      
        let match = false;

        switch (this.selectedSearchOption) {
          case 'patientName':
            // console.log('Patient Name:', appointment.patientName.toLowerCase());
            match = appointment.patientName ? appointment.patientName.toLowerCase().includes(searchLower) : false;
            // console.log('Match:', match);
            break;
          case 'phoneNumber':
            match = appointment.phoneNumber ? appointment.phoneNumber.toLowerCase().includes(searchLower) : false;
            break;
          case 'doctorName':
            match = appointment.doctorName ? appointment.doctorName.toLowerCase().includes(searchLower) : false;
            break;
          case 'department':
            match = appointment.department ? appointment.department.toLowerCase().includes(searchLower) : false;
            break;
          default:
            match = true;
        }
  

      return match;
    });

    }
    else {
      // If no date is selected, show all appointments
      this.filteredAppointments = [...this.pendingAppointments];
    }
    this.filteredAppointments = filteredList;
    this.currentPage = 1;
  }
  submitAppointment(appointment: Appointment | null, status: string, requestVia: any) {
    // console.log('Appointment in Request:', appointment);
    if (!appointment) {
      console.error('No appointment selected for submission.');
      return; // Early return if appointment is null or undefined
    }

    if (status === 'Confirm') {
      if (requestVia === 'Online') {
        requestVia = 'Online';
      }
      else {
        requestVia = 'Call';
      }
      const confirmedAppointment: Appointment = {
        ...appointment,  // Copy all properties from the original appointment
        status: 'confirmed', // Update the status
        smsSent: true,
        emailSent: true,
        messageSent: true,
        requestVia: requestVia         // Optionally add or modify properties as needed
      };
      // const confirmed = this.confirmedAppointments;
      // console.log("confirmed in submitted", confirmedAppointment)
      this.appointmentService.addConfirmedAppointment(confirmedAppointment);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment confirmed successfully!' });
    } else if (status === 'Cancel') {
      if (requestVia === 'Online') {
        requestVia = 'Online';
      }
      else {
        requestVia = 'Call';
      }
      // this.canceledAppointments.push({ ...appointment, status: 'Cancelled' });
      const cancelledAppointment: Appointment = {
        ...appointment,  // Copy all properties from the original appointment
        status: 'cancelled', // Update the status
        smsSent: true,
        emailSent: true,
        messageSent: true,
        requestVia: requestVia        // Optionally add or modify properties as needed
      };
      // const confirmed = this.confirmedAppointments;

      this.appointmentService.addCancelledAppointment(cancelledAppointment);
      +
      // this.appointmentService.sendWhatsAppMessage(cancelledAppointment).subscribe({
      //   next: (response) => {
      //     console.log('WhatsApp message sent successfully:', response);
      //   },
      //   error: (error) => {
      //     console.error('Error sending WhatsApp message:', error);
      //   }
      // });
      this.doctorService.getDoctorDetails(appointment.doctorId).subscribe({
        next: (response) =>{
          const doctorPhoneNumber = response?.phone_number;
          const appointmentDetails ={
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
          console.log('Email sent to patient successfully:', response);
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email sent to patient successfully!' });
        },
        error: (error) => {
          console.error('Error sending email to patient:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error sending email to patient!' });
        },
      });
    }

    // Remove the appointment from the request list based on phone number
    this.pendingAppointments = this.pendingAppointments.filter(a => a.id !== appointment.id);

    this.closeAppointmentForm();
    this.filterAppointment(); // Refresh the filtered appointments
  }

  // Utility method to format the date in 'dd/mm/yy' format
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear().toString().slice(-4); // Get last two digits of year
    return `${year}-${month}-${day}`;
  }

  // Method to return the filtered appointments for display
  // getFilteredAppointments() {
  //   return this.filteredAppointments;
  // }
  // convertDateToISO(dateString: string): string {
  //   const [month, day, year] = dateString.split('/');
  //   return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Adjusting for 20XX century dates
  // }
  confirmDeleteAppointment() {
    if(this.appointmentToDelete && this.appointmentToDelete.id) {
    this.appointmentService.deleteAppointment(this.appointmentToDelete!.id).subscribe(
      () => {
        // console.log('Appointment deleted successfully');
        this.pendingAppointments = this.pendingAppointments.filter(a => a.id !== this.appointmentToDelete!.id);
        this.filterAppointment();
        this.showDeleteConfirmDialog= false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment deleted successfully!' });
        // this.fetchAppointments(); // Refresh appointments after deletion
      },
      (error) => {
        console.error('Error deleting appointment:', error);
      }
    );
  }
  }
  showDeleteDialog(appointment: Appointment): void {
    this.appointmentToDelete = appointment;
    this.showDeleteConfirmDialog = true;
  }
  closeDeleteDialog(): void {
    this.showDeleteConfirmDialog = false;
    this.appointmentToDelete = null;
  }

  cancelAppointment(appointment: Appointment) {
    // appointment.date = this.convertDateToISO(appointment.date);
    const cancel: Appointment = {
      ...appointment,
      status: 'cancelled',
      smsSent: true,
      emailSent: true,
      messageSent: true,
      requestVia: 'Online'
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
      next: (response) =>{
        const doctorPhoneNumber = response?.phone_number;
        const appointmentDetails ={
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
    this.pendingAppointments = this.pendingAppointments.filter(a => a.id !== appointment.id);

    this.filterAppointment();
  }


  // Private method to lock an appointment
  private lockAppointment(appointmentId: number, userId: string): boolean {
    if (lockedAppointments.has(appointmentId)) {
      return false; // Already locked by someone else
    }
    lockedAppointments.set(appointmentId, { userId, lockTime: Date.now() });
    return true; // Lock successful
  }

  lockAndAccessAppointment(appointment: Appointment): void {
    const appointmentId = appointment.id!;
    this.appointmentService.lockAppointment(appointmentId, this.userId).subscribe({
      next: (response) => {
        // Successfully locked, proceed to open the form
        this.activeAppointmentId = appointmentId;

        // Proceed to open the appointment form since the lock was successful
        this.selectedAppointment = { ...appointment };  // Create a copy to avoid direct modification
        this.showAppointmentForm = true;

      },
      error: (error) => {
        if (error.status === 409) {
          // Show lock modal if the appointment is locked by another user
          this.isLockedDialogVisible = true;
          this.lockedUser = error.error?.lockedByUsername
          console.warn('The appointment is currently locked by another user.');
        } else if (error.status === 401) {
          // If unauthorized, do NOT redirect automatically, show a custom message instead
          console.error('Unauthorized access - maybe the session expired.');
          alert('You are not authorized to access this resource. Please re-authenticate.');
        } else {
          console.error('Error locking the appointment:', error);
        }
      }

    });
  }



  handleLockedDialogClose(): void {
    // Hide the locked dialog
    this.isLockedDialogVisible = false;
  }

  // Cleanup: unlock appointment if component is destroyed
  ngOnDestroy(): void {
    if (this.activeAppointmentId !== null) {
      this.closeAppointmentForm();
    }
  }
 

}
