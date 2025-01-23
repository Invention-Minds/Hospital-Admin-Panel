import { Department } from './department.model';

interface UnavailableSlot {
  id: number;
  doctorId: number;
  date: string;
  time: string;
}

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
  doctorType: string;
  availability: {
    id: number;
    day: string;
    availableFrom: string; // Change here to use a single field
    slotDuration: number;
    updatedAt?: string;
    doctorId?: number;
    availableFromArray?: [''],
  }[];
  unavailableDates?: any[];
  isUnavailable?: boolean; // Optional property to mark the doctor as unavailable
  unavailableSlots?: any[]; // Optional property to mark the slots as unavailable
  updatedAt?: Date;
  bookedSlots?: { time: string; complete: boolean }[]; // Optional property to store booked slots
  extraSlots?: any[]; // Optional property to store extra slots
  userId?: number; // Optional property to link to a user
  
}
