import { Component, OnDestroy, OnInit, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
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
  private apiUrl = environment.apiUrl;
  private audio = new Audio('/notification.mp3'); // Add a notification sound
  private eventSource: EventSource | null = null;
  public hasNewAppointment: boolean = false;
  isDropdownOpen: boolean = false;
  constructor(private authService: AuthServiceService, private router: Router, private appointmentService: AppointmentConfirmService, private changeDetector: ChangeDetectorRef, private messageService: MessageService, private elementRef: ElementRef) { }

  // ngOnInit(): void {
  //   if (typeof window !== 'undefined' && window.localStorage) {
  //     // Fetch role from localStorage or the authentication service
  //     const storedUsername = localStorage.getItem('username');
  //     const storedRole = localStorage.getItem('role');
  //     const user = this.authService.getUser();
  //     if (storedUsername && storedRole) {
  //       this.username = storedUsername;
  //       this.role = storedRole;
  //     }
  //     // console.log(this.username, this.role);
  //   } else {
  //     console.log('localStorage is not available');
  //   }
  //   console.log('Connecting to server to receive new appointments...',this.apiUrl,environment.apiUrl);
  //   this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);
  //   this.eventSource.onopen = () => {
  //     console.log('Connection to server opened.');
  //   };

  //   this.eventSource.onerror = (error) => {
  //     console.error('Error connecting to server:', error);
  //   };
  //   this.eventSource.onmessage = (event) => {
  //     console.log('New pending appointment received:', event.data);

  //     this.appointmentService.getNotifications().subscribe((notifications: Notification[]) => {
  //       const userId = Number(localStorage.getItem('userid')); // Assuming a method to get the current logged-in user's ID
  //       console.log('User ID:', userId);
  //   const userNotifications = notifications.filter(
  //     (notification) => notification.userId === userId 
  //   );

  //   console.log('User Notifications:', userNotifications);
  //       const sortedNotifications = userNotifications.sort((a, b) => {
  //         const dateA = new Date(a.createdAt || 0).getTime(); // Default to epoch if undefined
  //         const dateB = new Date(b.createdAt || 0).getTime(); // Default to epoch if undefined
  //         return dateB - dateA; // Sort in descending order by creation date
  //       });
  //       this.notifications = sortedNotifications;

  //       console.log('Notifications:', notifications);
  //       this.changeDetector.detectChanges()

  //       this.audio.load()
  //       this.audio.play();
  //     });
  //   };

  //   this.appointmentService.getNotifications().subscribe((notifications: Notification[]) => {
  //     const sortedNotifications = notifications.sort((a, b) => {
  //       const dateA = new Date(a.createdAt || 0).getTime(); // Default to epoch if undefined
  //       const dateB = new Date(b.createdAt || 0).getTime(); // Default to epoch if undefined
  //       return dateB - dateA; // Sort in descending order by creation date
  //     });
  //     this.notifications = sortedNotifications;
  //     console.log('Notifications:', notifications);

  //   });
  // }
  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUsername = localStorage.getItem('username');
      const storedRole = localStorage.getItem('role');
      const isReceptionist = localStorage.getItem('isReceptionist') === 'true'; // Check if receptionist
      this.isReceptionist = localStorage.getItem('isReceptionist') === 'true';

      if (storedUsername && storedRole) {
        this.username = storedUsername;
        this.role = storedRole;
      }

      console.log('Connecting to server to receive new appointments...', this.apiUrl, environment.apiUrl);
      this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);

      this.eventSource.onmessage = (event) => {
        console.log('New notification received:', event.data);
        const userId = localStorage.getItem('userid');

        if (!userId) {
          console.error('User ID is not available.');
          return; // Exit early or handle accordingly
        }
        const newNotification: Notification = JSON.parse(event.data);

        // Determine if the notification should trigger a toast
        if (
          this.role !== 'super_admin' && // Exclude super admin
          this.role !== 'admin' && // Exclude admin
          (
            (newNotification.type === 'appointment_request') || // For both tele callers and receptionists
            (this.isReceptionist && newNotification.type === 'appointment_remainder') // For receptionists only
          )
        ) {
          console.log('New Notification Processed:', newNotification);

          // Play audio notification
          this.audio.load();
          this.audio.play();

          // Display a toast for the notification
          const toastSummary = newNotification.type === 'appointment_request'
            ? 'New Appointment Request'
            : 'Appointment Reminder';

          this.messageService.add({
            severity: 'info', // Severity type: success, info, warn, error
            summary: toastSummary,
            detail: newNotification.message,
            life: 5000, // Duration in milliseconds
          });
        }


        // Fetch notifications based on role
        this.appointmentService.getNotifications().subscribe((notifications: Notification[]) => {
          const filteredNotifications = notifications.filter(notification =>
            notification.type === 'appointment_request' ||
            (this.isReceptionist && notification.type === 'appointment_remainder')
          );
          console.log('Filtered Notifications:', filteredNotifications);
          const sortedNotifications = filteredNotifications.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });



          this.notifications = sortedNotifications;

          console.log('Filtered Notifications:', sortedNotifications);


        });
      };
      this.appointmentService.getNotifications().subscribe((notifications: Notification[]) => {
        // const userId = Number(localStorage.getItem('userid'));
        // console.log('User ID:', userId);
        // const userNotifications = notifications.filter(
        //   (notification) => notification.userId === userId
        // );
        const filteredNotifications = notifications.filter(notification =>
          notification.type === 'appointment_request' ||
          (this.isReceptionist && notification.type === 'appointment_remainder')
        );
        console.log('Filtered Notifications:', filteredNotifications);
        const sortedNotifications = filteredNotifications.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });



        this.notifications = sortedNotifications;

        // this.audio.load();
        // this.audio.play();
      }
      );
    }
  }

  gotoProfile() {
    this.router.navigate(['/settings']);
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
          this.router.navigate(['/appointments']);

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
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('token');  // Assuming the token is also stored in localStorage
    this.router.navigate(['/login']);
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const targetElement = event.target as HTMLElement;

    // Close the dropdown if the click is outside the dropdown or notification icon
    if (
      this.showNotifications &&
      !this.elementRef.nativeElement.contains(targetElement)
    ) {
      this.showNotifications = false;
    }
  }
  toggleDropdownOpen(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // gotoProfile(): void {
  //   console.log('Navigating to Profile Settings...');
  //   // Add navigation logic here
  // }

  gotoReports(): void {
    console.log('Navigating to Reports & Data...');
    // Add navigation logic here
  }

  gotoAnalytics(): void {
    console.log('Navigating to Analytics & Data...');
    // Add navigation logic here
  }

  gotoHelp(): void {
    console.log('Navigating to Help Center...');
    // Add navigation logic here
  }

  // logout(): void {
  //   console.log('Logging out...');
  //   // Add logout logic here
  // }
}
