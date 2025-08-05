import { Component } from '@angular/core';
import { EstimationService } from '../services/estimation/estimation.service';
import { DoctorServiceService } from '../services/doctor-details/doctor-service.service';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-estimation-analytics',
  templateUrl: './estimation-analytics.component.html',
  styleUrl: './estimation-analytics.component.css'
})
export class EstimationAnalyticsComponent {
  pendingEstimations: number = 0;
  approvedEstimations: number = 0;
  confirmedEstimations: number = 0;
  completedEstimations: number = 0;
  cancelledEstimations: number = 0;
  overDueEstimations: number = 0;
  totalEstimations: number = 0;
  estimations: any[] = [];
  totalEstimationsOverall: any[] = [];
  todaySurgeries: number = 0;

  selectedDateRange: Date[] = []; // Will store [startDate, endDate]
  filteredEstimations: any[] = [];
  // Chart data
  estimationTypeLabels: string[] = [];
  estimationTypeData: number[] = [];

  doctorLabels: string[] = [];
  doctorData: number[] = [];

  monthlyLabels: string[] = [];
  monthlyData: number[] = [];

  pacLabels = ['PAC Done', 'PAC Not Done'];
  pacData: number[] = [];

  todayStatusLabels: string[] = [];
  todayStatusData: number[] = [];

  estimatorLabels: string[] = [];
  estimatorData: number[] = [];
  estimatorSummaryData: any = {
    labels: [],
    datasets: []
  };
  approvalChartData: any = {
    labels: [],
    datasets: []
  };
  ageChartData: any = {
    labels: [],
    datasets: []
  };
  genderChartData: any = {
    labels: [],
    datasets: []
  };
  surgeryNameChartData: any = {
    labels: [],
    datasets: []
  };
  roomTypeChartData: any = {
    labels: [],
    datasets: []
  };
  statusChartData: any = {
    labels: [],
    datasets: []
  };
  stayDurationChartData: any = {
    labels: [],
    datasets: []
  };
  stayDurationChartOptions: any = {};
  departmentTable: any[] = []; // For department-wise table data
  doctorList: any[] = []; // To hold doctor data for department-wise table
  showPopup: boolean = false;
  popupTitle: string = '';
  popupTableData: any[] = [];
  popupTableColumns: any[] = [];
  standardColumns = [
    { field: 'estimationId', header: 'Estimation ID' },
    { field: 'estimationName', header: 'Estimation Name' },
    { field: 'consultantName', header: 'Doctor Name' },
    { field: 'employeeName', header: 'Estimator Name' },
    { field: 'submittedDateAndTime', header: 'Created Date' },
    { field: 'estimatedDate', header: 'Admission Date' },
    { field: 'statusOfEstimation', header: 'Status' },
    { field: 'estimationType', header: 'Type' }
  ];
  pacColumns = [
    ...this.standardColumns,
    { field: 'pacDone', header: 'PAC Status' } // true/false
  ];

  roomColumns = [
    ...this.standardColumns,
    { field: 'selectedRoomCost', header: 'Room Name' }
  ];

  genderColumns = [
    ...this.standardColumns,
    { field: 'genderOfPatient', header: 'Gender' }
  ];

  ageColumns = [
    ...this.standardColumns,
    { field: 'ageOfPatient', header: 'Age' }
  ];

  approvalColumns = [
    ...this.standardColumns,
    { field: 'approvalTime', header: 'Approval Time (H:M)' }
  ];

  departmentColumns = [
    ...this.standardColumns,
    { field: 'department', header: 'Department' },
  ];

  estimationTypeOptions: any;
  monthlyChartOptions: any;
  doctorChartOptions: any;
  pacDoneChartOptions: any;
  todayStatusChartOptions: any;
  estimatorWiseChartOptions: any;
  approvalChartOptions: any;
  ageChartOptions: any;
  genderChartOptions: any;
  surgeryNameChartOptions: any;
  roomTypeChartOptions: any;
  statusChartOptions: any;

  showChartPopup = false;
  chartPopupTitle = '';
  chartPopupData: any = null;
  chartPopupDisplayType: 'bar' | 'line' | 'scatter' | 'bubble' | 'pie' | 'doughnut' | 'polarArea' | 'radar' = 'pie';
  chartDisplayTypes: { [key: string]: 'bar' | 'line' | 'scatter' | 'bubble' | 'pie' | 'doughnut' | 'polarArea' | 'radar' } = {
    estimationType: 'pie',
    doctorWise: 'bar',
    monthly: 'bar',
    pacDone: 'doughnut',
    todayStatus: 'bar',
    estimatorWise: 'bar',
    approvalTime: 'bar',
    age: 'bar',
    gender: 'doughnut',
    surgeryName: 'bar',
    roomType: 'doughnut',
    status: 'doughnut',
    stayDuration: 'bar',
    departmentWise: 'bar'
  };

  popupDateRange: Date[] = [];
  chartPopupDateRange: Date[] = [];

  selectedDoctor: string | null = null;
  chartSelectedDoctor: string | null = null;

  doctorDropdownOptions: any;

  // Define chart options for each chart type






  constructor(private estimationService: EstimationService, private doctorService: DoctorServiceService) { }


  ngOnInit() {
    this.estimationTypeOptions = this.generateChartOptions('estimationType');
    this.monthlyChartOptions = this.generateChartOptions('monthly');
    this.doctorChartOptions = this.generateChartOptions('doctorWise');
    this.pacDoneChartOptions = this.generateChartOptions('pacDone');
    this.todayStatusChartOptions = this.generateChartOptions('todayStatus');
    this.estimatorWiseChartOptions = this.generateEstimatorChartOptions('estimatorWise');
    this.approvalChartOptions = this.generateChartOptions('approvalTime');
    this.ageChartOptions = this.generateChartOptions('age');
    this.genderChartOptions = this.generateChartOptions('gender');
    this.surgeryNameChartOptions = this.generateChartOptions('surgeryName');
    this.roomTypeChartOptions = this.generateChartOptions('roomType');
    this.statusChartOptions = this.generateChartOptions('status');
    this.stayDurationChartOptions = this.generateChartOptions('stayDuration');
    this.departmentChartOptions = this.generateDepartmentChartOptions();


    this.estimationService.getAllEstimation().subscribe({
      next: (estimations: any[]) => {
        console.log(estimations);
        this.estimations = estimations;
        this.totalEstimationsOverall = estimations.sort((a, b) => {
          const dateA = new Date(a.submittedDateAndTime).getTime() || 0;
          const dateB = new Date(b.submittedDateAndTime).getTime() || 0;
          return dateB - dateA;
        });

        this.filteredEstimations = this.filterByDays(7); // Default 7 days
        this.updateCharts();
      },
      error: (err) => {
        // Handle the error if the API call fails
        console.error('Error fetching services:', err);
      },
      complete: () => {
        // Optional: Actions to perform once the API call completes
        console.log('Service fetching process completed.');
      }
    });
    this.doctorService.getDoctorWithDepartment().subscribe(doctors => {
      this.doctorList = doctors;
      this.doctorDropdownOptions = this.doctorList.map(doc => ({
        label: doc.name,
        value: doc.name
      }));
      // Then build department-wise table once you also have estimations
      this.prepareDepartmentWiseTable(this.filteredEstimations);
    });
  }
  filterByDays(days: number) {
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - days);

