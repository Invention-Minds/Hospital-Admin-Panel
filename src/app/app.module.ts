import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PhoneMaskPipe } from './services/phone-mask.pipe';
import { ChartModule } from 'primeng/chart';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { CommonModule } from '@angular/common';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule } from 'primeng/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NgxLoadingButtonsModule } from 'ngx-loading-buttons';



import {MatSelectModule} from '@angular/material/select';
import { FloatLabelModule } from 'primeng/floatlabel';

//Module for the application
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CheckboxModule } from 'primeng/checkbox';
import { BadgeModule } from 'primeng/badge';


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
import { InactiveDoctorsComponent } from './doctor/inactive-doctors/inactive-doctors.component';
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
import { NewFormComponent } from './appointment/new-form/new-form.component';
import { MhcFormComponent } from './health-checkup-service/mhc-form/mhc-form.component';
import { MhcTodayConsulComponent } from './health-checkup-service/mhc-today-consul/mhc-today-consul.component';
import { AnalyticsRootComponent } from './analytics/analytics-root/analytics-root.component';
import { OpdEstimationPieComponent } from './analytics/opd-estimation-pie/opd-estimation-pie.component';
import { OpdRequestComponent } from './analytics/opd-request/opd-request.component';
import { OpdOverviewComponent } from './analytics/opd-overview/opd-overview.component';
import { ReportFilterComponent } from './analytics/report-filter/report-filter.component';
import { AverageWaitingTimeComponent } from './analytics/average-waiting-time/average-waiting-time.component';
import { DoctorLoginActivityComponent } from './analytics/doctor-login-activity/doctor-login-activity.component';
import { ModuleUtilizationComponent } from './analytics/module-utilization/module-utilization.component';
import { OpdTimeWiseComponent } from './analytics/opd-time-wise/opd-time-wise.component';
import { MhcOverviewComponent } from './analytics/mhc-overview/mhc-overview.component';
import { OpdTypeComponent } from './analytics/opd-type/opd-type.component';
import { GenderOverviewComponent } from './analytics/gender-overview/gender-overview.component';
import { LoadingComponent } from './analytics/loading/loading.component';
import { DelayReportComponent } from './analytics/delay-report/delay-report.component'; 
import { TodayAnalyticsComponent } from './analytics/today-analytics/today-analytics.component';
import { EstimationBarComponent } from './analytics/estimation-bar/estimation-bar.component';
import { AgeChartComponent } from './analytics/age-chart/age-chart.component';
import { MaintainanceComponent } from './maintainance/maintainance/maintainance.component';
import { ArrivedConsultationComponent } from './doctor-role/arrived-consultation/arrived-consultation.component';
import { ConfirmMhcComponent } from './health-checkup-service/confirm-mhc/confirm-mhc.component';
import { MhcReportComponent } from './health-checkup-service/mhc-report/mhc-report.component';
import { MhcWaitingTimeComponent } from './analytics/mhc-waiting-time/mhc-waiting-time.component';
import { EstimationTypeReportComponent } from './analytics/estimation-type-report/estimation-type-report.component';
import { ServiceFormComponent } from './service-radiology/service-form/service-form.component';
import { ServiceConfirmComponent } from './service-radiology/service-confirm/service-confirm.component';
import { ServiceCancelComponent } from './service-radiology/service-cancel/service-cancel.component';
import { ServiceCompleteComponent } from './service-radiology/service-complete/service-complete.component';
import { ServiceOverviewComponent } from './service-radiology/service-overview/service-overview.component';
import { MhcRadiologyComponent } from './health-checkup-service/mhc-radiology/mhc-radiology.component';
import { ConfirmRadioComponent } from './health-checkup-service/confirm-radio/confirm-radio.component';
import { ConfirmRadiologyComponent } from './radiology/confirm-radiology/confirm-radiology.component';
import { OverviewRadiologyComponent } from './radiology/overview-radiology/overview-radiology.component';
import { ReferredComponent } from './appointment/referred/referred.component';
import { SamrakshaApptComponent } from './samraksha/samraksha-appt/samraksha-appt.component';
import { SamraskhaApptOverviewComponent } from './samraksha/samraskha-appt-overview/samraskha-appt-overview.component';
import { SamrakshaApptConfirmComponent } from './samraksha/samraksha-appt-confirm/samraksha-appt-confirm.component';
import { SamrakshaApptCancelComponent } from './samraksha/samraksha-appt-cancel/samraksha-appt-cancel.component';
import { SamrakshaApptCompleteComponent } from './samraksha/samraksha-appt-complete/samraksha-appt-complete.component';
import { SamrakshaApptRepeatComponent } from './samraksha/samraksha-appt-repeat/samraksha-appt-repeat.component';
import { EstimationLockComponent } from './estimation-lock/estimation-lock.component';
import { SidebarHelpComponent } from './sidebar-help/sidebar-help.component';
import { HelpCenterComponent } from './help-center/help-center.component';
import { FAQComponent } from './help-center/faq/faq.component';


