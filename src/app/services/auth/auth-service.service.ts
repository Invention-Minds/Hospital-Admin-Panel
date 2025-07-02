import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { tap } from 'rxjs/operators'; 
import { environment } from '../../../environment/environment.prod';

export enum UserRole {
  admin = 'admin',
   sub_admin = 'sub_admin',
   super_admin ='super_admin',
   doctor = 'doctor',
   unknown = 'unknown'
}

@Injectable({
  providedIn: 'root'
})

export class AuthServiceService {
  private apiUrl = `${environment.apiUrl}/login`; // Replace with your backend URL
  public role: string | null = null;
  public user: { username: string; role: string, id:number } | null = null;

  constructor(private http: HttpClient) { 
    this.initializeUserFromStorage(); 
  }
  login(employeeId: string, password: string): Observable<any> {
    let loginPayload: any = { password }; // Default payload

    // ✅ Check if it's a phone number (12 digits, starts with '91')
    if (/^\d+$/.test(employeeId)) {
      if (employeeId.length === 10) {
        // ✅ If 10 digits, prepend '91' (convert to phone number)
        employeeId = `91${employeeId}`;
      }
  
      if (employeeId.length === 12 && employeeId.startsWith("91")) {
        // ✅ If 12 digits & starts with '91', it's a phone number
        loginPayload.phoneNumber = employeeId;
      } else {
        // ✅ Otherwise, it's an employee ID
        loginPayload.employeeId = employeeId;
      }
    } else {
      // ✅ If not numeric, treat it as an employee ID
      loginPayload.employeeId = employeeId;
    }
    return this.http.post(`${this.apiUrl}/login`, loginPayload).pipe(
      tap((response: any) => {
        console.log(response)
        const user = response.user;  // Use 'user' from the response
        // console.log('User in the login:', user);
        if (user) {
          this.user = { username: user.username, role: user.role, id: user.userId}; // Save the user in the service
          localStorage.setItem('loggedinTime', response.generatedTime);
          localStorage.setItem('loggedinDate', response.generatedDate);  // Save the user in localStorage
          localStorage.setItem('username', user.username);
          localStorage.setItem('role', user.role);
          localStorage.setItem('userid',user.userId)
          localStorage.setItem('token', response.token);  // Save the token in localStorage
          localStorage.setItem('isReceptionist', user.isReceptionist);
          localStorage.setItem('employeeId', user.employeeId);
          localStorage.setItem('subAdminType',user.subAdminType);
          localStorage.setItem('adminType',user.adminType);
        }
      })
    );
  }
  getUserId(): number | null {
    const userId = localStorage.getItem('userid');
    // console.log(userId,"from auth service");
    return userId ? parseInt(userId, 10) : null;

  }
// Method to initialize the user from localStorage
initializeUserFromStorage(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userid');
  const user = localStorage.getItem('user');

  if (username && role && userId) {
    this.user = {
      username,
      role,
      id: parseInt(userId, 10),
    };
    // console.log('Initialized user from storage:', this.user);
  }}
  else{
    console.error('localStorage is not available');
  }
}
  getUser() {
    return this.user;
    // console.log(this.user);
  }

  register(username: string, password: string, isReceptionist: boolean, employeeId: string, role:string, adminType: string, subAdminType: string, createdBy: string): Observable<any> {
    // const role = this.extractRoleFromUsername(username);  // Extract role
    return this.http.post(`${this.apiUrl}/register`, { username, password, isReceptionist, employeeId, role, adminType, subAdminType, createdBy }).pipe(
      tap(response => {
        this.role = role;  // Save the role
      })
    );
  }

  resetPassword(employeeId: string,newPassword: string, updatedBy:string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { employeeId,newPassword, updatedBy });
  }

  changePassword(currentPassword: string, newPassword: string, oldPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, { currentPassword, newPassword,oldPassword });
  }
    // Method to delete user by ID
    deleteUser(username: string, headers: HttpHeaders): Observable<any> {
      return this.http.delete(`${this.apiUrl}/delete-user/${username}`,  { headers });
  }
  isLoggedIn(): boolean {
    // console.log("token",localStorage.getItem('token'))
    return typeof window !== 'undefined' && localStorage.getItem('token') !== null;; // Return false if localStorage is not available
  
  }
  getAllUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-all-users`);
  }
  getUserDetails(userId: number): Observable<any> {
    const params = new HttpParams().set('userId', userId); // Pass userId as a query param

    return this.http.get<any>(`${this.apiUrl}/user-details`, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching user details:', error);
        return throwError(() => new Error('Failed to fetch user details'));
      })
    );
  }
  getLockedEstimations(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/estimation/locked`);
  }
  
  // Utility function to extract role from username
  private extractRoleFromUsername(username: string): string {
    const parts = username.split('_');
    if (parts.length > 1) {
      const roleString = parts[1].split('@')[0];   // Extract the role portion
      const normalizedRolePart = roleString.replace(/_/g, '').toLowerCase(); // This removes underscores
      // console.log(roleString);
      switch (normalizedRolePart) {
        case 'admin':
          return UserRole.admin;
        case 'subadmin':
          return UserRole.sub_admin;
        case 'superadmin':
          return UserRole.super_admin;
        case 'doctor':
          return UserRole.doctor;
        default:
          console.warn(`Unknown role: ${roleString}`); // Warning for unrecognized role
          return UserRole.unknown;  // Use 'unknown' or a neutral fallback if available
      }
    }
    // Ensure role is valid as per the UserRole enum

    return UserRole.super_admin; 
  }
   // Default to 'user' if no role is found
}  // Default role
  

