
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import SignaturePad from 'signature_pad';
import { PDFDocument, rgb } from 'pdf-lib';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-signature',
  templateUrl: './signature.component.html',
  styleUrl: './signature.component.css'
})
export class SignatureComponent {
  @ViewChild('patientPad', { static: true }) patientPadElement!: ElementRef;
  @ViewChild('employeePad', { static: true }) employeePadElement!: ElementRef;
  private patientPad!: SignaturePad;
  private employeePad!: SignaturePad;

  formData = {
    patientName: '',
    relationship: '',
    contactNumber: '',
    staffName: '',
    staffId: ''
  };

  ngAfterViewInit() {
    this.patientPad = new SignaturePad(this.patientPadElement.nativeElement);
    this.employeePad = new SignaturePad(this.employeePadElement.nativeElement);
  }

  clearPad(type: 'patient' | 'employee') {
    if (type === 'patient') {
      this.patientPad.clear();
    } else {
      this.employeePad.clear();
    }
  }

  // async generatePDF() {
  //   const pdf = new jsPDF();

  //   // Load the template PDF
  //   pdf.addImage('/assets/Estimation.pdf', 'JPEG', 0, 0, 210, 297); // Ensure this file is accessible in assets
  //   pdf.setFontSize(10);
  //   pdf.text(this.formData.patientName || 'N/A', 50, 130);
  //   pdf.text(this.formData.relationship || 'N/A', 50, 140);
  //   pdf.text(this.formData.contactNumber || 'N/A', 50, 150);

  //   // Add Employee Details
  //   pdf.text(this.formData.staffName || 'N/A', 50, 160);
  //   pdf.text(this.formData.staffId || 'N/A', 50, 170);

  //   // Draw Patient Signature
  //   const patientSignature = this.patientPad.toDataURL('image/png');
  //   pdf.addImage(patientSignature, 'PNG', 50, 250, 50, 20); // Adjust coordinates

  //   // Draw Employee Signature
  //   const employeeSignature = this.employeePad.toDataURL('image/png');
  //   pdf.addImage(employeeSignature, 'PNG', 150, 250, 50, 20); // Adjust coordinates


  //   // Save the PDF
  //   pdf.save('completed-estimation.pdf');
  // }
  async generatePDF() {
    // Load the template PDF
    const existingPdfBytes = await fetch('/Estimation.pdf').then((res) =>
      res.arrayBuffer()
    );

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Embed form details
    firstPage.drawText(this.formData.patientName || 'N/A', {
      x: 300,
      y: 830, // Adjust Y-coordinate as per your template
      size: 10,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(this.formData.relationship || 'N/A', {
      x: 300,
      y: 800,
      size: 10,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(this.formData.contactNumber || 'N/A', {
      x: 300,
      y: 260,
      size: 10,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(this.formData.staffName || 'N/A', {
      x: 300,
      y: 240,
      size: 10,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(this.formData.staffId || 'N/A', {
      x: 150,
      y: 220,
      size: 10,
      color: rgb(0, 0, 0),
    });

    // Add Patient Signature
    if (!this.patientPad.isEmpty()) {
      const patientSignature = this.patientPad.toDataURL();
      const patientSignatureImageBytes = await fetch(patientSignature).then((res) =>
        res.arrayBuffer()
      );
      const patientSignatureImage = await pdfDoc.embedPng(
        patientSignatureImageBytes
      );
      firstPage.drawImage(patientSignatureImage, {
        x: 50,
        y: 250, // Adjust as per template
        width: 100,
        height: 50,
      });
    }

    // Add Employee Signature
    if (!this.employeePad.isEmpty()) {
      const employeeSignature = this.employeePad.toDataURL();
      const employeeSignatureImageBytes = await fetch(employeeSignature).then(
        (res) => res.arrayBuffer()
      );
      const employeeSignatureImage = await pdfDoc.embedPng(
        employeeSignatureImageBytes
      );
      firstPage.drawImage(employeeSignatureImage, {
        x: 300,
        y: 240, // Adjust as per template
        width: 100,
        height: 50,
      });
    }

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.formData.patientName} completed-estimation.pdf`;
    link.click();
  }
}