import { PastConsultationsComponent } from './doctor-role/past-consultations/past-consultations.component';
import { ApptFollowUpComponent } from './appointment/appt-follow-up/appt-follow-up.component';
import { RedirectorComponent } from './redirector/redirector.component';
import { LabConsultationsComponent } from './lab/lab-consultations/lab-consultations.component';
import { LabOverviewComponent } from './lab/lab-overview/lab-overview.component';
import { MaternityEstimationComponent } from './estimation/maternity-estimation/maternity-estimation.component';
import { FollowupEstimationComponent } from './estimation/followup-estimation/followup-estimation.component';
import { EstimationCancelComponent } from './estimation/estimation-cancel/estimation-cancel.component';
import { PatientInfoComponent } from './patient/patient-info/patient-info.component';
import { PatientDetailsComponent } from './patient/patient-details/patient-details.component';
import { PatientNewComponent } from './patient/patient-new/patient-new.component';
import { PatientOverviewComponent } from './patient/patient-overview/patient-overview.component';
import { NursingOverviewComponent } from './nursing/nursing-overview/nursing-overview.component';
import { NursingVitalsComponent } from './nursing/nursing-vitals/nursing-vitals.component';
import { OtOverviewComponent } from './ot/ot-overview/ot-overview.component';
import { TodayOtComponent } from './ot/today-ot/today-ot.component';
import { OtTvDisplayComponent } from './ot-tv-display/ot-tv-display.component';
import { EstimationAnalyticsComponent } from './estimation-analytics/estimation-analytics.component';
import { HandWrittenComponent } from './assessment/hand-written/hand-written.component';
import { OpdAssessmentComponent } from './assessment/opd-assessment/opd-assessment.component';
import { OpdPrintComponent } from './assessment/opd-print/opd-print.component';
import { ErAssessmentComponent } from './assessment/er-assessment/er-assessment.component';
import { ErListComponent } from './assessment/er-list/er-list.component';
import { ErOverviewComponent } from './assessment/er-overview/er-overview.component';
import { TherapyOverviewComponent } from './therapy-appts/therapy-overview/therapy-overview.component';
import { TherapyConfirmedComponent } from './therapy-appts/therapy-confirmed/therapy-confirmed.component';
import { TherapyCancelledComponent } from './therapy-appts/therapy-cancelled/therapy-cancelled.component';
import { TherapyCompletedComponent } from './therapy-appts/therapy-completed/therapy-completed.component';
import { TherapyFormComponent } from './therapy-appts/therapy-form/therapy-form.component';
import { TherapyCoursesComponent } from './therapy-appts/therapy-courses/therapy-courses.component';
import { TherapistAvailabilityComponent } from './therapy-appts/therapist-availability/therapist-availability.component';
import { TherapistOverviewComponent } from './therapist/therapist-overview/therapist-overview.component';
import { TherapistApptsComponent } from './therapist/therapist-appts/therapist-appts.component';
import { TherapyChannelComponent } from './therapy-channel/therapy-channel/therapy-channel.component';
import { TherapyAnalyticsComponent } from './therapy-analytics/therapy-analytics/therapy-analytics.component';
import { CallBackComponent } from './estimation/call-back/call-back.component';
import { CheckinReportComponent } from './report/checkin-report/checkin-report.component';

