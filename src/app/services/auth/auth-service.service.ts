import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators'; 

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
  private apiUrl = 'http://localhost:3000/api/login'; // Replace with your backend URL
  public role: string | null = null;
  public user: { username: string; role: string, id:number } | null = null;

  constructor(private http: HttpClient) { 
    this.initializeUserFromStorage(); 
  }
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { username, password }).pipe(
      tap((response: any) => {
        const user = response.user;  // Use 'user' from the response
        console.log('User in the login:', user);
        if (user) {
          this.user = { username: user.username, role: user.role, id: user.userId }; // Save the user in the service
          localStorage.setItem('username', user.username);
          localStorage.setItem('role', user.role);
          localStorage.setItem('userid',user.userId)
          localStorage.setItem('token', response.token);  // Save the token in localStorage
        }
      })
    );
  }
  getUserId(): number | null {
    const userId = localStorage.getItem('userid');
    console.log(userId,"from auth service");
    return userId ? parseInt(userId, 10) : null;

  }
// Method to initialize the user from localStorage
initializeUserFromStorage(): void {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userid');

  if (username && role && userId) {
    this.user = {
      username,
      role,
      id: parseInt(userId, 10),
    };
    console.log('Initialized user from storage:', this.user);
  }
}
  getUser() {
    return this.user;
    console.log(this.user);
  }

  register(username: string, password: string): Observable<any> {
    const role = this.extractRoleFromUsername(username);  // Extract role
    return this.http.post(`${this.apiUrl}/register`, { username, password }).pipe(
      tap(response => {
        this.role = role;  // Save the role
      })
    );
  }

  resetPassword(username: string,newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { username,newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, { currentPassword, newPassword });
  }
    // Method to delete user by ID
    deleteUser(username: string, headers: HttpHeaders): Observable<any> {
      return this.http.delete(`http://localhost:3000/api/login/delete-user/${username}`,  { headers });
  }
  
  // Utility function to extract role from username
  private extractRoleFromUsername(username: string): string {
    const parts = username.split('_');
    if (parts.length > 1) {
      const roleString = parts[1].split('@')[0];   // Extract the role portion
      const normalizedRolePart = roleString.replace(/_/g, '').toLowerCase(); // This removes underscores
      console.log(roleString);
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
  

