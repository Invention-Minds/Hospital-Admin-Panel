import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import * as XLSX from 'xlsx';  // Import xlsx library
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { getYesterdayDate } from '../functions';


@Component({
  selector: 'app-report-filter',
  templateUrl: './report-filter.component.html',
  styleUrls: ['./report-filter.component.css']
})
export class ReportFilterComponent implements OnChanges {

  months: any[] = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  date: any;
  type: boolean = true;

  @Input() columns: { key: string; header: string }[] = [];
  @Input() reportData: any[] = [];
  @Input() dateSelectionType: any;
  @Input() onOf: any;
  emptyDate = ''

  @Output() onoff = new EventEmitter<boolean>

  importedData: any[] = []

  month: any;
  range: any;

  @Input() selectedDateRange: Date[] = [];
  individualDates: any[] = [];
  department: any
  departmentValue: any;
  doctors: any
  selectedDoctor: any

  ngOnInit() {
    this.loadDepartments()
    this.selectedDoctor = 'all'
    this.sortByDate(); 
  }

  async loadDepartments(): Promise<void> {
    try {
      const data = await this.doctor.getDepartments().toPromise()
      this.department = data;
      // console.log(this.department)
    } catch (err) {
      console.error(err)
    }
  }

  departmentOnchange(event: any): void {
    this.departmentValue = parseInt(event.target.value);
    // console.log(this.departmentValue, "from filter")
    this.doctor.getDoctors().subscribe(({
      next: (data: any) => {
        this.doctors = data.filter((doc: any) => doc.departmentId === this.departmentValue)
      },
      error: (error) => {
        console.error(error)
      },
      complete: () => {
        // console.log(this.doctors)
      }
    }))
  }

  doctorOnchange(e: any): void {
    this.selectedDoctor = parseInt(e.target.value) || 'all';
  }

  loadYesterday(): any {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = yesterday.toISOString().split('T')[0];
    this.individualDates = [formattedDate]
    console.log(this.individualDates, "individual datre")
    this.importedData = this.reportData.filter((entry: any) =>
      this.individualDates.includes(entry.date)  //
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['dateSelectionType']) || (changes['selectedDoctor'])) {
      this.controlDateRange();
    }

    if (changes['reportData']) {
      // this.sortByDate(); // Sort data whenever reportData changes
      this.importedData = this.reportData
      this.selectedDateRange = []
      this.sortByDate()
      this.loadYesterday()
    }
  }

  constructor(private doctor: DoctorServiceService) {
    this.selectedDateRange = [];
  }

  controlDateRange(): void {
    this.type = this.dateSelectionType === 'range';
  }

  // Method to download Excel file with styling
  downloadExcel(): void {
    const header = this.columns.map(col => col.header);
    const rows = this.reportData.map((row: any) =>
      this.columns.map(col => row[col.key])
    );

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

    // Apply styles to the header
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

    // Apply header style
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = { r: 0, c: col };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = headerStyle;
    }

    // Apply border style for data cells
    const cellStyle = {
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    for (let row = 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = { r: row, c: col };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        if (!ws[cellRef]) ws[cellRef] = {};
        ws[cellRef].s = cellStyle;
      }
    }

    // Write the workbook to file
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, 'styled_report_data.xlsx');
  }

  onDateRangeSelect(event: any): void {
    if (this.type && Array.isArray(event) && event.length === 2) {
      const startDate = event[0];
      const endDate = event[1];
  
      // Get all the individual dates between the selected range
      this.individualDates = this.getIndividualDates(startDate, endDate);
      console.log('Individual Dates:', this.individualDates);
  
      // Filter report data based on both date range and selected doctor
      const filteredReportData = this.reportData.filter((entry: any) => {
        const dateMatches = this.individualDates.includes(entry.date);  
        return dateMatches;  // Return true if both date and doctor conditions match
      });
  
      // Update the imported data with filtered data
      this.importedData = filteredReportData;
      console.log('Filtered Report Data:', filteredReportData);
  
    } else if (!this.type) {
      console.log('Selected Single Date:', event);
    }
  }

  onChoosingDoctor(event: any): void {
    this.selectedDoctor = event.target.value === 'all' ? 'all' : parseInt(event.target.value);
  
    console.log('Selected Doctor:', this.selectedDoctor); // Log the selected doctor to verify
  
    // Filter the report data based on the selected doctor and the 'all' option
    const filteredReportData = this.reportData.filter((entry: any) => {
      return this.selectedDoctor === 'all' || this.selectedDoctor === entry.doctorId;
    });
  
    // Update the imported data with the filtered report data
    this.importedData = filteredReportData;
  }
  

  getIndividualDates(startDate: Date, endDate: Date): string[] {
    const dates = [];
    console.log(startDate, "startDate from filter")
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

  sortByDate(): void {
    this.importedData = this.importedData.sort((a: any, b: any) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      // Compare dates (ascending order)
      return dateA.getTime() - dateB.getTime();
    });
    console.log('Sorted Report Data:', this.reportData);
  }

  getDatesInMonth(year: number, month: number): string[] {
    const dates: string[] = [];
    const daysInMonth = new Date(year, month, 0).getDate(); // Get number of days in the month

    for (let day = 1; day <= daysInMonth; day++) {
      const formattedDate = new Date(year, month - 1, day).toISOString().split("T")[0];
      dates.push(formattedDate);
    }

    return dates;
  }

  // closing report
  closingReport() {
    this.onoff.emit(false)
  }

  refresh() {
    this.loadDepartments()
    this.selectedDateRange = []
    this.individualDates = [getYesterdayDate()]
    const filtererdData = this.reportData.filter((entry: any) => {
      const dateMatches = this.individualDates.includes(entry.date);  
      return dateMatches;
    });
    this.importedData = filtererdData
  }
}
