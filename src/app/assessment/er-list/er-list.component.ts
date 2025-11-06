import { Component } from '@angular/core';
import { ErService } from '../../services/er/er.service';
import pdfMake from 'pdfmake/build/pdfmake';

@Component({
  selector: 'app-er-list',
  templateUrl: './er-list.component.html',
  styleUrl: './er-list.component.css'
})
export class ErListComponent {
  assessments: any[] = [];
  isLoading: boolean = true;
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof any | undefined = undefined;  // No sorting initially
  sortDirection: string = 'asc';
  filteredAssignments: any[] = [];
  selectedAssessment: any = null;


  constructor(private erService: ErService) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.erService.getAllAssessments().subscribe(res => {
      this.assessments = res;
      this.filteredAssignments = [...this.assessments]; // ✅ sync with table
      this.isLoading = false;
    });
  }

  edit(item: any) {
    this.selectedAssessment = item; // open form
  }
  closeForm() {
    this.selectedAssessment = null; // go back to list
  }

  handleSaved(updated: any) {
    // Refresh list after save
    this.loadData();
    this.selectedAssessment = null;
  }

//   printAssessment(data: any) {
//     const d = data;
//     const now = new Date();
//     const logoUrl = "/rash-logo.png";
  
//     this.getBase64ImageFromURL(logoUrl).then((logoBase64) => {
//     const docDefinition: any = {
//       pageSize: "A4",
//       pageMargins: [40, 40, 40, 40],
//       footer: function (currentPage: number, pageCount: number) {
//         return {
//           columns: [
//             {
//               text: `Jayadev Memorial Rashtrrothana Hospital & Research Centre \nPrinted: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
//               alignment: 'left',
//               fontSize: 9
//             },
//             { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 9 }
//           ],
//           margin: [40, 0]
//         };
//       },
//       content: [
//         { image: logoBase64, width: 130, alignment: "center" },  // logo on left

//         {
//           text: "Jayadev Memorial Rashtrrothana Hospital & Research Centre",
//           style: "header",
//           alignment: "center"
//         },
//         { text: "ER ASSESSMENT", style: "subheader", alignment: "center", margin: [0, 10, 0, 20] },

//         // Patient Info
//         {
//           table: {
//             widths: ["*", "*", "*"],
//             body: [
//               [
//                 { text: `Name: ${d.name || "-"}` },
//                 { text: `Age/Sex: ${d.age || "-"} / ${d.sex || "-"}` },
//                 { text: `UHID: ${d.uhId || "-"}` }
//               ],
//               [
//                 { text: `Date: ${d.date || "-"}` },
//                 { text: `Time: ${d.time || "-"}` },
//                 { text: `MLC No: ${d.mlcNo || "-"}` }
//               ]
//             ]
//           },
//           margin: [0, 0, 0, 20]
//         },

//         // Vitals
//         { text: "Vitals:", style: "sectionHeader" },
//         {
//           columns: [
//             { text: `PR: ${d.pr || "-"}` },
//             { text: `BP: ${d.bp || "-"}` },
//             { text: `RR: ${d.rr || "-"}` },
//             { text: `SPO2: ${d.spo2 || "-"}` },
//             { text: `Temp: ${d.temp || "-"}` },
//             { text: `GRBS: ${d.grbs || "-"}` }
//           ],
//           margin: [0, 0, 0, 20]
//         },

//         // Handwritten/Canvas Sections
//         { text: "Presenting Complaints:", style: "sectionHeader" },
//         d.presentingComplaints ? { image: d.presentingComplaints, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         { text: "Past History:", style: "sectionHeader" },
//         d.pastHistory ? { image: d.pastHistory, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         { text: "Regular Medications:", style: "sectionHeader" },
//         d.regularMedications ? { image: d.regularMedications, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         { text: "ABCDE Assessment:", style: "sectionHeader" },
//         d.abcdeAssessment ? { image: d.abcdeAssessment, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         { text: "Examination:", style: "sectionHeader" },
//         d.examination ? { image: d.examination, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         { text: "Investigation:", style: "sectionHeader" },
//         d.investigation ? { image: d.investigation, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         { text: "Procedure Done:", style: "sectionHeader" },
//         d.procedureDone ? { image: d.procedureDone, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         { text: "Provisional Diagnosis:", style: "sectionHeader" },
//         d.provisionalDiagnosis ? { image: d.provisionalDiagnosis, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         { text: "Treatment Administered:", style: "sectionHeader" },
//         d.treatmentAdministered ? { image: d.treatmentAdministered, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

//         // Referral & Disposition
//         { text: "Referral & Disposition:", style: "sectionHeader" },
//         {
//           table: {
//             widths: ["*", "*"],
//             body: [
//               [
//                 { text: `Referral Department: ${d.referralDepartment || "-"}` },
//                 { text: `Disposition: ${d.disposition || "-"}` }
//               ]
//             ]
//           },
//           margin: [0, 0, 0, 20]
//         },

