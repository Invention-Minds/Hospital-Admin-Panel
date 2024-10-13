import { Department } from './department.model';

export interface Doctor {
  id: number;  // Optional for new doctors until they are saved
  name: string;
  qualification: string;
  departmentId?: number; // New property to link to a department
  departmentName?: string; // Optional nested department object if needed
  phone_number: string;
  email: string;
  availabilityDays: { [key: string]: boolean };
  availableFrom: string; // Consolidated available time like "9:00-11:00"
  slotDuration: number;
  availability?: {
    id: number;
    day: string;
    availableFrom: string; // Change here to use a single field
    slotDuration: number;
  }[];
  unavailableDates?: string[];
  isUnavailable?: boolean; // Optional property to mark the doctor as unavailable
}
