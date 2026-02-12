import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HandWrittenComponent } from '../hand-written/hand-written.component';
import { OpdAssessmentsService } from '../../services/opd-assessment/opd-assessments.service';
import { MessageService } from 'primeng/api';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { VoiceOpdService } from '../../services/voice-opd/voice-opd.service';

@Component({
  selector: 'app-opd-assessment',
  templateUrl: './opd-assessment.component.html',
  styleUrl: './opd-assessment.component.css',
  providers: [MessageService]
})
export class OpdAssessmentComponent {
  @ViewChild('historyComp') historyComp!: HandWrittenComponent;
  @ViewChild('examinationComp') examinationComp!: HandWrittenComponent;
  @ViewChild('investigationComp') investigationComp!: HandWrittenComponent;
  @ViewChild('treatmentPlanComp') treatmentPlanComp!: HandWrittenComponent;


  private sectionRefs: { [key: string]: HandWrittenComponent } = {};


  ngAfterViewInit() {
    this.sectionRefs = {
      history: this.historyComp,
      examination: this.examinationComp,
      investigation: this.investigationComp,
      treatmentPlan: this.treatmentPlanComp
    };
    console.log('✅ sectionRefs ready:', this.sectionRefs);
  }


  @Input() appointmentId: number | undefined | null = null;
  @Output() close = new EventEmitter<void>(); // 🔴 Notify parent to close
  @Output() saved = new EventEmitter<any>();  // 🔴 Emit saved/updated record
  formData: any = {
    // Patient Info
    patientName: '',
    age: '',
    gender: '',
    uhid: '',
    consultant: '',
    department: '',
    date: '',
    assessmentTime: '',
    height: '',
    weight: '',

    // Vitals
    hr: '',
    rr: '',
    pulse: '',
    bp: '',
    temp: '',
    spo2: '',

    // Nutrition
    dietType: '',
    enteralFeed: '',
    npo: false,
    allergies: '',

    // Pain Score
    painScore: '',

    // Screening
    otherScreening: false,
    counsellingImplants: false,

    // Handwritten
    history: '',
    examination: '',
    investigation: '',
    treatmentPlan: '',

    // Staff
    staffName: '',
    staffEmpId: '',

    // Doctor
    doctorName: '',
    kmcNo: '',
    doctorSign: ''
  };
  mediaRecorder!: MediaRecorder;
  audioChunks: Blob[] = [];
  isRecording = false;

  isSubmitting = false;
  isEditMode = false;

  constructor(private opdService: OpdAssessmentsService, private messageService: MessageService, private appointmentService: AppointmentConfirmService, private voiceOPDService: VoiceOpdService) { }

  ngOnInit(): void {
    if (this.appointmentId) {
      this.isEditMode = true;
      this.loadAssessment(this.appointmentId);
      // fetch appointment details
      this.loadAppointmentDetails(this.appointmentId);
    } else {
      this.resetForm();
    }
  }
  resetForm() {
    this.formData = {
      patientName: '',
      age: '',
      gender: '',
      uhid: '',
      phone: '',
      consultant: '',
      department: '',
      date: '',
      assessmentTime: '',
      hr: '',
      rr: '',
      pulse: '',
      bp: '',
      temp: '',
      spo2: '',
      dietType: '',
      enteralFeed: '',
      npo: false,
      allergies: '',
      painScore: '',
      otherScreening: false,
      counsellingImplants: false,
      history: '',
      examination: '',
      investigation: '',
      treatmentPlan: '',
      staffName: '',
      staffEmpId: '',
      doctorName: '',
      kmcNo: '',
      doctorSign: ''
    };
  }
  onHandWrittenSaved(value: string, current: string) {
    console.log('Saved handwriting for:', current);
    this.formData[current] = value;

    // 🟢 Re-enable all handwriting sections after save
    this.setActivePad(''); // empty disables none (enables all)

    const order = ['history', 'examination', 'investigation', 'treatmentPlan'];
    const nextIndex = order.indexOf(current) + 1;

    if (nextIndex < order.length) {
      const nextKey = order[nextIndex];
      console.log('Focusing on next section:', nextKey);

      const nextComponent = this.sectionRefs[nextKey];
      const nextCanvas = nextComponent?.canvasRef?.nativeElement;

      console.log('Canvas to focus:', nextCanvas);

      if (nextCanvas) {
        nextCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nextCanvas.classList.add('highlight-section');
        setTimeout(() => nextCanvas.classList.remove('highlight-section'), 1000);
        setTimeout(() => nextCanvas.focus(), 600); // optional
      }
    }
  }





