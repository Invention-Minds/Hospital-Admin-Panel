import { Component, OnDestroy,OnInit,ChangeDetectorRef } from '@angular/core';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { Router } from '@angular/router';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { Observable, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';


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
@Component({
  selector: 'app-dashboard-module',
  templateUrl: './dashboard-module.component.html',
  styleUrl: './dashboard-module.component.css'
})
export class DashboardModuleComponent implements OnInit, OnDestroy {
  username: string = '';
  role: string = '';
  dropdownOpen: boolean = false;
  pendingAppointmentsCount: number = 0;
  newNotification: boolean = false; // Flag to show if new appointments came
  hasNewNotification: boolean = false;
  private audio = new Audio('/notification.mp3'); // Add a notification sound
  private eventSource: EventSource | null = null;
  public hasNewAppointment: boolean = true;
  constructor(private authService: AuthServiceService, private router: Router,private appointmentService: AppointmentConfirmService,private changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      const storedUsername = localStorage.getItem('username');
      const storedRole = localStorage.getItem('role');
      const user = this.authService.getUser();
      if (storedUsername && storedRole) {
        this.username = storedUsername;
        this.role = storedRole;
      }
      console.log(this.username, this.role);
    } else {
      console.log('localStorage is not available');
    }
    this.eventSource = new EventSource('http://localhost:3000/api/appointments/updates');

    this.eventSource.onmessage = (event) => {
      const newAppointment = JSON.parse(event.data);
      console.log('New pending appointment received:', newAppointment);
      this.hasNewAppointment = true;
      this.changeDetector.detectChanges()

this.audio.load()
      this.audio.play();
    };


  }
  ngOnDestroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
  handleNotificationClick(): void {
    if (this.hasNewAppointment) {
      this.hasNewAppointment = false; // Reset the notification state
      // Redirect to the appointments page when the notification icon is clicked
      this.router.navigate(['/appointments']);
    }
  }

  playNotificationSound(): void {
    this.audio.load();
    this.audio.play();
  }
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }
  // Logout function
  logout() {
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('token');  // Assuming the token is also stored in localStorage
    this.router.navigate(['/login']);
  }

}
