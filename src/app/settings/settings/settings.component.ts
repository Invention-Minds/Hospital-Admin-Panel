import { Component, OnInit } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { EstimationService } from '../../services/estimation/estimation.service';
import { Router } from '@angular/router';
import { HttpHeaders } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import moment from 'moment-timezone';
import { forkJoin } from 'rxjs';

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
  styleUrl: './settings.component.css',
  providers: [MessageService]
})
export class SettingsComponent implements OnInit {
  selectedTab: string = 'profile';
  showDeleteConfirmDialog: boolean = false;
  showLogoutConfirmDialog: boolean = false;
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
  appointmentsCount: number = 0;
  userid:number = 0;
  role: string | null = null;  // Store user role
  users: any[] = []; // List of all users
  selectedUser: any = ''; // User selected by super admin to reset password
  loading: boolean = false;
  name: string = '';
  buttonClicked: boolean = false;
  isFormValid: boolean = false;
  usernameErrorMessage: string = '';
  passwordErrorMessage: string = '';
  usernameErrorMessageinReset: string = '';
  passwordErrorMessageinReset: string = '';
  isUserNameValid: boolean = false;
  loggedinUser: any;
  firstNames: string[] = [];
  isReceptionist: boolean = true; // Default value for checkbox
  showReceptionistOptions: boolean = false;
  employeeId: string = '';
  selectedDepartment: string = '';
  selectedDoctor: any;
  filteredDoctors: any[] = [];
  departments: any[] = [];
  doctors: any[] = [];
  isAdmin = false;
  isSubAdmin = false;
  isDoctor = false;
  type = '';
  subAdminType = '';
  adminType ='';
  loggedInName: string = '';
  showSettings: boolean = false;
  employeeIdErrorMessage: string = '';
  createdBy: string = '';
  lockedEstimations: any[] = [];
selectAll: boolean = false;
loggedInAdminType: string = ''; // To store the admin type of the logged-in user

  constructor(private authService: AuthServiceService, private router: Router, private messageService: MessageService, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService, private estimationService: EstimationService) {}
 // Define the role-based access
 rolePermissions: Record<UserRole, string[]> = {
  sub_admin: ['profile', 'reset','est_locked'],
  doctor: ['profile', 'reset'],
  admin: ['profile', 'reset', 'login','delete'],
  super_admin: ['profile', 'reset', 'login','delete','login_details'],
};

  ngOnInit(): void {
    this.appointmentService.settingsModalState$.subscribe((state: boolean) => {
      this.showSettings = state;
      console.log(this.showSettings)
    });
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      const storedRole = localStorage.getItem('role');
      const storedUsername = localStorage.getItem('username'); 
      this.createdBy = localStorage.getItem('userid') || '';
      this.loggedInAdminType = localStorage.getItem('adminType') || ''; // Fetch admin type from localStorage
      const validRoles: UserRole[] = ['admin', 'doctor', 'sub_admin', 'super_admin'];
      this.role = storedRole;
      this.loggedInName = storedUsername || '';
      // this.loggedinUser = `${this.name}_${this.role}@rashtrotthana`;
      // console.log('Logged in user:', this.loggedinUser);
      // this.username = storedUsername || '';
      // console.log(localStorage.getItem('userid'))
      this.userid = Number(localStorage.getItem('userid'));
      // console.log('userid',this.userid)
      // console.log('role',this.role)
      if (validRoles.includes(this.role as UserRole)) {
        this.currentUserRole = this.role as UserRole;
        // console.log("current user role in settings",this.currentUserRole)
        if (this.currentUserRole === 'super_admin' || this.currentUserRole === 'admin' || this.currentUserRole === 'sub_admin') {
          this.loadUsers(); // Load users if the role is super admin
        }
      } else {
        this.currentUserRole = 'sub_admin'; // Default role in case of an invalid role
      }
      this.appointmentService.getAppointmentsByUser(this.userid).subscribe(appointments => {
        // console.log('Appointments for user:', appointments);
        this.appointmentsCount = appointments.length;
      });
  
    } else {
      console.log('localStorage is not available');
    }
    this.loadDepartments();
    this.loadDoctors();
    this.loadLockedEstimations();

  }

  closeSettings() {
    this.appointmentService.closeSettingsModal();
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
  loadUsers(): void {
    this.authService.getAllUsers().subscribe(
      (data) => {
        this.users = data;
        this.users = this.users.map(user => {
          const createdAt = new Date(user.createdAt);
          const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");
    
          // Store the date and time in two separate variables
          const indianDate = indianTime.format('YYYY-MM-DD');
          const indianTimeOnly = indianTime.format('HH:mm:ss');
          user.createdAt = indianDate + ' ' + indianTimeOnly;
    
          return user;
        });
        console.log('Users loaded successfully:', this.users);
        this.firstNames = this.users.map(user => this.extractFirstName(user.username));
        
        // console.log('Users loaded successfully:', this.users);
      },
      (error) => {
        console.error('Error loading users:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load users' });
      }
    );
  }
  onUsernameChange(): void {
    const role = this.extractRoleFromUsername(this.username);
    if (role === 'subadmin') {
      this.showReceptionistOptions = true;
    } else {
      this.showReceptionistOptions = false;
      this.isReceptionist = true; // Reset checkbox value when role is not subadmin
    }
    this.validateInputs(); // Optionally validate inputs
  }
  extractRoleFromUsername(username: string): string {
    const parts = username.split('_');
    return parts.length > 1 ? parts[1].split('@')[0] : '';
  }
  onReceptionistChange(): void {
    console.log('Is Receptionist:', this.isReceptionist ? 'Front Desk' : 'Tele Caller');
  }
  resetUserPassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Passwords do not match' });
      return;
    }

    this.buttonClicked = true;
    if (this.employeeId) {
      this.authService.resetPassword(this.employeeId, this.newPassword, this.createdBy).subscribe(
        () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Password reset successfully' });
          this.newPassword = '';
          this.confirmPassword = '';
          this.buttonClicked = false;
        },
        (error) => {
          console.error('Error resetting user password:', error);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to reset password' });
          this.buttonClicked = false;
        }
      );
    }
  }
  formatDoctorName(name: string): string {
    if (!name) return '';
    
    // Step 1: Remove "Dr." prefix if it exists
    let formattedName = name.replace(/^Dr\.\s*/i, '');
  
    // Step 2: Replace all spaces with underscores
    formattedName = formattedName.replace(/\s+/g, '_');
  
    // Step 3: Convert to lowercase (optional, based on requirements)
    return formattedName.toLowerCase();
  }
  
  // Usage Example
  typeChange(){
    console.log(this.subAdminType)
  }

