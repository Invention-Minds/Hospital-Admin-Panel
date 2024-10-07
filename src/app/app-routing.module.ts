import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardOverviewComponent } from './dashboard/dashboard-overview/dashboard-overview.component';
import { AppointmentOverviewComponent } from './appointment/appointment-overview/appointment-overview.component';
import { AppointmentRequestComponent } from './appointment/appointment-request/appointment-request.component';
import { AppointmentFormComponent } from './appointment/appointment-form/appointment-form.component';
import { DoctorOverviewComponent } from './doctor/doctor-overview/doctor-overview.component';
import { DoctorFormComponent } from './doctor/doctor-form/doctor-form.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardOverviewComponent },
  { path:'',component:DashboardOverviewComponent},
  {path:'appointments', component:AppointmentOverviewComponent},
  { path: 'appointment-request', component: AppointmentRequestComponent },
  { path: 'new-appointment', component: AppointmentFormComponent },
  {path:'doctor',component:DoctorOverviewComponent},
  {path:'doctor-profile',component: DoctorFormComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
