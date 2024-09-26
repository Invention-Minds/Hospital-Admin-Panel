import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AccountCreationComponent } from './account-creation/account-creation.component';
import { AccountLoginComponent } from './account-login/account-login.component';


//Module for the application
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import { DashboardModuleComponent } from './dashboard/dashboard-module/dashboard-module.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DashboardOverviewComponent } from './dashboard/dashboard-overview/dashboard-overview.component';
import { DoctorsListOverviewComponent } from './dashboard/doctors-list-overview/doctors-list-overview.component';
import { AppointmentListOverviewComponent } from './dashboard/appointment-list-overview/appointment-list-overview.component';

@NgModule({
  declarations: [
    AppComponent,
    AccountCreationComponent,
    AccountLoginComponent,
    DashboardModuleComponent,
    SidebarComponent,
    DashboardOverviewComponent,
    DoctorsListOverviewComponent,
    AppointmentListOverviewComponent,
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    provideClientHydration(),
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
