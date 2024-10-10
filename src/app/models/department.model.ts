import { Doctor } from './doctor.model';

export interface Department {
    id: number;
    name: string;
    doctors?: Doctor[];
  }