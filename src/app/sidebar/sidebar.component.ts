import { Component , OnInit, Output, EventEmitter} from '@angular/core';
import { SettingsComponent } from "../settings/settings/settings.component";
import { AppointmentConfirmService } from '../services/appointment-confirm.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  
})
export class SidebarComponent implements OnInit {
  role: string = ''; 
  subAdminType: string = ''
  adminType: string = ''
  type: string[] = []
  // openSetting: boolean = false;
  constructor(private appointmentService: AppointmentConfirmService) {}
  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      this.role = localStorage.getItem('role') || '';
      this.subAdminType = localStorage.getItem('subAdminType') || '';
      this.adminType = localStorage.getItem('adminType') || '';
      this.type = [this.adminType].filter(value => value !== '');

    console.log("User types:", this.type);

      // console.log('User role:', this.role);
    } else {
      console.log('localStorage is not available');
    }
  }
  isExpanded: boolean = false;

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
  }


  openSettings(): void {
    this.appointmentService.openSettingsModal()
    console.log('Settings opened');
  }
  hasEstimationAccess(): boolean {
    const allowedRoles = this.adminType;
    // console.log(this.type.some(t => allowedRoles.includes(t)))
    return this.type.some(t => allowedRoles.includes(t));  // Fix arrow function usage
  }
  isNotEstimator(): boolean {
    return !(this.role === 'sub_admin' && this.subAdminType === 'Estimator');
  }
  isEstimator():boolean {
    return(this.role === 'sub_admin' && this.subAdminType === 'Estimator')
  }
}