// Register method
createAccount() {
  this.buttonClicked = true;
  
  if(this.isDoctor){
    console.log(this.selectedDoctor);
    const name = this.formatDoctorName(this.selectedDoctor.name);
    console.log(name)
  
    // const doctorName = this.doctors.filter(
    //   (doctor) => doctor.name === this.selectedDoctor
    // 
    

    this.username = name + '_doctor@rashtrotthana';
    this.role = 'doctor';
    this.isReceptionist = false;
  }
  if (this.isAdmin) {
    this.username = `${this.name}_admin@rashtrotthana`;
    this.role = 'admin';
    this.isReceptionist = false;
    this.adminType = this.adminType
  } else if (this.isSubAdmin) {
    this.username = `${this.name}_subadmin@rashtrotthana`;
    this.role = 'sub_admin';
    console.log(this.subAdminType)
    if(this.subAdminType !== 'Front Desk'){
      this.isReceptionist = false;
      
    }
  } 
  console.log(this.subAdminType,"subadmin")
  console.log(this.adminType,"adminType")
  this.authService.register(this.username, this.password,this.isReceptionist, this.employeeId, this.role!, this.subAdminType,this.adminType, this.createdBy).subscribe(response => {
    // console.log('Account created successfully', response);
    this.username = '';  // Clear the username
    this.password = '';  // Clear the password
    this.showReceptionistOptions = false;  // Reset the checkbox
    this.employeeId='';
    this.selectedDepartment ='';
    // this.selectedDoctor = [];
    this.subAdminType='';
    this.name='';
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Account Created Successfully' });
    this.buttonClicked = false;
    if(this.isDoctor){
      this.selectedDoctor.userId = response.id;
      console.log(this.selectedDoctor);
      this.doctorService.updateDoctor(this.selectedDoctor).subscribe(
        () => {
          console.log('Doctor updated successfully');
          this.selectedDoctor=[]
        },
        (error) => {
          console.error('Error updating doctor:', error);
        }
      );
    }
  }, error => {
    if (error.status === 400) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'This username has already been used.' });
      this.buttonClicked = false;
    }
    else{
      console.error('Error creating account', error);
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to Create Account' });
    this.buttonClicked = false;
    }
    
  });
  console.log(this.username, this.password, this.isReceptionist, this.employeeId, this.subAdminType, this.adminType);
}
validateInputs(): void {
  const usernameRegex = /^[a-zA-Z]+_(admin|subadmin|superadmin|doctor)@rashtrotthana$/;
  
  // Validate username using regex and validate password length
  const isUsernameValid = usernameRegex.test(this.username);
  const isPasswordValid = this.password.length >= 6;

  // Update the form validity state
  // this.isFormValid = isUsernameValid && isPasswordValid;
  this.isFormValid = isPasswordValid

  // If the form is not valid, show an appropriate error message
  if (!isUsernameValid) {
    this.usernameErrorMessage = "Username must be in the format: name_role@rashtrotthana (e.g., john_admin@rashtrotthana). The role must be 'admin', 'subadmin', 'superadmin', or 'doctor'.";
  } else {
    this.usernameErrorMessage = ''; // Clear the error message if valid
  }

  if (!isPasswordValid) {
    this.passwordErrorMessage = 'Password must be at least 6 characters long.';
  } else {
    this.passwordErrorMessage = ''; // Clear the error message if valid
  }
}
validateEmployeeID():void {
  const employeeIdRegex = /^[a-zA-Z0-9]+$/;
  const isemployeeIdValid = employeeIdRegex.test(this.employeeId);
  if(!isemployeeIdValid){
    this.employeeIdErrorMessage = "Employee Id Should contain only characters and numbers"
  }
  else{
    this.employeeIdErrorMessage = ''
  }

}
validPasswords(): void {
  const usernameRegex = /^[a-zA-Z]+_(admin|subadmin|superadmin|doctor)@rashtrotthana$/;
  
  // Validate username using regex and validate password length
  if(this.role === 'super_admin'){

    const isPasswordValid = this.newPassword.length >= 6 && this.confirmPassword.length >= 6;

    // Update the form validity state
    this.isUserNameValid = !this.employeeId

    // Update the form validity state
    this.isFormValid = !this.isUserNameValid && isPasswordValid;
    console.log(this.isFormValid, this.isUserNameValid)
  
    // If the form is not valid, show an appropriate error message

  
    // if(this.confirmPassword.length>=6 || this.newPassword.length>=6){
    //   this.passwordErrorMessage = 'Password must be at least 6 characters long.';
    // }
    // else{
    //   this.passwordErrorMessage = '';
    // }
  }
  else{

    const isPasswordValid = this.newPassword.length >= 6 && this.confirmPassword.length >= 6;
    this.isUserNameValid = !this.employeeId

    // Update the form validity state
    this.isFormValid = !this.isUserNameValid && isPasswordValid;
    console.log(this.isFormValid, this.isUserNameValid)
  
    // If the form is not valid, show an appropriate error message
    // if (!this.isUserNameValid) {
    //   this.usernameErrorMessage = "Username must be in the format: name_role@rashtrotthana. The role must be 'admin', 'subadmin', 'superadmin', or 'doctor'.";
    // } else {
    //   this.usernameErrorMessage = ''; // Clear the error message if valid
    // }
  
    // if (!isPasswordValid) {
    //   this.passwordErrorMessage = 'Password must be at least 6 characters long.';
    // } else {
    //   this.passwordErrorMessage = ''; // Clear the error message if valid
    // }
    // if(this.confirmPassword.length>=6 || this.newPassword.length>=6){
    //   this.passwordErrorMessage = '';
    // }
    // else{
    //   this.passwordErrorMessage = 'Password must be at least 6 characters long.';
    // }
  }
 

}

