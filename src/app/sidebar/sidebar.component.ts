import { Component , OnInit, Output, EventEmitter, HostListener} from '@angular/core';
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
  isDesktopView: boolean = true;
  username: string = ''; // Initialize username
  deptId: number = 0; // Initialize deptId

  

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isDesktopView = window.innerWidth > 500; // Use table if screen width > 768px
  }
  ngOnInit(): void {
    this.checkScreenSize()
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      this.role = localStorage.getItem('role') || '';
      this.subAdminType = localStorage.getItem('subAdminType') || '';
      this.adminType = localStorage.getItem('adminType') || '';
      this.type = [this.adminType].filter(value => value !== '');
      this.username = localStorage.getItem('username') || '';
      this.deptId = Number(localStorage.getItem('deptId')) || 0;

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
  isNotMHC(): boolean {
    return !(this.role === 'sub_admin' && this.subAdminType === 'MHC Coordinator');
  }
  isEstimator():boolean {
    return(this.role === 'sub_admin' && this.subAdminType === 'Estimator')
  }
  isIpBillingManager():boolean{
    return(this.role === 'admin' && this.adminType === 'IP Billing Manager')
  }
  isNotIpBillingManager():boolean{
    return !(this.role === 'admin' && this.adminType === 'IP Billing Manager')
  }
  isMHC():boolean{
    return(this.role === 'sub_admin' && this.subAdminType === 'MHC Coordinator')
  }
  isRadiology():boolean{
    return(this.role === 'sub_admin' && this.subAdminType === 'Radiology Coordinator')
  }
  isNotRadiology():boolean{
    return !(this.role === 'sub_admin' && this.subAdminType === 'Radiology Coordinator')
  }
  isLab():boolean{
    return(this.role === 'sub_admin' && this.subAdminType === 'Lab Coordinator')
  }
  isNotLab():boolean{
    return !(this.role === 'sub_admin' && this.subAdminType === 'Lab Coordinator')
  }
  isMukund():boolean{
    return(this.role === 'admin' && this.username === 'Mukund Parathasarthy_admin@rashtrotthana')
  }
  isNotNursing():boolean{
    return !(this.role === 'sub_admin' && this.subAdminType === 'Nursing')
  }
  isNotOT():boolean{
    return !(this.role === 'sub_admin' && this.subAdminType === 'OT Coordinator')
  }
  isAyurveda():boolean{
    return(this.deptId == 2)
  }
  isNotTherapist():boolean{
    return !(this.role === 'sub_admin' && this.subAdminType === 'Therapist')
  }
}
