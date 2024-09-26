import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-account-creation',
  templateUrl: './account-creation.component.html',
  styleUrl: './account-creation.component.css'
})
export class AccountCreationComponent {
  employeeData = { name: '', password: '' };

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.authService.register(this.employeeData).subscribe({
      next: (response) => {
        alert('Registration successful, your Employee ID is: ' + response.employeeId);
      },
      error: (err) => {
        alert('Registration failed');
      },
    });
  }
}
