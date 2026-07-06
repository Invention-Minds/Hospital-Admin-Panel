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
  subAdminType: string = '';
  adminType: string = '';
  departmentName: string = '';
  type: string[] = [];
  // openSetting: boolean = false;
  constructor(private appointmentService: AppointmentConfirmService) {}
  isDesktopView: boolean = true;
  username: string = ''; // Initialize username
  deptId: number = 0; // Initialize deptId
  /** Block number parsed from the nurse's employeeId at login (e.g. "B2" → "2").
   *  Persisted to localStorage so the sidebar's "Appointments" link for the
   *  Nursing sub-admin can target /nursing/<blockId>; falls back to "0". */
  blockId: string = '0';
  /** NS — nurse capability flags (set from localStorage at login).
   *  isOpdNurse → in an OPD station (sees OPD Appointments).
   *  isIpdNurse → ward/IPD-scoped (sees clinical menus). A pure OPD nurse has
   *  only isOpdNurse, so they see just Appointments + Incidents. */
  isOpdNurse: boolean = false;
  isIpdNurse: boolean = false;

  

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
      this.departmentName = localStorage.getItem('departmentName') || '';
      this.type = [this.adminType].filter(value => value !== '');
      this.username = localStorage.getItem('username') || '';
      this.deptId = Number(localStorage.getItem('deptId')) || 0;
      this.blockId = localStorage.getItem('blockId') || '0';
      this.isOpdNurse = localStorage.getItem('isOpdNurse') === 'true';
      this.isIpdNurse = localStorage.getItem('isIpdNurse') === 'true';

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
  // ── Unified nursing identity (NS — collapse) ──────────────────────────
  // All bedside nurse subAdminTypes collapse to the canonical 'Nurse'. Legacy
  // values stay listed so accounts work during the one-time data migration.
  private readonly nurseTypes = ['Nurse', 'Nursing', 'IPD Nurse', 'ICU Nurse', 'Ward Coordinator'];
  get isNurse(): boolean {
    return this.role === 'sub_admin' && this.nurseTypes.includes(this.subAdminType);
  }
  get isNursingSuper(): boolean {
    return this.role === 'sub_admin' && this.subAdminType === 'Nursing Superintendent';
  }
  // A nurse is ward/clinical-focused, so the broad OPD + Investigations sections
  // stay hidden for them (they get their IPD/clinical menus + block vitals link).
  isNotNursing():boolean{
    return !this.isNurse;
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
  isTVController(): boolean {
  return this.role === 'sub_admin' && this.subAdminType === 'TV Coordinator';
}
isNotTVController(): boolean {
  return !(this.role === 'sub_admin' && this.subAdminType === 'TV Coordinator');
}
isNotDischargeCoordinator(): boolean {
  return !(this.role === 'sub_admin' && this.subAdminType === 'Discharge Coordinator');
}
isEmergencyDoctor(): boolean {
  return this.role === 'doctor' && this.departmentName.toLowerCase().includes('emergency');
}
isErNurse(): boolean {
  return this.role === 'sub_admin' && this.subAdminType === 'ER Nurse';
}
isNotErNurse(): boolean {
  return !this.isErNurse();
}

// ───────────────────────────────────────────────────────────────────────
// Section-header visibility.
//
// Each getter is the OR of the *ngIf conditions of the menu items inside
// that section. A section heading should only render when at least one of
// its items is visible for the current role — otherwise the user sees an
// orphan heading with nothing under it. These mirror the template item
// guards; if you add/remove an item, update the matching getter here.
// ───────────────────────────────────────────────────────────────────────

get showOpdSection(): boolean {
  // Nurses: OPD section only for OPD-station nurses (otherwise the label is an
  // orphan — a ward nurse has no OPD items under it).
  if (this.isNurse) return this.isOpdNurse;
  return ['super_admin', 'admin', 'doctor'].includes(this.role)
    || (this.role === 'sub_admin' && this.isNotEstimator() && this.isNotRadiology()
        && this.isNotLab() && this.isNotOT() && this.isNotTherapist() && this.isNotTVController()
        && this.isNotDischargeCoordinator() && this.isNotErNurse());
}

get showInvestigationsSection(): boolean {
  return this.isRadiology()
    || this.isLab()
    || this.subAdminType === 'Therapist'
    || (this.role === 'doctor' && this.isAyurveda())
    || (['super_admin', 'admin', 'sub_admin'].includes(this.role)
        && this.isNotEstimator() && this.isNotIpBillingManager() && this.isNotRadiology()
        && this.isNotMHC() && !this.isMukund() && this.isNotLab() && this.isNotNursing()
        && this.isNotOT() && this.isNotTherapist() && this.isNotTVController()
        && this.isNotDischargeCoordinator() && this.isNotErNurse());
}

get showEmergencySection(): boolean {
  // Broadest item (Incidents) is visible to every super_admin/admin/doctor/sub_admin.
  return ['super_admin', 'admin', 'doctor', 'sub_admin'].includes(this.role);
}

get showIpdSection(): boolean {
  return this.role === 'doctor' || this.role === 'super_admin'
    || this.isIpdNurse || this.isNursingSuper;
}

get showOtSection(): boolean {
  return this.role === 'super_admin' || this.role === 'doctor'
    || this.subAdminType === 'OT Coordinator' || this.isIpdNurse;
}

get showDieteticsSection(): boolean {
  return this.role === 'super_admin' || this.role === 'doctor'
    || ['Dietician', 'Canteen Staff'].includes(this.subAdminType) || this.isIpdNurse;
}

get showDischargeSection(): boolean {
  return this.role === 'super_admin' || this.role === 'doctor'
    || this.subAdminType === 'Discharge Coordinator'
    || ['Manager', 'Management', 'Senior Manager', 'IT Manager'].includes(this.adminType)
    || this.isEstimator() || this.isIpBillingManager();
}

get showReportingSection(): boolean {
  return this.role === 'super_admin'
    || this.isTVController()
    || ['Manager', 'Management', 'Senior Manager'].includes(this.adminType)
    || (['super_admin', 'admin'].includes(this.role) && this.isNotIpBillingManager()
        && this.isNotRadiology() && !this.isMukund() && this.isNotLab()
        && this.isNotOT() && this.isNotTherapist());
}

get showAdminSection(): boolean {
  return ['super_admin', 'admin', 'doctor'].includes(this.role)
    || this.isIpdNurse || this.isNursingSuper
    || ['OT Coordinator', 'Therapist', 'Dietician', 'Canteen Staff',
        'Lab Coordinator', 'Radiology Coordinator']
        .includes(this.subAdminType);
}
}
