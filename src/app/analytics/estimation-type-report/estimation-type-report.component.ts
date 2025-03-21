import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, OnInit } from '@angular/core';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { getLastThirtyDaysFromSelected, getYesterdayDate } from '../functions';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';

@Component({
  selector: 'app-estimation-type-report',
  templateUrl: './estimation-type-report.component.html',
  styleUrl: './estimation-type-report.component.css'
})
export class EstimationTypeReportComponent {


  @Input()  reportData : any

  tableData = [
    { sNo: 1, date: '2024-03-13', category: 'MM', planned: 5, immediate: 2 },
    { sNo: 2, date: '2024-03-14', category: 'SM', planned: 10, immediate: 2 },
    { sNo: 3, date: '2024-03-15', category: 'MM', planned: 3, immediate: 2 }
  ].map(item => ({
    ...item,
    total: item.planned + item.immediate // Calculate total dynamically
  }));

  // Calculate Totals Dynamically
  totalEstimation = {
    planned: this.tableData.reduce((sum, item) => sum + item.planned, 0),
    immediate: this.tableData.reduce((sum, item) => sum + item.immediate, 0),
    total: this.tableData.reduce((sum, item) => sum + item.total, 0)
  };

  constructor(private doctor: DoctorServiceService, private healthCheckup: HealthCheckupServiceService) {}
  
    type: boolean = true;
  
    @Input() columns: { key: string; header: string }[] = [];
    @Input() dateSelectionType: any;
    @Input() onOf: any;
    @Input() initializeDate: any[] = [];
    @Input() selectedDateRange: Date[] = [];
    @Input() individualDates: string[] = [];
    @Input() importedDoctor: any;
    @Input() isFilterBlock : boolean = false
    @Input() isMHC : boolean = false
    blockFilter : boolean = false;
    
    @Output() onoff = new EventEmitter<boolean>();
  
    importedData: any[] = [];
    department: any = [];
    departmentValue: string | number = 'all';
    doctors: any[] = [];
    selectedDoctor: string | number = 'all';
    allDoctors: any;
    mhcPackages : any = 'all'
    selectedPackage : any
  
    departmentControl : boolean = false;
    doctorControl : boolean = false
  
    // Lifecycle hook: Initialize component
    ngOnInit(): void {
      this.loadDepartments();
      this.loadMhcPackages();
      this.loadDoctors()
      this.individualDates = [getYesterdayDate()];
      this.importedData = this.convertDateFormat(this.reportData);
      console.log(this.importedData)
      this.sortByDate();
    }
  
    // Lifecycle hook: React to input changes
    ngOnChanges(changes: SimpleChanges): void {
      if (changes['reportData'] && !changes['reportData'].firstChange) {
        this.importedData = this.convertDateFormat(this.reportData);
        this.sortByDate();
        this.filterData();
      }
    }
  
    // Load departments from service
    async loadDepartments(): Promise<void> {
      try {
        const data = await this.doctor.getDepartments().toPromise();
        this.department = data;
      } catch (err) {
        console.error('Error loading departments:', err);
      }
    }
  
    loadMhcPackages():void{
      this.healthCheckup.getPackages().subscribe({
        next: (pack) => {
          this.mhcPackages = pack.map((name:any) => {
            return{
              id : name.id,
              name : name.name,
            }
          })
      }})
    }
  
    packageOnchange(event:any):any{
        this.selectedPackage = event.target.value
        this.filterMhc()
    }
  
    loadDoctors():void{
      this.doctor.getAllDoctors().subscribe((data:any) => {
        this.allDoctors = data
      })
    }
  
    // Handle department selection change
    departmentOnchange(event: any): void {
      const selectedDepartment = event.target.value === 'all' ? 'all' : parseInt(event.target.value);
      this.selectedDoctor = 'all'
      this.departmentValue = this.department.filter((entry:any) => entry.id === parseInt(event.target.value))[0].name
      console.log(this.departmentValue)
      this.doctors = this.allDoctors.filter((entry:any) => selectedDepartment === 'all' ? true : selectedDepartment === entry.departmentId)
  
      console.log(selectedDepartment)
      this.filterData();
    }
  
    // Handle doctor selection change
    onChoosingDoctor(event: any): void {
      this.selectedDoctor = event.target.value === 'all' ? 'all' : parseInt(event.target.value);
      this.filterData();
    }
  
    // Handle date range selection
    onDateRangeSelect(event: any): void {
      if (this.type && Array.isArray(event) && event.length === 2) {
        const startDate = event[0];
        const endDate = event[1] !== null ? event[1] : event[0];
        this.individualDates = this.getIndividualDates(startDate, endDate);
        this.filterData();
      }
    }
  
