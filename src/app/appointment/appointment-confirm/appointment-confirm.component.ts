import { Component, Input } from '@angular/core';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
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
  created_at?: string;
  completed?:boolean;
}
@Component({
  selector: 'app-appointment-confirm',
  templateUrl: './appointment-confirm.component.html',
  styleUrl: './appointment-confirm.component.css'
})
export class AppointmentConfirmComponent {
  confirmedAppointments: Appointment[] = [];

  constructor(private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService) { }
  appointments: Appointment[] = [
    // { id: '0001', patientName: 'Anitha Sundar', phoneNumber: '+91 7708590100', doctorName: 'Dr. Nitish', department: 'Psychologist', date: '11/02/24', time: '9.00 to 9.15', status: 'Booked', smsSent: true },
  ];

  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof Appointment | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';  // Default sorting direction
  @Input() selectedDate: Date | null = null;
  @Input() selectedValue: string = '';
  completed: boolean = false;

  searchOptions = [
    { label: 'Patient Name', value: 'patientName' },
    { label: 'Phone Number', value: 'phoneNumber' }
  ];
  // Method to handle sorting by a specific column
  ngOnInit() {
    // this.appointmentService.confirmedAppointments$.subscribe(appointments => {
    //   this.confirmedAppointments = appointments;
    //   this.filteredAppointments = [...this.confirmedAppointments];
    //   console.log('Confirmed appointments from component:', this.confirmedAppointments);
    this.appointmentService.confirmedAppointments$.subscribe(appointments => {
      this.confirmedAppointments = appointments;
      this.confirmedAppointments.sort((a, b) => {
        const dateA = new Date(a.created_at!);
        const dateB = new Date(b.created_at!);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredAppointments = [...this.confirmedAppointments];

    });

    // Fetch appointments from backend to initialize the data
    this.appointmentService.fetchAppointments();
    // });
  }
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
      // If no sorting column is selected, return the appointments as is (unsorted)
      return [...this.filteredAppointments];
    }


    return [...this.filteredAppointments].sort((a, b) => {
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
  filteredAppointments: Appointment[] = [...this.confirmedAppointments];

  ngOnChanges() {
    // Whenever the selected date changes, this will be triggered
    this.filterAppointment();
  }

  // Method to filter appointments by the selected date
  filterAppointment() {
    let filteredList = [...this.confirmedAppointments];

    if (this.selectedDate) {
      const formattedDate = this.formatDate(this.selectedDate);
      filteredList = filteredList.filter(confirmedAppointments => confirmedAppointments.date === formattedDate);
    }
    if (this.selectedValue.trim() !== '') {
      const searchLower = this.selectedValue.toLowerCase();
      filteredList = this.filteredAppointments.filter(confirmedAppointments =>
        confirmedAppointments.patientName.toLowerCase().includes(searchLower) ||
        confirmedAppointments.phoneNumber.toLowerCase().includes(searchLower)
      );

    }
    else {
      // If no date is selected, show all appointments
      this.filteredAppointments = [...this.confirmedAppointments];
    }
    this.filteredAppointments = filteredList;
    this.currentPage = 1;
  }

  // Utility method to format the date in 'dd/mm/yy' format
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear().toString().slice(-4); // Get last two digits of year
    return `${year}-${month}-${day}`;
  }
  completeAppointment(appointment: Appointment) {
    appointment.completed = true;
    // Fetch doctor details to get the slot duration
    this.doctorService.getDoctorDetails(appointment.doctorId).subscribe(
      (doctor) => {

        if (doctor && doctor.slotDuration) {

          const delayTime = (doctor.slotDuration + 5) * 60 * 1000; // Add 5 minutes to the slot duration and convert to milliseconds
          this.appointmentService.scheduleCompletion(appointment.id!, delayTime).subscribe({
            next: () => {
              console.log('Appointment completion scheduled successfully');
            },
            error: (error) => {
              console.error('Error scheduling appointment completion:', error);
            }
          });
          
        } else {
          console.error('Slot duration not found for doctor:', doctor);
        }
      },
      (error) => {
        console.error('Error fetching doctor details:', error);
      }
    );
  }

  // Method to return the filtered appointments for display
  // getFilteredAppointments() {
  //   return this.filteredAppointments;
  // }
  cancelAppointment(appointment: Appointment) {
    const cancelled: Appointment = {
      ...appointment,
      status: 'cancelled',
      smsSent: true,
      emailSent: true,
      requestVia: appointment.requestVia
    };

    this.appointmentService.addCancelledAppointment(cancelled);
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
          },
          error: (error) => {
            console.error('Error sending WhatsApp message:', error);
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
      },
      error: (error) => {
        console.error('Error sending email to patient:', error);
      },
    });
    this.filterAppointment();
  }
}
