import { Component } from '@angular/core';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-module',
  templateUrl: './dashboard-module.component.html',
  styleUrl: './dashboard-module.component.css'
})
export class DashboardModuleComponent {
  username: string = '';
  role: string = '';
  dropdownOpen: boolean = false;
  constructor(private authService: AuthServiceService, private router: Router) {}

  ngOnInit(): void {
    const storedUsername = localStorage.getItem('username');
    const storedRole = localStorage.getItem('role');

    const user = this.authService.getUser();
    if (storedUsername && storedRole) {
      this.username = storedUsername;
      this.role = storedRole;
    }
    console.log(this.username, this.role);
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
