import { Component , OnInit, Output, EventEmitter} from '@angular/core';
import { SettingsComponent } from "../settings/settings/settings.component";

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  
})
export class SidebarComponent implements OnInit {
  role: string = ''; 
  // openSetting: boolean = false;
  constructor() {}
  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      this.role = localStorage.getItem('role') || '';
      // console.log('User role:', this.role);
    } else {
      console.log('localStorage is not available');
    }
  }
  isExpanded: boolean = false;

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
  }
  @Output() toggleSettings = new EventEmitter<void>();

  openSettings(): void {
    this.toggleSettings.emit();
    console.log('Settings opened');
  }

}