    // Filter report data based on selections
    filterData(): void {
      const filteredData = this.reportData.filter((entry: any) => {
        const dateMatch = this.individualDates.includes(entry.date);
        const doctorMatch = this.selectedDoctor === 'all' || this.selectedDoctor === entry.doctorId;
        const deptMatch = this.departmentValue === 'all' || this.departmentValue === entry.departmentName;
        return dateMatch && doctorMatch && deptMatch;
      });
      this.importedData = this.convertDateFormat(filteredData);
      console.log('Filtered Imported Data:', this.importedData);
    }
  
    // filterMhcData
    filterMhc():void{
      const filteredData = this.reportData.filter((entry: any) => {
        const dateMatch = this.individualDates.includes(entry.date)
        const packageFilter = this.selectedPackage === 'all' || this.selectedPackage === entry.packageName 
        return dateMatch && packageFilter
      });
      console.log(this.selectedPackage)
      console.log(filteredData, "filtered data")
      this.importedData = this.convertDateFormat(filteredData);
      console.log('Filtered Imported Data:', this.importedData);
    }
  
    // Generate individual dates between start and end
    getIndividualDates(startDate: Date, endDate: Date): string[] {
      const dates: string[] = [];
      let currentDate = new Date(startDate);
  
      while (currentDate <= endDate) {
        dates.push(this.formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    }
  
    // Format date as YYYY-MM-DD
    formatDate(date: Date): string {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  
    // Sort data by date
    sortByDate(): void {
      this.importedData.sort((a: any, b: any) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    }
  
    // Get all dates in a month
    getDatesInMonth(year: number, month: number): string[] {
      const dates: string[] = [];
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month - 1, day).toISOString().split('T')[0]);
      }
      return dates;
    }
  
    // Close the report
    closingReport(): void {
      this.onoff.emit(false);
      this.loadDepartments();
      this.doctors = [];
      this.selectedDateRange = [];
      this.selectedDoctor = 'all';
      this.departmentValue = 'all';
      this.filterData();
    }
  
    // Refresh the component
    refresh(): void {
      this.loadDepartments();
      this.doctors = [];
      this.selectedDateRange = [];
      this.individualDates = getLastThirtyDaysFromSelected();
      this.selectedDoctor = 'all';
      this.departmentValue = 'all';
      this.filterData();
    }
  
    // Convert date format from YYYY-MM-DD to DD-MM-YYYY  
    convertDateFormat(dataArray: any[]): any[] {
      return dataArray.map((item: any) => {
        const [year, month, day] = item.date.split('-');
        return { ...item, date: `${day}-${month}-${year}` };
      });
    }
  
    // Download data as Excel file
    downloadExcel = (data: any[]) => {
      // Define the headers
      const headers = [
        "S.No",
        "Date",
        "SM Planned",
        "SM Immediate",
        "SM Total",
        "MM Planned",
        "MM Immediate",
        "MM Total",
        "Maternity Planned",
        "Maternity Immediate",
        "Maternity Total",
        "Total Planned Estimation",
        "Total Immediate Estimation",
        "Grand Total",
      ];
    
      // Convert data into an array format matching the table structure
      const excelData = data.map((entry, index) => [
        index + 1, // S.No
        entry.date,
        entry.plannedSm,
        entry.immediateSm,
        entry.smTotal,
        entry.plannedMm,
        entry.immediateMm,
        entry.mmTotal,
        entry.plannedMaternity,
        entry.immediateMaternity,
        entry.totalMaternity,
        entry.totalPlannedEstimation,
        entry.totalImmediateEstimation,
        entry.grandTotal,
      ]);
    
      // Create worksheet and workbook
      const ws = XLSX.utils.aoa_to_sheet([headers, ...excelData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
    
      // Write and save file
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(blob, "Report.xlsx");
    };

}


// processedData = [
//   {
//     date : "",
//     sm : 0, // respective count of the particular day
//     immediateSm : 0, // respective count of the immediate sm of particular day
//     plannedSm : 0, // respective count of the immediate sm of particular day
//     smTotal : 0, // immediateSm + plannedSm
//     mm : 0, // respective count of the particular day
//     immediateMm : 0, // respective count of the immediate sm of particular day
//     plannedMm : 0, // respective count of the immediate sm of particular day
//     mmTotal : 0, // immediateMm + plannedMm
//     maternity : 0, // respective count of the particular day
//     immediateMatenity : 0, // respective count of the immediate maternity of particular day
//     plannedMatenity : 0, // respective count of the immediate maternity of particular day
//     totalMaternity : 0, // immediateMatenity + plannedMatenity

//     totalPlannedEstimation : 0, // plannedSm + immediateMm+ plannedMatenity
//     totalImmediateEstimation : 0, // immediateSm + immediateMm + immediateMatenity
//     grandTotal : 0, // smTotal + mmTotal + totalMaternity
//   }
// ]