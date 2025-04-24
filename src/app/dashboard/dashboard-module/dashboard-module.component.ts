import { Component, OnDestroy, OnInit, ChangeDetectorRef, HostListener, ElementRef, Output, EventEmitter } from '@angular/core';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { Router } from '@angular/router';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { Observable, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environment/environment';
import { MessageService } from 'primeng/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  status: string;
  entityId: number | null;
  entityType: string;
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  isCritical: boolean;
  expiresAt: string | null;
  targetRole: string;
  userId: number;
}

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
}
@Component({
  selector: 'app-dashboard-module',
  templateUrl: './dashboard-module.component.html',
  styleUrl: './dashboard-module.component.css',
  providers: [MessageService]
})
export class DashboardModuleComponent implements OnInit, OnDestroy {
  username: string = '';
  role: string = '';
  dropdownOpen: boolean = false;
  notifications: Notification[] = [];
  showNotifications: boolean = false; // Toggle for showing notification dropdown
  pendingAppointmentsCount: number = 0;
  newNotification: boolean = false; // Flag to show if new appointments came
  hasNewNotification: boolean = false;
  isReceptionist: boolean = false;
  subAdminType: string = '';
  adminType: string = '';
  private apiUrl = environment.apiUrl;
  private audio = new Audio('/notification.mp3'); // Add a notification sound
  private eventSource: EventSource | null = null;
  public hasNewAppointment: boolean = false;
  isDropdownOpen: boolean = false;
  showLogoutConfirmDialog: boolean = false;
  showBubble: boolean = true; // Flag to show the bubble
  @Output() leaveRequestClicked = new EventEmitter<void>();
  constructor(private authService: AuthServiceService, private router: Router, private appointmentService: AppointmentConfirmService, private changeDetector: ChangeDetectorRef, private messageService: MessageService, private elementRef: ElementRef) { }



  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      setTimeout(() => {
        this.showBubble = false;
      }, 6000);
      const storedUsername = localStorage.getItem('username');
      const storedRole = localStorage.getItem('role');
      this.subAdminType = localStorage.getItem('subAdminType') || ""; // Identify subAdminType
      this.adminType = localStorage.getItem('adminType') || "";       // Identify adminType
      const isReceptionist = localStorage.getItem('isReceptionist') === 'true';
      this.isReceptionist = isReceptionist;
  
      if (storedUsername && storedRole) {
        this.username = storedUsername;
        this.role = storedRole.replace(/_/g, ''); // Remove underscores
      }
  
      if (this.role !== 'doctor') {
        this.username = this.username.split(`_${this.role}`)[0];
      } else if (this.role === 'doctor') {
        this.username = `Dr. ${this.username.split('_doctor')[0]}`;
      }
  
