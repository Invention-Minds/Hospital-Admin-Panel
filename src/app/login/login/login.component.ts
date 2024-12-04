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
  
  constructor(private authService: AuthServiceService, private router: Router,private messageService: MessageService) {}
  ngOnInit(): void {
    // Check if the user is already logged in by checking the token in localStorage or sessionStorage
    const token = localStorage.getItem('token');
    if (token) {
      // If a token exists, redirect to the dashboard
      this.router.navigate(['/dashboard']);
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
        // console.log('Login successful:', response);
        // response = response;
        
        // Navigate to the desired route upon successful login
        this.router.navigate(['/dashboard']); // Adjust the route as necessary
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