//         // Discharge Vitals
//         { text: "Vitals on Discharge:", style: "sectionHeader" },
//         {
//           columns: [
//             { text: `PR: ${d.dischargePR || "-"}` },
//             { text: `BP: ${d.dischargeBP || "-"}` },
//             { text: `RR: ${d.dischargeRR || "-"}` },
//             { text: `SPO2: ${d.dischargeSpo2 || "-"}` },
//             { text: `Temp: ${d.dischargeTemp || "-"}` }
//           ],
//           margin: [0, 0, 0, 20]
//         },

//         // Prescriptions
//         { text: "Prescriptions:", style: "sectionHeader" },
//         {
//           table: {
//             headerRows: 1,   // 🔑 Ensures header repeats on every page
//             widths: ["auto", "*", "*", "*", "*", "*", "*"],
//             body: [
//               [
//                 { text: "Sl.No", style: "tableHeader" },
//                 { text: "Drug", style: "tableHeader" },
//                 { text: "Dosage", style: "tableHeader" },
//                 { text: "Route", style: "tableHeader" },
//                 { text: "Frequency", style: "tableHeader" },
//                 { text: "Duration", style: "tableHeader" },
//                 { text: "Instruction", style: "tableHeader" }
//               ],
//               ...((d.prescribedDrugs || []).map((row: any, i: number) => [
//                 { text: (i + 1).toString(), alignment: "center" },
              
//                 // ✅ Only drug is handwritten (image)
//                 row.drug ? { image: row.drug, width: 70, alignment: "center" } : "-",
              
//                 // ✅ Others are plain text
//                 { text: row.dosage || "-", alignment: "center" },
//                 { text: row.route || "-", alignment: "center" },
//                 { text: row.frequency || "-", alignment: "center" },
//                 { text: row.duration || "-", alignment: "center" },
//                 { text: row.instruction || "-", alignment: "center" }
//               ]))
              
//             ]
//           },
//           layout: {
//             hLineWidth: function () { return 0.5; },
//             vLineWidth: function () { return 0.5; },
//             hLineColor: function () { return '#aaa'; },
//             vLineColor: function () { return '#aaa'; },
//             paddingLeft: function () { return 5; },
//             paddingRight: function () { return 5; },
//             paddingTop: function () { return 5; },
//             paddingBottom: function () { return 5; }
//           },
//           pageBreak: 'before',   // 🔑 start fresh if table doesn’t fit
//           margin: [0, 0, 0, 20]
//         },


//         // Doctor
//         { text: "Doctor:", style: "sectionHeader" },
//         { text: `Name: ${d.doctorName || "-"}, Specialty: ${d.doctorSpecialty || "-"}, KMC No: ${d.kmcNo || "-"}` },
//         d.doctorSign ? { image: d.doctorSign, width: 200, margin: [0, 10, 0, 0] } : {}
//       ],
//       styles: {
//         header: { fontSize: 16, bold: true },
//         subheader: { fontSize: 14, bold: true },
//         sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] }
//       }
//     };

//     pdfMake.createPdf(docDefinition).open();
//   });
// }