  loadAssessment(appointmentId: number) {
    this.opdService.getAssessmentByAppointmentId(appointmentId).subscribe({
      next: (data) => {
        if (data) {

          this.formData = {
            // Patient Info
            patientName: data.name || '',
            age: data.age || '',
            gender: data.gender || '',
            uhid: data.uhId || '',
            consultant: data.consultant || '',
            department: data.department || '',
            date: data.date || '',
            assessmentTime: data.assessmentTime || '',
            height: data.height || '',
            weight: data.weight || '',

            // Vitals
            hr: data.hr || '',
            rr: data.rr || '',
            pulse: data.pulse || '',
            bp: data.bp || '',
            temp: data.temp || '',
            spo2: data.spo2 || '',

            // Nutrition
            dietType: data.oralDiet || '',
            enteralFeed: data.enteralFeed || '',
            npo: data.npo || false,
            allergies: data.allergies || '',

            // Pain Score
            painScore: data.painScore || '',

            // Screening
            otherScreening: data.screeningReq || false,
            counsellingImplants: data.implantCounsel || false,

            // Handwritten
            history: data.history || '',
            examination: data.examination || '',
            investigation: data.investigation || '',
            treatmentPlan: data.treatmentPlan || '',

            // Staff
            staffName: data.staffName || '',
            staffEmpId: data.staffEmpId || '',

            // Doctor
            doctorName: data.doctorName || '',
            kmcNo: data.kmcNo || '',
          };

          this.isEditMode = true;
        }
      },
      error: (err) => {
        console.error('Error loading OPD assessment', err);
      }
    });
  }


