export interface Doctor {
    name: string;
    qualification: string;
    department: string;
    mobileNumber: string;
    email: string;
    availabilityDays: {
      sun: boolean;
      mon: boolean;
      tue: boolean;
      wed: boolean;
      thu: boolean;
      fri: boolean;
      sat: boolean;
    };
    availableTime: string;
    slotTiming: string;
  }
  