import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AccountCreationComponent } from './account-creation/account-creation.component';
import { AccountLoginComponent } from './account-login/account-login.component';

import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';

//Module for the application
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {FormsModule} from '@angular/forms';


import { DashboardModuleComponent } from './dashboard/dashboard-module/dashboard-module.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DashboardOverviewComponent } from './dashboard/dashboard-overview/dashboard-overview.component';
import { DoctorsListOverviewComponent } from './dashboard/doctors-list-overview/doctors-list-overview.component';
import { AppointmentListOverviewComponent } from './dashboard/appointment-list-overview/appointment-list-overview.component';
import { TotalOverviewComponent } from './dashboard/total-overview/total-overview.component';
import { AppointmentOverviewComponent } from './appointment/appointment-overview/appointment-overview.component';


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
    TotalOverviewComponent,
    AppointmentOverviewComponent,
  
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
    CalendarModule,
  ],
  providers: [
    provideClientHydration(),
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
