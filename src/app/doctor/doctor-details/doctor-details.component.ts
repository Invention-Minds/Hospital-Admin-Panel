import { Component } from '@angular/core';
import { time } from 'node:console';
import { Doctor } from '../../models/doctor.model';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
// interface Doctor {
//   name: string;
//   qualification: string;
//   available_times: string;
//   time: string;
// }

interface Department {
  name: string;
  doctors: Doctor[];
}
@Component({
  selector: 'app-doctor-details',
  templateUrl: './doctor-details.component.html',
  styleUrl: './doctor-details.component.css'
})
export class DoctorDetailsComponent {
  constructor(private doctorFormService: DoctorServiceService) {}
  selectedDepartment: string = '';
  selectedDoctor: string = '';
  isEditMode: boolean = false; 
  selectedEditDoctor: Doctor | null = null;
  department:  Department[] = [
    {
      name: 'General Surgery',
      doctors: [
        {
          name: 'Dr. Atmaram D. C',
          qualification: 'MBBS, MS',
          department: 'General Surgery',
          mobileNumber: '9342287945',
          email: 'atamaram@gmail.com',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '16:00-17:00',
          slotTiming: '4'
        },
        {
          name: 'Dr. Nishanth Lakshmikantha',
          qualification: 'MBBS, MS, FMAS, FIAGES, FARIS',
          department: 'General Surgery',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '9:30-11:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Oncology',
      doctors: [
        {
          name: 'Dr. Shekar Patil',
          qualification: 'MBBS, MD, DM',
          department: 'Oncology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '9:00-10:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Rajeev Vijayakumar',
          qualification: 'MBBS, DNB (Gen Medicine), DNB (Medical Oncology), MRCP (UK)',
          department: 'Oncology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-16:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Orthopedics',
      doctors: [
        {
          name: 'Dr. Mahesh Kulkarni',
          qualification: 'MS Ortho, DNB Ortho, Fellowship in Arthroplasty/ Arthroscopy/ Spine surgery/ Complex trauma',
          department: 'Orthopedics',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '18:30-19:30',
          slotTiming: ''
        },
        {
          name: 'Dr. Sujayendra D. M',
          qualification: 'MBBS, MS (ORTHO), DNB (Ortho), Diploma SICOT, Fellowship in Arthroplasty',
          department: 'Orthopedics',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:30-15:30',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Urology',
      doctors: [
        {
          name: 'Dr. Nagaraj Rao',
          qualification: 'MBBS, MS, MCH',
          department: 'Urology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '12:00-14:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Madhu S. N',
          qualification: 'MBBS, MS (GEN. SURGERY), MCH (UROLOGY)',
          department: 'Urology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '9:30-16:10',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Cardiac Sciences',
      doctors: [
        {
          name: 'Dr. Suhas Raj S',
          qualification: 'MBBS, MD (GEN MEDICINE), DM (CARDIOLOGY)',
          department: 'Cardiac Sciences',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '18:00-19:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Neurosciences',
      doctors: [
        {
          name: 'Dr. Brig (Dr) S. Shashivadhanan',
          qualification: 'MBBS, MS, DNB (GEN SURGERY), MCH, DNB (NEUROSURGERY), FRCS EDINBURGH, FICS, FIGASS (COPENHAGEN), FIMSA, MNAMS',
          department: 'Neurosciences',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '12:00-14:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Jaidev S',
          qualification: 'MBBS, MS, MCH (NEURO SURGERY)',
          department: 'Neurosciences',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '17:00-18:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Internal Medicine',
      doctors: [
        {
          name: 'Dr. H. M. Krishnamurthy',
          qualification: 'MBBS, MD',
          department: 'Internal Medicine',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '18:00-20:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Sindhu P. Madanshetty',
          qualification: 'MBBS, MD INTERNAL MEDICINE, IDCCM',
          department: 'Internal Medicine',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-16:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Obstetrics & Gynecology',
      doctors: [
        {
          name: 'Dr. Latha Venkataram',
          qualification: 'MBBS, MRCOG(UK), MRCP(I), FRCOG(UK)',
          department: 'Obstetrics & Gynecology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-14:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Shreelakshmi G',
          qualification: 'MBBS, MS, MRCOG(UK)',
          department: 'Obstetrics & Gynecology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-13:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Nephrology',
      doctors: [
        {
          name: 'Dr. Santhosh S',
          qualification: 'MBBS, MD, DM (Nephrology)',
          department: 'Nephrology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-23:30',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Pediatrics and Neonatology',
      doctors: [
        {
          name: 'Dr. Savinay S. Kanchibail',
          qualification: 'MBBS, DCH, DNB/MD, MRCPCH(UK)',
          department: 'Pediatrics and Neonatology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-16:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Vishwanath Sanagoudar',
          qualification: 'MBBS, MD, Fellowship in Pediatric Intensive Care (IGICH)',
          department: 'Pediatrics and Neonatology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-20:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Pulmonology',
      doctors: [
        {
          name: 'Dr. Kolla Vinod',
          qualification: 'MBBS, MD Pulmonology Medicine',
          department: 'Pulmonology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '16:30-18:30',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Ophthalmology',
      doctors: [
        {
          name: 'Dr. Sowmya Bhat S',
          qualification: 'MBBS, DO, DNB, FPR, FICO',
          department: 'Ophthalmology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-13:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Dental Sciences',
      doctors: [
        {
          name: 'Dr. H. N. Shyla',
          qualification: 'MDS',
          department: 'Dental Sciences',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '9:00-17:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Geethanjali K. G',
          qualification: 'BDS, PGCE, PGCO',
          department: 'Dental Sciences',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-16:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'ENT Speciality',
      doctors: [
        {
          name: 'Dr. Manasa N. A',
          qualification: 'MBBS, DLO, DNB (ENT)',
          department: 'ENT Speciality',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:30-12:30',
          slotTiming: ''
        },
        {
          name: 'Dr. Narendranath A',
          qualification: 'MBBS, MS (ENT)',
          department: 'ENT Speciality',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '13:30-15:30',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Psychiatry',
      doctors: [
        {
          name: 'Dr. Valli Kiran',
          qualification: 'MBBS, DPM',
          department: 'Psychiatry',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '16:30-18:10',
          slotTiming: ''
        },
        {
          name: 'Dr. Gopal Das C M',
          qualification: 'MD Psychiatry, MBBS',
          department: 'Psychiatry',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '18:00-19:30',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Anesthesiology',
      doctors: [
        {
          name: 'Dr. (Col) Anand Shankar',
          qualification: 'MBBS, MD (Anesthesiology), EDIC',
          department: 'Anesthesiology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-17:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Shashidhar',
          qualification: 'MBBS, DA',
          department: 'Anesthesiology',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: 'No-slot',
          slotTiming: 'No-slot'
      
    },
  ]
},
    {
      name: 'Emergency Medicine',
      doctors: [
        {
          name: 'Dr. (Col) Anand Shankar',
          qualification: 'MBBS, MD (Anesthesiology), EDIC',
          department: 'Emergency Medicine',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-17:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Nutrition & Dietetics',
      doctors: [
        {
          name: 'Ms. Archana Karthick',
          qualification: 'M.Sc. in Dietetics and Food service management, B.Sc in Clinical Nutrition and Dietetics, PG certificate in Diabetes Education (International Diabetes Federation), MICYAN - Indian Institute of Public Health-Delhi',
          department: 'Nutrition & Dietetics',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '12:00-15:30',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Lifestyle Medicine',
      doctors: [
        {
          name: 'Dr. Suvarnini Konale',
          qualification: 'BNYS',
          department: 'Lifestyle Medicine',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-16:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Shamantha S',
          qualification: 'BAMS',
          department: 'Lifestyle Medicine',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '10:00-16:00',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Ayurveda',
      doctors: [
        {
          name: 'Dr. Rohith K. R',
          qualification: 'BAMS',
          department: 'Ayurveda',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '9:00-14:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Alekhya R',
          qualification: 'BAMS',
          department: 'Ayurveda',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '9:30-17:00',
          slotTiming: ''
        },
        {
          name: 'Dr. Kavyashree Kulamarva',
          qualification: 'MD, PDF',
          department: 'Ayurveda',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '9:30-17:10',
          slotTiming: ''
        }
      ]
    },
    {
      name: 'Homeopathy',
      doctors: [
        {
          name: 'Dr. Anusha Mutalik Desai',
          qualification: 'BHMS, MD (HOM)',
          department: 'Homeopathy',
          mobileNumber: '',
          email: '',
          availabilityDays: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
          availableTime: '9:00-17:00',
          slotTiming: ''
        }
      ]
    }
  ];
  getFilteredDoctors(): Department[] {
    let filteredDepartments = this.department;

    if (this.selectedDepartment) {
      filteredDepartments = filteredDepartments.filter((dep: Department) => dep.name === this.selectedDepartment);
    }

    if (this.selectedDoctor) {
      filteredDepartments = filteredDepartments
        .map((dep: Department) => ({
          ...dep,
          doctors: dep.doctors.filter((doc: Doctor) => doc.name === this.selectedDoctor)
        }))
        .filter((dep: Department) => dep.doctors.length > 0);
    }

    return filteredDepartments;
  }

  // Method to get the list of doctors based on selected department (for doctor dropdown)
  getDoctorsForSelectedDepartment(): Doctor[] {
    if (this.selectedDepartment) {
      const department = this.department.find((dep: Department) => dep.name === this.selectedDepartment);
      return department ? department.doctors : [];
    } else {
      return this.department.flatMap((department: Department) => department.doctors);
    }
  }
  reset(){
    this.selectedDepartment = '';
    this.selectedDoctor = '';
  }
   // Method to initiate editing a doctor profile
   editProfile(doctor: Doctor): void {
    this.selectedEditDoctor = { ...doctor };  // Clone doctor object to avoid direct modification
    this.isEditMode = true;  // Show the form for editing
  }

  // Method to handle saving the edited doctor
  onSaveDoctor(updatedDoctor: Doctor): void {
    // Perform the update logic here, e.g., call a service to save doctor data
    this.doctorFormService.updateDoctor(updatedDoctor);
    this.isEditMode = false;
    this.selectedEditDoctor = null;
  }

  // Method to cancel editing
  cancelEdit(): void {
    this.isEditMode = false;
    this.selectedEditDoctor = null;
  }
}
