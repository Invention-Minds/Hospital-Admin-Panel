import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardOverviewComponent } from './dashboard/dashboard-overview/dashboard-overview.component';
import { AppointmentOverviewComponent } from './appointment/appointment-overview/appointment-overview.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardOverviewComponent },
  { path:'',component:DashboardOverviewComponent},
  {path:'appointments', component:AppointmentOverviewComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
