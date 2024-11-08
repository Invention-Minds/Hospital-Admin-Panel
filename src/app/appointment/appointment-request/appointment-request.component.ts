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
  requestVia?: string; // Optional property
  [key: string]: any;  // Add this line to allow indexing by string
  created_at?: string;
}
const lockedAppointments = new Map<number, { userId: string; lockTime: number }>();
@Component({
  selector: 'app-appointment-request',
  templateUrl: './appointment-request.component.html',
  styleUrl: './appointment-request.component.css',
  providers: [MessageService]
})
export class AppointmentRequestComponent implements OnInit {
  @Input() selectedDate: Date | null = null;
  @Input() selectedValue: string = '';
  pendingAppointments: Appointment[] = [];
  activeAppointmentId: number | null | undefined = null;
  userId: any = 0;
  isLockedDialogVisible: boolean = false; // To control the visibility of the lock dialog

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
    this.appointmentService.fetchPendingAppointments().subscribe((appointments) => {
      this.pendingAppointments = appointments;
      this.pendingAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredAppointments = [...this.pendingAppointments];
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
    console.log(appointment, "in req component");
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
    return Math.ceil(this.pendingAppointments.length / this.itemsPerPage);
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
  }

  // Method to filter appointments by the selected date
  filterAppointment() {
    let filteredList = [...this.pendingAppointments];

    if (this.selectedDate) {
      const formattedDate = this.formatDate(this.selectedDate);
      console.log('Formatted date:', formattedDate);
      filteredList = filteredList.filter(appointment => appointment.date === formattedDate);
    }
    if (this.selectedValue.trim() !== '') {
      const searchLower = this.selectedValue.toLowerCase();
      filteredList = this.filteredAppointments.filter(appointment =>
        appointment.patientName.toLowerCase().includes(searchLower) ||
        appointment.phoneNumber.toLowerCase().includes(searchLower)
      );

    }
    else {
      // If no date is selected, show all appointments
      this.filteredAppointments = [...this.pendingAppointments];
    }
    this.filteredAppointments = filteredList;
    this.currentPage = 1;
  }
  submitAppointment(appointment: Appointment | null, status: string, requestVia: any) {
    console.log('Appointment in Request:', appointment);
    if (!appointment) {
      console.error('No appointment selected for submission.');
      return; // Early return if appointment is null or undefined
    }

    if (status === 'Confirm') {
      if (requestVia === 'Website') {
        requestVia = 'Website';
      }
      else {
        requestVia = 'Call';
      }
      const confirmedAppointment: Appointment = {
        ...appointment,  // Copy all properties from the original appointment
        status: 'confirmed', // Update the status
        smsSent: true,
        emailSent: true,
        requestVia: requestVia         // Optionally add or modify properties as needed
      };
      // const confirmed = this.confirmedAppointments;
      console.log("confirmed in submitted", confirmedAppointment)
      this.appointmentService.addConfirmedAppointment(confirmedAppointment);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment confirmed successfully!' });
    } else if (status === 'Cancel') {
      if (requestVia === 'Website') {
        requestVia = 'Website';
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
            status: 'cancelled'
          }
          this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
            next: (response) => {
              console.log('WhatsApp message sent successfully:', response);
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
  cancelAppointment(appointment: Appointment) {
    // appointment.date = this.convertDateToISO(appointment.date);
    const cancel: Appointment = {
      ...appointment,
      status: 'cancelled',
      smsSent: true,
      emailSent: true,
      requestVia: 'Website'
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
          status: 'cancelled'
        }
        this.appointmentService.sendWhatsAppMessage(appointmentDetails).subscribe({
          next: (response) => {
            console.log('WhatsApp message sent successfully:', response);
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
