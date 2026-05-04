# Docminds HMIS Integration - Frontend Implementation Guide

## Overview
This document provides a complete guide for integrating the new HMIS features into the Docminds frontend Angular application.

---

## Services Created

### 1. **Emergency Service** (`src/app/services/emergency.service.ts`)
- **Endpoints**: Emergency case management
- **Key Methods**:
  - `createEmergencyCase()` - Register new emergency
  - `getEmergencyQueue()` - Pending emergency cases
  - `updateEmergencyCaseStatus()` - Update case status
  - `convertToIPD()` - Convert emergency to IPD admission
  - `addProgressNote()` / `getProgressNotes()` - Case documentation

### 2. **IPD Service** (`src/app/services/ipd.service.ts`)
- **Endpoints**: In-patient admission management
- **Key Methods**:
  - `createAdmission()` - Create IPD admission
  - `getActiveAdmissions()` - List active admissions
  - `addProgressNote()` - SOAP progress notes
  - `createDischarge()` - Discharge processing
  - `transferPatient()` - Bed transfer
  - `downloadDischargePDF()` - Discharge summary PDF

### 3. **IPD Prescription Service** (`src/app/services/ipd-prescription.service.ts`)
- **Endpoints**: Pharmacy coordination
- **Key Methods**:
  - `reviewCarryoverPrescriptions()` - From OPD/Emergency
  - `continuePrescription()` - Continue existing prescription
  - `modifyPrescription()` - Update dose/frequency
  - `discontinuePrescription()` - Stop medication
  - `administerMedication()` - MAR entry
  - `getPendingMedications()` - For nurse
  - `getMedicationAdministrationRecord()` - Nursing log

### 4. **Ward Management Service** (`src/app/services/ward-management.service.ts`)
- **Endpoints**: Ward and bed management
- **Key Methods**:
  - `getAllWards()` / `getWardById()` - Ward data
  - `getBedsByWard()` - Bed listing
  - `getAvailableBeds()` - Available bed search
  - `updateBedStatus()` - Update bed occupancy
  - `getBedCensus()` - Occupancy report
  - `getBedCensusReport()` - Download census report
  - `getOccupancyTrends()` - Trend analysis

### 5. **Critical Values Service** (`src/app/services/critical-values.service.ts`)
- **Endpoints**: Real-time alerts via SSE
- **Key Methods**:
  - `subscribeToCriticalValues()` - SSE EventSource connection
  - `getAllCriticalAlerts()` - Historical alerts
  - `getCriticalAlertsByPrn()` - Patient-specific alerts
  - `acknowledgeAlert()` - Mark alert as seen
  - `getAlertStats()` - Analytics

### 6. **MLC Service** (`src/app/services/mlc.service.ts`)
- **Endpoints**: Medico Legal Case documentation
- **Key Methods**:
  - `registerMlcCase()` - Create MLC case
  - `recordExamination()` - Examination findings
  - `recordSampleCollection()` - Sample tracking
  - `submitFinalReport()` - Report submission
  - `uploadPhotographs()` - Evidence documentation
  - `uploadExaminerSignature()` - Signature capture
  - `getPendingReports()` - Cases awaiting submission

### 7. **LAMA/DAMA Service** (`src/app/services/lama-dama.service.ts`)
- **Endpoints**: Against Medical Advice documentation
- **Key Methods**:
  - `createLamaRecord()` - LAMA case
  - `createDamaRecord()` - DAMA case
  - `uploadPatientSignature()` - Patient consent signature
  - `uploadWitnessSignature()` - Witness verification
  - `getComplianceReport()` - Audit compliance

### 8. **HMIS Sync Service** (`src/app/services/hmis-sync.service.ts`)
- **Endpoints**: HMIS integration monitoring
- **Key Methods**:
  - `getAuditLogs()` - Sync history
  - `getSyncStatus()` - Current status by module
  - `retrySyncLog()` - Manual retry
  - `getPendingSyncs()` - Failed syncs
  - `downloadAuditReport()` - Compliance report

---

## Components Created

### Emergency Module (`src/app/emergency/`)

#### 1. **Emergency Intake Component**
- **File**: `emergency-intake/emergency-intake.component.ts|html|css`
- **Route**: `/emergency/intake`
- **Features**:
  - Patient registration form
  - Triage category selection
  - ABCDE assessment
  - Trauma scoring (ISS/GCS)
  - Vitals entry
  - Procedures documentation

#### 2. **Emergency List Component**
- **File**: `emergency-list/emergency-list.component.ts|html|css`
- **Route**: `/emergency`
- **Features**:
  - Queue of pending emergency cases
  - Status dropdown for quick updates
  - Triage color coding (red/yellow/green/black)
  - Convert to IPD button
  - Search and filter
  - Responsive DataTable

### IPD Module (`src/app/ipd/`)

