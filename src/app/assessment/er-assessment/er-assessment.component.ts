import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { ErService } from '../../services/er/er.service';
import { MessageService } from 'primeng/api';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { NgForm } from '@angular/forms';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { HandWrittenComponent } from '../hand-written/hand-written.component';

@Component({
  selector: 'app-er-assessment',
  templateUrl: './er-assessment.component.html',
  styleUrl: './er-assessment.component.css',
  providers: [MessageService]

})
export class ErAssessmentComponent {
  @Input() appointmentId: number | undefined | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();
  @ViewChild('erForm') erForm!: NgForm;
  @ViewChild('presentingComplaintsComp') presentingComplaintsComp!: HandWrittenComponent;
  @ViewChild('pastHistoryComp') pastHistoryComp!: HandWrittenComponent;
  @ViewChild('regularMedicationsComp') regularMedicationsComp!: HandWrittenComponent;
  @ViewChild('abcdeAssessmentComp') abcdeAssessmentComp!: HandWrittenComponent;
  @ViewChild('examinationComp') examinationComp!: HandWrittenComponent;
  @ViewChild('investigationComp') investigationComp!: HandWrittenComponent;
  @ViewChild('procedureDoneComp') procedureDoneComp!: HandWrittenComponent;
  @ViewChild('provisionalDiagnosisComp') provisionalDiagnosisComp!: HandWrittenComponent;
  @ViewChild('treatmentAdministeredComp') treatmentAdministeredComp!: HandWrittenComponent;

  private sectionRefs: { [key: string]: HandWrittenComponent } = {};

ngAfterViewInit() {
  this.sectionRefs = {
    presentingComplaints: this.presentingComplaintsComp,
    pastHistory: this.pastHistoryComp,
    regularMedications: this.regularMedicationsComp,
    abcdeAssessment: this.abcdeAssessmentComp,
    examination: this.examinationComp,
    investigation: this.investigationComp,
    procedureDone: this.procedureDoneComp,
    provisionalDiagnosis: this.provisionalDiagnosisComp,
    treatmentAdministered: this.treatmentAdministeredComp
  };
}



  formData: any = {
    name: '', age: '', sex: '', uhId: '', date: '', time: '',
    pr: '', bp: '', rr: '', spo2: '', temp: '', grbs: '', mlcNo: '',
    presentingComplaints: '', pastHistory: '', regularMedications: '',
    abcdeAssessment: '', examination: '', investigation: '',
    procedureDone: '', provisionalDiagnosis: '', treatmentAdministered: '',
    referralDepartment: '', disposition: '',
    dischargePR: '', dischargeBP: '', dischargeRR: '',
    dischargeSpo2: '', dischargeTemp: '',
    prescribedDrugs: [], otherInstructions: '', followUp: '',
    doctorSpecialty: '', doctorSign: '', doctorName: '', kmcNo: ''
  };

  isSubmitting = false;
  isEditMode = false;
  doctorList: any[] = [];
  doctorDropdownOptions: any[] = [];
  departments: any[] = [];


  constructor(private erService: ErService, private messageService: MessageService, private appointmentService: AppointmentConfirmService, private doctorService: DoctorServiceService) { }

  ngOnInit(): void {
    if (this.appointmentId) {
      this.loadAssessment(this.appointmentId);
    }
    if (!this.formData.prescribedDrugs) {
      this.formData.prescribedDrugs = [];
    }
    this.addPrescriptionRow(); // Start with one empty row
    this.appointmentService.getAllPatients().subscribe(
      (patients => {
        this.patients = patients;
        // console.log(this.patients)
      })
    )
    this.doctorService.getDoctorWithDepartment().subscribe(doctors => {
      this.doctorList = doctors;
      this.doctorDropdownOptions = this.doctorList.map(doc => ({
        label: doc.name,
        value: doc.id
      }));
    });
    this.doctorService.getDepartments().subscribe((res: any[]) => {
      this.departments = res;
    });
  }
  // When doctor selected from dropdown
  onDoctorSelect(doctorId: string | number) {
    const selectedDoctor = this.doctorList.find(doc => doc.id === +doctorId);

    if (selectedDoctor) {
      this.formData.doctorName = selectedDoctor.name || '';
      this.formData.kmcNo = selectedDoctor.kmcNumber || '';
      this.formData.doctorSpecialty = selectedDoctor.departmentName || '';
      this.formData.doctorId = Number(selectedDoctor.id);
      // this.formData.doctorSign = selectedDoctor.signUrl || '';
    }
  }


  loadAssessment(appointmentId: number) {
    this.erService.getAssessmentByAppointmentId(appointmentId).subscribe(res => {
      if (res) {
        this.formData = res;
        this.isEditMode = true;
      }
    });
  }

