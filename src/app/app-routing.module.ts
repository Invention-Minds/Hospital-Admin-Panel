import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardOverviewComponent } from './dashboard/dashboard-overview/dashboard-overview.component';
import { DashboardDispatcherComponent } from './dashboards/dashboard-dispatcher/dashboard-dispatcher.component';
import { DoctorDashboardComponent } from './dashboards/doctor-dashboard/doctor-dashboard.component';
import { ManagementDashboardComponent } from './dashboards/management-dashboard/management-dashboard.component';
import { FrontDeskDashboardComponent } from './dashboards/frontdesk-dashboard/frontdesk-dashboard.component';
import { NurseDashboardComponent } from './dashboards/nurse-dashboard/nurse-dashboard.component';
import { NursingSuperDashboardComponent } from './dashboards/nursing-super-dashboard/nursing-super-dashboard.component';
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
import { roleGuard } from './role.guard';
import { HealthCheckupFormComponent } from './health-checkup-service/health-checkup-form/health-checkup-form.component';
import { UnsavedChangesGuard } from './guards/unsaved-changes.guard';
import { TotalOverviewComponent } from './dashboard/total-overview/total-overview.component';
import { TodayConsultationsComponent } from './doctor-role/today-consultations/today-consultations/today-consultations.component';
import { OverviewComponent } from './doctor-role/overview/overview/overview.component';
import { TvComponent } from './tv/tv/tv.component';
import { TvControlComponent } from './tv-control/tv-control/tv-control.component';
import { EstimationOverviewComponent } from './estimation/estimation-overview/estimation-overview/estimation-overview.component';
import { AnalyticsRootComponent } from './analytics/analytics-root/analytics-root.component';
import { ModuleUtilizationComponent } from './analytics/module-utilization/module-utilization.component';
import { ServiceOverviewComponent } from './service-radiology/service-overview/service-overview.component';
import { OverviewRadiologyComponent } from './radiology/overview-radiology/overview-radiology.component';
import { SamraskhaApptOverviewComponent } from './samraksha/samraskha-appt-overview/samraskha-appt-overview.component';
import { MaintainanceComponent } from './maintainance/maintainance/maintainance.component';
import { HelpCenterComponent } from './help-center/help-center.component';
import { RedirectorComponent } from './redirector/redirector.component';
import { LabOverviewComponent } from './lab/lab-overview/lab-overview.component';
import { PatientOverviewComponent } from './patient/patient-overview/patient-overview.component';
import { NursingOverviewComponent } from './nursing/nursing-overview/nursing-overview.component';
import { OtOverviewComponent } from './ot/ot-overview/ot-overview.component';
import { OtTvDisplayComponent } from './ot-tv-display/ot-tv-display.component';
import { OpdAssessmentComponent } from './assessment/opd-assessment/opd-assessment.component';
import { ErAssessmentComponent } from './assessment/er-assessment/er-assessment.component';
import { ErListComponent } from './assessment/er-list/er-list.component';
import { ErOverviewComponent } from './assessment/er-overview/er-overview.component';
import { TherapyOverviewComponent } from './therapy-appts/therapy-overview/therapy-overview.component';
import { TherapistOverviewComponent } from './therapist/therapist-overview/therapist-overview.component';
import { TherapyChannelComponent } from './therapy-channel/therapy-channel/therapy-channel.component';
import { TherapyAnalyticsComponent } from './therapy-analytics/therapy-analytics/therapy-analytics.component';
import { EmergencyOverviewComponent } from './emergency/emergency-overview.component';
import { EmergencyIntakeComponent } from './emergency/emergency-intake/emergency-intake.component';
import { EmergencyListComponent } from './emergency/emergency-list/emergency-list.component';
import { ReferralInboxComponent } from './emergency/referral-inbox/referral-inbox.component';
import { IpdOverviewComponent } from './ipd/ipd-overview.component';
import { IpdAdmissionComponent } from './ipd/ipd-admission/ipd-admission.component';
import { IpdProgressNoteComponent } from './ipd/ipd-progress-note/ipd-progress-note.component';
import { IpdDischargeComponent } from './ipd/ipd-discharge/ipd-discharge.component';
import { IpdPharmacyComponent } from './ipd/ipd-pharmacy/ipd-pharmacy.component';
import { IpdMarComponent } from './ipd/ipd-mar/ipd-mar.component';
import { WardCensusComponent } from './ward-management/ward-census.component';
import { BedsideAcceptanceComponent } from './ipd/bedside-acceptance/bedside-acceptance.component';
import { DailyClosureComponent } from './ipd/daily-closure/daily-closure.component';
import { IcuTransferComponent } from './ipd/icu-transfer/icu-transfer.component';
import { IcuTransferQueueComponent } from './ipd/icu-transfer-queue/icu-transfer-queue.component';
import { StaffHandoverComponent } from './staff-handover/staff-handover.component';
import { NabhAuditComponent } from './nabh-audit/nabh-audit.component';
import { OtBoardComponent } from './ot-workflow/ot-board/ot-board.component';
import { OtScheduleDetailComponent } from './ot-workflow/ot-schedule-detail/ot-schedule-detail.component';
import { NoteTemplateManagerComponent } from './note-template-manager/note-template-manager.component';
import { MyOpdTemplatesComponent } from './doctor-role/my-opd-templates/my-opd-templates.component';
import { OptometryQueueComponent } from './optometry/optometry-queue/optometry-queue.component';
import { MlcCasesComponent } from './mlc/mlc-cases.component';
import { MlcRegisterComponent } from './mlc/mlc-register/mlc-register.component';
import { MlcDetailComponent } from './mlc/mlc-detail/mlc-detail.component';
import { LamaDamaComponent } from './discharge/lama-dama.component';
import { LamaDamaRegisterComponent } from './lama-dama/lama-dama-register/lama-dama-register.component';
import { LamaDamaDetailComponent } from './lama-dama/lama-dama-detail/lama-dama-detail.component';
import { SyncStatusComponent } from './hmis-sync/sync-status.component';
import { DieteticsSetupComponent } from './dietetics/dietetics-setup/dietetics-setup.component';
import { DieticianQueueComponent } from './dietetics/dietician-queue/dietician-queue.component';
import { CanteenWorkspaceComponent } from './dietetics/canteen-workspace/canteen-workspace.component';
import { CanteenChannelComponent } from './dietetics/canteen-channel/canteen-channel.component';
import { DietAdmissionTabComponent } from './dietetics/diet-admission-tab/diet-admission-tab.component';
import { MastersComponent } from './masters/masters.component';
import { NursingStationAdminComponent } from './nursing-station/nursing-station-admin/nursing-station-admin.component';
import { IpdReportsComponent } from './ipd/ipd-reports/ipd-reports.component';
import { IpdInsulinChartComponent } from './ipd/ipd-insulin-chart/ipd-insulin-chart.component';
import { TreatmentDashboardComponent } from './treatment-dashboard/treatment-dashboard.component';
import { OtWorkbenchComponent } from './ot-workflow/ot-workbench/ot-workbench.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardDispatcherComponent, canActivate:[authGuard] },
  // Direct routes for testing each designation-tuned dashboard without
  // having to log in as that role. The dispatcher at /dashboard still does
  // role-based routing in production.
  { path: 'dashboard/doctor', component: DoctorDashboardComponent, canActivate:[authGuard] },
  { path: 'dashboard/management', component: ManagementDashboardComponent, canActivate:[authGuard] },
  { path: 'dashboard/frontdesk', component: FrontDeskDashboardComponent, canActivate:[authGuard] },
  { path: 'dashboard/nurse', component: NurseDashboardComponent, canActivate:[authGuard] },
  { path: 'dashboard/nursing-superintendent', component: NursingSuperDashboardComponent, canActivate:[authGuard] },
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
  {path:'nursing/:blockId', component: NursingOverviewComponent},
  {path: 'estimation', component: EstimationOverviewComponent, canActivate:[authGuard]},
  {path: 'analytics', component: AnalyticsRootComponent, canActivate:[authGuard]},
  // Module Utilization — management analytics (admins only; super_admin always passes roleGuard)
  {path: 'module-utilization', component: ModuleUtilizationComponent, canActivate:[authGuard, roleGuard], data: { roles: ['admin'] }},
  {path: 'blood-appointments', component: SamraskhaApptOverviewComponent, canActivate:[authGuard]},
  {path:'help-center', component: HelpCenterComponent, canActivate:[authGuard]},
  {path: 'lab', component: LabOverviewComponent, canActivate:[authGuard]},
  {path:'patient', component: PatientOverviewComponent, canActivate:[authGuard]},
  { path: 'redirector', component: RedirectorComponent },
  {path:'surgery', component: OtOverviewComponent, canActivate:[authGuard]},
  { path: 'ot-channel', component: OtTvDisplayComponent, canActivate:[authGuard] },
  { path: 'opd', component: OpdAssessmentComponent, canActivate:[authGuard] },
  { path:'er',component: ErOverviewComponent, canActivate:[authGuard]},
  { path:'therapy', component: TherapyOverviewComponent , canActivate:[authGuard]},
  { path:'therapy-list', component: TherapistOverviewComponent , canActivate:[authGuard]},
  { path:'therapy-channel', component: TherapyChannelComponent, canActivate:[authGuard]},
  { path:'therapy-analytics', component: TherapyAnalyticsComponent, canActivate:[authGuard]},

  // HMIS Modules
  { path: 'emergency', component: EmergencyOverviewComponent, canActivate:[authGuard] },
  { path: 'emergency/intake', component: EmergencyIntakeComponent, canActivate:[authGuard] },
  { path: 'emergency/list', component: EmergencyListComponent, canActivate:[authGuard] },
  // Phase 9.19 — referral escalation chain + SLA admin config (before :id)
  { path: 'emergency/escalation-config', loadComponent: () => import('./emergency/escalation-chain-config/escalation-chain-config.component').then(m => m.EscalationChainConfigComponent), canActivate:[authGuard] },
  // Phase 9.19 — doctor's referral inbox (acknowledge from one place)
  { path: 'emergency/my-referrals', component: ReferralInboxComponent, canActivate:[authGuard] },
  // Phase 9.23 — unified patient timeline (cross-module chronological view)
  { path: 'patient/timeline/:prn', loadComponent: () => import('./patient/patient-timeline/patient-timeline.component').then(m => m.PatientTimelineComponent), canActivate:[authGuard] },
  { path: 'patient/timeline', redirectTo: 'patient/timeline/0', pathMatch: 'full' },
  // Phase 9.24 — incident reporting (Phase 1: manual raise + inbox + detail)
  { path: 'incidents', loadComponent: () => import('./incident/incident-inbox/incident-inbox.component').then(m => m.IncidentInboxComponent), canActivate:[authGuard] },
  { path: 'incidents/:id', loadComponent: () => import('./incident/incident-detail/incident-detail.component').then(m => m.IncidentDetailComponent), canActivate:[authGuard] },
  // Phase 9.25 — patient feedback + complaints. Kiosk route is PUBLIC (no
  // authGuard) — the token in the URL is the authentication.
  { path: 'feedback/k/:token', loadComponent: () => import('./feedback/feedback-kiosk/feedback-kiosk.component').then(m => m.FeedbackKioskComponent) },
  // Phase 6 — walk-up kiosk: permanent poster QR points here.
  { path: 'feedback/new', loadComponent: () => import('./feedback/feedback-start/feedback-start.component').then(m => m.FeedbackStartComponent) },
  // Phase D — Discharge clearance queues (per-department + MT).
  { path: 'discharge/mt-queue', loadComponent: () => import('./ipd/discharge-mt-queue/discharge-mt-queue.component').then(m => m.DischargeMtQueueComponent), canActivate: [authGuard] },
  { path: 'discharge/queue/:dept', loadComponent: () => import('./ipd/discharge-dept-queue/discharge-dept-queue.component').then(m => m.DischargeDeptQueueComponent), canActivate: [authGuard] },
  { path: 'ipd/admission/:admissionId/discharge-clearance', loadComponent: () => import('./ipd/discharge-clearance-page/discharge-clearance-page.component').then(m => m.DischargeClearancePageComponent), canActivate: [authGuard] },
  // Phase P — Pharmacy + nurse handshake.
  { path: 'pharmacy/queue', loadComponent: () => import('./ipd/pharmacy-queue/pharmacy-queue.component').then(m => m.PharmacyQueueComponent), canActivate: [authGuard] },
  { path: 'nurse/medication-inbox', loadComponent: () => import('./ipd/nurse-medication-inbox/nurse-medication-inbox.component').then(m => m.NurseMedicationInboxComponent), canActivate: [authGuard] },
  { path: 'feedback', loadComponent: () => import('./feedback/feedback-inbox/feedback-inbox.component').then(m => m.FeedbackInboxComponent), canActivate:[authGuard] },
  { path: 'complaints', loadComponent: () => import('./feedback/complaint-inbox/complaint-inbox.component').then(m => m.ComplaintInboxComponent), canActivate:[authGuard] },
  { path: 'complaints/:id', loadComponent: () => import('./feedback/complaint-detail/complaint-detail.component').then(m => m.ComplaintDetailComponent), canActivate:[authGuard] },
  { path: 'whatsapp-queries', loadComponent: () => import('./whatsapp-queries/whatsapp-queries.component').then(m => m.WhatsappQueriesComponent), canActivate:[authGuard] },
  { path: 'doorstep-requests', loadComponent: () => import('./doorstep-requests/doorstep-requests.component').then(m => m.DoorstepRequestsComponent), canActivate:[authGuard] },
  // Phase 9.26 — Quality / NABH dashboard
  { path: 'quality', loadComponent: () => import('./quality/quality-dashboard/quality-dashboard.component').then(m => m.QualityDashboardComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 1 — NABH 108-indicator master + capture
  { path: 'quality/indicators', loadComponent: () => import('./quality/quality-indicators/quality-indicators.component').then(m => m.QualityIndicatorsComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 3 — RCA inbox + detail editor
  { path: 'quality/rcas', loadComponent: () => import('./quality/quality-rca-inbox/quality-rca-inbox.component').then(m => m.QualityRcaInboxComponent), canActivate:[authGuard] },
  { path: 'quality/rcas/:id', loadComponent: () => import('./quality/quality-rca-detail/quality-rca-detail.component').then(m => m.QualityRcaDetailComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 5a — Audit observation capture
  { path: 'quality/audit', loadComponent: () => import('./quality/quality-audit/quality-audit.component').then(m => m.QualityAuditComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 5c — Monthly denominator capture
  { path: 'quality/denominators', loadComponent: () => import('./quality/quality-denominators/quality-denominators.component').then(m => m.QualityDenominatorsComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 5b — Infection control capture
  { path: 'quality/infection-control', loadComponent: () => import('./quality/quality-infection-control/quality-infection-control.component').then(m => m.QualityInfectionControlComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 5f — Facility / equipment registers
  { path: 'quality/facility', loadComponent: () => import('./quality/quality-facility/quality-facility.component').then(m => m.QualityFacilityComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 5e — Generic TAT event capture
  { path: 'quality/tat-events', loadComponent: () => import('./quality/quality-tat-events/quality-tat-events.component').then(m => m.QualityTatEventsComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 5g — Pharmacy stock + expired drugs
  { path: 'quality/pharmacy', loadComponent: () => import('./quality/quality-pharmacy/quality-pharmacy.component').then(m => m.QualityPharmacyComponent), canActivate:[authGuard] },
  // Phase 9.26 / Phase 5i — Lab/Radiology event log
  { path: 'quality/lab-rad-events', loadComponent: () => import('./quality/quality-lab-rad/quality-lab-rad.component').then(m => m.QualityLabRadComponent), canActivate:[authGuard] },
  // Phase 6 / Batch A — Notification target-role aliases
  { path: 'settings/role-aliases', loadComponent: () => import('./settings/role-aliases/role-aliases.component').then(m => m.RoleAliasesComponent), canActivate:[authGuard] },
  // Phase 9.20 — hospital emergency codes board (Code Blue / Red / …)
  { path: 'emergency/codes', loadComponent: () => import('./emergency/emergency-codes-board/emergency-codes-board.component').then(m => m.EmergencyCodesBoardComponent), canActivate:[authGuard] },
  // Form 5 (Phase 8) — ER case detail page (investigations/treatments/procedures/specimens)
  { path: 'emergency/:id', loadComponent: () => import('./emergency/emergency-detail/emergency-detail.component').then(m => m.EmergencyDetailComponent), canActivate:[authGuard] },
  { path: 'ipd', component: IpdOverviewComponent, canActivate:[authGuard] },
  { path: 'ipd/admission', component: IpdAdmissionComponent, canActivate:[authGuard] },
  {
    path: 'ipd/admission/:admissionId/progress-note',
    component: IpdProgressNoteComponent,
    canActivate: [authGuard],
    canDeactivate: [UnsavedChangesGuard],
  },
  // Phase 1 — structured initial assessment on admission (NABH AAC.4)
  {
    path: 'ipd/admission/:admissionId/initial-assessment',
    loadComponent: () => import('./ipd/ipd-initial-assessment/ipd-initial-assessment.component').then(m => m.IpdInitialAssessmentComponent),
    canActivate: [authGuard],
  },
  // Phase 2 — Clinical Chart (TPR + intake/output + per-day text fields)
  {
    path: 'ipd/admission/:admissionId/clinical-chart',
    loadComponent: () => import('./ipd/ipd-clinical-chart/ipd-clinical-chart.component').then(m => m.IpdClinicalChartComponent),
    canActivate: [authGuard],
  },
  // Phase 3 — per-admission SBAR Hand-off (NABH HRM.5 / PSQ.5)
  {
    path: 'ipd/admission/:admissionId/handover',
    loadComponent: () => import('./ipd/ipd-handover/ipd-handover.component').then(m => m.IpdHandoverComponent),
    canActivate: [authGuard],
  },
  // Phase 4a — Medication reconciliation (NABH MOM.1.c)
  {
    path: 'ipd/admission/:admissionId/medication-reconciliation',
    loadComponent: () => import('./ipd/ipd-medication-reconciliation/ipd-medication-reconciliation.component').then(m => m.IpdMedicationReconciliationComponent),
    canActivate: [authGuard],
  },
  // Phase 4b — Intra-Op Nursing Chart
  {
    path: 'surgery-ot/:id/nursing-chart',
    loadComponent: () => import('./ot-workflow/ot-nursing-chart/ot-nursing-chart.component').then(m => m.OtNursingChartComponent),
    canActivate: [authGuard],
  },
  // Phase 9.6 — ICU Workbench (NABH COP.3 critical care)
  {
    path: 'ipd/admission/:admissionId/icu',
    loadComponent: () => import('./ipd/icu-workbench/icu-workbench.component').then(m => m.IcuWorkbenchComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ipd/admission/:admissionId/discharge',
    component: IpdDischargeComponent,
    canActivate: [authGuard],
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'ipd/admission/:admissionId/pharmacy',
    component: IpdPharmacyComponent,
    canActivate: [authGuard],
  },
  {
    path: 'ipd/admission/:admissionId/mar',
    component: IpdMarComponent,
    canActivate: [authGuard],
  },
  { path: 'ward-census', component: WardCensusComponent, canActivate:[authGuard] },
  // Phase 4 — Daily closure (WF-3 daily care + attender ack)
  { path: 'ipd/admission/:admissionId/daily-closure', component: DailyClosureComponent, canActivate:[authGuard] },
  // Phase 7 — Non-drug doctor orders (diet/mobility/investigation/procedure/consult)
  { path: 'ipd/admission/:admissionId/non-drug-orders', loadComponent: () => import('./ipd/non-drug-orders/non-drug-orders.component').then(m => m.NonDrugOrdersComponent), canActivate:[authGuard] },
  // Phase 5 — Day Care monitoring (outpatient day-procedure — dialysis/chemo/endoscopy)
  { path: 'daycare', loadComponent: () => import('./day-care/day-care-list/day-care-list.component').then(m => m.DayCareListComponent), canActivate:[authGuard] },
  { path: 'daycare/new', loadComponent: () => import('./day-care/day-care-monitoring/day-care-monitoring.component').then(m => m.DayCareMonitoringComponent), canActivate:[authGuard] },
  { path: 'daycare/:id', loadComponent: () => import('./day-care/day-care-monitoring/day-care-monitoring.component').then(m => m.DayCareMonitoringComponent), canActivate:[authGuard] },
  // Phase 5 — ICU transfer (WF-4 three-signature chain)
  { path: 'ipd/admission/:admissionId/icu-transfer', component: IcuTransferComponent, canActivate:[authGuard] },
  { path: 'icu-transfer-queue', component: IcuTransferQueueComponent, canActivate:[authGuard] },
  // Phase 7 — Staff handover / contingency reassignment
  { path: 'staff-handover', component: StaffHandoverComponent, canActivate:[authGuard] },
  // Phase 10 — NABH audit pack export
  { path: 'nabh-audit', component: NabhAuditComponent, canActivate:[authGuard] },
  // Phase 11 — OT workflow (board + per-schedule detail)
  { path: 'surgery-ot', component: OtBoardComponent, canActivate:[authGuard] },
  // Phase 9.1a — OT Requisition queue (ward → OT booking queue, before scheduling)
  { path: 'surgery-ot/requisitions', loadComponent: () => import('./ot-workflow/ot-requisition-list/ot-requisition-list.component').then(m => m.OtRequisitionListComponent), canActivate:[authGuard] },
  // Phase 9.2 — Notes Templates manager (must precede /:id catch-all)
  { path: 'surgery-ot/templates', loadComponent: () => import('./ot-workflow/ot-templates/ot-templates.component').then(m => m.OtTemplatesComponent), canActivate:[authGuard] },
  // Phase 9.3a — OT reports (must precede /:id catch-all)
  { path: 'surgery-ot/reports', loadComponent: () => import('./ot-workflow/ot-reports/ot-reports.component').then(m => m.OtReportsComponent), canActivate:[authGuard] },
  // Phase 9.5g — Unified OT Workbench shell (must precede /:id catch-all)
  { path: 'surgery-ot/workbench', component: OtWorkbenchComponent, canActivate:[authGuard] },
  // Phase 9.5e — OT Setup admin (must precede /:id catch-all)
  { path: 'surgery-ot/setup', loadComponent: () => import('./ot-workflow/ot-setup/ot-setup.component').then(m => m.OtSetupComponent), canActivate:[authGuard] },
  // Phase 9.10 — Nurse / clinical-staff admin (super_admin only)
  { path: 'staff/nurses', loadComponent: () => import('./staff/nurses-admin/nurses-admin.component').then(m => m.NursesAdminComponent), canActivate:[authGuard, roleGuard], data: { roles: [] } },
  // Phase NS-4 — Nursing Station admin (Nursing Superintendent + super_admin)
  { path: 'nursing-stations', component: NursingStationAdminComponent, canActivate:[authGuard, roleGuard], data: { subAdminTypes: ['Nursing Superintendent'] } },
  // Phase 9.11 — Lab & Radiology reports admin (coordinator workbench)
  { path: 'lab-radiology/reports', loadComponent: () => import('./lab-radiology/reports-admin/reports-admin.component').then(m => m.ReportsAdminComponent), canActivate:[authGuard] },
  // Phase 9.11 — IPD admission "Reports" sub-page
  { path: 'ipd/admission/:admissionId/reports', component: IpdReportsComponent, canActivate:[authGuard] },
  // Phase 9.14 — IPD Insulin Infusion Chart
  { path: 'ipd/admission/:admissionId/insulin-chart', component: IpdInsulinChartComponent, canActivate:[authGuard] },
  // Phase 9.17 — Full Discharge Summary (printable, paper layout)
  { path: 'ipd/admission/:admissionId/discharge-summary', loadComponent: () => import('./ipd/ipd-discharge-summary/ipd-discharge-summary.component').then(m => m.IpdDischargeSummaryComponent), canActivate:[authGuard] },
  // Phase 9.12 — Ward → OT Pre-Operative Surgical Safety Checklist (both entry points)
  { path: 'ipd/admission/:admissionId/ward-transfer', loadComponent: () => import('./ot-workflow/ot-ward-transfer-checklist/ot-ward-transfer-checklist.component').then(m => m.OtWardTransferChecklistComponent), canActivate:[authGuard] },
  { path: 'surgery-ot/:scheduleId/ward-transfer', loadComponent: () => import('./ot-workflow/ot-ward-transfer-checklist/ot-ward-transfer-checklist.component').then(m => m.OtWardTransferChecklistComponent), canActivate:[authGuard] },
  // Phase 9.13 — Treatment Dashboard (NEWS2 deterioration watchboard)
  { path: 'treatment-dashboard', component: TreatmentDashboardComponent, canActivate:[authGuard] },
  // Phase 9.5c — OT Archives (patient profile)
  { path: 'surgery-ot/archives/:prn', loadComponent: () => import('./ot-workflow/ot-archives/ot-archives.component').then(m => m.OtArchivesComponent), canActivate:[authGuard] },
  // Phase 9.5b — OT Discharge Summary (per-admission)
  { path: 'surgery-ot/admission/:admissionId/discharge-summary', loadComponent: () => import('./ot-workflow/ot-discharge-summary/ot-discharge-summary.component').then(m => m.OtDischargeSummaryComponent), canActivate:[authGuard] },
  // Phase 9.5e — ICD/CPT diagnosis update (per-admission)
  { path: 'surgery-ot/admission/:admissionId/diagnosis', loadComponent: () => import('./ot-workflow/ot-diagnosis-update/ot-diagnosis-update.component').then(m => m.OtDiagnosisUpdateComponent), canActivate:[authGuard] },
  // Phase 9.2 — Surgery Track Sheet print view (UHJ/OTS/F-04)
  { path: 'surgery-ot/:id/track-sheet', loadComponent: () => import('./ot-workflow/ot-track-sheet/ot-track-sheet.component').then(m => m.OtTrackSheetComponent), canActivate:[authGuard] },
  // Phase 9.5d — View Issued Drugs (per-schedule)
  { path: 'surgery-ot/:id/issued-drugs', loadComponent: () => import('./ot-workflow/ot-issued-drugs/ot-issued-drugs.component').then(m => m.OtIssuedDrugsComponent), canActivate:[authGuard] },
  // Phase 9.5a — Emergency Surgery Charges (per-schedule)
  { path: 'surgery-ot/:id/emrg-charges', loadComponent: () => import('./ot-workflow/ot-emrg-charges/ot-emrg-charges.component').then(m => m.OtEmrgChargesComponent), canActivate:[authGuard] },
  // Phase 9.5f — Print Preview (per-schedule; ?form=safety-checklist|operative-note|track-sheet)
  { path: 'surgery-ot/:id/print', loadComponent: () => import('./ot-workflow/ot-print-preview/ot-print-preview.component').then(m => m.OtPrintPreviewComponent), canActivate:[authGuard] },
  { path: 'surgery-ot/:id', component: OtScheduleDetailComponent, canActivate:[authGuard] },
  // Department-scoped note templates — admin manager (super_admin only on the UI side).
  { path: 'note-templates', component: NoteTemplateManagerComponent, canActivate:[authGuard] },
  // Phase 9.21 — doctor self-service manager for their own OPD templates.
  { path: 'my-opd-templates', component: MyOpdTemplatesComponent, canActivate:[authGuard] },
  // Optometrist board — today's eye appointments + refraction work-up capture.
  { path: 'optometry/queue', component: OptometryQueueComponent, canActivate:[authGuard] },
  // Phase 3 — bedside attender-acceptance flow (final step of WF-2 handshake).
  { path: 'bedside-acceptance/:bedRequestId', component: BedsideAcceptanceComponent, canActivate:[authGuard] },
  { path: 'mlc', component: MlcCasesComponent, canActivate:[authGuard] },
  { path: 'mlc/new', component: MlcRegisterComponent, canActivate:[authGuard] },
  { path: 'mlc/:id', component: MlcDetailComponent, canActivate:[authGuard] },
  { path: 'lama-dama', component: LamaDamaComponent, canActivate:[authGuard] },
  { path: 'lama-dama/new', component: LamaDamaRegisterComponent, canActivate:[authGuard] },
  { path: 'lama-dama/:type/:id', component: LamaDamaDetailComponent, canActivate:[authGuard] },
  { path: 'hmis-sync', component: SyncStatusComponent, canActivate:[authGuard] },

  // Dietetics module — dietician queue, canteen workspace, masters setup, TV channel.
  { path: 'dietetics/setup', component: DieteticsSetupComponent, canActivate:[authGuard] },
  { path: 'dietetics/queue', component: DieticianQueueComponent, canActivate:[authGuard] },
  { path: 'dietetics/canteen', component: CanteenWorkspaceComponent, canActivate:[authGuard] },
  { path: 'ipd/admission/:admissionId/diet', component: DietAdmissionTabComponent, canActivate:[authGuard] },
  { path: 'canteen-channel/:channelId', component: CanteenChannelComponent },

  // Unified Masters admin (super_admin only).
  { path: 'masters', component: MastersComponent, canActivate:[authGuard] },
  // Phase 9.4a — ICD-10 + CPT code master (MRD coding catalog)
  { path: 'masters/diagnosis-codes', loadComponent: () => import('./masters/diagnosis-code-master/diagnosis-code-master.component').then(m => m.DiagnosisCodeMasterComponent), canActivate:[authGuard] },
  // Phase 9.4c — Order Surgeries (per-role billing lines on an estimation)
  { path: 'estimation/:estimationId/order-surgeries', loadComponent: () => import('./estimation/order-surgeries/order-surgeries.component').then(m => m.OrderSurgeriesComponent), canActivate:[authGuard] },
  // Phase 9.4d — OP Procedures (outpatient minor procedure flow)
  { path: 'op-procedures', loadComponent: () => import('./op-procedure/op-procedure-list/op-procedure-list.component').then(m => m.OpProcedureListComponent), canActivate:[authGuard] },
  { path: 'op-procedures/:id', loadComponent: () => import('./op-procedure/op-procedure-detail/op-procedure-detail.component').then(m => m.OpProcedureDetailComponent), canActivate:[authGuard] },

  // Staff scheduling — roster grid + ward-tablet sign-in kiosk.
  { path: 'scheduling/roster', loadComponent: () => import('./scheduling/roster/roster.component').then(m => m.RosterComponent), canActivate:[authGuard, roleGuard], data: { subAdminTypes: ['Nursing Superintendent'] } },
  { path: 'duty-signin', loadComponent: () => import('./scheduling/duty-signin/duty-signin.component').then(m => m.DutySigninComponent), canActivate:[authGuard] },

  {
    path: 'form',
    component: HealthCheckupFormComponent,
    canDeactivate: [UnsavedChangesGuard], // Apply the guard
  },
  // Security — rate-limit blocked IP management (super_admin only)
  { path: 'security/blocked-ips', loadComponent: () => import('./security/blocked-ips/blocked-ips.component').then(m => m.BlockedIpsComponent), canActivate: [authGuard, roleGuard], data: { roles: [] } },
  // Settings — WhatsApp/SMS recipient numbers (super_admin only)
  { path: 'settings/notification-recipients', loadComponent: () => import('./settings/notification-recipients/notification-recipients.component').then(m => m.NotificationRecipientsComponent), canActivate: [authGuard, roleGuard], data: { roles: [] } },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },



];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
