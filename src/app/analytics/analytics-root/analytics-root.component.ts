import { Component, OnChanges, SimpleChanges } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { availability, unavailableDates, doctors } from '../../Analytics-Folder/data'
import { getDayOfWeek, getLastSevenDays, getYesterdayDate, getTodayDate, reorderDateFormat } from '../functions';
import { AnyCnameRecord } from 'node:dns';
import { MessageService } from 'primeng/api';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
@Component({
  selector: 'app-analytics-root',
  templateUrl: './analytics-root.component.html',
  styleUrl: './analytics-root.component.css'
})
export class AnalyticsRootComponent implements OnChanges{
  constructor(private doctor : DoctorServiceService, private messageService : MessageService, private appointment : AppointmentConfirmService){}

  department:any
  departmentValue:any
  doctors:any
  selectedDoctor:any = 'all'
  selectedDate:any
  selectedDateRange :any[] = []
  availableDoctors : any
  selectedDepartment : any
  unAvailableDoctors : any
  availlableDoctorsCount : any
  lastSevenDaysAvailability : any
  currentDate : any | any[]
  emptyDate : any = ''
  Array = Array;

  maxSelectableDate : any
  isSelectingStartDate: any;  // Maximum selectable date (7 days after start date)

  // report variable
  reportColumn : any
  reportdata : any
  reportInitializeDate : any[] = []
  inputBlock : boolean = false
  isMhc : boolean = false
  reportName : string = ''

  // estimation type report
  viewReportSection : boolean = false
  estiReportData : any

  // report part open and close
  onOf : boolean = false 
  range : any
  reportDoctorId : any

  // today hide and visible
  isCurrentDate : boolean =false

  // loading
  isLoading: boolean = false;

  ngOnInit(){   
    this.currentDate = getYesterdayDate()
    // setTimeout(() => {
    //   this.isLoading = false; // Set to false when data is loaded
    // }, 6000); // 3 seconds delay

    this.isCurrentDate = true
    this.loadDepartments()
    this.selectedDoctor = 'all'
    // this.loadAvailableDoctors('2025-03-15')
    this.sendYesterdayDate()
    // this.getAllAppointments()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if((changes['reportdata'] && !changes['reportdata'].firstChange)){
      this.receiveReportData(this.reportdata)
    }  

