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
import { BlockedIpsComponent } from './security/blocked-ips/blocked-ips.component';
import { NotificationRecipientsComponent } from './settings/notification-recipients/notification-recipients.component';
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
import { EmergencyDetailComponent } from './emergency/emergency-detail/emergency-detail.component';
import { EscalationChainConfigComponent } from './emergency/escalation-chain-config/escalation-chain-config.component';
import { ReferralInboxComponent } from './emergency/referral-inbox/referral-inbox.component';
import { PatientTimelineComponent } from './patient/patient-timeline/patient-timeline.component';
import { IncidentInboxComponent } from './incident/incident-inbox/incident-inbox.component';
import { IncidentDetailComponent } from './incident/incident-detail/incident-detail.component';
import { FeedbackKioskComponent } from './feedback/feedback-kiosk/feedback-kiosk.component';
import { FeedbackStartComponent } from './feedback/feedback-start/feedback-start.component';
import { DischargeDeptQueueComponent } from './ipd/discharge-dept-queue/discharge-dept-queue.component';
import { DischargeMtQueueComponent } from './ipd/discharge-mt-queue/discharge-mt-queue.component';
import { DischargeClearancePageComponent } from './ipd/discharge-clearance-page/discharge-clearance-page.component';
import { PharmacyQueueComponent } from './ipd/pharmacy-queue/pharmacy-queue.component';
import { NurseMedicationInboxComponent } from './ipd/nurse-medication-inbox/nurse-medication-inbox.component';
import { FeedbackInboxComponent } from './feedback/feedback-inbox/feedback-inbox.component';
import { ComplaintInboxComponent } from './feedback/complaint-inbox/complaint-inbox.component';
import { ComplaintDetailComponent } from './feedback/complaint-detail/complaint-detail.component';
import { WhatsappQueriesComponent } from './whatsapp-queries/whatsapp-queries.component';
import { DoorstepRequestsComponent } from './doorstep-requests/doorstep-requests.component';
import { QualityDashboardComponent } from './quality/quality-dashboard/quality-dashboard.component';
import { QualityIndicatorsComponent } from './quality/quality-indicators/quality-indicators.component';
import { QualityRcaInboxComponent } from './quality/quality-rca-inbox/quality-rca-inbox.component';
import { QualityRcaDetailComponent } from './quality/quality-rca-detail/quality-rca-detail.component';
import { QualityAuditComponent } from './quality/quality-audit/quality-audit.component';
import { QualityDenominatorsComponent } from './quality/quality-denominators/quality-denominators.component';
import { QualityInfectionControlComponent } from './quality/quality-infection-control/quality-infection-control.component';
import { QualityFacilityComponent } from './quality/quality-facility/quality-facility.component';
import { QualityTatEventsComponent } from './quality/quality-tat-events/quality-tat-events.component';
import { QualityPharmacyComponent } from './quality/quality-pharmacy/quality-pharmacy.component';
import { QualityLabRadComponent } from './quality/quality-lab-rad/quality-lab-rad.component';
import { RoleAliasesComponent } from './settings/role-aliases/role-aliases.component';
import { EmergencyCodesBoardComponent } from './emergency/emergency-codes-board/emergency-codes-board.component';
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
import { OtRequisitionListComponent } from './ot-workflow/ot-requisition-list/ot-requisition-list.component';
import { OtTrackSheetComponent } from './ot-workflow/ot-track-sheet/ot-track-sheet.component';
import { OtTemplatesComponent } from './ot-workflow/ot-templates/ot-templates.component';
import { OtReportsComponent } from './ot-workflow/ot-reports/ot-reports.component';
import { DiagnosisCodeMasterComponent } from './masters/diagnosis-code-master/diagnosis-code-master.component';
import { OrderSurgeriesComponent } from './estimation/order-surgeries/order-surgeries.component';
import { OpProcedureListComponent } from './op-procedure/op-procedure-list/op-procedure-list.component';
import { OpProcedureDetailComponent } from './op-procedure/op-procedure-detail/op-procedure-detail.component';
import { OtScheduleDetailComponent } from './ot-workflow/ot-schedule-detail/ot-schedule-detail.component';
import { NoteTemplateManagerComponent } from './note-template-manager/note-template-manager.component';
import { MyOpdTemplatesComponent } from './doctor-role/my-opd-templates/my-opd-templates.component';
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
import { RosterComponent } from './scheduling/roster/roster.component';
import { DutySigninComponent } from './scheduling/duty-signin/duty-signin.component';
import { IpdInitialAssessmentComponent } from './ipd/ipd-initial-assessment/ipd-initial-assessment.component';
import { NonDrugOrdersComponent } from './ipd/non-drug-orders/non-drug-orders.component';
import { DayCareListComponent } from './day-care/day-care-list/day-care-list.component';
import { DayCareMonitoringComponent } from './day-care/day-care-monitoring/day-care-monitoring.component';
import { IpdClinicalChartComponent } from './ipd/ipd-clinical-chart/ipd-clinical-chart.component';
import { IpdHandoverComponent } from './ipd/ipd-handover/ipd-handover.component';
import { IpdMedicationReconciliationComponent } from './ipd/ipd-medication-reconciliation/ipd-medication-reconciliation.component';
import { OtNursingChartComponent } from './ot-workflow/ot-nursing-chart/ot-nursing-chart.component';
import { IcuWorkbenchComponent } from './ipd/icu-workbench/icu-workbench.component';
import { OtDischargeSummaryComponent } from './ot-workflow/ot-discharge-summary/ot-discharge-summary.component';
import { OtDiagnosisUpdateComponent } from './ot-workflow/ot-diagnosis-update/ot-diagnosis-update.component';
import { OtArchivesComponent } from './ot-workflow/ot-archives/ot-archives.component';
import { OtEmrgChargesComponent } from './ot-workflow/ot-emrg-charges/ot-emrg-charges.component';
import { OtIssuedDrugsComponent } from './ot-workflow/ot-issued-drugs/ot-issued-drugs.component';
import { OtSetupComponent } from './ot-workflow/ot-setup/ot-setup.component';
import { NursesAdminComponent } from './staff/nurses-admin/nurses-admin.component';
import { NursingStationAdminComponent } from './nursing-station/nursing-station-admin/nursing-station-admin.component';
import { ReportsAdminComponent } from './lab-radiology/reports-admin/reports-admin.component';
import { IpdReportsComponent } from './ipd/ipd-reports/ipd-reports.component';
import { IpdInsulinChartComponent } from './ipd/ipd-insulin-chart/ipd-insulin-chart.component';
import { IpdDischargeSummaryComponent } from './ipd/ipd-discharge-summary/ipd-discharge-summary.component';
import { OtWardTransferChecklistComponent } from './ot-workflow/ot-ward-transfer-checklist/ot-ward-transfer-checklist.component';
import { TreatmentDashboardComponent } from './treatment-dashboard/treatment-dashboard.component';
import { OtPrintPreviewComponent } from './ot-workflow/ot-print-preview/ot-print-preview.component';
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
  { path: 'emergency/escalation-config', component: EscalationChainConfigComponent, canActivate:[authGuard] },
  // Phase 9.19 — doctor's referral inbox (acknowledge from one place)
  { path: 'emergency/my-referrals', component: ReferralInboxComponent, canActivate:[authGuard] },
  // Phase 9.23 — unified patient timeline (cross-module chronological view)
  { path: 'patient/timeline/:prn', component: PatientTimelineComponent, canActivate:[authGuard] },
  { path: 'patient/timeline', redirectTo: 'patient/timeline/0', pathMatch: 'full' },
  // Phase 9.24 — incident reporting (Phase 1: manual raise + inbox + detail)
  { path: 'incidents', component: IncidentInboxComponent, canActivate:[authGuard] },
  { path: 'incidents/:id', component: IncidentDetailComponent, canActivate:[authGuard] },
  // Phase 9.25 — patient feedback + complaints. Kiosk route is PUBLIC (no
  // authGuard) — the token in the URL is the authentication.
  { path: 'feedback/k/:token', component: FeedbackKioskComponent },
  // Phase 6 — walk-up kiosk: permanent poster QR points here.
  { path: 'feedback/new', component: FeedbackStartComponent },
  // Phase D — Discharge clearance queues (per-department + MT).
  { path: 'discharge/mt-queue', component: DischargeMtQueueComponent, canActivate: [authGuard] },
  { path: 'discharge/queue/:dept', component: DischargeDeptQueueComponent, canActivate: [authGuard] },
  { path: 'ipd/admission/:admissionId/discharge-clearance', component: DischargeClearancePageComponent, canActivate: [authGuard] },
  // Phase P — Pharmacy + nurse handshake.
  { path: 'pharmacy/queue', component: PharmacyQueueComponent, canActivate: [authGuard] },
  { path: 'nurse/medication-inbox', component: NurseMedicationInboxComponent, canActivate: [authGuard] },
  { path: 'feedback', component: FeedbackInboxComponent, canActivate:[authGuard] },
  { path: 'complaints', component: ComplaintInboxComponent, canActivate:[authGuard] },
  { path: 'complaints/:id', component: ComplaintDetailComponent, canActivate:[authGuard] },
  { path: 'whatsapp-queries', component: WhatsappQueriesComponent, canActivate:[authGuard] },
  { path: 'doorstep-requests', component: DoorstepRequestsComponent, canActivate:[authGuard] },
  // Phase 9.26 — Quality / NABH dashboard
  { path: 'quality', component: QualityDashboardComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 1 — NABH 108-indicator master + capture
  { path: 'quality/indicators', component: QualityIndicatorsComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 3 — RCA inbox + detail editor
  { path: 'quality/rcas', component: QualityRcaInboxComponent, canActivate:[authGuard] },
  { path: 'quality/rcas/:id', component: QualityRcaDetailComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 5a — Audit observation capture
  { path: 'quality/audit', component: QualityAuditComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 5c — Monthly denominator capture
  { path: 'quality/denominators', component: QualityDenominatorsComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 5b — Infection control capture
  { path: 'quality/infection-control', component: QualityInfectionControlComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 5f — Facility / equipment registers
  { path: 'quality/facility', component: QualityFacilityComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 5e — Generic TAT event capture
  { path: 'quality/tat-events', component: QualityTatEventsComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 5g — Pharmacy stock + expired drugs
  { path: 'quality/pharmacy', component: QualityPharmacyComponent, canActivate:[authGuard] },
  // Phase 9.26 / Phase 5i — Lab/Radiology event log
  { path: 'quality/lab-rad-events', component: QualityLabRadComponent, canActivate:[authGuard] },
  // Phase 6 / Batch A — Notification target-role aliases
  { path: 'settings/role-aliases', component: RoleAliasesComponent, canActivate:[authGuard] },
  // Phase 9.20 — hospital emergency codes board (Code Blue / Red / …)
  { path: 'emergency/codes', component: EmergencyCodesBoardComponent, canActivate:[authGuard] },
  // Form 5 (Phase 8) — ER case detail page (investigations/treatments/procedures/specimens)
  { path: 'emergency/:id', component: EmergencyDetailComponent, canActivate:[authGuard] },
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
    component: IpdInitialAssessmentComponent,
    canActivate: [authGuard],
  },
  // Phase 2 — Clinical Chart (TPR + intake/output + per-day text fields)
  {
    path: 'ipd/admission/:admissionId/clinical-chart',
    component: IpdClinicalChartComponent,
    canActivate: [authGuard],
  },
  // Phase 3 — per-admission SBAR Hand-off (NABH HRM.5 / PSQ.5)
  {
    path: 'ipd/admission/:admissionId/handover',
    component: IpdHandoverComponent,
    canActivate: [authGuard],
  },
  // Phase 4a — Medication reconciliation (NABH MOM.1.c)
  {
    path: 'ipd/admission/:admissionId/medication-reconciliation',
    component: IpdMedicationReconciliationComponent,
    canActivate: [authGuard],
  },
  // Phase 4b — Intra-Op Nursing Chart
  {
    path: 'surgery-ot/:id/nursing-chart',
    component: OtNursingChartComponent,
    canActivate: [authGuard],
  },
  // Phase 9.6 — ICU Workbench (NABH COP.3 critical care)
  {
    path: 'ipd/admission/:admissionId/icu',
    component: IcuWorkbenchComponent,
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
  { path: 'ipd/admission/:admissionId/non-drug-orders', component: NonDrugOrdersComponent, canActivate:[authGuard] },
  // Phase 5 — Day Care monitoring (outpatient day-procedure — dialysis/chemo/endoscopy)
  { path: 'daycare', component: DayCareListComponent, canActivate:[authGuard] },
  { path: 'daycare/new', component: DayCareMonitoringComponent, canActivate:[authGuard] },
  { path: 'daycare/:id', component: DayCareMonitoringComponent, canActivate:[authGuard] },
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
  { path: 'surgery-ot/requisitions', component: OtRequisitionListComponent, canActivate:[authGuard] },
  // Phase 9.2 — Notes Templates manager (must precede /:id catch-all)
  { path: 'surgery-ot/templates', component: OtTemplatesComponent, canActivate:[authGuard] },
  // Phase 9.3a — OT reports (must precede /:id catch-all)
  { path: 'surgery-ot/reports', component: OtReportsComponent, canActivate:[authGuard] },
  // Phase 9.5g — Unified OT Workbench shell (must precede /:id catch-all)
  { path: 'surgery-ot/workbench', component: OtWorkbenchComponent, canActivate:[authGuard] },
  // Phase 9.5e — OT Setup admin (must precede /:id catch-all)
  { path: 'surgery-ot/setup', component: OtSetupComponent, canActivate:[authGuard] },
  // Phase 9.10 — Nurse / clinical-staff admin (super_admin only)
  { path: 'staff/nurses', component: NursesAdminComponent, canActivate:[authGuard, roleGuard], data: { roles: [] } },
  // Phase NS-4 — Nursing Station admin (Nursing Superintendent + super_admin)
  { path: 'nursing-stations', component: NursingStationAdminComponent, canActivate:[authGuard, roleGuard], data: { subAdminTypes: ['Nursing Superintendent'] } },
  // Phase 9.11 — Lab & Radiology reports admin (coordinator workbench)
  { path: 'lab-radiology/reports', component: ReportsAdminComponent, canActivate:[authGuard] },
  // Phase 9.11 — IPD admission "Reports" sub-page
  { path: 'ipd/admission/:admissionId/reports', component: IpdReportsComponent, canActivate:[authGuard] },
  // Phase 9.14 — IPD Insulin Infusion Chart
  { path: 'ipd/admission/:admissionId/insulin-chart', component: IpdInsulinChartComponent, canActivate:[authGuard] },
  // Phase 9.17 — Full Discharge Summary (printable, paper layout)
  { path: 'ipd/admission/:admissionId/discharge-summary', component: IpdDischargeSummaryComponent, canActivate:[authGuard] },
  // Phase 9.12 — Ward → OT Pre-Operative Surgical Safety Checklist (both entry points)
  { path: 'ipd/admission/:admissionId/ward-transfer', component: OtWardTransferChecklistComponent, canActivate:[authGuard] },
  { path: 'surgery-ot/:scheduleId/ward-transfer', component: OtWardTransferChecklistComponent, canActivate:[authGuard] },
  // Phase 9.13 — Treatment Dashboard (NEWS2 deterioration watchboard)
  { path: 'treatment-dashboard', component: TreatmentDashboardComponent, canActivate:[authGuard] },
  // Phase 9.5c — OT Archives (patient profile)
  { path: 'surgery-ot/archives/:prn', component: OtArchivesComponent, canActivate:[authGuard] },
  // Phase 9.5b — OT Discharge Summary (per-admission)
  { path: 'surgery-ot/admission/:admissionId/discharge-summary', component: OtDischargeSummaryComponent, canActivate:[authGuard] },
  // Phase 9.5e — ICD/CPT diagnosis update (per-admission)
  { path: 'surgery-ot/admission/:admissionId/diagnosis', component: OtDiagnosisUpdateComponent, canActivate:[authGuard] },
  // Phase 9.2 — Surgery Track Sheet print view (UHJ/OTS/F-04)
  { path: 'surgery-ot/:id/track-sheet', component: OtTrackSheetComponent, canActivate:[authGuard] },
  // Phase 9.5d — View Issued Drugs (per-schedule)
  { path: 'surgery-ot/:id/issued-drugs', component: OtIssuedDrugsComponent, canActivate:[authGuard] },
  // Phase 9.5a — Emergency Surgery Charges (per-schedule)
  { path: 'surgery-ot/:id/emrg-charges', component: OtEmrgChargesComponent, canActivate:[authGuard] },
  // Phase 9.5f — Print Preview (per-schedule; ?form=safety-checklist|operative-note|track-sheet)
  { path: 'surgery-ot/:id/print', component: OtPrintPreviewComponent, canActivate:[authGuard] },
  { path: 'surgery-ot/:id', component: OtScheduleDetailComponent, canActivate:[authGuard] },
  // Department-scoped note templates — admin manager (super_admin only on the UI side).
  { path: 'note-templates', component: NoteTemplateManagerComponent, canActivate:[authGuard] },
  // Phase 9.21 — doctor self-service manager for their own OPD templates.
  { path: 'my-opd-templates', component: MyOpdTemplatesComponent, canActivate:[authGuard] },
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
  { path: 'masters/diagnosis-codes', component: DiagnosisCodeMasterComponent, canActivate:[authGuard] },
  // Phase 9.4c — Order Surgeries (per-role billing lines on an estimation)
  { path: 'estimation/:estimationId/order-surgeries', component: OrderSurgeriesComponent, canActivate:[authGuard] },
  // Phase 9.4d — OP Procedures (outpatient minor procedure flow)
  { path: 'op-procedures', component: OpProcedureListComponent, canActivate:[authGuard] },
  { path: 'op-procedures/:id', component: OpProcedureDetailComponent, canActivate:[authGuard] },

  // Staff scheduling — roster grid + ward-tablet sign-in kiosk.
  { path: 'scheduling/roster', component: RosterComponent, canActivate:[authGuard, roleGuard], data: { subAdminTypes: ['Nursing Superintendent'] } },
  { path: 'duty-signin', component: DutySigninComponent, canActivate:[authGuard] },

  {
    path: 'form',
    component: HealthCheckupFormComponent,
    canDeactivate: [UnsavedChangesGuard], // Apply the guard
  },
  // Security — rate-limit blocked IP management (super_admin only)
  { path: 'security/blocked-ips', component: BlockedIpsComponent, canActivate: [authGuard, roleGuard], data: { roles: [] } },
  // Settings — WhatsApp/SMS recipient numbers (super_admin only)
  { path: 'settings/notification-recipients', component: NotificationRecipientsComponent, canActivate: [authGuard, roleGuard], data: { roles: [] } },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },



];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
