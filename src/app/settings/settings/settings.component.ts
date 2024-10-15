import { Component, OnInit } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';

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
  currentUserRole: UserRole = 'admin';
  isPasswordVisible: boolean = false; // Track visibility of password
  username: string = '';
  password: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  role: string | null = null;  // Store user role
  constructor(private authService: AuthServiceService) {}
 // Define the role-based access
 rolePermissions: Record<UserRole, string[]> = {
  admin: ['profile', 'reset'],
  doctor: ['profile', 'reset'],
  sub_admin: ['profile', 'reset', 'login'],
  super_admin: ['profile', 'reset', 'login'],
};

  ngOnInit(): void {
    const storedRole = localStorage.getItem('role');
    const storedUsername = localStorage.getItem('username');
    const validRoles: UserRole[] = ['admin', 'doctor', 'sub_admin', 'super_admin'];
    this.role = storedRole;
    this.username = storedUsername || '';
    console.log('role',this.role)
    if (validRoles.includes(this.role as UserRole)) {
      this.currentUserRole = this.role as UserRole;
      console.log("current user role in settigns",this.currentUserRole)
    } else {
      this.currentUserRole = 'admin'; // Default role in case of an invalid role
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
  }, error => {
    console.error('Error resetting password', error);
  });
}
 // Change Password method
 changePassword() {
  this.authService.changePassword(this.password, this.newPassword).subscribe(response => {
    console.log('Password changed successfully', response);
    this.password = '';  // Clear the current password
    this.newPassword = '';  // Clear the new password

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

}
