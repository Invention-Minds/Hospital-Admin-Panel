import { Component, OnInit } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { Router } from '@angular/router';
import { HttpHeaders } from '@angular/common/http';

// export enum UserRole {
//   admin = 'admin',
//    sub_admin = 'sub_admin',
//    super_admin ='super_admin',
//    doctor = 'doctor'
// }
type UserRole = 'admin' | 'doctor' | 'sub_admin' | 'super_admin';
type Tab = 'profile' | 'reset' | 'login';
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  selectedTab: string = 'profile';
  showDeleteConfirmDialog: boolean = false;
  currentUserRole: UserRole = 'sub_admin'; // Default role
  isPasswordVisible: boolean = false; // Track visibility of password
  isCreatePasswordVisible:boolean = false;
  isConfirmPasswordVisible:boolean = false;
  isNewPasswordVisible: boolean = false;
  oldPassword: string='';
  isOldPasswordVisible:boolean = false;
  username: string = '';
  password: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  userid:number = 0;
  role: string | null = null;  // Store user role
  constructor(private authService: AuthServiceService, private router: Router) {}
 // Define the role-based access
 rolePermissions: Record<UserRole, string[]> = {
  sub_admin: ['profile', 'reset'],
  doctor: ['profile', 'reset'],
  admin: ['profile', 'reset', 'login','delete'],
  super_admin: ['profile', 'reset', 'login','delete'],
};

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      const storedRole = localStorage.getItem('role');
      const storedUsername = localStorage.getItem('username');
      const validRoles: UserRole[] = ['admin', 'doctor', 'sub_admin', 'super_admin'];
      this.role = storedRole;
      this.username = storedUsername || '';
      console.log(localStorage.getItem('userid'))
      this.userid = Number(localStorage.getItem('userid'));
      console.log('userid',this.userid)
      console.log('role',this.role)
      if (validRoles.includes(this.role as UserRole)) {
        this.currentUserRole = this.role as UserRole;
        console.log("current user role in settings",this.currentUserRole)
      } else {
        this.currentUserRole = 'sub_admin'; // Default role in case of an invalid role
      }
  
    } else {
      console.log('localStorage is not available');
    }
    
  }

  switchTab(tabName: string) {
    this.selectedTab = tabName;
  }

  openDeleteDialog(): void {
    this.showDeleteConfirmDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteConfirmDialog = false;
  }
// Register method
createAccount() {
  this.authService.register(this.username, this.password).subscribe(response => {
    console.log('Account created successfully', response);
    this.username = '';  // Clear the username
    this.password = '';  // Clear the password
  }, error => {
    console.error('Error creating account', error);
  });
}

// Reset Password method
resetPassword() {
  if (this.newPassword !== this.confirmPassword) {
    console.error('Passwords do not match!');
    return;
  }
  this.authService.resetPassword(this.username, this.newPassword).subscribe(response => {
    console.log('Password reset successfully', response);
    this.username = '';  // Clear the username
    this.newPassword = '';  // Clear the new password

    this.confirmPassword= '';

  }, error => {
    console.error('Error resetting password', error);
  });
}
 // Change Password method
 changePassword() {
  this.authService.changePassword(this.password,this.oldPassword, this.newPassword).subscribe(response => {
    console.log('Password changed successfully', response);
    this.password = '';  // Clear the current password
    this.newPassword = '';  // Clear the new password
    this.oldPassword = '';

  }, error => {
    console.error('Error changing password', error);
  });
}
  confirmDelete(): void {
    // Add logic to delete account
    // Example: this.doctorService.deleteDoctor(doctorId).subscribe(...)
    console.log('Account deleted');
    this.closeDeleteDialog();
  }
  logout() {
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('token');  // Assuming the token is also stored in localStorage
    this.router.navigate(['/login']);
  }
  // Role-Based Access: Show/Hide Tabs Based on Role
// Role-Based Access: Show/Hide Tabs Based on Role
// canAccessTab(tabName: string): boolean {
//   // Role-based tab access
//   if ((this.role === UserRole.admin || this.role === UserRole.doctor) && (tabName === 'profile' || tabName === 'reset')) {
//     return true;  // Admin and Doctor can access 'profile' and 'reset'
//   }
  
//   if ((this.role === UserRole.sub_admin || this.role === UserRole.super_admin)) {
//     return true;  // Sub_admin and Super_admin can access all tabs
//   }
  
//   return false;  // Default to denying access for other roles or restricted tabs
// }
canAccessTab(tab: string): boolean {
  return this.rolePermissions[this.currentUserRole]?.includes(tab) ?? false;
}
// Method to toggle password visibility
togglePasswordVisibility() {
  this.isPasswordVisible = !this.isPasswordVisible;
}
toggleNewPasswordVisibility() {
  this.isNewPasswordVisible = !this.isNewPasswordVisible;
}
toggleConfirmPasswordVisibility() {
  this.isConfirmPasswordVisible = !this.isConfirmPasswordVisible;
}
toggleCreatePasswordVisibility() {
  this.isCreatePasswordVisible = !this.isCreatePasswordVisible;
}
toggleOldPasswordVisibility(){
this.isOldPasswordVisible = !this.isConfirmPasswordVisible
}
extractFirstName(username: string): string {
  const parts = username.split('_'); // Split the string by underscore
  if (parts.length > 0) {
      return parts[0]; // Return the first part, which is the first name
  }
  return ''; // Return empty string if no underscore found
};



deleteUser() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No authentication token found');
    return;
  }

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });
  // let username = this.extractFirstName(this.username); // Extract the first name
  this.authService.deleteUser(this.username,headers).subscribe(
    response => {
        console.log('User deleted successfully', response);
    },
    error => {
        console.error('Failed to delete user', error);
    }
);}
}