// HMIS Modules
import { EmergencyOverviewComponent } from './emergency/emergency-overview.component';
import { EmergencyIntakeComponent } from './emergency/emergency-intake/emergency-intake.component';
import { EmergencyListComponent } from './emergency/emergency-list/emergency-list.component';
import { IpdOverviewComponent } from './ipd/ipd-overview.component';
import { IpdAdmissionComponent } from './ipd/ipd-admission/ipd-admission.component';
import { IpdProgressNoteComponent } from './ipd/ipd-progress-note/ipd-progress-note.component';
import { IpdReportsComponent } from './ipd/ipd-reports/ipd-reports.component';
import { IpdInsulinChartComponent } from './ipd/ipd-insulin-chart/ipd-insulin-chart.component';
import { IpdDischargeComponent } from './ipd/ipd-discharge/ipd-discharge.component';
import { IpdPharmacyComponent } from './ipd/ipd-pharmacy/ipd-pharmacy.component';
import { IpdMarComponent } from './ipd/ipd-mar/ipd-mar.component';
import { WardCensusComponent } from './ward-management/ward-census.component';
import { MlcCasesComponent } from './mlc/mlc-cases.component';
import { MlcRegisterComponent } from './mlc/mlc-register/mlc-register.component';
import { MlcDetailComponent } from './mlc/mlc-detail/mlc-detail.component';
import { LamaDamaComponent } from './discharge/lama-dama.component';
import { SyncStatusComponent } from './hmis-sync/sync-status.component';

// Shared reusables (Sprint 3a-2 onward)
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from './shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from './shared/ui/page-header/page-header.component';
import { AdmissionTabsComponent } from './shared/ui/admission-tabs/admission-tabs.component';
import { HmisSyncIndicatorComponent } from './shared/ui/hmis-sync-indicator/hmis-sync-indicator.component';
// Phase 0 — NABH foundation reusables
import { ESignComponent } from './shared/ui/e-sign/e-sign.component';
import { PatientReportsTabComponent } from './lab-radiology/patient-reports-tab/patient-reports-tab.component';
import { CriticalResultBannerComponent } from './lab-radiology/critical-result-banner/critical-result-banner.component';
import { EstimationAdmissionActionsComponent } from './estimation/estimation-admission-actions/estimation-admission-actions.component';
// Phase 2 — consent bundle
import { ConsentBundleComponent } from './shared/ui/consent-bundle/consent-bundle.component';
// Phase 3 — NS bed-request acceptance queue
import { NsAcceptanceQueueComponent } from './ipd/ns-acceptance-queue/ns-acceptance-queue.component';
// Phase 3 — PRE bedside attender-acceptance screen
import { BedsideAcceptanceComponent } from './ipd/bedside-acceptance/bedside-acceptance.component';
// Phase 4 — Daily closure (WF-3)
import { DailyClosureComponent } from './ipd/daily-closure/daily-closure.component';
// Phase 5 — ICU transfer (WF-4)
import { IcuTransferComponent } from './ipd/icu-transfer/icu-transfer.component';
import { IcuTransferQueueComponent } from './ipd/icu-transfer-queue/icu-transfer-queue.component';
import { OtWorkbenchComponent } from './ot-workflow/ot-workbench/ot-workbench.component';
import { ReferralInboxComponent } from './emergency/referral-inbox/referral-inbox.component';
// Phase 7 — Staff handover / contingency reassignment
import { StaffHandoverComponent } from './staff-handover/staff-handover.component';
// Phase 2.5 — Revenue report tab
import { RevenueReportComponent } from './report/revenue-report/revenue-report.component';
// Phase 10 — NABH audit pack export
import { NabhAuditComponent } from './nabh-audit/nabh-audit.component';
// Phase 11 — OT workflow
import { OtBoardComponent } from './ot-workflow/ot-board/ot-board.component';
import { OtScheduleDetailComponent } from './ot-workflow/ot-schedule-detail/ot-schedule-detail.component';
import { OtClearanceCardComponent } from './ot-workflow/ot-clearance-card/ot-clearance-card.component';
import { OtScheduleExtrasComponent } from './ot-workflow/ot-schedule-extras/ot-schedule-extras.component';
import { IpdDischargeOperativeNotesComponent } from './ipd/ipd-discharge-operative-notes/ipd-discharge-operative-notes.component';
import { DiagnosisCodesCardComponent } from './ipd/diagnosis-codes-card/diagnosis-codes-card.component';
// Phase 9.13 — Treatment Dashboard (standalone), embedded as an IPD tab
import { TreatmentDashboardComponent } from './treatment-dashboard/treatment-dashboard.component';
// Note templates — admin manager + reusable form renderer
import { NoteTemplateManagerComponent } from './note-template-manager/note-template-manager.component';
import { MyOpdTemplatesComponent } from './doctor-role/my-opd-templates/my-opd-templates.component';
import { TemplateFormRendererComponent } from './shared/ui/template-form-renderer/template-form-renderer.component';
import { PrescriptionCaptureComponent } from './shared/ui/prescription-capture/prescription-capture.component';
import { InvestigationOrderComponent } from './assessment/investigation-order/investigation-order.component';
import { DoctorSelectComponent } from './shared/ui/doctor-select/doctor-select.component';