// Reset Password method
resetPassword() {
  console.log(this.employeeId, this.name)
  if(this.username !== this.name){
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'You are not authorized to reset password for other users' });
    return;
   }
  if (this.newPassword !== this.confirmPassword) {
    this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Passwords do not match' });
    console.error('Passwords do not match!');
    return;
  }
  this.buttonClicked = true;
  this.authService.resetPassword(this.employeeId, this.newPassword,this.createdBy).subscribe(response => {
    // console.log('Password reset successfully', response);
    this.employeeId = '';  // Clear the username
    this.newPassword = '';  // Clear the new password

    this.confirmPassword= '';
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Password reset successfully' });
    this.buttonClicked = false;

  }, error => {
    console.error('Error resetting password', error);
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to reset the password' });
    this.buttonClicked = false;
  });
}
 // Change Password method
 changePassword() {
  this.authService.changePassword(this.password,this.oldPassword, this.newPassword).subscribe(response => {
    // console.log('Password changed successfully', response);
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
    // console.log('Account deleted');
    this.closeDeleteDialog();
  }
  // logout() {
  //   localStorage.removeItem('username');
  //   localStorage.removeItem('role');
  //   localStorage.removeItem('token');  // Assuming the token is also stored in localStorage
  //   this.router.navigate(['/login']);
  // }

  logout() {
    this.showLogoutConfirmDialog = true;
  }

  confirmLogout() {
    // Clear user session and redirect to login
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    localStorage.removeItem('employeeId');
    localStorage.removeItem('subAdminType');
    localStorage.removeItem('adminType');
    localStorage.removeItem('userId');
    localStorage.removeItem('nurseId');
    localStorage.removeItem('name');
    localStorage.removeItem('blockId');
    this.router.navigate(['/login']);
    this.showLogoutConfirmDialog = false;
   this.closeSettings()
  }

  closeLogoutDialog() {
    this.showLogoutConfirmDialog = false;
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

validDelete(): void{
  const usernameRegex = /^[a-zA-Z]+_(admin|subadmin|superadmin|doctor)@rashtrotthana$/;
  this.isUserNameValid = usernameRegex.test(this.username);
   // Update the form validity state
   this.isFormValid = this.isUserNameValid;
  
   // If the form is not valid, show an appropriate error message
   if (!this.isUserNameValid) {
     this.usernameErrorMessageinReset = "Username must be in the format: name_role@rashtrotthana. The role must be 'admin', 'subadmin', 'superadmin', or 'doctor'.";
   } 
}

deleteUser() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No authentication token found');
    return;
  }
  this.buttonClicked=true;
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });
  this.loading = true; // Show loader
  // let username = this.extractFirstName(this.username); // Extract the first name
  this.authService.deleteUser(this.username,headers).subscribe(
    response => {
        // console.log('User deleted successfully', response);
        this.showDeleteConfirmDialog = false;
        this.username='';
        this.loading = false; // Hide loader
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User deleted successfully'});
        this.buttonClicked = false;
    },
    error => {
        console.error('Failed to delete user', error);
        if (error.status === 401) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'You are not authorized to delete users'});
        }
        if (error.status === 404) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'User not found'});
        }
        // this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete user'});
        this.loading = false; // Hide loader
        this.buttonClicked = false;
    }
);
}
loadDepartments(): void {
  this.doctorService.getDepartments().subscribe((departments) => {
    this.departments = departments;
  });
}

