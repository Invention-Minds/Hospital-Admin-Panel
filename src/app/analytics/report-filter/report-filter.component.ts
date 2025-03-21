import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { getLastThirtyDaysFromSelected, getYesterdayDate } from '../functions';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';

@Component({
  selector: 'app-report-filter',
  templateUrl: './report-filter.component.html',
  styleUrls: ['./report-filter.component.css']
})
export class ReportFilterComponent implements OnInit, OnChanges {
  constructor(private doctor: DoctorServiceService, private healthCheckup: HealthCheckupServiceService) {}

  months: string[] = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  type: boolean = true;

  @Input() columns: { key: string; header: string }[] = [];
  @Input() reportData: any[] = [];
  @Input() dateSelectionType: any;
  @Input() onOf: any;
  @Input() initializeDate: any[] = [];
  @Input() selectedDateRange: Date[] = [];
  @Input() individualDates: string[] = [];
  @Input() importedDoctor: any;
  @Input() isFilterBlock : boolean = false
  @Input() isMHC : boolean = false
  @Input() reportName : any
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
    this.individualDates = getLastThirtyDaysFromSelected();
    this.importedData = this.convertDateFormat(this.reportData);
    console.log(this.importedData)
    // this.sortByDate();
    // this.filterData();
  }

  // Lifecycle hook: React to input changes
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reportData'] && !changes['reportData'].firstChange) {
      this.importedData = this.convertDateFormat(this.reportData);
      // this.sortByDate();
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
    this.filterBlock()
    const filteredData = this.reportData.filter((entry: any) => {
      const dateMatch = this.individualDates.includes(entry.date);
      const doctorMatch = this.selectedDoctor === 'all' || this.selectedDoctor === entry.doctorId;
      const deptMatch = this.departmentValue === 'all' || this.departmentValue === entry.departmentName;
      return dateMatch && doctorMatch && deptMatch;
    });

    const sortedData = filteredData.sort((a: any, b: any) => {
      const dateA = new Date(a.date); // Convert date strings to Date objects
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime(); // Compare the dates
    });
    // const sortedData:any = this.sortByDate(filteredData)
    this.importedData = this.convertDateFormat(sortedData);
    console.log('Filtered Imported Data:', this.importedData);
  }

  // filterMhcData
  filterMhc():void{
    this.filterBlock()
    const filteredData = this.reportData.filter((entry: any) => {
      const dateMatch = this.individualDates.includes(entry.date)
      const packageFilter = this.selectedPackage === 'all' || this.selectedPackage === entry.packageName 
      return dateMatch && packageFilter
    });
    console.log(this.selectedPackage)
    console.log(filteredData, "filtered data")
    this.importedData = this.convertDateFormat(filteredData);
    console.log('Filtered Imported Data:', this.importedData);
    // this.sortByDate();
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
  sortByDate(data:any): void {
    data.sort((a: any, b: any) => {
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
    this.individualDates = [getYesterdayDate()];
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
  downloadExcel(data:any): void {
    const header = this.columns.map(col => col.header);
    const rows = data.map((row: any) => this.columns.map(col => row[col.key]));
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4CAF50' } },
      alignment: { horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    const cellStyle = {
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      ws[cellRef].s = headerStyle;
    }

    for (let row = 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) ws[cellRef] = {};
        ws[cellRef].s = cellStyle;
      }
    }

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${this.reportName} report.xlsx`);
  }

  // filter block
  filterBlock():void{
    if(this.isFilterBlock === true){
      this.blockFilter = true
    }
    else{
      this.blockFilter = false
    }
    console.log(this.blockFilter, "form report")
  }

}