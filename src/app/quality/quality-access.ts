/**
 * UI gating for the Incident + Quality modules. Mirrors the backend
 * `src/api/_shared/quality-roles.ts` — the API enforces these rules; the UI
 * only hides controls the user can't use. super_admin always passes.
 */

export const QUALITY_MANAGER = 'Quality Manager';
export const INFECTION_CONTROL_NURSE = 'Infection Control Nurse';
export const NURSING_SUPERINTENDENT = 'Nursing Superintendent';
export const SENIOR_MANAGEMENT = ['Manager', 'Senior Manager', 'Management'];
export const QUALITY_VIEWER_ADMIN_TYPES = [QUALITY_MANAGER, ...SENIOR_MANAGEMENT];

function read(key: string): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return '';
  return localStorage.getItem(key) ?? '';
}

const isSuperAdmin = (): boolean => read('role') === 'super_admin';
const isAdminOfType = (types: string[]): boolean =>
  read('role') === 'admin' && types.includes(read('adminType'));

/** May open the Quality module (dashboards, indicators, lists) — read access. */
export function isQualityViewer(): boolean {
  return isSuperAdmin() || isAdminOfType(QUALITY_VIEWER_ADMIN_TYPES);
}

/** May capture / configure / edit anything in the Quality module. */
export function isQualityEditor(): boolean {
  return isSuperAdmin() || isAdminOfType([QUALITY_MANAGER]);
}

/** Infection Control Nurse — may view + edit the infection-control screen only. */
export function isInfectionControlEditor(): boolean {
  return read('subAdminType') === INFECTION_CONTROL_NURSE;
}

/** May triage / assign / change status / CAPA / QI-tag incidents and see all of them. */
export function isIncidentManager(): boolean {
  return isSuperAdmin() || isAdminOfType([QUALITY_MANAGER]);
}

/**
 * Read-only department viewer for incidents: any non-QM admin, or the
 * Nursing Superintendent (who also sees every ward incident).
 */
export function isIncidentDepartmentViewer(): boolean {
  if (isIncidentManager()) return false;
  return read('role') === 'admin' || read('subAdminType') === NURSING_SUPERINTENDENT;
}

export function isNursingSuperintendent(): boolean {
  return read('subAdminType') === NURSING_SUPERINTENDENT;
}

export const PATIENT_RELATIONS = 'Patient Relations';
export const FRONT_DESK = 'Front Desk';

/** May see every complaint and act on it (status, assign, resolve, bulk, SLA sweep). */
export function isComplaintHandler(): boolean {
  return isSuperAdmin() || isAdminOfType([QUALITY_MANAGER]) || read('subAdminType') === PATIENT_RELATIONS;
}

/** Read-only department viewer for complaints (same rule as incidents). */
export function isComplaintDepartmentViewer(): boolean {
  if (isComplaintHandler()) return false;
  return read('role') === 'admin' || read('subAdminType') === NURSING_SUPERINTENDENT;
}

/** May open the Feedback module (aggregate NPS / survey inbox). */
export function isFeedbackViewer(): boolean {
  return isSuperAdmin() || isAdminOfType(QUALITY_VIEWER_ADMIN_TYPES) || read('subAdminType') === PATIENT_RELATIONS;
}

/** May create a survey / hand out a feedback QR (Front Desk included). */
export function isFeedbackCollector(): boolean {
  return isSuperAdmin() || isAdminOfType([QUALITY_MANAGER]) ||
    [PATIENT_RELATIONS, FRONT_DESK].includes(read('subAdminType'));
}

/** Sidebar / route gate for the Feedback module: viewers plus collectors. */
export function canOpenFeedback(): boolean {
  return isFeedbackViewer() || isFeedbackCollector();
}