  addPrescriptionRow() {
    this.formData.prescribedDrugs.push({
      drug: "",
      dosage: "",
      route: "",
      frequency: "",
      duration: "",
      instruction: "",
      handwriting: ""
    });
  }
  // ✅ Dosage Options
  dosageOptions: string[] = [
    '1 mg', '2 mg', '5 mg', '10 mg', '20 mg', '25 mg', '50 mg', '100 mg',
    '125 mg', '250 mg', '500 mg', '750 mg', '1000 mg',
    '5 ml', '10 ml', '15 ml', '20 ml',
    '1 tablet', '2 tablets',
    '1/2 tablet', '1/4 tablet',
    'As Directed'
  ];

  // ✅ Route Options
  routeOptions: string[] = [
    'Oral', 'IV', 'IM', 'Subcutaneous', 'Topical', 'Inhalation', 'Ophthalmic', 'Rectal'
  ];

  // ✅ Frequency Options
  frequencyOptions: string[] = [
    '1-1-1',
    '1-0-1',
    '1-1-0',
    '0-1-1',
    '1-0-0',
    '0-0-1',
    '0-1-0',
    '2-2-2',
    '1/2-1/2-1/2',
    '1/2-0-1/2',
    '1/2-1/2-0',
    '1-1-1-1',
    '2-2-2-2',
    '5ml-5ml-5ml',
    'Stat',
    'Till Review',
    'SOS',
    'Daily',
    'Alternate Days',
    'Weekly',
    'Monthly'
  ];

  // ✅ Duration Options
  durationOptions: string[] = [
    'Daily',
    '3 days',
    '5 days',
    '7 days',
    '10 days',
    '14 days',
    '1 month',
    'As Directed'
  ];


