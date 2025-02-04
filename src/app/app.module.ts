import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { CommonModule } from '@angular/common';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { DialogModule } from '@angular/cdk/dialog';
import { PaginatorModule } from 'primeng/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import {  MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NgxLoadingButtonsModule } from 'ngx-loading-buttons';



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
import {MatBadgeModule} from '@angular/material/badge';
import { HealthCheckupFormComponent } from './health-checkup-service/health-checkup-form/health-checkup-form.component';
import { HealthCheckupOverviewComponent } from './health-checkup-service/health-checkup-overview/health-checkup-overview.component';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { HealthCheckupConfirmedComponent } from './health-checkup-service/health-checkup-confirmed/health-checkup-confirmed/health-checkup-confirmed.component';
import { HealthCheckupCancelComponent } from './health-checkup-service/health-checkup-cancel/health-checkup-cancel/health-checkup-cancel.component';
import { HealthCheckupCompleteComponent } from './health-checkup-service/health-checkup-complete/health-checkup-complete/health-checkup-complete.component';
import { HealthCheckupRequestComponent } from './health-checkup-service/health-checkup-request/health-checkup-request/health-checkup-request.component';
import { ColdObservable } from 'rxjs/internal/testing/ColdObservable';
import { LoaderComponent } from './loader/loader.component';
import { LoadingInterceptor } from './loading.interceptor';
import { HealthCheckupRepeatComponent } from './health-checkup-service/health-checkup-repeat/health-checkup-repeat.component';
import { SignatureComponent } from './signature/signature/signature.component';
import { TodayConsultationsComponent } from './doctor-role/today-consultations/today-consultations/today-consultations.component';
import { OverviewComponent } from './doctor-role/overview/overview/overview.component';
import { FutureConsultationsComponent } from './doctor-role/future-consultations/future-consultations/future-consultations.component';
import { TvComponent } from './tv/tv/tv.component';
import { TvControlComponent } from './tv-control/tv-control/tv-control.component';
import { EstimationFormComponent } from './estimation/estimation-form/estimation-form/estimation-form.component';
import { EstimationOverviewComponent } from './estimation/estimation-overview/estimation-overview/estimation-overview.component';
import { EstimationRequestComponent } from './estimation/estimation-request/estimation-request/estimation-request.component';
import { EstimationApprovedComponent } from './estimation/estimation-approved/estimation-approved/estimation-approved.component';
import { EstimationConfirmedComponent } from './estimation/estimation-confirmed/estimation-confirmed/estimation-confirmed.component';
import { EstimationCompleteComponent } from './estimation/estimation-complete/estimation-complete/estimation-complete.component';
import { EstimationOverdueComponent } from './estimation/estimation-overdue/estimation-overdue/estimation-overdue.component';
import { EstimationSubmitComponent } from './estimation/estimation-submit/estimation-submit/estimation-submit.component';
import { DoctorAppointmentsComponent } from './doctor/doctor-appointments/doctor-appointments/doctor-appointments.component';
import { AppointmentTransferComponent } from './appointment/appointment-transfer/appointment-transfer/appointment-transfer.component';



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
    HealthCheckupFormComponent,
    HealthCheckupOverviewComponent,
    HealthCheckupConfirmedComponent,
    HealthCheckupCancelComponent,
    HealthCheckupCompleteComponent,
    HealthCheckupRequestComponent,
    LoaderComponent,
    HealthCheckupRepeatComponent,
    SignatureComponent,
    TodayConsultationsComponent,
    OverviewComponent,
    FutureConsultationsComponent,
    TvComponent,
    TvControlComponent,
    EstimationFormComponent,
    EstimationOverviewComponent,
    EstimationRequestComponent,
    EstimationApprovedComponent,
    EstimationConfirmedComponent,
    EstimationCompleteComponent,
    EstimationOverdueComponent,
    EstimationSubmitComponent,
    DoctorAppointmentsComponent,
    AppointmentTransferComponent,

  
    
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
    ProgressSpinnerModule,
    MatBadgeModule,
    ConfirmPopupModule,
    DialogModule,
    NgxLoadingButtonsModule,
    CommonModule
  ],
  providers: [
    DatePipe,
    InactivityService,
    MessageService,
    ConfirmationService,
    provideClientHydration(),
    // provideAnimationsAsync(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true
    }
    
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
