import { Appointment } from "../services/appointment-confirm.service";

export const download : Function = (name:any, containerName : any) => {
const image = containerName.getDataURL({
    pixelRatio: 2,  // For higher resolution
    backgroundColor: '#ffffff'
  });
  const a = document.createElement('a');
  a.href = image;
  a.download = `${name}.png`;
  a.click();
}

export const countByDate = <T>(data: T[], key: keyof T): { [key: string]: number } => {
  return data.reduce((acc: { [key: string]: number }, item: T) => {
    const date = item[key] as unknown as string; // Assuming the key is a string-based date
    if (acc[date]) {
      acc[date] += 1;
    } else {
      acc[date] = 1;
    }
    return acc;
  }, {});
}

export function processAppointmentData(appointmentData: any[], dateKeys: string[]) {
  const dataCount = countByDate(appointmentData, 'date');
  return dateKeys.map((date: string) => {
    return dataCount[date] !== undefined ? dataCount[date] : 0;
  });
}

// export const filteredAppointments = (data: any[], requestType: string, doctorId: any, date: any) => {
//   return data.filter((appointments) => {
//     // console.log(appointments.requestVia)
//     const isRequestTypeMatch = appointments.requestVia === requestType;
//     const isDoctorMatch = appointments.doctorId === doctorId || doctorId === 'all';
//     const isDateMatch = appointments.date === 'all' || appointments.date === date;
//     console.log(isDateMatch)
//     // console.log(isDoctorMatch)
//     // console.log(isRequestTypeMatch)
//     return isRequestTypeMatch && isDoctorMatch && isDateMatch;
//   });
// };

export const filteredAppointments = ((data: any[], requestType: string, doctorId: any, date: any) => {
  return data.filter((appointment: any) => {

    if (appointment.requestVia !== requestType) {
      return false;
    }

    if (doctorId === 'all' && date === 'all') {
      return true;
    } else if (doctorId !== 'all' && date === 'all') {
      return appointment.doctorId === doctorId;
    } else if (doctorId === 'all' && date !== 'all') {
      return appointment.date === date;
    } else {
      return appointment.doctorId === doctorId && appointment.date === date;
    }
  });
});

export const doctors = [
  {
    docId: 1,
    docName: 'John Doe',
  },
  {
    docId: 2,
    docName: 'Jane Smith',
  },
  {
    docId: 3,
    docName: 'Michael Johnson',
  },
  {
    docId: 4,
    docName: 'Emily Davis',
  },
  {
    docId: 5,
    docName: 'David Wilson',
  },
  {
    docId: 6,
    docName: 'Sarah Brown',
  },
  {
    docId: 7,
    docName: 'James Miller',
  },
  {
    docId: 8,
    docName: 'Linda Garcia',
  },
  {
    docId: 9,
    docName: 'Robert Martinez',
  },
  {
    docId: 10,
    docName: 'Patricia Anderson',
  }
];

export const availability = [
  // Doctor 1
  { docId: 1, availableDay: 'mon' },
  { docId: 1, availableDay: 'tue' },
  { docId: 1, availableDay: 'fri' },

  // Doctor 2
  { docId: 2, availableDay: 'tue' },
  { docId: 2, availableDay: 'wed' },
  { docId: 2, availableDay: 'thu' },

  // Doctor 3
  { docId: 3, availableDay: 'mon' },
  { docId: 3, availableDay: 'wed' },
  { docId: 3, availableDay: 'sat' },

  // Doctor 4
  { docId: 4, availableDay: 'tue' },
  { docId: 4, availableDay: 'thu' },
  { docId: 4, availableDay: 'sun' },

  // Doctor 5
  { docId: 5, availableDay: 'mon' },
  { docId: 5, availableDay: 'fri' },
  { docId: 5, availableDay: 'sat' },

  // Doctor 6
  { docId: 6, availableDay: 'wed' },
  { docId: 6, availableDay: 'thu' },
  { docId: 6, availableDay: 'sun' },

  // Doctor 7
  { docId: 7, availableDay: 'tue' },
  { docId: 7, availableDay: 'fri' },
  { docId: 7, availableDay: 'sat' },

  // Doctor 8
  { docId: 8, availableDay: 'mon' },
  { docId: 8, availableDay: 'thu' },
  { docId: 8, availableDay: 'sun' },

  // Doctor 9
  { docId: 9, availableDay: 'wed' },
  { docId: 9, availableDay: 'fri' },
  { docId: 9, availableDay: 'sat' },

  // Doctor 10
  { docId: 10, availableDay: 'tue' },
  { docId: 10, availableDay: 'thu' },
  { docId: 10, availableDay: 'sun' },
];

export const unavailableDates = [
  // Doctor 1
  { docId: 1, date: "2025-02-10" },
  { docId: 1, date: "2025-03-15" },

  // Doctor 2
  { docId: 2, date: "2025-01-20" },
  { docId: 2, date: "2025-04-05" },

  // Doctor 3
  { docId: 3, date: "2025-02-14" },
  { docId: 3, date: "2025-05-15" },

  // Doctor 4
  { docId: 4, date: "2025-03-10" },
  { docId: 4, date: "2025-06-12" },

  // Doctor 5
  { docId: 5, date: "2025-04-22" },
  { docId: 5, date: "2025-07-18" },

  // Doctor 6
  { docId: 6, date: "2025-05-30" },
  { docId: 6, date: "2025-08-15" },

  // Doctor 7
  { docId: 7, date: "2025-06-11" },
  { docId: 7, date: "2025-03-15" },

  // Doctor 8
  { docId: 8, date: "2025-07-04" },
  { docId: 8, date: "2025-10-31" },

  // Doctor 9
  { docId: 9, date: "2025-08-19" },
  { docId: 9, date: "2025-11-22" },

  // Doctor 10
  { docId: 10, date: "2025-09-12" },
  { docId: 10, date: "2025-12-25" },
];