  submitForm() {
    this.isSubmitting = true;
    this.formData.age = this.formData.age.toString()
    this.formData.appointmentId = this.appointmentId;
    if (this.isEditMode && this.formData.id) {
      this.opdService.updateAssessment(this.formData.id, this.formData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Assessment updated successfully' });
          this.saved.emit(res);  // 🟢 Emit updated data
          this.close.emit();     // 🟢 Close modal
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update assessment' });
        }
      });
    } else {
      this.opdService.saveAssessment(this.formData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Assessment saved successfully' });
          this.saved.emit(res);  // 🟢 Emit new record
          this.close.emit();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save assessment' });
        }
      });
    }
  }
  async printAssessment() {
    const d = this.formData;
    const now = new Date();
    const logoUrl = "/rash-logo.png";
    d.doctorSign = '';
    if (d.doctorSign && d.doctorSign.startsWith('http')) {
      d.doctorSign = await this.getBase64ImageFromURL(d.doctorSign);
    }

    this.getBase64ImageFromURL(logoUrl).then((logoBase64) => {
      const docDefinition: any = {
        pageSize: "A4",
        pageMargins: [40, 40, 40, 40],
        footer: function (currentPage: number, pageCount: number) {
          return {
            columns: [
              { text: `Jayadev Memorial Rashtrrothana Hospital & Research Centre \nPrinted: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, alignment: 'left', fontSize: 9 },
              { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 9 }
            ],
            margin: [40, 0]
          };
        },
        content: [
          { image: logoBase64, width: 130, alignment: "center" },  // logo on left
          {
            text: "Jayadev Memorial Rashtrrothana Hospital & Research Centre",
            style: "header",
            alignment: "center",
            margin: [0, 30, 0, 0]

          },
          { text: "OPD INITIAL ASSESSMENT", style: "subheader", alignment: "center", margin: [0, 10, 0, 20] },

          // Patient Info
          {
            table: {
              widths: ["*", "*", "*"],
              body: [
                [
                  { text: `Name: ${d.patientName || "-"}` },
                  { text: `Age/Sex: ${d.age || "-"} / ${d.gender || "-"}` },
                  { text: `UHID: ${d.uhid || "-"}` }
                ],
                [
                  { text: `Ht: ${d.height || "-"}` },
                  { text: `Wt: ${d.weight || "-"}` },
                  { text: `Date: ${d.date || "-"}` }
                ],
                [
                  { text: `Consultant: ${d.consultant || "-"}` },
                  { text: `Department: ${d.department || "-"}` },
                  { text: `Assessment Time: ${d.assessmentTime || "-"}` }
                ]
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // Vitals
          { text: "Vitals:", style: "sectionHeader" },
          {
            columns: [
              { text: `HR: ${d.hr || "-"}` },
              { text: `RR: ${d.rr || "-"}` },
              { text: `Pulse: ${d.pulse || "-"}` },
              { text: `BP: ${d.bp || "-"}` },
              { text: `Temp: ${d.temp || "-"}` },
              { text: `SPO2: ${d.spo2 || "-"}` }
            ],
            margin: [0, 0, 0, 20]
          },

          // Nutrition
          { text: "Nutritional Assessment:", style: "sectionHeader" },
          {
            table: {
              widths: ["*", "*", "*", "*"],
              body: [
                [
                  { text: `Oral: ${d.dietType || "-"}` },
                  { text: `Enteral: ${d.enteralFeed || "-"}` },
                  { text: `NPO: ${d.npo ? "Yes" : "No"}` },
                  { text: `Allergies: ${d.allergies || "None"}` }
                ]
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // Pain Score (Legend with selection)
          { text: "Pain Score:", style: "sectionHeader" },
          {
            table: {
              widths: ["auto", "*"],
              body: [
                ["0", d.painScore === "0" ? "No hurt - Selected" : "No hurt"],
                ["1-3", d.painScore === "1-3" ? "Mild - Selected" : "Mild"],
                ["4-7", d.painScore === "4-7" ? "Moderate - Selected" : "Moderate"],
                ["8-10", d.painScore === "8-10" ? "Severe - Selected" : "Severe"]
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // Screening
          { text: "Screening:", style: "sectionHeader" },
          {
            table: {
              widths: ["*", "*"],
              body: [
                [
                  { text: `Requirement for any other screening: ${d.otherScreening ? "Yes" : "No"}` },
                  { text: `Counselling on implants: ${d.counsellingImplants ? "Yes" : "No"}` }
                ]
              ]
            },
            margin: [0, 0, 0, 20]
          },

          // Handwritten sections
          { text: "History:", style: "sectionHeader" },
          d.history ? { image: d.history, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

          { text: "Examination:", style: "sectionHeader" },
          d.examination ? { image: d.examination, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

          { text: "Investigation:", style: "sectionHeader" },
          d.investigation ? { image: d.investigation, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

          { text: "Treatment Plan:", style: "sectionHeader" },
          d.treatmentPlan ? { image: d.treatmentPlan, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

          // Staff
          { text: "Staff:", style: "sectionHeader" },
          { text: `Name: ${d.staffName || "-"}, Emp ID: ${d.staffEmpId || "-"}`, margin: [0, 0, 0, 20] },

          // Doctor
          { text: "Doctor:", style: "sectionHeader" },
          { text: `Name: ${d.doctorName || "-"}, KMC No: ${d.kmcNo || "-"}` },
          d.doctorSign ? { image: d.doctorSign, width: 200, margin: [0, 10, 0, 0] } : {}
          // ✅ Doctor Signature Section

        ],
        styles: {
          header: { fontSize: 16, bold: true },
          subheader: { fontSize: 14, bold: true },
          sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] }
        }
      };

      pdfMake.createPdf(docDefinition).open();
    });
  }
  // printAssessment() {
  //   const d = this.formData;
  //   const now = new Date();
  //   const logoUrl = "/rash-logo.png";

  //   // ✅ Prepare promises for both images
  //   const logoPromise = this.getBase64ImageFromURL(logoUrl);
  //   const doctorSignPromise = d.doctorSign
  //     ? this.getBase64ImageFromURL(d.doctorSign)
  //     : Promise.resolve(null);

  //   // ✅ Wait for both images
  //   Promise.all([logoPromise, doctorSignPromise])
  //     .then(([logoBase64, doctorSignBase64]) => {
  //       const docDefinition: any = {
  //         pageSize: "A4",
  //         pageMargins: [40, 40, 40, 40],
  //         footer: function (currentPage: number, pageCount: number) {
  //           return {
  //             columns: [
  //               {
  //                 text: `Jayadev Memorial Rashtrrothana Hospital & Research Centre \nPrinted: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
  //                 alignment: "left",
  //                 fontSize: 9,
  //               },
  //               {
  //                 text: `Page ${currentPage} of ${pageCount}`,
  //                 alignment: "right",
  //                 fontSize: 9,
  //               },
  //             ],
  //             margin: [40, 0],
  //           };
  //         },
  //         content: [
  //           // ✅ Logo + Header
  //           { image: logoBase64, width: 130, alignment: "center" },
  //           {
  //             text: "Jayadev Memorial Rashtrrothana Hospital & Research Centre",
  //             style: "header",
  //             alignment: "center",
  //             margin: [0, 30, 0, 0],
  //           },
  //           {
  //             text: "OPD INITIAL ASSESSMENT",
  //             style: "subheader",
  //             alignment: "center",
  //             margin: [0, 10, 0, 20],
  //           },

  //           // ✅ Patient Info
  //           {
  //             table: {
  //               widths: ["*", "*", "*"],
  //               body: [
  //                 [
  //                   { text: `Name: ${d.patientName || "-"}` },
  //                   { text: `Age/Sex: ${d.age || "-"} / ${d.gender || "-"}` },
  //                   { text: `UHID: ${d.uhid || "-"}` },
  //                 ],
  //                 [
  //                   { text: `Ht: ${d.height || "-"}` },
  //                   { text: `Wt: ${d.weight || "-"}` },
  //                   { text: `Date: ${d.date || "-"}` },
  //                 ],
  //                 [
  //                   { text: `Consultant: ${d.consultant || "-"}` },
  //                   { text: `Department: ${d.department || "-"}` },
  //                   { text: `Assessment Time: ${d.assessmentTime || "-"}` },
  //                 ],
  //               ],
  //             },
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Vitals
  //           { text: "Vitals:", style: "sectionHeader" },
  //           {
  //             columns: [
  //               { text: `HR: ${d.hr || "-"}` },
  //               { text: `RR: ${d.rr || "-"}` },
  //               { text: `Pulse: ${d.pulse || "-"}` },
  //               { text: `BP: ${d.bp || "-"}` },
  //               { text: `Temp: ${d.temp || "-"}` },
  //               { text: `SPO2: ${d.spo2 || "-"}` },
  //             ],
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Nutrition
  //           { text: "Nutritional Assessment:", style: "sectionHeader" },
  //           {
  //             table: {
  //               widths: ["*", "*", "*", "*"],
  //               body: [
  //                 [
  //                   { text: `Oral: ${d.dietType || "-"}` },
  //                   { text: `Enteral: ${d.enteralFeed || "-"}` },
  //                   { text: `NPO: ${d.npo ? "Yes" : "No"}` },
  //                   { text: `Allergies: ${d.allergies || "None"}` },
  //                 ],
  //               ],
  //             },
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Pain Score
  //           { text: "Pain Score:", style: "sectionHeader" },
  //           {
  //             table: {
  //               widths: ["auto", "*"],
  //               body: [
  //                 ["0", d.painScore === "0" ? "No hurt - Selected" : "No hurt"],
  //                 ["1-3", d.painScore === "1-3" ? "Mild - Selected" : "Mild"],
  //                 ["4-7", d.painScore === "4-7" ? "Moderate - Selected" : "Moderate"],
  //                 ["8-10", d.painScore === "8-10" ? "Severe - Selected" : "Severe"],
  //               ],
  //             },
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Screening
  //           { text: "Screening:", style: "sectionHeader" },
  //           {
  //             table: {
  //               widths: ["*", "*"],
  //               body: [
  //                 [
  //                   { text: `Requirement for any other screening: ${d.otherScreening ? "Yes" : "No"}` },
  //                   { text: `Counselling on implants: ${d.counsellingImplants ? "Yes" : "No"}` },
  //                 ],
  //               ],
  //             },
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Handwritten sections
  //           { text: "History:", style: "sectionHeader" },
  //           d.history ? { image: d.history, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

  //           { text: "Examination:", style: "sectionHeader" },
  //           d.examination ? { image: d.examination, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

  //           { text: "Investigation:", style: "sectionHeader" },
  //           d.investigation ? { image: d.investigation, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

  //           { text: "Treatment Plan:", style: "sectionHeader" },
  //           d.treatmentPlan ? { image: d.treatmentPlan, width: 400, margin: [0, 5, 0, 15] } : { text: "-" },

  //           // ✅ Staff
  //           { text: "Staff:", style: "sectionHeader" },
  //           {
  //             text: `Name: ${d.staffName || "-"}, Emp ID: ${d.staffEmpId || "-"}`,
  //             margin: [0, 0, 0, 20],
  //           },

  //           // ✅ Doctor Signature Section
  //           { text: "Doctor:", style: "sectionHeader" },
  //           {
  //             table: {
  //               widths: ["auto", "*"],
  //               body: [
  //                 [
  //                   doctorSignBase64
  //                     ? { image: doctorSignBase64, width: 120, margin: [0, 5, 0, 5] }
  //                     : { text: "Signature: Not Available" },
  //                   {
  //                     stack: [
  //                       { text: `Name: ${d.doctorName || "-"}` },
  //                       { text: `Department: ${d.department || "-"}` },
  //                       { text: `KMC No: ${d.kmcNo || "-"}` },
  //                     ],
  //                     margin: [10, 5, 0, 0],
  //                   },
  //                 ],
  //               ],
  //             },
  //             layout: "noBorders",
  //             margin: [0, 10, 0, 0],
  //           },
  //         ],
  //         styles: {
  //           header: { fontSize: 16, bold: true },
  //           subheader: { fontSize: 14, bold: true },
  //           sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
  //         },
  //       };

  //       pdfMake.createPdf(docDefinition).open();
  //     })
  //     .catch((err) => {
  //       console.error("❌ Error generating PDF:", err);
  //     });
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
  // Load appointment details
  loadAppointmentDetails(appointmentId: number) {
    this.appointmentService.getAppointmentById(appointmentId).subscribe({
      next: (appt) => {
        if (!appt) return;

        const user = appt.user || {};

        // 🧠 Extract clean staff name from username (e.g. "keerthu_superadmin@rashtrotthana" → "Keerthu")
        let staffName = '';
        if (user.username) {
          const raw = user.username.split('@')[0]; // remove domain
          const base = raw.split('_')[0];          // remove role suffix
          staffName = base.charAt(0).toUpperCase() + base.slice(1); // capitalize first letter
        }

        this.formData = {
          ...this.formData,   // keep handwritten sections, etc.

          // Patient Info
          patientName: appt.patientName || '',
          age: appt.age || '',
          gender: appt.gender || '',
          uhid: appt.prnNumber?.toString() || '',
          consultant: appt.doctorName || '',
          department: appt.department || '',
          date: appt.date || '',
          assessmentTime: appt.time || '',

          // Vitals (from appointment table itself)
          bp: appt.BPs && appt.BPd ? `${appt.BPs}/${appt.BPd}` : '',
          hr: appt.pulse || '',
          rr: appt.RR || '',
          temp: appt.temp || '',
          spo2: appt.spo2 || '',
          height: appt.height || '',
          weight: appt.weight || '',

          // Doctor details
          doctorName: appt.doctorName || '',
          kmcNo: appt.doctor?.kmcNumber || '', // if relation loaded
          staffName: staffName,
          staffEmpId: appt.user?.employeeId?.toString() || '',
          doctorSign: appt.doctor?.signUrl || ''
        };
      },
      error: (err) => {
        console.error("Error loading appointment", err);
      }
    });
  }
  setActivePad(activeKey: string): void {
    const pads = {
      history: this.historyComp,
      examination: this.examinationComp,
      investigation: this.investigationComp,
      treatmentPlan: this.treatmentPlanComp,
    };

    Object.keys(pads).forEach(key => {
      pads[key as keyof typeof pads]?.setReadOnly(!!activeKey && key !== activeKey);
    });
  }

  uploadVoice(file: File) {
    const formData = new FormData();
    formData.append('audio', file);
    this.voiceOPDService.uploadVoice(file).subscribe({
      next: (res) => {
        console.log('Voice response:', res);

        // Fill text data
        this.formData.history = res.history || '';
        this.formData.examination = res.examination || '';
        this.formData.investigation = res.investigation || '';
        this.formData.treatmentPlan = res.treatmentPlan || '';

        // Update handwriting pads
        // this.updateHandwrittenSections();
      },
      error: (err) => {
        console.error('Voice upload failed', err);
      }
    });
  }
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('Recording started...');
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  }
  stopRecording() {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecording = false;

    this.mediaRecorder.onstop = () => {
      // const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      // const audioFile = new File([audioBlob], 'voice.wav', { type: 'audio/wav' });
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });

      this.uploadVoice(audioFile);
    };

    console.log('Recording stopped...');
  }


}