#### 1. **IPD Admission Component**
- **File**: `ipd-admission/ipd-admission.component.ts|html|css`
- **Route**: `/ipd/admission`
- **Features**:
  - Admission form with ward/bed selection
  - Real-time available bed updates
  - Diagnosis entry
  - Doctor assignment
  - Source module tracking (OPD/Emergency/Direct)

### Ward Management Module (`src/app/ward-management/`)

#### 1. **Bed Census Component**
- **File**: `bed-census/bed-census.component.ts|html|css`
- **Route**: `/ward-management/census`
- **Features**:
  - Real-time occupancy dashboard
  - Summary cards (total/occupied/available/rate)
  - Ward-wise census table
  - Occupancy visualizations (bars/percentages)
  - Modal for bed details
  - Auto-refresh every 30 seconds
  - Download census report

### Critical Values Widget (`src/app/services/critical-values-alert/`)

#### 1. **Critical Values Alert Component**
- **File**: `critical-values-alert/critical-values-alert.component.ts|html|css`
- **Features**:
  - Floating alert button (bottom-right)
  - SSE connection indicator
  - Real-time alert notifications
  - Sound alert for critical values
  - Alert panel with history
  - Toast notifications
  - Connection status and reconnect

---

## Integration Steps

### Step 1: Update app.module.ts

Add the following imports at the top of `app.module.ts`:

```typescript
// New Services
import { EmergencyService } from './services/emergency.service';
import { IpdService } from './services/ipd.service';
import { IpdPrescriptionService } from './services/ipd-prescription.service';
import { WardManagementService } from './services/ward-management.service';
import { CriticalValuesService } from './services/critical-values.service';
import { MlcService } from './services/mlc.service';
import { LamaDamaService } from './services/lama-dama.service';
import { HmisSyncService } from './services/hmis-sync.service';

// New Components - Emergency Module
import { EmergencyIntakeComponent } from './emergency/emergency-intake/emergency-intake.component';
import { EmergencyListComponent } from './emergency/emergency-list/emergency-list.component';

// New Components - IPD Module
import { IpdAdmissionComponent } from './ipd/ipd-admission/ipd-admission.component';

// New Components - Ward Management
import { BedCensusComponent } from './ward-management/bed-census/bed-census.component';

// New Components - Critical Values Alert Widget
import { CriticalValuesAlertComponent } from './services/critical-values-alert/critical-values-alert.component';
```

Add these declarations to the `@NgModule` declarations array:

```typescript
declarations: [
  // ... existing declarations ...
  EmergencyIntakeComponent,
  EmergencyListComponent,
  IpdAdmissionComponent,
  BedCensusComponent,
  CriticalValuesAlertComponent,
  // ... more declarations ...
]
```

Services are automatically provided with `providedIn: 'root'`, so no additional provider configuration is needed.

### Step 2: Update app-routing.module.ts

Add these routes to the `routes` array in `app-routing.module.ts`:

```typescript
// Emergency Routes
{
  path: 'emergency',
  children: [
    { path: '', component: EmergencyListComponent, canActivate: [authGuard] },
    { path: 'intake', component: EmergencyIntakeComponent, canActivate: [authGuard] },
    // Add additional emergency routes as needed
  ]
},

// IPD Routes
{
  path: 'ipd',
  children: [
    { path: 'admission', component: IpdAdmissionComponent, canActivate: [authGuard] },
    // Add additional IPD routes as needed
  ]
},

// Ward Management Routes
{
  path: 'ward-management',
  children: [
    { path: 'census', component: BedCensusComponent, canActivate: [authGuard] },
    // Add additional ward routes as needed
  ]
}
```

### Step 3: Add Critical Values Alert to Layout

Add the critical values alert widget to your main layout (e.g., `app.component.html`):

```html
<!-- Add this at the end of app.component.html -->
<app-critical-values-alert></app-critical-values-alert>
```

### Step 4: Ensure PrimeNG Modules are Imported

Verify that the following PrimeNG modules are imported in `app.module.ts`:

```typescript
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

// Add to imports array
imports: [
  // ... existing imports ...
  TableModule,
  ButtonModule,
  InputTextModule,
  InputTextareaModule,
  DropdownModule,
  CalendarModule,
  ToastModule,
  DialogModule,
  TagModule,
  TooltipModule,
  BadgeModule,
  // ... more imports ...
]

// Add to providers array
providers: [
  // ... existing providers ...
  ConfirmationService,
  MessageService,
  // ... more providers ...
]
```

---

## Additional Components to Create

The following components should be created following the same pattern:

### Emergency Module Components
- `emergency-details` - View single emergency case
- `emergency-progress-note` - Add progress notes
- `emergency-to-ipd-conversion` - Convert emergency to IPD
- `mlc-registration` - MLC case intake
- `lama-dama-form` - LAMA/DAMA documentation