onDepartmentChange(): void {

 console.log(this.selectedDepartment);
 console.log(this.doctors);
  this.filteredDoctors = this.doctors.filter(
    (doctor) => doctor.departmentName === this.selectedDepartment
  );
  console.log('Filtered doctors:', this.filteredDoctors);
}
loadDoctors(): void {
  this.doctorService.getDoctors().subscribe(
    (doctors) => {
      this.doctors = doctors; // Now this.doctors will hold the array of doctors
    },
    (error) => {
      console.error('Error fetching doctors:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch doctors.' });
    }
  );
}

onAccountTypeChange(type: string) {
  this.isAdmin = type === 'admin';
  this.isSubAdmin = type === 'subadmin';
  this.isDoctor = type === 'doctor';

  // Reset form when switching account types
  this.username = '';
  this.password = '';
  this.employeeId = '';
  this.selectedDepartment = '';
  this.selectedDoctor = [];
  this.name = '';
}
loadLockedEstimations(): void {
  this.authService.getLockedEstimations().subscribe(
    (data) => {
      this.lockedEstimations = data.map((item:any) => { 
        console.log(item.lockedBy, this.users)
        const user = this.users.find(u => u.id === item.lockedBy);

        return {
          ...item,
          selected: false,
          empId: user?.employeeId || 'Unknown',
          username:this.extractFirstName(user?.username) || 'Unknown',
          isUnlocking: false,
        };
       });
    },
    (error) => console.error('Error loading locked estimations:', error)
  );
}

toggleAll(): void {
  this.lockedEstimations.forEach(est => est.selected = this.selectAll);
}

unlockEstimation(estimation: any): void {
  estimation.isUnlocking = true;
  this.estimationService.unlockService(estimation.id).subscribe(
    () => this.loadLockedEstimations(),
    (error) => console.error('Error unlocking estimation:', error)
  );
}

bulkUnlock(): void {
  const selectedIds = this.lockedEstimations.filter(e => e.selected).map(e => e.id);
  if (selectedIds.length === 0) {
    this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'No estimations selected for unlocking' });
    return;
  };

  // const unlockRequests = selectedIds.map(id => this.estimationService.unlockService(id));
  // forkJoin(unlockRequests).subscribe(
  //   () => this.loadLockedEstimations(),
  //   (error) => console.error('Error unlocking estimations:', error)
  // );
  this.estimationService.bulkUnlock(selectedIds).subscribe(
    () => {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Selected estimations unlocked successfully' });
      this.loadLockedEstimations();
    },
    (error) => {
      console.error('Error unlocking estimations:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to unlock selected estimations' });
    }
  );
}
}