    return this.estimations.filter(e => {
      const date = new Date(e.submittedDateAndTime);
      return date >= cutoff;
    });
  }
  show30Days(chartType: string) {
    this.currentChartType = chartType;
    const last30DaysData = this.filterByDays(90);

    let labels: string[] = [];
    let datasetData: number[] = [];

    switch (chartType) {
      case 'estimationType': {
        const grouped = this.groupBy(last30DaysData, 'estimationType');
        labels = Object.keys(grouped);
        datasetData = Object.values(grouped).map((arr: any) => arr.length);
        this.chartPopupTitle = 'Estimation Type - Last 30 Days';
        break;
      }

      case 'doctorWise': {
        const grouped = this.groupBy(last30DaysData, 'consultantName');
        labels = Object.keys(grouped);
        datasetData = Object.values(grouped).map((arr: any) => arr.length);
        this.chartPopupTitle = 'Doctor Wise - Last 30 Days';
        break;
      }

      case 'monthly': {
        const grouped: any = {};
        last30DaysData.forEach(est => {
          const date = est.submittedDateAndTime ? new Date(est.submittedDateAndTime) : null;
          if (date) {
            const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            grouped[monthYear] = (grouped[monthYear] || 0) + 1;
          }
        });
        labels = Object.keys(grouped);
        datasetData = Object.values(grouped);
        this.chartPopupTitle = 'Monthly - Last 30 Days';
        break;
      }

      case 'pacDone': {
        const filteredPAC = last30DaysData.filter(e => e.estimationType !== 'MM');
        const pacDoneCount = filteredPAC.filter(e => e.pacDone).length;
        const pacNotDoneCount = filteredPAC.length - pacDoneCount;
        labels = ['PAC Done', 'PAC Not Done'];
        datasetData = [pacDoneCount, pacNotDoneCount];
        this.chartPopupTitle = 'PAC Status - Last 30 Days';
        break;
      }

      case 'todayStatus': {
        const today = new Date().toDateString();
        const todayEstimations = last30DaysData.filter(e => {
          const date = e.estimatedDate ? new Date(e.estimatedDate).toDateString() : '';
          return date === today;
        });
        const grouped = this.groupBy(todayEstimations, 'statusOfEstimation');
        labels = Object.keys(grouped);
        datasetData = Object.values(grouped).map((arr: any) => arr.length);
        this.chartPopupTitle = 'Today Status - Last 30 Days';
        break;
      }

      case 'gender': {
        const genderCounts = { Male: 0, Female: 0, Other: 0 };
        last30DaysData.forEach(e => {
          const gender = e.genderOfPatient?.toLowerCase();
          if (gender === 'male') genderCounts.Male++;
          else if (gender === 'female') genderCounts.Female++;
          else genderCounts.Other++;
        });
        labels = ['Male', 'Female', 'Other'];
        datasetData = [genderCounts.Male, genderCounts.Female, genderCounts.Other];
        this.chartPopupTitle = 'Gender - Last 30 Days';
        break;
      }

      case 'roomType': {
        const roomCounts: { [key: string]: number } = {};
        last30DaysData.forEach(e => {
          const roomCost = e.selectedRoomCost;
          if (!roomCost) return;
          const roomName = roomCost.split('-')[0].trim();
          roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
        });
        labels = Object.keys(roomCounts);
        datasetData = Object.values(roomCounts);
        this.chartPopupTitle = 'Room Type - Last 30 Days';
        break;
      }

      case 'status': {
        const grouped = this.groupBy(last30DaysData, 'statusOfEstimation');
        labels = Object.keys(grouped);
        datasetData = Object.values(grouped).map((arr: any) => arr.length);
        this.chartPopupTitle = 'Status - Last 30 Days';
        break;
      }

      case 'surgeryName': {
        const grouped = this.groupBy(last30DaysData, 'estimationName');
        labels = Object.keys(grouped).slice(0, 10); // top 10
        datasetData = labels.map(label => grouped[label].length);
        this.chartPopupTitle = 'Surgery Name - Last 30 Days';
        break;
      }

      case 'age': {
        const ageBuckets = { '<20': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50+': 0 };
        last30DaysData.forEach(e => {
          const age = e.ageOfPatient;
          if (age !== null && age !== undefined) {
            if (age < 20) ageBuckets['<20']++;
            else if (age < 30) ageBuckets['20-29']++;
            else if (age < 40) ageBuckets['30-39']++;
            else if (age < 50) ageBuckets['40-49']++;
            else ageBuckets['50+']++;
          }
        });
        labels = Object.keys(ageBuckets);
        datasetData = Object.values(ageBuckets);
        this.chartPopupTitle = 'Age Distribution - Last 30 Days';
        break;
      }

      case 'approvalTime': {
        // Filter only records that have both dates
        const recordsWithApproval = last30DaysData.filter(e => e.submittedDateAndTime && e.approvedDateAndTime);

        // Map approval time differences
        const approvalTimes = recordsWithApproval.map(e => {
          const submitted = new Date(e.submittedDateAndTime).getTime();
          const approved = new Date(e.approvedDateAndTime).getTime();

          const hoursTaken = (approved - submitted) / (1000 * 60 * 60); // difference in hours
          return {
            approverName: e.approverName || 'Unknown',
            hoursTaken: parseFloat(hoursTaken.toFixed(1))
          };
        });

        // Group by employee (average approval time)
        const grouped: { [employee: string]: number[] } = {};
        approvalTimes.forEach(item => {
          if (!grouped[item.approverName]) grouped[item.approverName] = [];
          grouped[item.approverName].push(item.hoursTaken);
        });

        // Compute averages
        labels = Object.keys(grouped);
        datasetData = labels.map(name => {
          const times = grouped[name];
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          return parseFloat(avg.toFixed(1));
        });
        this.chartPopupTitle = 'Avg Approval Time - Last 30 Days';
        break;
      }
      case 'departmentWise': {
        const departmentMap: { [key: string]: { sm: number; mm: number; mat: number; total: number } } = {};

        last30DaysData.forEach(est => {
          const doctor = this.doctorList.find(d => d.id === est.consultantId);
          const dept = doctor?.departmentName || 'Unknown';

          if (!departmentMap[dept]) {
            departmentMap[dept] = { sm: 0, mm: 0, mat: 0, total: 0 };
          }

          if (est.estimationType === 'SM') departmentMap[dept].sm++;
          else if (est.estimationType === 'MM') departmentMap[dept].mm++;
          else if (est.estimationType?.toLowerCase().includes('mat')) departmentMap[dept].mat++;

          departmentMap[dept].total++;
        });

        const sorted = Object.entries(departmentMap)
          .map(([dept, values]) => ({
            department: dept,
            ...values
          }))
          .sort((a, b) => b.total - a.total)

        const labels = sorted.map(item => item.department);
        const smData = sorted.map(item => item.sm);
        const mmData = sorted.map(item => item.mm);
        const matData = sorted.map(item => item.mat);

        this.chartPopupTitle = 'Department Wise Summary - Last 30 Days';
        this.chartPopupDisplayType = 'bar';

        this.chartPopupData = {
          labels,
          datasets: [
            { label: 'SM', data: smData, backgroundColor: '#7D5FFF' },
            { label: 'MM', data: mmData, backgroundColor: '#FF7BA9' },
            { label: 'Maternity', data: matData, backgroundColor: '#5AC8FA' }
          ]
        };

        this.chartDisplayOptions = this.generateDepartmentChartOptions();
        this.showChartPopup = true;
        return;
      }


      default: {
        console.warn(`View More not configured for: ${chartType}`);
        return;
      }
    }

    // Set chart type dynamically (pie/bar/doughnut)
    this.chartPopupDisplayType = this.chartDisplayTypes[chartType] || 'pie';

    // Prepare popup chart data
    this.chartPopupData = {
      labels,
      datasets: [
        {
          data: datasetData,
          backgroundColor: ['#FFB1B7', '#775DA6', '#70B6C1', '#5AC8FA', '#FF9F40', '#9966FF']
        }
      ]
    };

    this.showChartPopup = true;
  }



  processTodayEstimations(estimations: any[]) {
    const today = new Date();

    const isSameDate = (dateStr: string | Date | null | undefined): boolean => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    };
    const getCreationDate = (e: any): Date | null => {
      return e.estimationCreatedTime || e.submittedDateAndTime || null;
    };

    this.totalEstimations = estimations.filter(e =>
      isSameDate(getCreationDate(e))
    ).length;

    this.pendingEstimations = estimations.filter(e =>
      (e.statusOfEstimation === 'pending' || e.statusOfEstimation === 'submitted') && isSameDate(getCreationDate(e))
    ).length;

    this.approvedEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'approved' && isSameDate(e.approvedDateAndTime)
    ).length;

    this.confirmedEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'confirmed' && isSameDate(e.confirmedDateAndTime)
    ).length;

    this.completedEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'completed' && isSameDate(e.completedDateAndTime)
    ).length;

    this.cancelledEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'cancelled' && isSameDate(e.cancellationDateAndTime)
    ).length;

    this.overDueEstimations = estimations.filter(e =>
      e.statusOfEstimation === 'overDue' && isSameDate(e.overDueDateAndTIme)
    ).length;
    this.todaySurgeries = estimations.filter(e =>
      e.estimatedDate === new Date().toISOString().split('T')[0] && (e.statusOfEstimation === 'confirmed' || e.statusOfEstimation === 'completed') && e.estimatedDate !== null && e.estimatedDate !== undefined
    ).length;
  }


  onSearch() {
    // if (!this.selectedDateRange || this.selectedDateRange.length === 0) {
    //   // No date selected → default data
    //   this.filteredEstimations = this.estimations;
    //   this.updateCharts();
    //   return;
    // }
  
    // If single date selected
    if (this.selectedDateRange.length === 1 || (this.selectedDateRange.length === 2 && this.selectedDateRange[1] === null)) {
      const singleDate = new Date(this.selectedDateRange[0]);
      singleDate.setHours(0, 0, 0, 0); // Start of day
      const endOfDay = new Date(singleDate);
      endOfDay.setHours(23, 59, 59, 999);
  
      this.filteredEstimations = this.estimations.filter(estimation => {
        const estimationDate = new Date(estimation.submittedDateAndTime);
        return estimationDate >= singleDate && estimationDate <= endOfDay;
      });
    }
  
    // If date range selected
    if (this.selectedDateRange.length === 2 && this.selectedDateRange[0] && this.selectedDateRange[1]) {
      const startDate = new Date(this.selectedDateRange[0]);
      const endDate = new Date(this.selectedDateRange[1]);
      endDate.setHours(23, 59, 59, 999);
  
      this.filteredEstimations = this.estimations.filter(estimation => {
        const estimationDate = new Date(estimation.submittedDateAndTime);
        return estimationDate >= startDate && estimationDate <= endDate;
      });
    }
  
    this.updateCharts();
  }
  
  refresh() {
    this.selectedDateRange = []; // Clear selected dates
    this.filteredEstimations = this.filterByDays(7); // Reset to full list
    this.updateCharts();
  }

  // 1. Estimation Type Chart (Pie)
  prepareEstimationTypeChart(data: any[]) {
    const grouped = this.groupBy(data, 'estimationType');
    this.estimationTypeLabels = Object.keys(grouped);
    this.estimationTypeData = Object.values(grouped).map((arr: any) => arr.length);
  }

  // 2. Doctor Wise Estimation (Bar)
  prepareDoctorWiseChart(data: any[]) {
    // Group by consultantName
    const grouped = this.groupBy(data, 'consultantName');

    // Convert grouped object to array of { name, count }
    const doctorCounts = Object.entries(grouped).map(([name, items]: [string, any]) => ({
      name,
      count: items.length
    }));

    // Sort descending by count
    const sorted = doctorCounts.sort((a, b) => b.count - a.count);

    // Take top 10
    const top10 = sorted.slice(0, 10);

    // Map to chart labels and data
    this.doctorLabels = top10.map(item => item.name);
    this.doctorData = top10.map(item => item.count);
  }

  // 3. Monthly Estimation (Line)
  prepareMonthlyChart(data: any[]) {
    const grouped: any = {};
    data.forEach(est => {
      const date = est.submittedDateAndTime ? new Date(est.submittedDateAndTime) : null;
      if (date) {
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        grouped[monthYear] = (grouped[monthYear] || 0) + 1;
      }
    });
    this.monthlyLabels = Object.keys(grouped);
    this.monthlyData = Object.values(grouped);
  }

  // 4. PAC Done Chart (Pie)
  preparePacDoneChart(data: any[]) {
    // Exclude records with estimationType = 'MM'
    const filteredEstimations = data.filter(e => e.estimationType !== 'MM');

    const pacDone = filteredEstimations.filter(e => e.pacDone === true).length;
    const pacNotDone = filteredEstimations.length - pacDone;

    this.pacData = [pacDone, pacNotDone];
  }


  // 5. Today Surgery Status (Bar)
  prepareTodayStatusChart(data: any[]) {
    const today = new Date().toDateString();
    const todayEstimations = data.filter(e => {
      const date = e.estimatedDate ? new Date(e.estimatedDate).toDateString() : '';
      return date === today;
    });

    const grouped = this.groupBy(todayEstimations, 'statusOfEstimation');
    this.todayStatusLabels = Object.keys(grouped);
    this.todayStatusData = Object.values(grouped).map((arr: any) => arr.length);
  }

  // 6. Estimator Wise Summary (Bar)
  prepareEstimatorSummaryChart(data: any[]) {
    // Step 1: Get month labels
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const monthsSet = new Set<string>();

    // Group counts by estimator + month
    const grouped: { [employee: string]: { [month: string]: number } } = {};

    data.forEach(est => {
      const date = est.submittedDateAndTime ? new Date(est.submittedDateAndTime) : null;
      if (!date || !est.employeeName) return;

      const month = monthFormatter.format(date); // e.g., "Jan"
      monthsSet.add(month);

      if (!grouped[est.employeeName]) {
        grouped[est.employeeName] = {};
      }

      grouped[est.employeeName][month] = (grouped[est.employeeName][month] || 0) + 1;
    });

    // Step 2: Prepare labels (months sorted)
    this.estimatorLabels = Array.from(monthsSet);

    // Step 3: Prepare datasets for each estimator
    const datasets = Object.keys(grouped).map((employeeName, idx) => ({
      label: employeeName,
      data: this.estimatorLabels.map(month => grouped[employeeName][month] || 0),
      backgroundColor: this.getColor(idx) // assign colors
    }));

    // Step 4: Assign chart data
    this.estimatorSummaryData = {
      labels: this.estimatorLabels,
      datasets: datasets
    };
  }

  // Helper: Generate colors for datasets
  getColor(index: number): string {
    // const colors = ['#7D5FFF', '#FF7BA9', '#5AC8FA', '#FF9F40', '#36A2EB'];
    const colors = [
      '#FF6F61', // Coral
      '#6B5B95', // Indigo
      '#88B04B', // Olive
      '#F7CAC9', // Rose
      '#92A8D1', // Light Blue
      '#955251'  // Brownish Red
    ]
    return colors[index % colors.length];
  }

  prepareApprovalTimeChart(data: any[]) {
    // Filter only records that have both dates
    const recordsWithApproval = data.filter(e => e.submittedDateAndTime && e.approvedDateAndTime);

    // Map approval time differences
    const approvalTimes = recordsWithApproval.map(e => {
      const submitted = new Date(e.submittedDateAndTime).getTime();
      const approved = new Date(e.approvedDateAndTime).getTime();

      const hoursTaken = (approved - submitted) / (1000 * 60 * 60); // difference in hours
      return {
        approverName: e.approverName || 'Unknown',
        hoursTaken: parseFloat(hoursTaken.toFixed(1))
      };
    });

    // Group by employee (average approval time)
    const grouped: { [employee: string]: number[] } = {};
    approvalTimes.forEach(item => {
      if (!grouped[item.approverName]) grouped[item.approverName] = [];
      grouped[item.approverName].push(item.hoursTaken);
    });

    // Compute averages
    const labels = Object.keys(grouped);
    const avgTimes = labels.map(name => {
      const times = grouped[name];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      return parseFloat(avg.toFixed(1));
    });

    // Assign to chart data
    this.approvalChartData = {
      labels,
      datasets: [
        {
          label: 'Avg Approval Time (hrs)',
          data: avgTimes,
          backgroundColor: '#7D5FFF'
        }
      ]
    };
  }
  prepareAgeChart(data: any[]) {
    // Initialize buckets
    const ageBuckets = {
      '<20': 0,
      '20-29': 0,
      '30-39': 0,
      '40-49': 0,
      '50+': 0
    };

    data.forEach(e => {
      const age = e.ageOfPatient;
      if (age !== null && age !== undefined) {
        if (age < 20) ageBuckets['<20']++;
        else if (age < 30) ageBuckets['20-29']++;
        else if (age < 40) ageBuckets['30-39']++;
        else if (age < 50) ageBuckets['40-49']++;
        else ageBuckets['50+']++;
      }
    });

    this.ageChartData = {
      labels: Object.keys(ageBuckets),
      datasets: [
        {
          label: 'Age Distribution',
          data: Object.values(ageBuckets),
          backgroundColor: ['#7D5FFF', '#FF7BA9', '#5AC8FA', '#FF9F40', '#36A2EB']
        }
      ]
    };
  }
  prepareGenderChart(data: any[]) {
    const genderCounts: { Male: number; Female: number; Other: number } = {
      Male: 0,
      Female: 0,
      Other: 0
    };


    data.forEach(e => {
      const gender = e.genderOfPatient?.toLowerCase();
      if (gender === 'male') genderCounts.Male++;
      else if (gender === 'female') genderCounts.Female++;
      else genderCounts.Other++;
    });

    this.genderChartData = {
      labels: ['Male', 'Female', 'Other'],
      datasets: [
        {
          data: [genderCounts['Male'], genderCounts['Female'], genderCounts['Other']],
          backgroundColor: ['#36A2EB', '#FF7BA9', '#FFCE56']
        }
      ]
    };

  }

  prepareSurgeryNameChart(data: any[]) {
    const surgeryCounts: { [key: string]: number } = {};

    data.forEach(e => {
      const name = e.estimationName?.trim() || 'Unknown';
      surgeryCounts[name] = (surgeryCounts[name] || 0) + 1;
    });

    // Optionally sort by count (descending)
    const sortedEntries = Object.entries(surgeryCounts)
      .sort((a, b) => b[1] - a[1]) // highest first
      .slice(0, 10); // top 10 surgeries

    const labels = sortedEntries.map(entry => entry[0]);
    const counts = sortedEntries.map(entry => entry[1]);

    this.surgeryNameChartData = {
      labels,
      datasets: [
        {
          label: 'Most Created Surgeries',
          data: counts,
          backgroundColor: '#A52B0E'
        }
      ]
    };
  }

  prepareRoomTypeChart(data: any[]) {
    const roomCounts: { [key: string]: number } = {};

    data.forEach(e => {
      // Extract valid value
      const roomCost = e.selectedRoomCost;

      if (!roomCost || roomCost === '(NULL)') return; // Ignore nulls

      // Extract room name (before ' - ')
      const roomName = roomCost.split('-')[0].trim();

      roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
    });


    this.roomTypeChartData = {
      labels: Object.keys(roomCounts),
      datasets: [
        {
          data: Object.values(roomCounts),
          // backgroundColor: ['#7D5FFF', '#FF7BA9', '#5AC8FA', '#FF9F40', '#36A2EB', '#9966FF']
          backgroundColor: [
            '#0072B2', // Blue
            '#E69F00', // Orange
            '#009E73', // Green
            '#D55E00', // Red
            '#CC79A7', // Pink
            '#F0E442'  // Yellow
          ]
          
        }
      ]
    };
  }
  prepareEstimationStatusChart(data: any[]) {
    const statusCounts: { [key: string]: number } = {};

    data.forEach(e => {
      const status = e.statusOfEstimation?.trim() || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    this.statusChartData = {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          data: Object.values(statusCounts),
          // backgroundColor: ['#7D5FFF', '#FF7BA9', '#5AC8FA', '#FF9F40', '#36A2EB', '#9966FF']
          backgroundColor: [
            '#4CAF50', // Green
            '#FF9800', // Orange
            '#2196F3', // Blue
            '#9C27B0', // Purple
            '#F44336', // Red
            '#00BCD4'  // Cyan
          ]
          
        }
      ]
    };
  }
  prepareStayDurationChart(data: any[]) {
    const grouped: { [key: string]: { total: number; icu: number; ward: number; count: number } } = {};

    // Group by estimationName
    data.forEach(e => {
      const name = e.estimationName?.trim() || 'Unknown';

      if (!grouped[name]) {
        grouped[name] = { total: 0, icu: 0, ward: 0, count: 0 };
      }

      grouped[name].total += e.totalDaysStay || 0;
      grouped[name].icu += e.icuStay || 0;
      grouped[name].ward += e.wardStay || 0;
      grouped[name].count++;
    });

    // Calculate average stay for each surgery
    const surgeryAverages = Object.entries(grouped).map(([name, values]) => {
      return {
        name,
        avgTotal: +(values.total / values.count).toFixed(1),
        avgIcu: +(values.icu / values.count).toFixed(1),
        avgWard: +(values.ward / values.count).toFixed(1)
      };
    });

    // Sort by highest avg total stay (or change to frequency if needed)
    const sorted = surgeryAverages.sort((a, b) => b.avgTotal - a.avgTotal);

    // Take top 10
    const top = sorted.slice(0, 10);

    const labels = top.map(item => item.name);
    const avgTotal = top.map(item => item.avgTotal);
    const avgIcu = top.map(item => item.avgIcu);
    const avgWard = top.map(item => item.avgWard);

    this.stayDurationChartData = {
      labels,
      datasets: [
        { label: 'Total Stay', data: avgTotal, backgroundColor: '#7D5FFF', barPercentage: 0.6, categoryPercentage: 0.8 },
        { label: 'ICU Stay', data: avgIcu, backgroundColor: '#FF7BA9', barPercentage: 0.6, categoryPercentage: 0.8 },
        { label: 'Ward Stay', data: avgWard, backgroundColor: '#5AC8FA', barPercentage: 0.6, categoryPercentage: 0.8 }
      ]
    };

    this.stayDurationChartOptions = {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: false
          }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Average Days' }
        }
      }
    };
  }


  prepareDepartmentWiseTable(data: any[]) {
    const departmentMap: {
      [key: string]: { sm: number; mm: number; mat: number; total: number };
    } = {};

    data.forEach(est => {
      const doctor = this.doctorList.find(d => d.id === est.consultantId);
      const dept = doctor?.departmentName || 'Unknown';

      if (!departmentMap[dept]) {
        departmentMap[dept] = { sm: 0, mm: 0, mat: 0, total: 0 };
      }

      if (est.estimationType === 'SM') departmentMap[dept].sm++;
      else if (est.estimationType === 'MM') departmentMap[dept].mm++;
      else if (est.estimationType?.toLowerCase().includes('mat')) departmentMap[dept].mat++;

      departmentMap[dept].total++;
    });

    // Convert to array and sort by total descending
    const sorted = Object.entries(departmentMap)
      .map(([dept, values]) => ({
        department: dept,
        sm: values.sm.toString().padStart(2, '0'),
        mm: values.mm.toString().padStart(2, '0'),
        mat: values.mat.toString().padStart(2, '0'),
        total: values.total
      }))
      .sort((a, b) => b.total - a.total);

    // Take top 5
    this.departmentTable = sorted.slice(0, 5).map((item, index) => ({
      no: (index + 1).toString().padStart(2, '0'),
      ...item
    }));
  }

  // Helper: Group array by property
  groupBy(arr: any[], key: string) {
    return arr.reduce((acc, item) => {
      const val = item[key] || 'Unknown';
      if (!acc[val]) acc[val] = [];
      acc[val].push(item);
      return acc;
    }, {} as { [key: string]: any[] });
  }

  updateCharts() {
    this.prepareEstimationTypeChart(this.filteredEstimations);
    this.prepareDoctorWiseChart(this.filteredEstimations);
    this.prepareEstimatorSummaryChart(this.estimations);
    this.prepareMonthlyChart(this.estimations);
    this.preparePacDoneChart(this.filteredEstimations);
    this.prepareTodayStatusChart(this.filteredEstimations);
    this.prepareApprovalTimeChart(this.filteredEstimations);
    this.prepareAgeChart(this.filteredEstimations);
    this.prepareGenderChart(this.filteredEstimations);
    this.prepareSurgeryNameChart(this.filteredEstimations);
    this.prepareRoomTypeChart(this.filteredEstimations);
    this.prepareEstimationStatusChart(this.filteredEstimations);
    this.prepareStayDurationChart(this.filteredEstimations);
    this.prepareDepartmentWiseTable(this.filteredEstimations);
    this.prepareDepartmentWiseTable(this.filteredEstimations);
    this.prepareDepartmentWiseChart(this.filteredEstimations);
  }
  openDetails(chartType: string, filterValue?: any) {
    let data: any[] = [];

    switch (chartType) {
      case 'estimationType':
        this.popupTitle = `Estimation Type: ${filterValue || 'All'}`;
        data = this.filteredEstimations.filter(est =>
          filterValue ? est.estimationType === filterValue : true
        );
        break;

      case 'doctorWise':
        this.popupTitle = `Doctor: ${filterValue || 'All Doctors'}`;
        data = this.filteredEstimations.filter(est =>
          filterValue ? est.consultantName === filterValue : true
        );
        break;

      case 'monthly':
        this.popupTitle = `Monthly Estimations: ${filterValue}`;
        data = this.estimations.filter(est => {
          const date = new Date(est.submittedDateAndTime);
          const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          return filterValue ? monthYear === filterValue : true;
        });
        break;

      case 'pacDone':
        this.popupTitle = `PAC Status: ${filterValue || 'All'}`;
        data = this.filteredEstimations.filter(est =>
          filterValue ? (est.pacDone ? 'PAC Done' : 'PAC Not Done') === filterValue : true
        );
        data = data.map(item => ({
          ...item,
          pacDone: item.pacDone ? 'Yes' : 'No'
        }));

        this.popupTableColumns = this.pacColumns;
        break;

      case 'todayStatus':
        this.popupTitle = `Today Status: ${filterValue || 'All'}`;
        const today = new Date().toDateString();
        data = this.filteredEstimations.filter(est => {
          const estDate = est.estimatedDate ? new Date(est.estimatedDate).toDateString() : '';
          return filterValue ? (est.statusOfEstimation === filterValue && estDate === today) : true;
        });
        break;

      case 'estimatorWise':
        if (filterValue && typeof filterValue === 'object') {
          // Filter by both month and estimator
          const { month, estimator } = filterValue;
          this.popupTitle = `Estimator: ${estimator} - ${month}`;

          data = this.estimations.filter(est => {
            const date = new Date(est.submittedDateAndTime);
            const monthYear = date.toLocaleString('default', { month: 'short' }); // "May"

            return est.employeeName === estimator && monthYear === month;
          });

        } else {
          // Fallback: show all
          this.popupTitle = `Estimator: ${filterValue || 'All'}`;
          data = this.estimations.filter(est =>
            filterValue ? est.employeeName === filterValue : true
          );
        }
        break;


      case 'approvalTime':
        this.popupTitle = `Approval Time: ${filterValue || 'All'}`;

        // Filter records
        data = this.filteredEstimations.filter(est =>
          filterValue ? est.approverName === filterValue : true
        );
        console.log('Approval Time Data:', data);
        // Map approval time (hours:minutes)
        data = data
          .filter(est => est.submittedDateAndTime && est.approvedDateAndTime) // Ensure both dates exist
          .map(est => {
            const submitted = new Date(est.submittedDateAndTime).getTime();
            const approved = new Date(est.approvedDateAndTime).getTime();

            const diffMs = approved - submitted;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;

            return {
              ...est,
              approvalTime: `${hours}h ${minutes}m`
            };
          });

        console.log('Approval Time Data:', data);

        this.popupTableColumns = this.approvalColumns;
        break;


      case 'age':
        this.popupTitle = `Age Group: ${filterValue || 'All'}`;
        data = this.filteredEstimations.filter(est => {
          const age = est.ageOfPatient;
          if (filterValue === '<20') return age < 20;
          else if (filterValue === '20-29') return age >= 20 && age < 30;
          else if (filterValue === '30-39') return age >= 30 && age < 40;
          else if (filterValue === '40-49') return age >= 40 && age < 50;
          else if (filterValue === '50+') return age >= 50;
          return true; // If no filter, include all
        });
        this.popupTableColumns = this.ageColumns;
        break;

      case 'gender':
        this.popupTitle = `Gender: ${filterValue || 'All'}`;
        data = this.filteredEstimations.filter(est => {
          const gender = est.genderOfPatient?.toLowerCase();

          if (!filterValue) return true; // Show all if no filter

          if (filterValue.toLowerCase() === 'male') return gender === 'male';
          if (filterValue.toLowerCase() === 'female') return gender === 'female';
          if (filterValue.toLowerCase() === 'other') return gender !== 'male' && gender !== 'female';

          return false;

        });
        this.popupTableColumns = this.genderColumns;
        break;
      case 'surgeryName':
        this.popupTitle = `Surgery Name: ${filterValue || 'All'}`;
        data = this.filteredEstimations.filter(est =>
          filterValue ? est.estimationName?.trim() === filterValue : true
        );
        break;

      case 'roomType':
        this.popupTitle = `Room Type: ${filterValue || 'All'}`;
        data = this.filteredEstimations.filter(est => {
          const roomCost = est.selectedRoomCost;
          if (!roomCost) return false; // Skip if no room cost

          const roomName = roomCost.split('-')[0].trim();
          return filterValue ? roomName === filterValue : true;
        });
        this.popupTableColumns = this.roomColumns;
        break;
      case 'status':
        this.popupTitle = `Status: ${filterValue || 'All'}`;
        data = this.filteredEstimations.filter(est =>
          filterValue ? est.statusOfEstimation === filterValue : true
        );
        break;
      case 'stayDuration':
        this.popupTitle = `Stay Duration: ${filterValue || 'All'}`;
        data = this.filteredEstimations.filter(est => {
          const totalDays = est.totalDaysStay;
          if (filterValue === 'ICU') return est.icuStay > 0;
          else if (filterValue === 'Ward') return est.wardStay > 0;
          else if (filterValue === 'Total') return totalDays > 0;
          return true; // If no filter, include all
        });
        break;

      case 'departmentWise':
        const department = filterValue?.department || null;
        const type = filterValue?.type || null;

        if (department && type) {
          // Specific department + type clicked
          this.popupTitle = `Department: ${department} - ${type}`;

          data = this.filteredEstimations
            .filter(est => {
              const doctor = this.doctorList.find(d => d.id === est.consultantId);
              const deptName = doctor?.departmentName || 'Unknown';
              return deptName === department && est.estimationType === type;
            })
            .map(est => {
              const doctor = this.doctorList.find(d => d.id === est.consultantId);
              return {
                ...est,
                department: doctor?.departmentName || 'Unknown'
              };
            });
        } else {
          // View ALL departments (either from "View More" button or no filter)
          this.popupTitle = `All Departments`;

          data = this.filteredEstimations.map(est => {
            const doctor = this.doctorList.find(d => d.id === est.consultantId);
            return {
              ...est,
              department: doctor?.departmentName || 'Unknown'
            };
          });
        }

        this.popupTableColumns = this.departmentColumns;
        this.popupTableData = data;
        this.showPopup = true;
        break;



      default:
        console.warn(`Unknown chart type: ${chartType}`);
        return; // Exit if unknown chart type
    }

    if (!this.popupTableColumns || this.popupTableColumns.length === 0) {
      this.popupTableColumns = this.standardColumns;
    }



    this.popupTableData = data;
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
    this.popupTableData = [];
    this.popupTableColumns = [];
    this.popupTitle = '';
    this.showChartPopup = false;
    this.chartPopupData = null;
    this.chartPopupTitle = '';
    this.chartPopupDisplayType = 'pie'; // Reset to default chart type
    this.popupDateRange = [];
    this.selectedDoctor = null; // Reset doctor filter
    this.chartPopupDateRange = []; // Reset date range for chart popup
    this.chartSelectedDoctor = null; // Reset doctor filter for chart popup

  }

  generateChartOptions(chartType: string) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: {
              size: 10
            }
          }
        }
      },
      layout: {
        padding: 20 // adds inner padding so chart appears smaller
      },
      onClick: (event: any, elements: any[], chart: any) => {
        if (elements.length > 0) {
          const elementIndex = elements[0].index;

          // Fetch labels directly from the chart data
          const clickedLabel = chart.data.labels[elementIndex];

          this.openDetails(chartType, clickedLabel);
        }
      }
    };
  }
  generateDepartmentChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y', // horizontal
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: {
              size: 10
            }
          }
        }
      },
      layout: {
        padding: 20
      },
      onClick: (event: any, elements: any[], chart: any) => {
        if (elements.length > 0) {
          const element = elements[0];

          // Department name (Y-axis label)
          const departmentLabel = chart.data.labels[element.index];

          // Dataset label (SM / MM / Maternity)
          const estimationType = chart.data.datasets[element.datasetIndex].label;

          // Pass both to openDetails
          this.openDetails('departmentWise', { department: departmentLabel, type: estimationType });
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: 'Count' }
        },
        y: {
          title: { display: true, text: 'Department' }
        }
      }
    };
  }

  generateEstimatorChartOptions(chartType: string) {
    return {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      onClick: (event: any, elements: any[], chart: any) => {
        if (elements.length > 0) {
          const element = elements[0];
          const monthLabel = chart.data.labels[element.index]; // e.g., "May"
          const estimatorName = chart.data.datasets[element.datasetIndex].label; // e.g., "Ramya H"

          // Pass both values
          this.openDetails(chartType, { month: monthLabel, estimator: estimatorName });
        }
      }
    };
  }

  exportPopupTable() {
    if (!this.popupTableData || this.popupTableData.length === 0) {
      return;
    }

    // Get headers from popupTableColumns
    const headers = this.popupTableColumns.map(col => col.header);

    // Prepare data rows with formatted values
    const formattedData = this.popupTableData.map(row => {
      const rowData: any = {};
      this.popupTableColumns.forEach(col => {
        let value = row[col.field];

        // Custom formatting logic
        if (col.field === 'pacDone') {
          value = value === true || value === 'Yes' ? 'Yes' : 'No';
        } else if (col.field === 'selectedRoomCost' && value) {
          value = value.split('-')[0].trim(); // Room name only
        } else if (col.field === 'genderOfPatient' && value) {
          value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        } else if (col.field === 'ageOfPatient' && value !== null && value !== undefined) {
          value = `${value} yrs`;
        }

        rowData[col.header] = value; // Use header as key
      });
      return rowData;
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(formattedData, { header: headers });
    const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };

    // Export as Excel
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = `${this.popupTitle || 'Export'}-${new Date().toISOString().split('T')[0]}.xlsx`;
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
  }
  closeChartPopup() {
    this.showChartPopup = false;
    this.chartPopupData = null;
  }

  applyPopupFilters() {
    let filtered = [...this.estimations];

    console.log('Applying filters:', this.popupDateRange, this.selectedDoctor);

    // 1. Filter by doctor if selected
    if (this.selectedDoctor) {
      filtered = filtered.filter(item => item.consultantName === this.selectedDoctor);
      console.log('Filtered by doctor:', filtered);
    }

    // 2. Filter by date or date range
    if (this.popupDateRange.length > 0) {
      let startDate: Date;
      let endDate: Date;

      if (this.popupDateRange[1] === null || this.popupDateRange.length === 1) {
        // Only one date selected
        startDate = new Date(this.popupDateRange[0]);
        endDate = new Date(this.popupDateRange[0]);
      } else {
        // Range selected
        startDate = new Date(this.popupDateRange[0]);
        endDate = new Date(this.popupDateRange[1]);
      }

      // Normalize end date to end of the day
      endDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.submittedDateAndTime);
        return itemDate >= startDate && itemDate <= endDate;
      });

      if (this.popupTitle.includes('PAC')) {
        filtered = filtered.map(item => ({
          ...item,
          pacDone: item.pacDone ? 'Yes' : 'No'
        }));
      }
      if (this.popupTitle.includes('Approval Time')) {
        filtered = filtered.map(item => {
          // Check both dates exist
          if (item.submittedDateAndTime && item.approvedDateAndTime) {
            const submitted = new Date(item.submittedDateAndTime).getTime();
            const approved = new Date(item.approvedDateAndTime).getTime();

            const diffMs = approved - submitted;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;

            return {
              ...item,
              approvalTime: `${hours}h ${minutes}m`
            };
          } else {
            return {
              ...item,
              approvalTime: 'N/A'
            };
          }
        });
      }

      console.log('Filtered by date range:', filtered);
    }
    this.popupTableData = filtered;
  }

  resetPopupFilters() {
    this.popupDateRange = [];
    this.selectedDoctor = null;
    this.popupTableData = [...this.filteredEstimations]; // Reset to original
    this.popupTableColumns = this.standardColumns; // Reset columns
  }

  applyChartPopupFilters() {
    let filtered = [...this.estimations];

    console.log('Applying chart popup filters:', this.chartPopupDateRange, this.chartSelectedDoctor);

    // 1. Filter by doctor if selected
    if (this.chartSelectedDoctor) {
      filtered = filtered.filter(item => item.consultantName === this.chartSelectedDoctor);
      console.log('Filtered by doctor:', filtered);
    }

    // 2. Filter by date or date range
    if (this.chartPopupDateRange.length > 0) {
      let startDate: Date;
      let endDate: Date;

      if (this.chartPopupDateRange[1] === null || this.chartPopupDateRange.length === 1) {
        // Only one date selected
        startDate = new Date(this.chartPopupDateRange[0]);
        endDate = new Date(this.chartPopupDateRange[0]);
      } else {
        // Range selected
        startDate = new Date(this.chartPopupDateRange[0]);
        endDate = new Date(this.chartPopupDateRange[1]);
      }

      // Normalize end date to end of the day
      endDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.submittedDateAndTime);
        return itemDate >= startDate && itemDate <= endDate;
      });
      console.log('Filtered by date range:', filtered);
    }


    // 3. Rebuild chart data using current chart type and filtered data
    this.buildChartPopupData(this.currentChartType, filtered);
  }


  resetChartPopupFilters() {
    this.chartPopupDateRange = [];
    this.chartSelectedDoctor = null;
    this.show30Days(this.currentChartType)
  }

  currentChartType: string = '';

  buildChartPopupData(chartType: string, data: any[]) {
    this.currentChartType = chartType;
    console.log('Building chart popup data for type:', chartType, 'with data:', data);

    let labels: string[] = [];
    let datasetData: number[] = [];

    switch (chartType) {
      case 'estimationType':
        const grouped = this.groupBy(data, 'estimationType');
        labels = Object.keys(grouped);
        datasetData = Object.values(grouped).map((arr: any) => arr.length);
        this.chartPopupTitle = 'Estimation Type - Last 30 Days';
        break;

      case 'doctorWise':
        const doctorGrouped = this.groupBy(data, 'consultantName');
        console.log(doctorGrouped)
        labels = Object.keys(doctorGrouped);
        datasetData = Object.values(doctorGrouped).map((arr: any) => arr.length);
        this.chartPopupTitle = 'Doctor Wise - Last 30 Days';
        break;

      case 'monthly':
        const monthlyGrouped: { [key: string]: number } = {};
        data.forEach(est => {
          const date = est.submittedDateAndTime ? new Date(est.submittedDateAndTime) : null;
          if (date) {
            const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlyGrouped[monthYear] = (monthlyGrouped[monthYear] || 0) + 1;
          }
        });
        labels = Object.keys(monthlyGrouped);
        datasetData = Object.values(monthlyGrouped);
        this.chartPopupTitle = 'Monthly Estimations - Last 30 Days';
        break;
      case 'pacDone':
        const pacDoneFiltered = data.filter(e => e.estimationType !== 'MM');
        const pacDoneCount = pacDoneFiltered.filter(e => e.pacDone === true).length;
        const pacNotDoneCount = pacDoneFiltered.length - pacDoneCount;

        labels = ['PAC Done', 'PAC Not Done'];
        datasetData = [pacDoneCount, pacNotDoneCount];
        this.chartPopupTitle = 'PAC Status - Last 30 Days';
        break;
      case 'approvalTime':
        const approvalGrouped: { [key: string]: number[] } = {};
        data.forEach(e => {
          if (e.submittedDateAndTime && e.approvedDateAndTime) {
            const submitted = new Date(e.submittedDateAndTime).getTime();
            const approved = new Date(e.approvedDateAndTime).getTime();
            const hoursTaken = (approved - submitted) / (1000 * 60 * 60);
            const approverName = e.approverName || 'Unknown';

            if (!approvalGrouped[approverName]) approvalGrouped[approverName] = [];
            approvalGrouped[approverName].push(parseFloat(hoursTaken.toFixed(1)));
          }
        });

        labels = Object.keys(approvalGrouped);
        datasetData = labels.map(name => {
          const times = approvalGrouped[name];
          return parseFloat((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1));
        });
        this.chartPopupTitle = 'Average Approval Time - Last 30 Days';
        break;
      case 'age':
        const ageBuckets = {
          '<20': 0,
          '20-29': 0,
          '30-39': 0,
          '40-49': 0,
          '50+': 0
        };
        data.forEach(e => {
          const age = e.ageOfPatient;
          if (age !== null && age !== undefined) {
            if (age < 20) ageBuckets['<20']++;
            else if (age < 30) ageBuckets['20-29']++;
            else if (age < 40) ageBuckets['30-39']++;
            else if (age < 50) ageBuckets['40-49']++;
            else ageBuckets['50+']++;
          }
        });
        labels = Object.keys(ageBuckets);
        datasetData = Object.values(ageBuckets);
        this.chartPopupTitle = 'Age Distribution - Last 30 Days';
        break;

      case 'gender':
        const genderCounts = { Male: 0, Female: 0, Other: 0 };
        data.forEach(e => {
          const gender = e.genderOfPatient?.toLowerCase();
          if (gender === 'male') genderCounts.Male++;
          else if (gender === 'female') genderCounts.Female++;
          else genderCounts.Other++;
        });
        labels = ['Male', 'Female', 'Other'];
        datasetData = [genderCounts.Male, genderCounts.Female, genderCounts.Other];
        this.chartPopupTitle = 'Gender - Last 30 Days';
        break;

      case 'surgeryName':
        const surgeryCounts: { [key: string]: number } = {};
        data.forEach(e => {
          const name = e.estimationName?.trim() || 'Unknown';
          surgeryCounts[name] = (surgeryCounts[name] || 0) + 1;
        });

        // Sort by count (descending)
        const sortedEntries = Object.entries(surgeryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10); // top 10 surgeries

        labels = sortedEntries.map(entry => entry[0]);
        datasetData = sortedEntries.map(entry => entry[1]);
        this.chartPopupTitle = 'Most Created Surgeries - Last 30 Days';
        break;

      case 'roomType':
        const roomCounts: { [key: string]: number } = {};
        data.forEach(e => {
          const roomCost = e.selectedRoomCost;
          if (!roomCost || roomCost === '(NULL)') return; // Ignore nulls

          const roomName = roomCost.split('-')[0].trim();
          roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
        });

        labels = Object.keys(roomCounts);
        datasetData = Object.values(roomCounts);
        this.chartPopupTitle = 'Room Type - Last 30 Days';
        break;
      case 'status':
        const statusCounts: { [key: string]: number } = {};
        data.forEach(e => {
          const status = e.statusOfEstimation?.trim() || 'Unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        labels = Object.keys(statusCounts);
        datasetData = Object.values(statusCounts);
        this.chartPopupTitle = 'Status - Last 30 Days';
        break;
      case 'departmentWise': {
        const departmentMap: { [key: string]: { sm: number; mm: number; mat: number; total: number } } = {};

        data.forEach(est => {
          const doctor = this.doctorList.find(d => d.id === est.consultantId);
          const dept = doctor?.departmentName || 'Unknown';

          if (!departmentMap[dept]) {
            departmentMap[dept] = { sm: 0, mm: 0, mat: 0, total: 0 };
          }

          if (est.estimationType === 'SM') departmentMap[dept].sm++;
          else if (est.estimationType === 'MM') departmentMap[dept].mm++;
          else if (est.estimationType?.toLowerCase().includes('mat')) departmentMap[dept].mat++;

          departmentMap[dept].total++;
        });

        const sorted = Object.entries(departmentMap)
          .map(([dept, values]) => ({
            department: dept,
            ...values
          }))
          .sort((a, b) => b.total - a.total)
          
        console.log(sorted)

        const labels = sorted.map(item => item.department);
        const smData = sorted.map(item => item.sm);
        const mmData = sorted.map(item => item.mm);
        const matData = sorted.map(item => item.mat);

        this.chartPopupTitle = 'Department Wise Summary - Last 30 Days';
        this.chartPopupDisplayType = 'bar';



        this.chartPopupData = {
          labels,
          datasets: [
            { label: 'SM', data: smData, backgroundColor: '#7D5FFF' },
            { label: 'MM', data: mmData, backgroundColor: '#FF7BA9' },
            { label: 'Maternity', data: matData, backgroundColor: '#5AC8FA' }
          ]
        };

        // this.departmentChartOptions = this.generateDepartmentChartOptions();
        this.chartDisplayOptions = this.generateDepartmentChartOptions();
        break;
      }



      // replicate other chart logic (doctorWise, gender, roomType etc.)
    }

    if (chartType !== 'departmentWise') {
      this.chartPopupDisplayType = this.chartDisplayTypes[chartType] || 'pie';
      this.chartPopupData = {
        labels,
        datasets: [{ data: datasetData, backgroundColor: ['#FFB1B7', '#775DA6', '#70B6C1'] }]
      };
      this.chartDisplayOptions = this.generateChartOptions(chartType);
    }
    
  }
  departmentChartData: any;
  departmentChartOptions: any;
  chartDisplayOptions:any

  prepareDepartmentWiseChart(data: any[]) {
    const departmentMap: {
      [key: string]: { sm: number; mm: number; mat: number; total: number };
    } = {};

    data.forEach(est => {
      const doctor = this.doctorList.find(d => d.id === est.consultantId);
      const dept = doctor?.departmentName || 'Unknown';

      if (!departmentMap[dept]) {
        departmentMap[dept] = { sm: 0, mm: 0, mat: 0, total: 0 };
      }

      if (est.estimationType === 'SM') departmentMap[dept].sm++;
      else if (est.estimationType === 'MM') departmentMap[dept].mm++;
      else if (est.estimationType?.toLowerCase().includes('mat')) departmentMap[dept].mat++;

      departmentMap[dept].total++;
    });

    const sorted = Object.entries(departmentMap)
      .map(([dept, values]) => ({
        department: dept,
        ...values
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const labels = sorted.map(item => item.department);
    const smData = sorted.map(item => item.sm);
    const mmData = sorted.map(item => item.mm);
    const matData = sorted.map(item => item.mat);

    this.departmentChartData = {
      labels,
      datasets: [
        { label: 'SM', data: smData, backgroundColor: '#7D5FFF' },
        { label: 'MM', data: mmData, backgroundColor: '#FF7BA9' },
        { label: 'Maternity', data: matData, backgroundColor: '#5AC8FA' }
      ]
    };
    this.departmentChartOptions = this.generateDepartmentChartOptions();


  }


  getChartDateLabel(): string {
    if (this.selectedDateRange?.length === 2 && this.selectedDateRange[1] === null) {
      const single = this.selectedDateRange[0];
      return `Showing Data for ${single.toLocaleDateString()}`;
    }
  
    if (this.selectedDateRange?.length === 2 && this.selectedDateRange[0] && this.selectedDateRange[1]) {
      const start = this.selectedDateRange[0];
      const end = this.selectedDateRange[1];
      return `Showing Data Between ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
  
    return 'Showing Data of Last 7 days';
  }
  
  
}
