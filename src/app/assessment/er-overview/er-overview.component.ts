import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ErService } from '../../services/er/er.service';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-er-overview',
  templateUrl: './er-overview.component.html',
  styleUrl: './er-overview.component.css'
})
export class ErOverviewComponent {
  constructor(private router: Router, private erService: ErService, private messageService: MessageService) { }

  activeComponent: string = 'new';
  isEditMode: boolean = false;
  role: string = '';  // User role
  selectedPatient: any;
  userId: string = ''; // User ID

  ngOnInit(): void {
    this.role = localStorage.getItem('role') || '';  // You can also fetch this from a service
    this.userId = localStorage.getItem('userid') || ''; // Fetch user ID from localStorage
  }
  showDoctorAvailability() {
    this.activeComponent = 'new';
  }

  showDoctorArrived() {
    this.activeComponent = 'list'
  }

}
