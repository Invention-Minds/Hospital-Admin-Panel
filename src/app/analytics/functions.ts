import * as moment from 'moment-timezone';

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

export const filteredAppointments = ((data: any[], requestType: string, doctorId: any, date: any) => {
  return data.filter((appointment: any) => {

    if (appointment.requestVia !== requestType) {
      return false;
    }

    if (doctorId === 'all' && date.includes(appointment.date)) {
      return true;
    } else if (doctorId !== 'all' && date.includes(appointment.date)) {
      return appointment.doctorId === doctorId;
    } else if (doctorId === 'all' && !date.includes(appointment.date)) {
      return appointment.date === date;
    } else {
      return appointment.doctorId === doctorId && date.includes(appointment.date);
    }
  });
});

export const getDayOfWeek = (date: string): string => {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayIndex = new Date(date).getDay();
  // console.log(days[dayIndex])
  return days[dayIndex];
}

export const getLastSevenDays = (): string[] => {
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) {  // Start loop from 1 instead of 0
    const date = new Date();
    date.setDate(date.getDate() - i);  // Subtract i days to get past days
    dates.push(date.toISOString().split('T')[0]); // Format as YYYY-MM-DD
  }
  return dates.reverse(); // Return dates in ascending order
}


export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const getDatesInRange = (startDate: Date, endDate: Date): string[] => {
  const dates: string[] = [];
  let currentDate = new Date(startDate);

  // Loop through each day in the range
  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate)); // Format and add to the array
    currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
  }

  return dates;
}


export const getaveragecount = (data:any[]) => {
  
}


export const utcToIst = (dateNTime:any) => {
  let dateAndTIme : any
  if(dateNTime){
    const createdAt = new Date(dateNTime);
    const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");
    const indianDate = indianTime.format('YYYY-MM-DD');
    const indianTimeOnly = indianTime.format('HH:mm:ss');          
    dateAndTIme = indianDate + ' ' + indianTimeOnly;

    // console.log(dateAndTIme, 'date and Time')
  }

  return dateAndTIme
}

export const utcToIstDate = (dateNTime:any) => {
  let date : any
  if(dateNTime){
    const createdAt = new Date(dateNTime);
    const indianTime = moment.tz(createdAt, "America/New_York").tz("Asia/Kolkata");
    const indianDate = indianTime.format('YYYY-MM-DD');
    const indianTimeOnly = indianTime.format('HH:mm:ss');          
    date = indianDate;

    // console.log(date, 'date and Time')
  }

  return date
}


export const getLast7Days = () => {
  const today = new Date();
  const last7Days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);  // Subtract i days
    last7Days.push(date.toISOString().split('T')[0]);  // Push formatted date 'YYYY-MM-DD'
  }

  return last7Days;
}

export const getLast14Days = () => {
  const today = new Date();
  const last14Days = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);  // Subtract i days
    last14Days.push(date.toISOString().split('T')[0]);  // Push formatted date 'YYYY-MM-DD'
  }
  return last14Days.reverse();
};

export const getPositiveNegative = (percentage:any) : any => {
  let num = percentage
  if(num >=0){
    return `+${parseFloat(num).toFixed(2)}%`
  }
  else if(!num){
    return `+0%`
  }
  else{
    return `${parseFloat(num).toFixed(2)}%`
  }
}

export const getIndividualDates = (startDate: Date, endDate: Date): string[] => {
  const dates = [];
  let currentDate = new Date(startDate);

  // Loop through dates from startDate to endDate
  while (currentDate <= endDate) {
    const formattedDate = formatDate(currentDate); // Format each date
    dates.push(formattedDate);
    currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
  }
  return dates;
}

export const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1); // Go back 1 day
  const formattedDate = yesterday.toISOString().split('T')[0]; // Format as "YYYY-MM-DD"
  return formattedDate
}

// export const animateCounter = (target: number, duration: number) => {
//   const start = 0;
//   const step = (target - start) / (duration / 10); // Increment step every 10ms
//   let current = start;

//   const interval = setInterval(() => {
//     current += step;
//     this.counter = Math.floor(current); // Round down to whole number

//     if (this.counter >= target) {
//       this.counter = target; // Ensure final value is exact
//       clearInterval(interval);
//     }
//   }, 10); // Update every 10ms
// }

export const lastSelectedSevenDays = (selectedDate: string): string[] => {
  const selectedDateObj = new Date(selectedDate);
  const lastSevenDays: string[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(selectedDateObj);
    day.setDate(selectedDateObj.getDate() - i);  

    // Format the date in "YYYY-MM-DD" format
    const formattedDate = day.toISOString().split('T')[0];
    lastSevenDays.push(formattedDate);
  }

  return lastSevenDays;
}

export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based, so add 1
  const day = today.getDate().toString().padStart(2, '0'); // Ensure two-digit day
  
  return `${year}-${month}-${day}`;
}

export const getLastSevenDaysFromSelected = (selectedDate: string): string[] => {
  const date = new Date(selectedDate); // Convert selected date to a Date object
  const lastSevenDays: string[] = [];

  // Loop through the last 7 days (including the selected date)
  for (let i = 0; i <= 7; i++) {
    const currentDate = new Date(date);
    currentDate.setDate(date.getDate() - i); // Subtract 'i' days from the selected date
    const formattedDate = currentDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    lastSevenDays.push(formattedDate);
  }

  return lastSevenDays.reverse();
}

export const sortByDateOldToNew = (data: any[], dateKey: any): any[] => {
  return data.sort((a, b) => new Date(a[dateKey]).getTime() - new Date(b[dateKey]).getTime());
}



export const getLastThirtyDaysFromSelected = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // +1 because months are 0-indexed
      const day = String(date.getDate()).padStart(2, '0');
      
      dates.push(`${year}-${month}-${day}`);
  }
  
  return dates.reverse();
}

// export  const getIndividualDates = (startDate: Date, endDate: Date): string[] => {
//   const dates = [];
//   console.log(startDate, "startDate from filter")
//   let currentDate = new Date(startDate);

//   // Loop through dates from startDate to endDate
//   while (currentDate <= endDate) {
//     const formattedDate = this.formatDate(currentDate); // Format each date
//     dates.push(formattedDate);
//     currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
//   }
//   return dates;
// }
