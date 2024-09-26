import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-account-login',
  templateUrl: './account-login.component.html',
  styleUrl: './account-login.component.css'
})
export class AccountLoginComponent {
  credentials = { name:'', password: '' };

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);
        alert('Login successful, Employee ID: ' + response.employeeId);
      },
      error: (err) => {
        alert('Login failed');
      },
    });
  }

}
