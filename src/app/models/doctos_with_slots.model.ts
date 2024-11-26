import { Doctor } from './doctor.model';

export interface DoctorWithSlots extends Doctor {
  slots: {
    time: string;
    status: 'available' | 'booked' | 'unavailable' | 'complete' | 'blocked' | 'extra';
  }[];
}