async printAssessment(data: any) {
  const d = { ...data };
  const now = new Date();
  const logoUrl = "/rash-logo.png";
  console.log(d);

  try {
    // Convert logo to Base64
    const logoBase64 = await this.getBase64ImageFromURL(logoUrl);

    // // Convert doctor signature if it's a URL
    // if (d.doctorSign && d.doctorSign.startsWith("http")) {
    //   d.doctorSign = await this.getBase64ImageFromURL(d.doctorSign);
    // }
    // d.doctorSign = '';
    console.log(d.doctorSign);
    if (d.doctorSign && d.doctorSign.startsWith('http')) {
      d.doctorSign = await this.getBase64ImageFromURL(d.doctorSign);
    }
    

    // Convert other image fields (handwritten sections)
    const imageFields = [
      "presentingComplaints",
      "pastHistory",
      "regularMedications",
      "abcdeAssessment",
      "examination",
      "investigation",
      "procedureDone",
      "provisionalDiagnosis",
      "treatmentAdministered"
    ];

    for (const key of imageFields) {
      if (d[key] && d[key].startsWith("http")) {
        d[key] = await this.getBase64ImageFromURL(d[key]);
      }
    }

    // Convert prescription drug images
    if (Array.isArray(d.prescribedDrugs)) {
      for (const row of d.prescribedDrugs) {
        if (row.drug && row.drug.startsWith("http")) {
          row.drug = await this.getBase64ImageFromURL(row.drug);
        }
      }
    }

    // Now all images are Base64 ✅
    const docDefinition: any = {
      pageSize: "A4",
      pageMargins: [40, 40, 40, 40],
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `Jayadev Memorial Rashtrrothana Hospital & Research Centre\nPrinted: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
            alignment: "left",
            fontSize: 9
          },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: "right", fontSize: 9 }
        ],
        margin: [40, 0]
      }),
      content: [
        { image: logoBase64, width: 130, alignment: "center" },
        {
          text: "Jayadev Memorial Rashtrrothana Hospital & Research Centre",
          style: "header",
          alignment: "center"
        },
        { text: "ER ASSESSMENT", style: "subheader", alignment: "center", margin: [0, 10, 0, 20] },
        {
          table: {
            widths: ["*", "*", "*"],
            body: [
              [
                { text: `Name: ${d.name || "-"}` },
                { text: `Age/Sex: ${d.age || "-"} / ${d.sex || "-"}` },
                { text: `UHID: ${d.uhId || "-"}` }
              ],
              [
                { text: `Date: ${d.date || "-"}` },
                { text: `Time: ${d.time || "-"}` },
                { text: `MLC No: ${d.mlcNo || "-"}` }
              ]
            ]
          },
          margin: [0, 0, 0, 20]
        },
        { text: "Vitals:", style: "sectionHeader" },
        {
          columns: [
            { text: `PR: ${d.pr || "-"}` },
            { text: `BP: ${d.bp || "-"}` },
            { text: `RR: ${d.rr || "-"}` },
            { text: `SPO2: ${d.spo2 || "-"}` },
            { text: `Temp: ${d.temp || "-"}` },
            { text: `GRBS: ${d.grbs || "-"}` }
          ],
          margin: [0, 0, 0, 20]
        },
        // Handwritten Sections
        { text: "Presenting Complaints:", style: "sectionHeader" },
        d.presentingComplaints ? { image: d.presentingComplaints, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        { text: "Past History:", style: "sectionHeader" },
        d.pastHistory ? { image: d.pastHistory, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        { text: "Regular Medications:", style: "sectionHeader" },
        d.regularMedications ? { image: d.regularMedications, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        { text: "ABCDE Assessment:", style: "sectionHeader" },
        d.abcdeAssessment ? { image: d.abcdeAssessment, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        { text: "Examination:", style: "sectionHeader" },
        d.examination ? { image: d.examination, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        { text: "Investigation:", style: "sectionHeader" },
        d.investigation ? { image: d.investigation, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        { text: "Procedure Done:", style: "sectionHeader" },
        d.procedureDone ? { image: d.procedureDone, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        { text: "Provisional Diagnosis:", style: "sectionHeader" },
        d.provisionalDiagnosis ? { image: d.provisionalDiagnosis, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        { text: "Treatment Administered:", style: "sectionHeader" },
        d.treatmentAdministered ? { image: d.treatmentAdministered, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },
        // Doctor Section
        { text: "Doctor:", style: "sectionHeader" },
        { text: `Name: ${d.doctorName || "-"}, Specialty: ${d.doctorSpecialty || "-"}, KMC No: ${d.kmcNo || "-"}` },
        d.doctorSign ? { image: d.doctorSign, width: 200, margin: [0, 10, 0, 0] } : {}
      ],
      styles: {
        header: { fontSize: 16, bold: true },
        subheader: { fontSize: 14, bold: true },
        sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] }
      }
    };

    pdfMake.createPdf(docDefinition).open();

  } catch (error) {
    console.error("Error generating PDF", error);
  }
}

  sortBy(column: keyof any) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; // Toggle direction
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc'; // Default to ascending when a new column is clicked
    }
    if (column === 'date') {
      this.filteredAssignments.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return this.sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
    }
    this.currentPage = 1; // Reset to the first page when sorting changes
  }

  // Method to sort appointments based on the selected column and direction
  sortedAppointments() {
    if (!this.sortColumn) {
      return [...this.filteredAssignments];
    }


    return [...this.filteredAssignments].sort((a, b) => {
      const valueA = a[this.sortColumn!]; // Use the non-null assertion operator (!) to tell TypeScript sortColumn is defined
      const valueB = b[this.sortColumn!];

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0; // Default to no sorting if types are not strings
    });
  }

  // Method to return paginated appointments after sorting
  getPaginatedAppointments() {
    const sorted = this.sortedAppointments();  // First, sort the data (or not)
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage); // Return paginated data
  }

  // Method to calculate total pages
  get totalPages() {
    return Math.ceil(this.filteredAssignments?.length / this.itemsPerPage);
  }

  // Method to go to the previous page
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Method to go to the next page
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Handle page number change
  onPageChange() {
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }
  private getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";  // important for cross-domain images
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = url;
    });
  }
}
