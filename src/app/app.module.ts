import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';


import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import {  MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MessageService } from 'primeng/api';



import {MatSelectModule} from '@angular/material/select';
import { FloatLabelModule } from 'primeng/floatlabel';

//Module for the application
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';


import { DashboardModuleComponent } from './dashboard/dashboard-module/dashboard-module.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DashboardOverviewComponent } from './dashboard/dashboard-overview/dashboard-overview.component';
import { DoctorsListOverviewComponent } from './dashboard/doctors-list-overview/doctors-list-overview.component';
import { AppointmentListOverviewComponent } from './dashboard/appointment-list-overview/appointment-list-overview.component';
import { TotalOverviewComponent } from './dashboard/total-overview/total-overview.component';
import { AppointmentOverviewComponent } from './appointment/appointment-overview/appointment-overview.component';
import { AppointmentRequestComponent } from './appointment/appointment-request/appointment-request.component';
import { AppointmentConfirmComponent } from './appointment/appointment-confirm/appointment-confirm.component';
import { AppointmentCancelComponent } from './appointment/appointment-cancel/appointment-cancel.component';
import { AppointmentFormComponent } from './appointment/appointment-form/appointment-form.component';
import { DoctorDetailsComponent } from './doctor/doctor-details/doctor-details.component';
import { DoctorOverviewComponent } from './doctor/doctor-overview/doctor-overview.component';
import { DoctorAvailabilityComponent } from './doctor/doctor-availability/doctor-availability.component';
import { MatOption, MatOptionModule } from '@angular/material/core';
import { DoctorFormComponent } from './doctor/doctor-form/doctor-form.component';
import { LoginComponent } from './login/login/login.component';
import { SettingsComponent } from './settings/settings/settings.component';
import { ReportOverviewComponent } from './report/report-overview/report-overview.component';
import { AdminReportComponent } from './report/admin-report/admin-report.component';
import { AppointmentCompleteComponent } from './appointment/appointment-complete/appointment-complete.component';
import { DoctorReportComponent } from './report/doctor-report/doctor-report.component';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog/delete-confirmation-dialog.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePipe } from '@angular/common';
import { InactivityService } from './services/inactivity.service';


@NgModule({
  declarations: [
    AppComponent,
    DashboardModuleComponent,
    SidebarComponent,
    DashboardOverviewComponent,
    DoctorsListOverviewComponent,
    AppointmentListOverviewComponent,
    TotalOverviewComponent,
    AppointmentOverviewComponent,
    AppointmentRequestComponent,
    AppointmentConfirmComponent,
    AppointmentCancelComponent,
    AppointmentFormComponent,
    DoctorDetailsComponent,
    DoctorOverviewComponent,
    DoctorAvailabilityComponent,
    DoctorFormComponent,
    LoginComponent,
    SettingsComponent,
    ReportOverviewComponent,
    AdminReportComponent,
    AppointmentCompleteComponent,
    DoctorReportComponent,
    DeleteConfirmationDialogComponent,
  
    
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
    TableModule,
    PaginatorModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTooltipModule,
    MatDatepickerModule,
    TooltipModule,
    MatLabel,
    MatOptionModule,
    MatSelectModule,
    FloatLabelModule,
    MatFormFieldModule,
    BrowserAnimationsModule,
    ToastModule,
    MultiSelectModule,
    ProgressSpinnerModule
  ],
  providers: [
    DatePipe,
    InactivityService,
    MessageService,
    provideClientHydration(),
    // provideAnimationsAsync(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