    if(changes['currentDate']){
      this.todayAnalytics()
    }
  }

  todayAnalytics():void{
    const todayDate = getTodayDate()
    console.log(todayDate, "today date form root")
    this.currentDate === todayDate ? this.isCurrentDate = true : this.isCurrentDate = false

  }

  sendYesterdayDate():void{
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    // this.selectedDate = [yesterdayDate.toISOString().slice(0, 10)]

    this.selectedDate = getLastSevenDays()
  }

  getDepartMentName(departmentId: number):any {
    const filteredDept = this.department.filter((dept:any) => departmentId === dept.id)
    return filteredDept[0].name
  }

  async loadDepartments():Promise<void>{
    try{
      const data = await this.doctor.getDepartments().toPromise()
      this.department = data;
    }catch(err){
      console.error(err)
    }
  }

  departmentOnchange(event : any):void{
    this.departmentValue = parseInt(event.target.value);
    // console.log(this.departmentValue, "from filter")
    this.doctor.getDoctors().subscribe(({
      next : (data : any)=> {
        if(this.departmentValue !== 'all'){
          this.doctors = data.filter((doc:any) => doc.departmentId === this.departmentValue)
        }
        else{
          this.doctors = 'all'
        }
      },
      error : (error)=>{
        console.error(error)
      },
      complete : ()=>{
        this.selectedDepartment = this.getDepartMentName(parseInt(event.target.value))
      }
    }))
  }

  doctorOnchange(e : any):void{
    this.selectedDoctor = parseInt(e.target.value) || 'all'; 
  }

  // dateOnChange(event:any): void {
  //   if (Array.isArray(event)) {
  //     if (event.length === 2) {
  //       // Handle the date range (start and end dates)
  //       const startDate = new Date(event[0]);
  //       let endDate;
  //       event[1]!==null ? endDate = event[1] : endDate = event[0]
  //       // console.log('Selected Date Range:', startDate, endDate);

  //       this.selectedDate = this.getIndividualDates(startDate, endDate)
  //       // console.log(this.selectedDate)

  //     } else if (event.length === 1) {
  //       // Handle the single date selection
  //       const startDate = new Date(event[0]);
  //       const endDate = startDate
  //       this.selectedDate = this.getIndividualDates(startDate, endDate)
  //       console.log(this.selectedDate)

  //     } else {
  //       // console.log('No date selected');
  //     }
  //   }
  //   this.currentDate = this.selectedDate[0]
  //   this.todayAnalytics()
  // }

  reportDateInititilize(event:any[]):void{
    this.reportInitializeDate = event
    console.log(this.reportInitializeDate, "report date initialize")
  }

  getIndividualDates(startDate: Date, endDate: Date): string[] {
    const dates = [];
    let currentDate = new Date(startDate);

    // Loop through dates from startDate to endDate
    while (currentDate <= endDate) {
      const formattedDate = this.formatDate(currentDate); // Format each date
      dates.push(formattedDate);
      currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }
    return dates;
  }
  
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based, so add 1
    const day = date.getDate().toString().padStart(2, '0'); // Pad single digits with a leading zero

    return `${year}-${month}-${day}`;
  }

  loadAvailableDoctors(date:string):void{

    const dayOfWeek = getDayOfWeek(date)

    const unAvailableDoctors = unavailableDates.filter((entry) => entry.date === date).map((entry) => entry.docId)
    const availableDoctors = availability.filter((entry) => entry.availableDay === dayOfWeek).map((entry) => entry.docId)

    this.availableDoctors = doctors.filter((entry) => !unAvailableDoctors.includes(entry.docId) && availableDoctors.includes(entry.docId))
    this.unAvailableDoctors = doctors.filter((entry) => unAvailableDoctors.includes(entry.docId) && !availableDoctors.includes(entry.docId))
    // console.log(this.availableDoctors)
  }

  getAvailableDoctors(date: string): any[] {
    const dayOfWeek = getDayOfWeek(date);

    // Get all doctor IDs who are unavailable on the given date
    const unavailableDoctorIds = unavailableDates
      .filter((entry:any) => entry.date === date)
      .map((entry:any) => entry.docId);

    // Get all doctor IDs who are available on the given day of the week
    const availableDoctorIds = availability
      .filter((entry) => entry.availableDay === dayOfWeek)
      .map((entry) => entry.docId);

    // Filter doctors who are not in the unavailable list and are available on the day
    return doctors.filter(
      (doctor) =>
        !unavailableDoctorIds.includes(doctor.docId) &&
        availableDoctorIds.includes(doctor.docId)
    );
  }

  receiveReportColumn(reportColumn:any):void{
    this.reportColumn = reportColumn
    // console.log(this.reportColumn, 'from root')
  }

  receiveReportData(reportData:any):void{
    this.reportdata = reportData
    console.log(this.reportdata)
    // console.log(this.reportdata, 'from root')
  }

  reportView(event : {onoff : boolean, range : string}){
    this.onOf = event.onoff
    this.range = event.range
    // this.reportDoctorId = event.doctorId 
  }

  reportDoctor(event:any){
    this.reportDoctorId = event
    // console.log(this.reportDoctorId, "report doctor id")
  }

  reportClose(event:boolean){
    this.onOf = event
  }  

  refreshButton():void{
    this.selectedDateRange = []
    this.loadDepartments()
    this.selectedDoctor = 'all'
    const yesterDay = getYesterdayDate()
    this.selectedDate = getLastSevenDays()
    this.currentDate = this.selectedDate[0]
    // this.selectedDateRange = yesterDay
  }

  // incrementDate():void{
  //   this.selectedDateRange = []
  //   let date = new Date(this.selectedDate[0])
  //   date.setDate(date.getDate() + 1)
  //   const formattedDate = this.formatDate(date)
  //   this.selectedDate = [formattedDate]
  //   this.currentDate = this.selectedDate[0]
  //   this.todayAnalytics()
  // }

  // decrementDate():void{
  //   this.selectedDateRange = []
  //   let date = new Date(this.selectedDate[0])
  //   date.setDate(date.getDate() - 1)
  //   const formattedDate = this.formatDate(date)
  //   this.selectedDate = [formattedDate]
  //   this.currentDate = this.selectedDate[0]
  //   this.todayAnalytics()
  // }

  incrementDate(): void {
    this.selectedDateRange = [];
    let date = new Date(this.selectedDate[this.selectedDate.length - 1]); // Use the last date
    date.setDate(date.getDate() + 1);
    const formattedDate = this.formatDate(date);
    this.selectedDate = [formattedDate]; // Assuming you want to update to a single date
    this.currentDate = this.selectedDate[0];
    this.todayAnalytics();
  }
  
  decrementDate(): void {
    this.selectedDateRange = [];
    let date = new Date(this.selectedDate[this.selectedDate.length - 1]); // Use the last date
    date.setDate(date.getDate() - 1);
    const formattedDate = this.formatDate(date);
    this.selectedDate = [formattedDate]; // Assuming you want to update to a single date
    this.currentDate = this.selectedDate[0];
    this.todayAnalytics();
  }

  blockFilters(event:boolean[]):void{
    this.inputBlock = event[0]
    this.isMhc = event[1]
  }

  dateOnChange(event: any): void {
    if (Array.isArray(event)) {
      if (event.length === 2) {
        const startDate = new Date(event[0]);
        let endDate = event[1] !== null ? new Date(event[1]) : new Date(event[0]);

        // Calculate the difference in days (just for validation, should not exceed 6 due to maxDate)
        const timeDifference = endDate.getTime() - startDate.getTime();
        const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

        if (dayDifference > 6) {
          // This should not happen due to maxDate restriction, but keeping as fallback
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          this.showToast("Date range cannot exceed 7 days. To view more, click on the 'View More' button.", 'warn');
          this.selectedDateRange = [startDate, endDate]; // Update the range
        }

        this.selectedDate = this.getIndividualDates(startDate, endDate);
        console.log(this.selectedDate);
      } else if (event.length === 1) {
        const startDate = new Date(event[0]);
        const endDate = startDate;
        this.selectedDate = this.getIndividualDates(startDate, endDate);
        this.selectedDateRange = [startDate, endDate];
        console.log(this.selectedDate);
      }
    }

    this.currentDate = this.selectedDate[this.selectedDate.length - 1];

    this.currentDate = this.selectedDate.length === 1 
    ? this.selectedDate[this.selectedDate.length - 1] 
    : [this.selectedDate[0], this.selectedDate[this.selectedDate.length - 1]];    this.todayAnalytics();
  }

  onDateSelect(event: any): void {
    if (Array.isArray(this.selectedDateRange)) {
      if (this.selectedDateRange.length === 1 && this.isSelectingStartDate) {
        // Start date selected, set max selectable date to 6 days after startDate
        const startDate = new Date(this.selectedDateRange[0]);
        this.maxSelectableDate = new Date(startDate);
        this.maxSelectableDate.setDate(startDate.getDate() + 6);
        this.isSelectingStartDate = false; // Now user will select end date
      } else if (this.selectedDateRange.length === 2) {
        // Both start and end dates selected, process the range
        this.dateOnChange(this.selectedDateRange);
        this.isSelectingStartDate = true; // Reset for next selection
        this.maxSelectableDate = null; // Reset max date for new selection
      }
    }
  }

  showToast(message: string, type: string) {
    this.messageService.add({ severity: type, summary: message });
  }

  displayEstiReport(event:boolean):void{
    this.viewReportSection = event
  }

  closeEstReport(event:boolean):void{
    this.viewReportSection = event
  }

  importEstiData(event:any[]):void{
    this.estiReportData = event
  }

  importReportName(event:string):void{
    this.reportName = event
  }

  // api calls

  // vars
  allAppointmentRawData:any

  getAllAppointments():void{
    this.appointment.getAllAppointments().subscribe((data:any) => {
      this.allAppointmentRawData = data
      console.log(this.allAppointmentRawData, "appointment data")
    })
  }
}