### IPD Module Components
- `ipd-details` - View admission details
- `ipd-progress-notes` - Manage SOAP notes
- `ipd-discharge` - Discharge form and summary
- `ipd-patient-transfer` - Bed transfer form
- `prescription-management` - Pharmacy coordination
- `medication-administration` - MAR (Nursing entry)

### MLC Module Components
- `mlc-list` - List MLC cases
- `mlc-details` - View MLC documentation
- `mlc-report-submission` - Final report

### LAMA/DAMA Module Components
- `lama-dama-list` - List LAMA/DAMA records
- `lama-dama-details` - View specific record

### Shared Components
- `discharge-summary-viewer` - PDF viewer for discharge
- `critical-value-history` - Historical alerts view
- `sync-status-dashboard` - HMIS sync monitoring

---

## Navigation Menu Integration

Add these menu items to your sidebar navigation:

```html
<!-- Emergency Management -->
<a routerLink="/emergency" routerLinkActive="active">
  <i class="pi pi-exclamation-triangle"></i>
  <span>Emergency</span>
</a>

<!-- IPD Management -->
<a routerLink="/ipd" routerLinkActive="active">
  <i class="pi pi-bed"></i>
  <span>In-Patient (IPD)</span>
</a>

<!-- Ward Management -->
<a routerLink="/ward-management/census" routerLinkActive="active">
  <i class="pi pi-sitemap"></i>
  <span>Ward Management</span>
</a>

<!-- MLC Cases -->
<a routerLink="/mlc" routerLinkActive="active">
  <i class="pi pi-shield"></i>
  <span>MLC Cases</span>
</a>

<!-- LAMA/DAMA Records -->
<a routerLink="/lama-dama" routerLinkActive="active">
  <i class="pi pi-sign-out"></i>
  <span>LAMA/DAMA</span>
</a>

<!-- HMIS Sync Status -->
<a routerLink="/hmis/sync-status" routerLinkActive="active">
  <i class="pi pi-sync"></i>
  <span>HMIS Sync</span>
</a>
```

---

## Form Validation & Error Handling

All forms implement:
- **Reactive Forms** with FormBuilder
- **Validators**: Required, Pattern, Range
- **Error Messages**: Conditional display for each field
- **Toast Notifications**: Success/Error feedback via MessageService
- **Loading States**: Disabled buttons during submission

---

## Responsive Design

All components are designed with responsive breakpoints:
- **Desktop**: Full layout with multi-column forms
- **Tablet**: Adjusted grid (md: col-6 → col-12)
- **Mobile**: Single column layouts

---

## State Management Pattern

Components use:
- **BehaviorSubject** for state in services
- **Observable$** exposed to components
- **RxJS operators**: `map`, `filter`, `switchMap`, `takeUntil`
- **Unsubscribe pattern** with `destroy$` Subject in `ngOnDestroy()`

---

## Testing Integration

To test the implementations:

1. **Start backend server** (npm start in Backend folder, port 3000)
2. **Start frontend dev server** (ng serve in Frontend folder, port 4200)
3. **Navigate to** `http://localhost:4200/emergency` for Emergency module
4. **Navigate to** `http://localhost:4200/ipd/admission` for IPD admission
5. **Navigate to** `http://localhost:4200/ward-management/census` for bed census

---

## API Endpoint Summary

| Module | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Emergency | `/api/emergency/` | POST | Create emergency case |
| Emergency | `/api/emergency/:id` | GET | Get case details |
| IPD | `/api/ipd/admission` | POST | Create admission |
| IPD | `/api/ipd/admissions` | GET | List admissions |
| IPD | `/api/ipd/admission/:id/discharge` | POST | Create discharge |
| Ward | `/api/ward/wards` | GET | List wards |
| Ward | `/api/ward/bed-census` | GET | Get bed occupancy |
| Prescription | `/api/ipd/:admissionId/pharmacy/pending` | GET | Pending medications |
| Critical Values | `/api/critical-values/stream` | GET (SSE) | Real-time alerts |
| MLC | `/api/mlc/` | POST | Register MLC case |
| LAMA/DAMA | `/api/lama-dama/lama` | POST | Create LAMA record |
| HMIS Sync | `/api/hmis-sync/audit-logs` | GET | Sync history |

---

## Next Steps

1. Create remaining components (see "Additional Components" section)
2. Implement routing for all new modules
3. Add dashboard widgets for quick access
4. Implement print/export functionality
5. Add real-time updates for ward occupancy
6. Configure SSE connection pooling for reliability
7. Add audit trails and compliance reports
8. Implement user role-based access control

---

## Support & Documentation

For detailed component documentation and examples, refer to:
- Backend API: `Hospital-Admin-Panel-Backend/INTEGRATION_TEST_GUIDE.md`
- Phase Implementation: `Hospital-Admin-Panel-Backend/PHASE3_IMPLEMENTATION_GUIDE.md`
- HMIS Plan: `Hospital-Admin-Panel-Backend/Docminds HMIS Integration Plan.md`