// Sprint 3e — LAMA/DAMA Register + Detail
import { LamaDamaRegisterComponent } from './lama-dama/lama-dama-register/lama-dama-register.component';
import { LamaDamaDetailComponent } from './lama-dama/lama-dama-detail/lama-dama-detail.component';
import { AdmitToIpdModalComponent } from './shared/ui/admit-to-ipd-modal/admit-to-ipd-modal.component';
import { CriticalValuesAlertComponent } from './services/critical-values-alert/critical-values-alert.component';
// Dietetics
import { DieteticsSetupComponent } from './dietetics/dietetics-setup/dietetics-setup.component';
import { DieticianQueueComponent } from './dietetics/dietician-queue/dietician-queue.component';
import { CanteenWorkspaceComponent } from './dietetics/canteen-workspace/canteen-workspace.component';
import { CanteenChannelComponent } from './dietetics/canteen-channel/canteen-channel.component';
import { DietAdmissionTabComponent } from './dietetics/diet-admission-tab/diet-admission-tab.component';
import { MastersComponent } from './masters/masters.component';
import { DutyAckModalComponent } from './scheduling/duty-ack-modal/duty-ack-modal.component';
// Designation-scoped dashboards (Phase 1 — Doctor)
import { DashboardDispatcherComponent } from './dashboards/dashboard-dispatcher/dashboard-dispatcher.component';
import { DoctorDashboardComponent } from './dashboards/doctor-dashboard/doctor-dashboard.component';
import { KpiTileComponent } from './dashboards/widgets/kpi-tile/kpi-tile.component';
import { PatientListCardComponent } from './dashboards/widgets/patient-list-card/patient-list-card.component';
import { DonutChartComponent } from './dashboards/widgets/donut-chart/donut-chart.component';
import { AlertRowComponent } from './dashboards/widgets/alert-row/alert-row.component';
import { MiniStatCardComponent } from './dashboards/widgets/mini-stat-card/mini-stat-card.component';
import { BarListCardComponent } from './dashboards/widgets/bar-list-card/bar-list-card.component';
import { ManagementDashboardComponent } from './dashboards/management-dashboard/management-dashboard.component';
import { FrontDeskDashboardComponent } from './dashboards/frontdesk-dashboard/frontdesk-dashboard.component';
import { NurseDashboardComponent } from './dashboards/nurse-dashboard/nurse-dashboard.component';
import { NursingSuperDashboardComponent } from './dashboards/nursing-super-dashboard/nursing-super-dashboard.component';


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
    InactiveDoctorsComponent,
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
    PhoneMaskPipe,
    NewFormComponent,
    MhcFormComponent,
    MhcTodayConsulComponent,
    AnalyticsRootComponent,
    OpdEstimationPieComponent,
    OpdRequestComponent, 
    OpdOverviewComponent,
    ReportFilterComponent,
    AverageWaitingTimeComponent,
    DoctorLoginActivityComponent,
    ModuleUtilizationComponent,
    OpdTimeWiseComponent,
    MhcOverviewComponent,
    OpdTypeComponent,
    GenderOverviewComponent,
    LoadingComponent,
    DelayReportComponent,
    TodayAnalyticsComponent,
    EstimationBarComponent,
    AgeChartComponent,
    EstimationBarComponent,
    MaintainanceComponent,
    ArrivedConsultationComponent,
    ConfirmMhcComponent,
    MhcReportComponent,
    EstimationTypeReportComponent,
    ServiceFormComponent,
    ServiceConfirmComponent,
    ServiceCancelComponent,
    ServiceCompleteComponent,
    ServiceOverviewComponent,
    MhcRadiologyComponent,
    ConfirmRadioComponent,
    ConfirmRadiologyComponent,
    OverviewRadiologyComponent,
    ReferredComponent,
    MhcWaitingTimeComponent,
    SamrakshaApptComponent,
    SamraskhaApptOverviewComponent,
    SamrakshaApptConfirmComponent,
    SamrakshaApptCancelComponent,
    SamrakshaApptCompleteComponent,
    SamrakshaApptRepeatComponent,
    EstimationLockComponent,
    PastConsultationsComponent,
    ApptFollowUpComponent,
    SidebarHelpComponent,
    HelpCenterComponent,
    FAQComponent,
    RedirectorComponent,
    LabConsultationsComponent,
    LabOverviewComponent,
    MaternityEstimationComponent,
    FollowupEstimationComponent,
    EstimationCancelComponent,
    PatientInfoComponent,
    PatientDetailsComponent,
    PatientNewComponent,
    PatientOverviewComponent,
    NursingOverviewComponent,
    NursingVitalsComponent,
    OtOverviewComponent,
    TodayOtComponent,
    OtTvDisplayComponent,
    EstimationAnalyticsComponent,
    HandWrittenComponent,
    OpdAssessmentComponent,
    OpdPrintComponent,
    ErAssessmentComponent,
    ErListComponent,
    ErOverviewComponent,
    TherapyOverviewComponent,
    TherapyConfirmedComponent,
    TherapyCancelledComponent,
    TherapyCompletedComponent,
    TherapyFormComponent,
    TherapyCoursesComponent,
    TherapistAvailabilityComponent,
    TherapistOverviewComponent,
    TherapistApptsComponent,
    TherapyChannelComponent,
    TherapyAnalyticsComponent,
    CallBackComponent,
    CheckinReportComponent,
    // HMIS Modules
    EmergencyOverviewComponent,
    EmergencyIntakeComponent,
    EmergencyListComponent,
    IpdOverviewComponent,
    IpdAdmissionComponent,
    IpdProgressNoteComponent,
    // Phase 9.11 — IPD admission "Reports" sub-page
    IpdReportsComponent,
    // Phase 9.14 — IPD Insulin Infusion Chart
    IpdInsulinChartComponent,
    IpdDischargeComponent,
    IpdPharmacyComponent,
    IpdMarComponent,
    WardCensusComponent,
    MlcCasesComponent,
    MlcRegisterComponent,
    MlcDetailComponent,
    LamaDamaComponent,
    SyncStatusComponent,
    // Shared reusables
    ConfirmDialogComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    AdmissionTabsComponent,
    HmisSyncIndicatorComponent,
    // Phase 0 — NABH foundation reusable. ESignComponent is now standalone
    // (declared in `imports` below) so it can be embedded in both NgModule-
    // declared and standalone components.
    // ESignComponent — moved to imports
    // Phase 2 — Consent bundle
    ConsentBundleComponent,
    // Phase 3 — NS acceptance queue
    NsAcceptanceQueueComponent,
    // Phase 3 — PRE bedside attender acceptance
    BedsideAcceptanceComponent,
    // Phase 4 — Daily closure (WF-3)
    DailyClosureComponent,
    // Phase 5 — ICU transfer (WF-4)
    IcuTransferComponent,
    IcuTransferQueueComponent,
    // Phase 7 — Staff handover
    StaffHandoverComponent,
    // Phase 2.5 — Revenue report
    RevenueReportComponent,
    // Phase 10 — NABH audit pack
    NabhAuditComponent,
    // Phase 11 — OT workflow
    OtBoardComponent,
    OtScheduleDetailComponent,
    // Note templates
    NoteTemplateManagerComponent,
    MyOpdTemplatesComponent,
    TemplateFormRendererComponent,
    // Sprint 3e — LAMA/DAMA
    LamaDamaRegisterComponent,
    LamaDamaDetailComponent,
    // Sprint 3f — Admit-to-IPD shared modal
    AdmitToIpdModalComponent,
    // Sprint 3g — Critical-values widget (mounted globally in auth shell)
    CriticalValuesAlertComponent,
    // Dietetics
    DieteticsSetupComponent,
    DieticianQueueComponent,
    CanteenWorkspaceComponent,
    CanteenChannelComponent,
    DietAdmissionTabComponent,
    // Duty-ack modal — mounted globally in app.component, declared here so
    // AppComponent's template can resolve <app-duty-ack-modal>. It uses
    // <app-e-sign> internally, which works because ESignComponent (standalone)
    // sits in this module's `imports` below.
    DutyAckModalComponent,
    // Designation-scoped dashboards
    DashboardDispatcherComponent,
    DoctorDashboardComponent,
    KpiTileComponent,
    PatientListCardComponent,
    DonutChartComponent,
    AlertRowComponent,
    MiniStatCardComponent,
    BarListCardComponent,
    ManagementDashboardComponent,
    FrontDeskDashboardComponent,
    NurseDashboardComponent,
    NursingSuperDashboardComponent,
    // MastersComponent is a standalone component — declared in `imports` below,
    // not here. (Standalone components cannot also be NgModule-declared.)
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
    MatOptionModule,
    MatSelectModule,
    FloatLabelModule,
    MatFormFieldModule,
    BrowserAnimationsModule,
    ToastModule,
    TagModule,
    AutoCompleteModule,
    MultiSelectModule,
    ProgressSpinnerModule,
    MatBadgeModule,
    ConfirmPopupModule,
    DialogModule,
    NgxLoadingButtonsModule,
    CommonModule,
    ChartModule,
    CheckboxModule,
    BadgeModule,
    // Standalone components — listed here, not in `declarations`.
    ESignComponent,
    PrescriptionCaptureComponent,
    InvestigationOrderComponent,
    DoctorSelectComponent,
    MastersComponent,
    // Phase 9.1 — OT Clearance card embedded in OT detail page
    OtClearanceCardComponent,
    // Phase 9.2 — Surgeries / Staff / Equipment / Consumables tabs
    OtScheduleExtrasComponent,
    // Phase 9.3b — Read-only operative notes on the Discharge Summary page
    IpdDischargeOperativeNotesComponent,
    // Phase 9.3c — ICD-10 + CPT codes editor on the Discharge Summary page
    DiagnosisCodesCardComponent,
    // Phase 9.13 — Treatment Dashboard, embedded as a tab in the IPD module
    TreatmentDashboardComponent,
    // Phase 9.11 — Lab & Radiology reports widgets (embedded in patient
    // profile + IPD admission detail).
    PatientReportsTabComponent,
    CriticalResultBannerComponent,
    // Estimation → admission / OT requisition actions (approved + confirmed screens)
    EstimationAdmissionActionsComponent,
    // Embedded inline as sub-tab panes on the doctor-appointments page.
    OtWorkbenchComponent,
    ReferralInboxComponent,
   ],
  exports: [PhoneMaskPipe],
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
export class AppModule {}