      // console.log('Connecting to server for new notifications...', environment.apiUrl);
      this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);
  
      this.eventSource.addEventListener('appointment', (event: MessageEvent) => {
        // console.log('New notification received:', event.data);
        const userId = localStorage.getItem('userid');
  
        if (!userId) {
          console.error('User ID is not available.');
          return;
        }
  
        const newNotification: Notification = JSON.parse(event.data);
  
        // ✅ Filtering Notifications Based on Role & SubAdminType
        if (this.shouldDisplayNotification(newNotification)) {
          // console.log('Processed Notification:', newNotification);
  
          // Play audio notification
          this.audio.load();
          this.audio.play();
  
          // Display toast notification
          const toastSummary = this.getToastSummary(newNotification.type);
  
          this.messageService.add({
            severity: 'info',
            summary: toastSummary,
            detail: newNotification.message,
            life: 5000,
          });
        }
  
        // Fetch Notifications Based on Role
        this.fetchNotifications();
      });
  
      // Initial Fetch for Notifications
      this.fetchNotifications();
    }
  }
  
  // ✅ Determines if a notification should be displayed
  private shouldDisplayNotification(notification: Notification): boolean {
    const isEstimator = this.subAdminType === 'Estimator';
    const isTelecaller = this.subAdminType === 'Tele Caller';
    const isFrontDesk = this.subAdminType === 'Front Desk';
    const isAdminManager = this.adminType === 'Manager' || this.adminType === 'Senior Manager';
  
    return (
      (this.role === 'subadmin' &&
        (
          (isEstimator && notification.type === 'estimation_request' && notification.title === 'New Estimation Raised') ||
          (isTelecaller && (notification.type === 'appointment_request' || notification.type === 'service_request')) ||
          (isFrontDesk && 
            (notification.type === 'appointment_remainder' || 
             notification.type === 'service_remainder' || 
             notification.type === 'appointment_request' || 
             notification.type === 'service_request'))
        )
      ) ||
      (this.role === 'admin' && isAdminManager && notification.type === 'estimation_request')
    );
  }
  
  // ✅ Fetch Notifications Based on Role & SubAdminType
  private fetchNotifications(): void {
    this.appointmentService.getNotifications().subscribe((notifications: Notification[]) => {
      const filteredNotifications = notifications.filter(notification =>
        this.shouldDisplayNotification(notification)
      );
  
      // console.log('Filtered Notifications:', filteredNotifications);
      this.notifications = filteredNotifications.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    });
  }
  
  // ✅ Returns a proper toast summary
  private getToastSummary(type: string): string {
    switch (type) {
      case 'appointment_remainder': return 'Appointment Reminder';
      case 'service_remainder': return 'Service Reminder';
      case 'appointment_request': return 'New Appointment Request';
      case 'service_request': return 'New Service Request';
      case 'estimation_request': return 'New Estimation Request';
      default: return 'Notification';
    }
  }
  

  gotoProfile() {
    this.appointmentService.openSettingsModal()
  }
  ngOnDestroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
  // handleNotificationClick(index: number): void {
  //   // Remove the clicked notification from the list
  //   this.notifications.splice(index, 1);

  //   // Navigate to the appointments page
  //   this.router.navigate(['/appointments']);

  //   // Close the notification dropdown if there are no notifications left
  //   if (this.notifications.length === 0) {
  //     this.dropdownOpen = false;
  //   }
  // }
  handleNotificationClick(index: number): void {
    const notificationToDelete = this.notifications[index];
    if (notificationToDelete.id) {

      // Make the HTTP request to delete the notification from the backend
      this.appointmentService.deleteNotification(notificationToDelete.id).subscribe(
        () => {
          // Remove the clicked notification from the list on successful deletion
          this.notifications.splice(index, 1);
          this.showNotifications = false;

          // Navigate to the appointments page
          if(this.notifications[index].type === 'estimation_request'){
            this.router.navigate(['/estimation']);
          }else{
            this.router.navigate(['/appointments']);
          }

          // Close the notification dropdown if there are no notifications left
          if (this.notifications.length === 0) {
            this.dropdownOpen = false;
          }
        },
        (error) => {
          console.error('Failed to delete the notification:', error);
        }
      );
    }
  }


  toggleNotificationDropdown(): void {
    this.showNotifications = !this.showNotifications;
    if (this.hasNewAppointment) {
      this.hasNewAppointment = false; // Reset the notification badge state when viewing notifications
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
 this.showLogoutConfirmDialog = true;
  }

  toggleDropdownOpen(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }
  // @HostListener('document:click', ['$event'])
  // handleOutsideClick(event: Event): void {
  //   const clickedInside = this.elementRef.nativeElement.contains(event.target);
  //   console.log('Clicked inside:', clickedInside);
  //   if (!clickedInside) {
  //     this.isDropdownOpen = false;
  //     this.showNotifications = false;
      
  //     console.log('Dropdown closed');
  //   }
  // }
  @HostListener('document:click', ['$event'])
  closeDropdowns(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-icon') && !target.closest('.notification-dropdown')) {
      this.showNotifications = false;
    }
    if (!target.closest('.profile-container')) {
      this.isDropdownOpen = false;
    }
  }
  // gotoProfile(): void {
  //   console.log('Navigating to Profile Settings...');
  //   // Add navigation logic here
  // }

  gotoReports(): void {
    // console.log('Navigating to Reports & Data...');
    this.router.navigate(['/report']);
    // Add navigation logic here
  }
  gotoAppointments(): void {
    // console.log('Navigating to Appointments...');
    this.router.navigate(['/appointments']);
    // Add navigation logic here
  }
  gotoHealthCheckup(): void{
    // console.log('Navigating to Health Checkup...');
    this.router.navigate(['/health-checkup']);
  }

  gotoAnalytics(): void {
    // console.log('Navigating to Analytics & Data...');
    // Add navigation logic here
  }
  gotoLeaveRequest(): void {
    // console.log('Navigating to Leave Request...');
    // Add navigation logic
    this.appointmentService.triggerLeaveRequest()
  }
  gotoDoctorAppointments(): void{
    this.router.navigate(['/doctor-appointments'])
  }

  gotoHelp(): void {
    // console.log('Navigating to Help Center...');
    // Add navigation logic here
  }
  confirmLogout() {
    // Clear user session and redirect to login
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
    this.showLogoutConfirmDialog = false;
  }

  closeLogoutDialog() {
    this.showLogoutConfirmDialog = false;
  }

  // logout(): void {
  //   console.log('Logging out...');
  //   // Add logout logic here
  // }
  openWhatsApp(): void {
    const phone = '919844005600'; // Change to your WhatsApp number
    const message = encodeURIComponent('Hello! I need assistance.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }
}
