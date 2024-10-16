import { Component , OnInit} from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  role: string = ''; 
  constructor() {}
  ngOnInit(): void {
    // Fetch role from localStorage or the authentication service
    this.role = localStorage.getItem('role') || '';  // You can also fetch this from a service
    console.log('User role:', this.role);
  }

}
