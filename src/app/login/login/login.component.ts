import { Component, OnInit } from '@angular/core';
import { AuthServiceService } from '../../services/auth/auth-service.service'; // Import your AuthService
import { Router } from '@angular/router'; // Import Router for navigation
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  providers: [MessageService]
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  isPasswordVisible: boolean = false; // Track visibility of password
  isLoading: boolean = false; // Track loading state of the login form
  role: string = ''; // Track the user role
  subAdminType: string = ''
  adminType: string = ''
  
  constructor(private authService: AuthServiceService, private router: Router,private messageService: MessageService) {}
  ngOnInit(): void {
    // Check if the user is already logged in by checking the token in localStorage or sessionStorage
    const token = localStorage.getItem('token');
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      this.role = localStorage.getItem('role') || '';
      this.subAdminType = localStorage.getItem('subAdminType') || ''
      this.adminType = localStorage.getItem('adminType') || ''
      console.log(this.adminType)
      // console.log('User role:', this.role);
    } else {
      console.log('localStorage is not available');
    }
    if (token) {
      console.log(this.adminType)
      // If a token exists, redirect to the dashboard
      // this.router.navigate(['/dashboard']);
      if (this.adminType === 'IP Billing Manager'){
        console.log(this.subAdminType)
        this.router.navigate(['/estimation'])
      }
      else if(this.role === 'admin'){
        console.log('role', this.role)
        this.router.navigate(['/analytics']);
      }else if (this.subAdminType === 'Estimator'){
        console.log(this.subAdminType)
        this.router.navigate(['/estimation'])
      }
      else if(this.subAdminType === 'MHC Coordinator'){
        this.router.navigate(['/health-checkup'])
      }
      else if(this.subAdminType === 'Therapist'){
        this.router.navigate(['/therapy-list'])
      }
      else if(this.role === 'sub_admin'){
        this.router.navigate(['/dashboard'])
      }
      else{
        console.log('doctor',this.role)
        this.router.navigate(['/doctor-appointments']);
      }
    }
    
    const logoutReason = localStorage.getItem('logoutReason');
    if (logoutReason === 'inactivity') {
      console.log('Logged out due to inactivity');
      this.messageService.add({
        severity: 'info',
        summary: 'Logged Out',
        detail: 'You were logged out due to inactivity.',
        // life: 5000 // Display for 5 seconds
      });

      // Remove the reason after displaying it
      localStorage.removeItem('logoutReason');
    }
  }
  onSubmit() {
    this.isLoading = true;
    this.authService.login(this.username, this.password).subscribe(
      (response) => {
        console.log('Login successful:', response);
        // response = response;
        // Navigate to the desired route upon successful login
        if (response.user.employeeId) {
          const blockId = response.user.employeeId.match(/B(\d+)/i); // Split by "C" and take the first part
          const match = response.user.employeeId.match(/C(\d+)/i); // Case-insensitive match for "C" followed by a number
          if (match && match[1]) {
            const channelNumber = match[1]; // Extract the number part
            console.log(`🔀 Redirecting to /channel/${channelNumber}`);
            
            this.router.navigate([`/channel/${channelNumber}`]); // Navigate to the appropriate channel
          }
          else if (blockId && blockId[1]) {
            const blockNumber = blockId[1]; // Extract the number part
            console.log(`🔀 Redirecting to /nursing/${blockNumber}`);
            this.router.navigate([`/nursing/${blockNumber}`]); // Navigate to the appropriate channel
          }
          else if(response.user.subAdminType === 'OT Channel'){
            this.router.navigate(['/ot-channel']);
          }
          else if( response.user.subAdminType === 'OT Coordinator'){
            this.router.navigate(['/surgery']);
          }
          else if (response.user.subAdminType === 'Estimator'){
            console.log(this.subAdminType)
            this.router.navigate(['/estimation'])
          }else if(response.user.subAdminType === 'MHC Coordinator'){
            this.router.navigate(['/health-checkup'])
          }
          else if(response.user.subAdminType === 'Radiology Coordinator'){
            this.router.navigate(['/radiology-services'])
          }
          else if(response.user.subAdminType === 'Lab Coordinator'){
            this.router.navigate(['/lab'])
          }
          else if(response.user.subAdminType === 'Therapist'){
            this.router.navigate(['/therapy-list'])
          }
          else if(response.user.subAdminType === 'Therapy Channel'){
            this.router.navigate(['/therapy-channel'])
          }
          else if(response.user.adminType === 'IP Billing Manager'){
            this.router.navigate(['/estimation'])
          }
            else if(response.user.role === 'admin'){
            this.router.navigate(['/analytics']);
          }
          else if(response.user.role!== 'doctor'){
            console.log('role', response.user.role)
            this.router.navigate(['/dashboard']);
          }
          else if(response.user.role === 'doctor'){
            console.log('doctor',response.user.role)
            this.router.navigate(['/doctor-appointments']);
          }
          else if(response.user.role === ''){
            this.router.navigate(['/login']);
          }
          else{
            this.router.navigate(['/login']);
          }
        }
       
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Welcome!' });
      },
      (error) => {
        console.error('Login failed:', error);
        let message = error.error;
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid username and password' });
        // Handle the error, e.g., show a message to the user
      }
    );
  }
  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }
  
}
