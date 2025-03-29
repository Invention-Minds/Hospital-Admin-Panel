import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardOverviewComponent } from './dashboard/dashboard-overview/dashboard-overview.component';
import { AppointmentOverviewComponent } from './appointment/appointment-overview/appointment-overview.component';
import { AppointmentRequestComponent } from './appointment/appointment-request/appointment-request.component';
import { AppointmentFormComponent } from './appointment/appointment-form/appointment-form.component';
import { DoctorOverviewComponent } from './doctor/doctor-overview/doctor-overview.component';
import { DoctorFormComponent } from './doctor/doctor-form/doctor-form.component';
import { LoginComponent } from './login/login/login.component';
import { SettingsComponent } from './settings/settings/settings.component';
import { ReportOverviewComponent } from './report/report-overview/report-overview.component';
import { HealthCheckupOverviewComponent } from './health-checkup-service/health-checkup-overview/health-checkup-overview.component';
import { authGuard } from './auth.guard';
import { HealthCheckupFormComponent } from './health-checkup-service/health-checkup-form/health-checkup-form.component';
import { UnsavedChangesGuard } from './guards/unsaved-changes.guard';
import { TotalOverviewComponent } from './dashboard/total-overview/total-overview.component';
import { TodayConsultationsComponent } from './doctor-role/today-consultations/today-consultations/today-consultations.component';
import { OverviewComponent } from './doctor-role/overview/overview/overview.component';
import { TvComponent } from './tv/tv/tv.component';
import { TvControlComponent } from './tv-control/tv-control/tv-control.component';
import { EstimationOverviewComponent } from './estimation/estimation-overview/estimation-overview/estimation-overview.component';
import { AnalyticsRootComponent } from './analytics/analytics-root/analytics-root.component';
import { ServiceOverviewComponent } from './service-radiology/service-overview/service-overview.component';
import { OverviewRadiologyComponent } from './radiology/overview-radiology/overview-radiology.component';
import { SamraskhaApptOverviewComponent } from './samraksha/samraskha-appt-overview/samraskha-appt-overview.component';
import { MaintainanceComponent } from './maintainance/maintainance/maintainance.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardOverviewComponent, canActivate:[authGuard] },
  {path: 'maintenance', component: MaintainanceComponent, canActivate:[authGuard] },
  // { path:'',component:DashboardOverviewComponent},
  {path:'appointments', component:AppointmentOverviewComponent,canActivate:[authGuard]},
  { path: 'appointment-request', component: AppointmentRequestComponent,canActivate:[authGuard] },
  { path: 'new-appointment', component: AppointmentFormComponent,canActivate:[authGuard] },
  {path:'doctor',component:DoctorOverviewComponent,canActivate:[authGuard]},
  {path:'doctor-profile',component: DoctorFormComponent,canActivate:[authGuard]},
  {path:'login', component:LoginComponent},
  {path:'settings', component: SettingsComponent,canActivate:[authGuard]},
  {path:'report',component: ReportOverviewComponent,canActivate:[authGuard]},
  {path: 'health-checkup', component: HealthCheckupOverviewComponent,canActivate:[authGuard]},
  {path: 'services', component: ServiceOverviewComponent,canActivate:[authGuard]},
  {path: 'radiology-services', component: OverviewRadiologyComponent,canActivate:[authGuard]},
  { path: 'reschedule/:id', component: HealthCheckupFormComponent,canActivate:[authGuard] },
  {path:'doctor-appointments', component: OverviewComponent, canActivate:[authGuard]},
  {path: 'tv-control', component: TvControlComponent, canActivate:[authGuard]},
  { path: 'channel/:channelId', component: TvComponent },
  {path: 'estimation', component: EstimationOverviewComponent, canActivate:[authGuard]},
  {path: 'analytics', component: AnalyticsRootComponent, canActivate:[authGuard]},
  {path: 'blood-appointments', component: SamraskhaApptOverviewComponent, canActivate:[authGuard]},
  {
    path: 'form',
    component: HealthCheckupFormComponent,
    canDeactivate: [UnsavedChangesGuard], // Apply the guard
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },



];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