  submitForm() {
    this.isSubmitting = true;
    this.formData.age = this.formData.age.toString();
    this.formData.uhId = this.formData.uhId?.toString();
    this.formData.doctorId = this.formData.doctorId ? Number(this.formData.doctorId) : null;
    if (this.isEditMode && this.formData.id) {
      this.erService.updateAssessment(this.formData.id, this.formData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'ER Assessment updated successfully' });
          this.saved.emit(res);
          this.close.emit();
        },
        error: () => this.isSubmitting = false
      });
    } else {
      this.formData.date = new Date().toISOString().split('T')[0]; // current date
      this.formData.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // current time
      this.erService.saveAssessment(this.formData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'ER Assessment saved successfully' });
          this.saved.emit(res);
          this.close.emit();
        },
        error: () => this.isSubmitting = false
      });
    }
  }
  async printAssessment() {
    const d = this.formData;
    const now = new Date();
    const logoUrl = "/rash-logo.png";
    console.log(d);
  
    try {
      // Convert logo to Base64
      const logoBase64 = await this.getBase64ImageFromURL(logoUrl);
  
      // // Convert doctor signature if it's a URL
      if (d.doctorSign && d.doctorSign.startsWith('http')) {
        d.doctorSign = await this.getBase64ImageFromURL(d.doctorSign);
      }
      // d.doctorSign = '';

      
  
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
  // printAssessment() {
  //   const d = this.formData;
  //   const now = new Date();
  //   const logoUrl = "/rash-logo.png";
  
  //   // ✅ Prepare both image promises
  //   const logoPromise = this.getBase64ImageFromURL(logoUrl);
  //   const doctorSignPromise = d.doctorSign
  //     ? this.getBase64ImageFromURL(d.doctorSign)
  //     : Promise.resolve(null);
  
  //   // ✅ Wait for both before creating the PDF
  //   Promise.all([logoPromise, doctorSignPromise]).then(([logoBase64, doctorSignBase64]) => {
  //     const docDefinition: any = {
  //       pageSize: "A4",
  //       pageMargins: [40, 40, 40, 40],
  //       footer: function (currentPage: number, pageCount: number) {
  //         return {
  //           columns: [
  //             {
  //               text: `Jayadev Memorial Rashtrrothana Hospital & Research Centre \nPrinted: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
  //               alignment: "left",
  //               fontSize: 9,
  //             },
  //             { text: `Page ${currentPage} of ${pageCount}`, alignment: "right", fontSize: 9 },
  //           ],
  //           margin: [40, 0],
  //         };
  //       },
  //       content: [
  //         // ✅ Header
  //         { image: logoBase64, width: 130, alignment: "center" },
  //         {
  //           text: "Jayadev Memorial Rashtrrothana Hospital & Research Centre",
  //           style: "header",
  //           alignment: "center",
  //           margin: [0, 30, 0, 0],
  //         },
  //         { text: "ER ASSESSMENT", style: "subheader", alignment: "center", margin: [0, 10, 0, 20] },
  
  //         // ✅ Patient Info
  //         {
  //           table: {
  //             widths: ["*", "*", "*"],
  //             body: [
  //               [
  //                 { text: `Name: ${d.name || "-"}` },
  //                 { text: `Age/Sex: ${d.age || "-"} / ${d.sex || "-"}` },
  //                 { text: `UHID: ${d.uhId || "-"}` },
  //               ],
  //               [
  //                 { text: `Date: ${d.date || "-"}` },
  //                 { text: `Time: ${d.time || "-"}` },
  //                 { text: `MLC No: ${d.mlcNo || "-"}` },
  //               ],
  //             ],
  //           },
  //           margin: [0, 0, 0, 20],
  //         },
  
  //         // ✅ Vitals
  //         { text: "Vitals:", style: "sectionHeader" },
  //         {
  //           columns: [
  //             { text: `PR: ${d.pr || "-"}` },
  //             { text: `BP: ${d.bp || "-"}` },
  //             { text: `RR: ${d.rr || "-"}` },
  //             { text: `SPO2: ${d.spo2 || "-"}` },
  //             { text: `Temp: ${d.temp || "-"}` },
  //             { text: `GRBS: ${d.grbs || "-"}` },
  //           ],
  //           margin: [0, 0, 0, 20],
  //         },
  
  //         // ✅ Canvas/Handwritten Sections
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
  
  //         // ✅ Referral & Disposition
  //         { text: "Referral & Disposition:", style: "sectionHeader" },
  //         {
  //           table: {
  //             widths: ["*", "*"],
  //             body: [
  //               [
  //                 { text: `Referral Department: ${d.referralDepartment || "-"}` },
  //                 { text: `Disposition: ${d.disposition || "-"}` },
  //               ],
  //             ],
  //           },
  //           margin: [0, 0, 0, 20],
  //         },
  
  //         // ✅ Discharge Vitals
  //         { text: "Vitals on Discharge:", style: "sectionHeader" },
  //         {
  //           columns: [
  //             { text: `PR: ${d.dischargePR || "-"}` },
  //             { text: `BP: ${d.dischargeBP || "-"}` },
  //             { text: `RR: ${d.dischargeRR || "-"}` },
  //             { text: `SPO2: ${d.dischargeSpo2 || "-"}` },
  //             { text: `Temp: ${d.dischargeTemp || "-"}` },
  //           ],
  //           margin: [0, 0, 0, 20],
  //         },
  
  //         // ✅ Prescriptions
  //         { text: "Prescriptions:", style: "sectionHeader" },
  //         {
  //           table: {
  //             headerRows: 1,
  //             widths: ["auto", "*", "*", "*", "*", "*", "*"],
  //             body: [
  //               [
  //                 { text: "Sl.No", style: "tableHeader" },
  //                 { text: "Drug", style: "tableHeader" },
  //                 { text: "Dosage", style: "tableHeader" },
  //                 { text: "Route", style: "tableHeader" },
  //                 { text: "Frequency", style: "tableHeader" },
  //                 { text: "Duration", style: "tableHeader" },
  //                 { text: "Instruction", style: "tableHeader" },
  //               ],
  //               ...((d.prescribedDrugs || []).map((row: any, i: number) => [
  //                 { text: (i + 1).toString(), alignment: "center" },
  //                 row.drug ? { image: row.drug, width: 70, alignment: "center" } : "-",
  //                 { text: row.dosage || "-", alignment: "center" },
  //                 { text: row.route || "-", alignment: "center" },
  //                 { text: row.frequency || "-", alignment: "center" },
  //                 { text: row.duration || "-", alignment: "center" },
  //                 { text: row.instruction || "-", alignment: "center" },
  //               ])),
  //             ],
  //           },
  //           layout: {
  //             hLineWidth: () => 0.5,
  //             vLineWidth: () => 0.5,
  //             hLineColor: () => "#aaa",
  //             vLineColor: () => "#aaa",
  //             paddingLeft: () => 5,
  //             paddingRight: () => 5,
  //             paddingTop: () => 5,
  //             paddingBottom: () => 5,
  //           },
  //           pageBreak: "before",
  //           margin: [0, 0, 0, 20],
  //         },
  
  //         // ✅ Doctor Details + Signature
  //         { text: "Doctor:", style: "sectionHeader" },
  //         {
  //           table: {
  //             widths: ["auto", "*"],
  //             body: [
  //               [
  //                 doctorSignBase64
  //                   ? { image: doctorSignBase64, width: 120, margin: [0, 5, 0, 5] }
  //                   : { text: "Signature: Not Available" },
  //                 {
  //                   stack: [
  //                     { text: `Name: ${d.doctorName || "-"}` },
  //                     { text: `Specialty: ${d.doctorSpecialty || "-"}` },
  //                     { text: `KMC No: ${d.kmcNo || "-"}` },
  //                   ],
  //                   margin: [10, 5, 0, 0],
  //                 },
  //               ],
  //             ],
  //           },
  //           layout: "noBorders",
  //           margin: [0, 10, 0, 0],
  //         },
  //       ],
  //       styles: {
  //         header: { fontSize: 16, bold: true },
  //         subheader: { fontSize: 14, bold: true },
  //         sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
  //         tableHeader: { bold: true, fillColor: "#f0f0f0" },
  //       },
  //     };
  
  //     pdfMake.createPdf(docDefinition).open();
  //   });
  // }

  
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
  showUhidSuggestions = false;
  filteredUHIDs: any[] = [];
  patients: any[] = []; // fill this list with API response

  onUHIDChange() {
    console.log('UHID input changed:', this.formData.uhId);
    this.showUhidSuggestions = true
    const input = this.formData.uhId || '';

    if (!input) {
      this.filteredUHIDs = [];
      return;
    }

    console.log('Filtering UHIDs with input:', input, this.filteredUHIDs, this.showUhidSuggestions);

    this.filteredUHIDs = this.patients.filter(patient =>
      String(patient.prn).trim().includes(String(input).trim())
    );

    this.showUhidSuggestions = this.filteredUHIDs.length > 0;
  }

  selectUHID(selectedPatient: any) {
    if (!selectedPatient) return;

    const nameParts = selectedPatient.name.split(" ");
    const titles = ["Mr.", "Ms.", "Mrs.", "Miss.", "Dr.", "Master", "Baby Of."];
    let prefix = "";
    let firstName = "";
    let lastName = "";

    if (titles.includes(nameParts[0])) {
      prefix = nameParts[0];
      firstName = nameParts[1] || "";
      lastName = nameParts.slice(2).join(" ") || "";
    } else if (nameParts[0] === "Baby" && nameParts[1] === "Of.") {
      prefix = "Baby Of.";
      firstName = nameParts.slice(2).join(" ") || "";
      lastName = "";
    } else {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ") || "";
    }

    // Autofill patient details into your formData
    this.formData = {
      ...this.formData,
      uhId: selectedPatient.prn || '',
      name: selectedPatient.name || '',
      age: selectedPatient.age ? selectedPatient.age.replace(/\D/g, '') : '',
      sex: selectedPatient.gender || '',
    };

    this.showUhidSuggestions = false;
  }

  validateAndSubmit() {
    if (this.erForm.invalid) {
      // Touch all controls so errors show inline
      Object.values(this.erForm.controls).forEach(control => {
        control.markAsTouched();
      });

      // Or show a toast with generic error
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill all required fields before submitting.'
      });
      return;
    }
    else {

      this.submitForm(); // proceed with save
    }
  }
  onHandWrittenSaved(value: string, current: string) {
    console.log('Saved handwriting for:', current);
    this.formData[current] = value;

      // Re-enable all pads after save
  this.setActivePad('');
  
    const order = [
      'presentingComplaints',
      'pastHistory',
      'regularMedications',
      'abcdeAssessment',
      'examination',
      'investigation',
      'procedureDone',
      'provisionalDiagnosis',
      'treatmentAdministered'
    ];
  
    const nextIndex = order.indexOf(current) + 1;
  
    if (nextIndex < order.length) {
      const nextKey = order[nextIndex];
      const nextComponent = this.sectionRefs[nextKey];
      const nextCanvas = nextComponent?.canvasRef?.nativeElement;
  
      if (nextCanvas) {
        nextCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nextCanvas.classList.add('highlight-section');
        setTimeout(() => nextCanvas.classList.remove('highlight-section'), 1000);
        setTimeout(() => nextCanvas.focus(), 600); // optional auto-focus
      }
    }
  }
  
  setActivePad(activeKey: string): void {
    const pads = {
      presentingComplaints: this.presentingComplaintsComp,
      pastHistory: this.pastHistoryComp,
      regularMedications: this.regularMedicationsComp,
      abcdeAssessment: this.abcdeAssessmentComp,
      examination: this.examinationComp,
      investigation: this.investigationComp,
      procedureDone: this.procedureDoneComp,
      provisionalDiagnosis: this.provisionalDiagnosisComp,
      treatmentAdministered: this.treatmentAdministeredComp
    };
  
    // 🔹 If activeKey is empty → enable all
    if (!activeKey) {
      Object.values(pads).forEach(pad => pad?.setReadOnly(false));
      return;
    }
  
    // 🔹 Disable all except the active one
    Object.keys(pads).forEach(key => {
      const pad = pads[key as keyof typeof pads];
      pad?.setReadOnly(key !== activeKey);
    });
  }
  
}
