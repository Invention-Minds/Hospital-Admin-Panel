import { Component, ViewChild, ElementRef } from '@angular/core';
import { flush } from '@angular/core/testing';
import { FLAG_ID } from 'html2canvas/dist/types/css/syntax/tokenizer';

@Component({
  selector: 'app-help-center',
  templateUrl: './help-center.component.html',
  styleUrl: './help-center.component.css'
})
export class HelpCenterComponent {

@ViewChild('topScrollAnchor', { static: true }) topScrollAnchor!: ElementRef

onQuestionSelected($event: any) {
throw new Error('Method not implemented.');
}

  component : string = 'default';
  showList : boolean = false;
  viewList : boolean = false;
  mhcModule : boolean = false;
  serviceModule : boolean = false;
  reportModule : boolean = false;
  estimationModule: boolean = false;
  doctorModule: boolean = false;
  profileModule: boolean = false;
  MHCCoordinatorModule: boolean = false;
  showAns: boolean = false;
  showLine: boolean = false;

  accordionStates:any = {
    showList: false,
    viewList: false,
    mhcModule: false,
    serviceModule: false,
    reportModule: false,
    estimationModule: false,
    doctorModule: false,
    profileModule: false,
    MHCCoordinatorModule: false
  };

  ngOnInit(){
    this.component = 'default'
    this.faqs = this.defaultModule.filter((faqs:any) => faqs.from === 'defaultModule')
    this.faqs
  }

  faqs : any

  moduleController(e:string,faq:string){
    this.component = e;

    this.faqs = this.defaultModule.filter((ques : any) => ques.from === faq)
    this.faqs 
    
    this.scrollToTop()
  }

  private scrollToTop(): void {
    // Method 1: Using anchor element (recommended)
    this.topScrollAnchor.nativeElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }


  accordian(tab: string): void {
    this.showLine = true;
    
    // Extract the base module name (remove 'Close' if present)
    const moduleName = tab.replace('Close', '');
    
    // If clicking the currently open module, close it
    if (this.accordionStates[moduleName]) {
      this.accordionStates[moduleName] = false;
      return;
    }
    
    // Close all modules first
    Object.keys(this.accordionStates).forEach(key => {
      this.accordionStates[key] = false;
    });
    
    // Open the clicked module
    this.accordionStates[moduleName] = true;
  }

    defaultModule = [
    {
      question: `How do I book a new appointment ?`,
      answer: `Go to the <b>New Appointment Form</b>, enter the patient\'s PRN or full name, phone number, and select the doctor, date, and time. If the slot is already taken or the doctor is unavailable, it will not appear`,
      from: 'defaultModule'
    },
    { 
      question: `How do I add a new doctor to the system ?`, 
      answer: `Admins can go to the <b>Add New Doctor</b> section, fill in the doctor’s name, department, qualification, contact details, and set their working days, OPD timings, and slot duration. You can apply the same timing to all days or customize each day.`,
      from: 'defaultModule'
    },
    { 
      question: `How do I book a new MHC appointment ?`, 
      answer: `Go to the <b>New Appointment Form</b> under the MHC Module. Enter the patient\'s details and select the desired health check package. You can also enable the <b>Repeat Appointment</b> option for recurring checkups.` ,
      from: 'defaultModule'
    },
    { 
      question: `How do I book a new service appointment ?`, 
      answer: `Go to the <b>New Appointment Form</b> under the Service Module.Enter the patient\’s PRN, name, phone number, age, and gender. Then select the required service (e.g., physiotherapy, lab test, radiology) along with the preferred date, time, and request type (Walk-in or Call).` ,
      from: 'defaultModule'
    },
    { 
      question: `Where can doctors see their appointments for the day ?`, 
      answer: `Doctors can view their day’s schedule under <b>Today’s Consultations</b>. It lists all confirmed appointments with PRN, patient name, time, and visit type.` ,
      from: 'defaultModule'
    },
    { 
      question: `What is the Doctor Appointment Report used for ?`, 
      answer: `The <b>Doctor Appointment Report</b> helps track appointment performance for individual doctors. It includes metrics like total appointments, confirmed, cancelled, completed counts, and appointment sources (Online, Call, Walk-in). It’s mainly used to monitor productivity and trends over time.`,
      from: 'defaultModule' 
    },
    { 
      question: `What is the purpose of the TV Control Module ?`, 
      answer: `The TV Control Module is used to <b>display live doctor queues, patient statuses</b>, and <b>informational slides or ads</b> on hospital TV screens. It helps patients know which doctor is available, who\'s being consulted, and what their current status is.` ,
      from: 'defaultModule'
    },
    { 
      question: `What is the role of the MHC Coordinator module ?`, 
      answer: `The <b>MHC Coordinator Module</b> helps manage every step of the patient’s Master Health Checkup (MHC) journey - from check-in to lab, radiology, consultation coordination and final package completion.` ,
      from: 'defaultModule'
    },
    { 
      question: `How do I create a new estimation for a patient ?`, 
      answer: `Go to <b>Estimation Creation</b>, enter the patient’s UHID, name, age, and gender. Then select the doctor, estimation type, surgery level, preferred surgery date, room type, and stay details. Add applicable inclusions/exclusions, instruments, and remarks. Once complete, submit for approval.` ,
      from: 'defaultModule'
    },
    { 
      question: `What is the Coordinator Module used for ?`, 
      answer: 'This module helps <b>service coordinators</b> manage and monitor <b>today’s service appointments</b> in real-time. It allows them to update patient status, mark reports as done, handle cancellations, and postpone appointments - all from one place.' ,
      from: 'defaultModule'
    },
    { 
      question: `What does the Sub-Admin Dashboard show ?`, 
      answer: `The dashboard gives a <b>real-time overview</b> of hospital operations for the day, including OPD activity, doctor availability, pending appointments, and system notifications.`  ,
      from: 'defaultModule'
    },
    { 
      question: `What is the Admin Analytics Dashboard used for ?`, 
      answer: `The Analytics Dashboard provides a real-time and historical overview of key hospital operations like OPD trends, appointment types, MHC bookings, estimations, waiting times, and doctor availability. It helps admins make informed decisions with data-backed insights.` ,
      from: 'defaultModule'
    },
    { 
      question: `What is the Profile Management Module used for ?`, 
      answer: `The Profile Management module allows users to manage personal account details, reset passwords, and (for Admins/Super Admins) handle account creation, deletion, and monitor login activity. It ensures secure and accountable access to the system.` ,
      from: 'defaultModule'
    },
    {
      question: `How do I book a new appointment ?`,
      answer: `Go to the <b>New Appointment Form</b>, enter the patient\'s PRN or full name, phone number, and select the doctor, date, and time. If the slot is already taken or the doctor is unavailable, it will not appear` ,
      from: 'AppointmentModule'
    },
    { 
      question: `What does ‘Request Via’ mean during booking ?`, 
      answer: `This shows how the appointment request came in — for example:
      <ul>
      <li>Online (through website/chatbot)</li>
      <li>Call (telecaller)</li>
      <li>Walk-in (front desk)</li>
      </ul>` ,
      from:  'AppointmentModule'
    },
    { 
      question: `What if the doctor is not available on a selected date ?`, 
      answer: `Unavailable dates or fully booked slots are automatically disabled in the calendar. You can either choose another date or select a different doctor` ,
      from:  'AppointmentModule'
    },
    { 
      question: `Can I reschedule or cancel an appointment after it’s confirmed ?`, 
      answer: `Yes. Go to <b>Confirmed Appointments</b>, select the appointment, and use the <b>Reschedule</b> or <b>Cancel</b> option. Patients and doctors will get an automated alert.` ,
      from:  'AppointmentModule'
    },
    { 
      question: `What is the Check-In feature and when can I use it ?`, 
      answer: `Check-In lets the system know that the patient has arrived. It can be done <b>only 30 minutes before or after</b> the scheduled time. Beyond this window, the system may auto-cancel.` ,
      from:  'AppointmentModule'
    },
    { 
      question: `What happens if a patient misses the check-in window ?`, 
      answer: 'The appointment is auto-cancelled, and notifications are sent to both the patient and doctor. You can rebook if needed from the <b>Cancelled Appointments</b> section.' ,
      from:  'AppointmentModule'
    },
    { 
      question: `Where can I see all online requests made by patients ?`, 
      answer: `Go to the <b>Online Requests</b> section. You can view, confirm, reschedule, or cancel appointment requests received via chatbot or website.` ,
      from:  'AppointmentModule'
    },
    { 
      question: `How can I track cancelled or completed appointments ?`, 
      answer: `Use the <b>Cancelled Appointments</b> and <b>Completed Appointments</b> tabs. You can filter by PRN, date, doctor, or source. Each entry shows communication status (SMS/WhatsApp/Email).` ,
      from:  'AppointmentModule'
    },
    { 
      question: `Can a doctor transfer an appointment to another doctor ?`, 
      answer: `Yes. The doctor can mark the appointment as <b>Transferred</b> or <b>CC (Cross Consultation)</b>. The sub-admin must then create a new walk-in appointment under the referred doctor.` ,
      from:  'AppointmentModule'
    },
    { 
      question: `Can I view the history of a patient’s appointments ?`, 
      answer: 'Yes. You can search using PRN in any tab (Confirmed, Cancelled, Completed, etc.) to see all past activity related to that patient.' ,
      from:  'AppointmentModule'
    },
    {
      question: `How do I add a new doctor to the system ?`,
      answer: `Admins can go to the <b>Add New Doctor</b> section, fill in the doctor’s name, department, qualification, contact details, and set their working days, OPD timings, and slot duration. You can apply the same timing to all days or customize each day.`,
      from: 'DoctorModule'
    },
    { 
      question: `How do I mark a doctor as unavailable for certain days ?`, 
      answer: `In the <b>Mark Unavailable Dates</b> tab, select the doctor, then choose the date or range of dates to block. You can also revert this if availability changes.` ,
      from: 'DoctorModule'
    },
    { 
      question: `What do the slot colors mean in the Doctor Availability screen ?`, 
      answer: `<ul>
      <li>🟢 Green : Available and booked slots</li>
      <li>🔴 Red : Already booked</li>
      <li>⚪ Grey : Unavailable</li>
      <li>🔵 Blue : Completed</li>
      <li>🟡 Yellow : Blocked</li>
      <li>🟣 Violet : Extra slots (added beyond regular hours)</li>
      </ul>` ,
      from: 'DoctorModule'
    },
    { 
      question: `Can a doctor have two OPD sessions on the same day ?`, 
      answer: `Yes. Use the <b>Doctor Multiple Availability</b> feature to add multiple time windows (e.g., 10 AM–12 PM and 4 PM–6 PM) for the same day.` ,
       from: 'DoctorModule'
    },
    { 
      question: `What is the process to mark short-term unavailability (only today or tomorrow) ?`, 
      answer: `Doctors or admins can use the <b>Mark Unavailable Slots</b> option to block specific slots without affecting the entire day’s schedule. Ideal for urgent schedule changes.` ,
       from: 'DoctorModule'
    },
    { 
      question: `How can doctors close their OPD early ?`, 
      answer: `Use the <b>Close OPD</b> request feature. The doctor selects slots to close, submits the request, and the admin marks those slots as unavailable. Booked patients can be rebooked or moved to another doctor.`,
      from: 'DoctorModule' 
    },
    { 
      question: `How can I add extra slots for a doctor beyond their regular OPD timing ?`, 
      answer: `Go to the <b>Doctor Availability</b> section and click on the doctor’s name. Use the <b>Add Slot</b> option to include new time blocks before or after the existing schedule. These will appear as <b>violet slots</b> and can be booked immediately if needed.`,
      from: 'DoctorModule' 
    },
    { 
      question: `Can I edit an existing doctor’s details or change their timings ?`, 
      answer: `Yes. Go to <b>Edit Doctor Information</b>, select the doctor, and update contact info, qualifications, departments, available days, and OPD timings as needed.` ,
       from: 'DoctorModule'
    },
    { 
      question: `What is the difference between a Retain Doctor and a Visiting Consultant ?`, 
      answer: `
      <ul>
      <li><b>Retain Doctor</b> : Has fixed OPD timings and recurring slots</li>
      <li><b>Visiting Consultant</b> : No regular slots; slots are added manually as needed</li>
      </ul>` ,
       from: 'DoctorModule'
    },
    { 
      question: `Can I remove a doctor from the system ?`, 
      answer: `Yes. From the <b>Doctor Details Management</b> section, use the red delete icon next to the doctor’s name. A confirmation prompt will appear to avoid accidental deletion.`,
       from: 'DoctorModule'
    },
    {
      question: `How do I book a new MHC appointment ?`,
      answer: `Go to the <b>New Appointment Form</b> under the MHC Module. Enter the patient\'s details and select the desired health check package. You can also enable the <b>Repeat Appointment</b> option for recurring checkups.` ,
       from: 'MHCModule'
    },
    { 
      question: `What is the "Repeat Appointment" feature used for ?`, 
      answer: `This allows you to schedule multiple recurring checkups in advance.You can set :
      <ul>
      <li>The <b>frequency</b> (e.g., every 30 days)</li>
      <li>The <b>number of repetitions</b></li>
      </ul>
      <div> The system will auto-create future appointments and alert you if any fall on holidays.</div>` ,
        from: 'MHCModule'
    },
    { 
      question: `Where can I see MHC appointment requests from the website ?`, 
      answer: `All online requests will appear under the <b>Online Requests</b> tab. You can confirm, reschedule, or cancel directly from there. Status updates will be sent to the patient via WhatsApp, SMS, or email.` ,
        from: 'MHCModule'
    },
   
    { 
      question: `How do I check-in a patient for their MHC appointment ?`, 
      answer: `Once the patient arrives, go to <b>Confirmed Appointments</b>, click <b>Check-In</b>. The MHC Coordinator will then be able to proceed with lab, radiology, and consultation coordination.` ,
        from: 'MHCModule'
    },
    { 
      question: `Can I cancel or reschedule a confirmed MHC appointment ?`, 
      answer: `Yes. From the <b>Confirmed Appointments</b> section, click <b>Cancel</b> or <b>Reschedule</b>. You won’t need to re-enter patient data — it auto-fills when rebooking.` ,
        from: 'MHCModule'
    },
    { 
      question: `How do I track repeated MHC packages ?`, 
      answer: `Go to the <b>Repeated Packages</b> tab. You’ll see how many visits are completed or pending for each patient. You can also stop future repetitions if needed (e.g., if treatment is over or patient requests).` ,
        from: 'MHCModule'
    },
    { 
      question: `Can I filter and export MHC data ?`, 
      answer: 'Yes. In most tabs (Confirmed, Completed, Cancelled), you can filter by PRN, patient name, date or package. You can also export data for reporting or documentation.' ,
        from: 'MHCModule'
    },
    { 
      question: `How do I book a new service appointment ?`, 
      answer: `Go to the <b>New Appointment Form</b> under the Service Module. Enter the patient’s PRN, name, phone number, age, and gender. Then select the required service (e.g., physiotherapy, lab test, radiology) along with the preferred date, time, and request type (Walk-in or Call).` ,
        from: 'Service Module'
    },
    { 
      question: `What is the difference between "New" and "Old" in visit type ?`, 
      answer: `<ul>
      <li><b>New :</b>First-time appointment for that particular service.</li>
      <li><b>Old :</b>Follow-up or repeat appointment for the same service.</li>
      </ul>` ,
        from: 'Service Module'
    },
    { 
      question: `Where can I view all upcoming service appointments ?`, 
      answer: `All confirmed appointments appear in the <b>Confirmed Appointments</b> tab. You can filter by patient name, PRN, service type, or date.` ,
        from: 'Service Module'
    },
    { 
      question: `How do I check in a patient for their service ?`, 
      answer: `Go to the <b>Confirmed Appointments</b> list and click <b>Check-In</b>. This updates the status so the Service Coordinator knows the patient is ready and can proceed with the assigned service.` ,
        from: 'Service Module'
    },
    { 
      question: `Can I reschedule or cancel a confirmed appointment ?`, 
      answer: `Yes. Use the <b>Reschedule</b> or <b>Cancel</b> button next to the appointment. You won’t have to fill the form again - the details will be retained for quicker action.` ,
        from: 'Service Module'
    },
    { 
      question: `What happens when a service is completed ?`, 
      answer: `Once the service is complete, the coordinator sets the status to "Report Done." This will appear in the "Completed Services" section for the same day, along with the patient's details, service type and date.` ,
        from: 'Service Module'
    },
    { 
      question: `How do I track cancelled appointments ?`, 
      answer: `Cancelled entries appear in the <b>Cancelled Appointments</b> section. You can see the patient’s name, PRN, service type and communication status (SMS/Email/WhatsApp sent). Use the <b>Reschedule</b> button to quickly rebook.` ,
        from: 'Service Module'
    },
    { 
      question: `What do the different appointment statuses mean ?`, 
      answer: `<ul>
      <li><b>Confirmed :</b> Appointment is booked but not yet started.</li>
      <li><b>Checked In :</b> Patient has arrived and is ready.</li>
      <li><b>Report Done :</b> Service completed.</li>
      <li><b>Cancelled :</b> Appointment was either manually cancelled or missed.</li>
      </ul>` ,
        from: 'Service Module'
    },
    { 
      question: `Can I filter service appointments by type or date ?`, 
      answer: `<div>Yes. You can filter appointments by :</div>
      <ul>
      <li>Patient name</li>
      <li>PRN</li>
      <li>Service type</li>
      <li>Appointment date</li>
      </ul>
      <div>This helps you quickly locate any record.</div>` ,
        from: 'Service Module'
    },
    { 
      question: `How do I create a new estimation for a patient ?`, 
      answer: `Go to <b>Estimation Creation</b>, enter the patient’s UHID, name, age, and gender. Then select the doctor, estimation type, surgery level, preferred surgery date, room type, and stay details. Add applicable inclusions/exclusions, instruments, and remarks. Once complete, submit for approval.` ,
        from: 'EstimationModule'
    },
    { 
      question: `What happens to services I don’t select in inclusions ?`, 
      answer: `Any item not selected under <b>Inclusions</b> is automatically treated as an <b>Exclusion</b>. This ensures only the approved services are costed in the final estimation.` ,
        from: 'EstimationModule'
    },
    { 
      question: `How can I add implants, instruments, or multiple procedures ?`, 
      answer: `Under <b>Implants / Procedures / Instruments</b>, you can add items individually with their respective costs. If marked as <b>included</b>, their charges will not reflect in the final total.` ,
        from: 'EstimationModule'
    },
    { 
      question: `How is the total estimated cost calculated ?`, 
      answer: `The Estimation Summary auto-calculates the cost based on :
      <ul>
      <li>Room charges</li>
      <li>Duration of stay</li>
      <li>Excluded items</li>
      <li>Additional services added</li>
      </ul>
      <div>It also displays internal and external remarks and total estimation value.</div>` ,
        from: 'EstimationModule'
    },
    { 
      question: `Is digital signature mandatory in the estimation process ?`, 
      answer: `Yes. Three digital signatures are required : 
      <ul>
      <li>Estimator</li>
      <li>Approver</li>
      <li>Patient or Attender </li>
      </ul>
      <div>Without these, the estimation cannot move to confirmation.</div>` ,
        from: 'EstimationModule'
    },
    { 
      question: `Where do I find estimation requests raised by doctors ?`, 
      answer: `Go to the <b>Estimation Request from Doctor</b> section. You’ll see a list of pending or rejected requests. Select one, review the information, and proceed to create a new estimation.` ,
        from: 'EstimationModule'
    },
    { 
      question: `What is the process after an estimator submits an estimation ?`, 
      answer: `It appears under <b>Submitted Estimations for Approval</b>. The approver can either :
      <ul>
      <li><b>Approve </b>the estimation, moving it to the next stage</li>
      <li><b>Reject</b>it with a documented reason</li>
      </ul>` ,
        from: 'EstimationModule'
    },
    { 
      question: `What happens after the estimation is approved ?`, 
      answer: `Once approved, it moves to the Approved Estimation section. From here, you’ll :
      <ul>
      <li>Collect the patient’s signature (if status is “Action Needed”)</li>
      <li>Add follow-ups (up to 5 entries)</li>
      <li>Record any advance payment details</li>
      <li>Download or resend the PDF copy to the patient via WhatsApp</li>
      </ul> ` ,
        from: 'EstimationModule'
    },
    { 
      question: `How do I confirm an estimation ?`, 
      answer: `After adding advance details (receipt number and amount), the estimation is marked as <b>Confirmed</b>. It then becomes eligible for surgery booking or further processing.` ,
        from: 'EstimationModule'
    },
    { 
      question: `Can I complete or cancel a confirmed estimation ?`, 
      answer: `Yes. Go to the Confirmed Estimations section.
      <div>You can :</div>
      <ul>
      <li>Mark <b>PAC Done</b> (mandatory for SM-type estimations)</li>
      <li>Click <b>Complete</b> once everything is ready</li>
      <li>Request<b> Cancel</b>, which must be approved by a Senior Manager with a reason</li>
      </ul>` ,
        from: 'EstimationModule'
    },
    { 
      question: `Where can I find completed or cancelled estimations ?`, 
      answer: `All closed estimations appear in the <b>Complete/Cancel EST</b> tab.
      <div>You’ll see :</div>
      <ul>
      <li>Estimation ID</li>
      <li>Patient Name</li>
      <li>Estimation Status (green for completed, red for cancelled)</li>
      <li>Download option for the PDF report</li>
      </ul>` ,
        from: 'EstimationModule'
    },
    { 
      question: `What is an Overdue Estimation ?`, 
      answer: `An estimation is considered <b>Overdue</b> if :
      <ul>
      <li>It hasn’t been acted upon for more than <b>20 days</b>, or</li>
      <li>The <b>Estimation Date</b> has already passed</li>
      </ul>
      <div>These entries move to the <b>Overdue Estimations</b> section, and the system will auto-send a follow-up message to the patient.</div>` ,
        from: 'EstimationModule'
    },
    { 
      question: `How do I close an overdue estimation ?`, 
      answer: `The <b>Senior Manager</b> must cancel it manually via the <b>Cancel with Feedback</b> action, mentioning the reason (e.g., patient not interested, no follow-up). This helps clean up stale estimations from the system.` ,
        from: 'EstimationModule'
    },
    { 
      question: `What is the purpose of the TV Control Module ?`, 
      answer: `The TV Control Module is used to <b>display live doctor queues, patient statuses</b>, and <b>informational slides or ads</b> on hospital TV screens. It helps patients know which doctor is available, who's being consulted, and what their current status is.` ,
        from: 'TVControlModule'
    },
    { 
      question: `How do I assign doctors to a specific TV screen ?`, 
      answer: `Each screen is configured based on <b>room numbers</b>. You can assign doctors to a room, and the queue for that room will automatically reflect the <b>live consultation status</b> of those doctors.` ,
        from: 'TVControlModule'
    },
    { 
      question: `What information is shown on the TV screen ?`, 
      answer: `The display shows :
      <ul>
      <li>Doctor name</li>
      <li>Department</li>
      <li>Current status (Next / Patient In / Postponed)</li>
      <li>Patient name</li>
      <li>Hospital branding and scrolling messages</li>
      <li>Optional ad or info slides between updates</li>
      </ul>` ,
        from: 'TVControlModule'
    },
    { 
      question: `How do I update the consultation status on the TV screen ?`, 
      answer: `Doctors control their own status from the <b>Individual Doctor Module</b> :
      <ul>
      <li><b>Start</b> → Changes status to Patient In</li>
      <li><b>Finish</b> → Marks consultation as completed and moves to the next</li>
      <li><b>Postpone</b> → Patient is temporarily skipped and marked as pending</li>
      </ul>
      <div>These actions reflect <b>immediately on the TV screen</b>.</div>` ,
        from: 'TVControlModule'
    },
    { 
      question: `Can I display promotional slides or health tips ?`, 
      answer: `Yes. Admins can upload and manage <b>image pop-up and  text scroll</b> in the <b>Ad Slide Settings</b> section of the TV Control module. You can also set the duration and order of the slides.` ,
        from: 'TVControlModule'
    },
    { 
      question: `How often does the TV screen update ?`, 
      answer: `The system auto-refreshes every few seconds to reflect real-time status. You don’t need to manually refresh anything.` ,
        from: 'TVControlModule'
    },
    { 
      question: `What happens if multiple doctors share a room ?`, 
      answer: `If multiple doctors are assigned to the same room (e.g., morning and evening shifts), only the <b>active doctor</b> for that slot will be shown on the TV screen based on their availability and timing.` ,
        from: 'TVControlModule'
    },
    { 
      question: `Can I manage multiple TV displays for different departments ?`, 
      answer: `Yes. Each display screen can be configured to show queues for a specific<b> room, floor</b>, or <b>department</b>. You can manage all screens from the <b>TV Control dashboard</b>.` ,
        from: 'TVControlModule'
    },
    { 
      question: `Where can doctors see their appointments for the day ?`, 
      answer: `Doctors can view their day’s schedule under <b>Today’s Consultations</b>.It lists all confirmed appointments with PRN, patient name, time, and visit type.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `What is the Checked-In Consultations tab ?`, 
      answer: `This tab displays all patients who have checked in and are currently waiting to be seen. Doctors can <b>Start, Finish</b>, or <b>Postpone</b> the consultation from here.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `What does the Start button do ?`, 
      answer: `Clicking <b>Start</b> updates the patient’s queue status to <b>“Patient In”</b> and begins the consultation. A timer also starts to track consultation duration.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `What happens when the Finish button is clicked ?`, 
      answer: `The <b>Finish </b>button ends the consultation and removes the patient from the queue display. The status will be marked as <b>Completed</b>.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `What if I want to delay a consultation ?`, 
      answer: `Click <b>Postpone</b>. This pushes the appointment to a “Pending” status on the TV/queue screen, allowing you to return to it later.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `How can I refer a patient to another doctor ?`, 
      answer: `Use the <b>CC (Cross Consultation)</b> button to send the case to another doctor for additional opinion. The sub-admin can then book a follow-up appointment with the referred doctor.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `What is the Transfer option used for ?`, 
      answer: `If a case requires a referral to another department or specialty, click <b>Transfer</b>. The admin will then cancel the original and create a walk-in for the new doctor based on your note.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `What is the live consultation timer for ?`, 
      answer: `The timer tracks how long each consultation has been running.If it exceeds the allotted time, the row will start blinking red — helping manage OPD efficiency.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `How can a doctor close their OPD for the day ?`, 
      answer: `Doctors can go to <b>Close OPD</b>, select the slots they wish to cancel, and submit the request. The system will notify the admin/front desk.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `What does the End Consultation button do ?`, 
      answer: `Once all appointments are completed, the doctor can click <b>End Consultation</b>. This removes their name from queue displays and marks OPD as closed for the day.` ,
        from: 'IndividualDoctorModule'
    },
    { 
      question: `What is the Doctor Appointment Report used for ?`, 
      answer: `The <b>Doctor Appointment Report</b> helps track appointment performance for individual doctors. It includes metrics like total appointments, confirmed, cancelled, completed counts, and appointment sources (Online, Call, Walk-in). It’s mainly used to monitor productivity and trends over time.` ,
        from: 'ReportModule'
    },
    { 
      question: `Can I filter reports by time duration ?`, 
      answer: `Yes. You can generate reports for :
      <ul>
      <li><b>Daily</b></li>
      <li><b>Weekly</b></li>
      <li><b>Monthly</b></li>
      <div> Use the date filter or calendar range to customize the report view based on your needs.</div>
      </ul>` ,
        from: 'ReportModule'
    },
    { 
      question: `How can I generate a report for a specific doctor ?`, 
      answer: `In the <b>Doctor Appointment Report</b> section, each doctor’s row includes two buttons under the <b>Action</b> column :
      <ul>
      <li><b>🖨️ Print</b>- Click this to print that doctor's report directly.</li>
      <li><b>📥 Download</b> - Click this to export the doctor’s report in Excel format.</li>
      </ul>
      <div>No need to select filters manually - just click the icon next to the doctor’s name for an instant report.</div>` ,
        from: 'ReportModule'
    },
    { 
      question: `What are appointment sources shown in the report ?`, 
      answer: `Appointments are categorized by how they were booked :
      <ul>
      <li><b>Online</b> (website/chatbot)</li>
      <li><b>Call</b> (telephonic)</li>
      <li><b>Walk-In</b> (front desk or in-person)</li>
      </ul>
      <div>This helps track which channels are performing best.</div>` ,
        from: 'ReportModule'
    },
    { 
      question: `Can I export doctor-wise reports ?`, 
      answer: `Yes. Every doctor report or summary can be exported in <b>Excel format</b> or printed directly using the <b>Export or Print</b> buttons at the top of the report.` ,
        from: 'ReportModule'
    },
    { 
      question: `What is the Summary Report in the Doctor Appointment section ?`, 
      answer: `The <b>Summary Report</b> gives an overall view of multiple doctors’ appointment performance. It’s helpful for comparing productivity across departments or monitoring high-performing consultants.` ,
        from: 'ReportModule'
    },
    { 
      question: `What is the Health Checkup Appointment Report ?`, 
      answer: `This report focuses specifically on <b>Master Health Checkup (MHC)</b> packages. It tracks total, confirmed, cancelled, and completed package appointments, sorted by package types (e.g., Diabetic Care, Senior Citizen, etc.).` ,
        from: 'ReportModule'
    },
    { 
      question: `Can I track health checkup reports package-wise ?`, 
      answer: `Yes. Each MHC package (like Executive, General, Cardiac, etc.) will show appointment performance individually so you can monitor which packages are in demand and how they are performing.` ,
        from: 'ReportModule'
    },
    { 
      question: `Is there a date-wise filter for health checkup reports ?`, 
      answer: `Yes. You can filter <b>Health Checkup Reports </b> by any date range using the calendar filter to get accurate daily, weekly, or monthly performance data.` ,
        from: 'ReportModule'
    },
    { 
      question: `Can I download or print the health checkup reports ?`, 
      answer: `Absolutely. Health checkup reports can be exported in <b>Excel</b> format or printed directly for documentation and performance reviews.` ,
        from: 'ReportModule'
    },
    { 
      question: `What is the role of the MHC Coordinator module ?`, 
      answer: `The <b>MHC Coordinator Module</b> helps manage every step of the patient’s Master Health Checkup (MHC) journey - from check-in to lab, radiology, consultation coordination and final package completion.` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `Where do I see patients booked for MHC today ?`, 
      answer: `Go to <b>Today’s MHC</b> tab. You’ll see a list of patients scheduled for health checkups along with their package name and PRN.` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `How do I check in a patient for their health checkup ?`, 
      answer: `Click on the <b>Lab</b> action for the patient. A popup will appear to mark check-in for lab tests. Once done, you can proceed to radiology and consultations.` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `How do I assign radiology slots ?`, 
      answer: `Click the <b>Radiology</b> action. A form opens showing :
      <ul>
      <li>PRN</li>
      <li>Patient name</li>
      <li>Package name</li>
      <li>Included radiology services</li>
      </ul>
      <div> Select available slots for each service and confirm. The appointments will then appear in the <b> Confirmed Radiology Appointments </b>list.</div>` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `How do I book consultations under MHC ?`, 
      answer: `Click <b>Consultation</b>. A form opens listing :
      <ul>
      <li>PRN & patient details</li>
      <li>Department-wise doctors assigned in the package</li>
      </ul>
      <div>Select slots for each department/doctor. Bookings will reflect under the <b>Confirmed Consultation Appointments</b> section.</div>` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `Can I see which services are completed and which are pending ?`, 
      answer: `Yes. Each service (lab, radiology, consultation) is marked with its status. Once a report is marked complete or a consult is finished, it will update automatically.` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `How do I mark the MHC package as complete ?`, 
      answer: `Once all services are completed, click the <b>Complete</b> button in the Today’s MHC list. This marks the package as closed and moves it out of the active workflow.` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `Can I track pending reports or missed appointments ?`, 
      answer: `Yes. The coordinator dashboard highlights pending services. You can follow up with patients or departments if any checkup component hasn’t been completed.` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `What if a patient misses one service (like radiology) ?`, 
      answer: `If a service is not completed, you can keep the package open until the pending service is completed. In case the patient doesn't return for it, you can choose to close the package manually once confirmed with the patient or department.` ,
        from: 'MHCCoordinatorModule'
    },
    { 
      question: `What is the Coordinator Module used for ?`, 
      answer: `This module helps <b>service coordinators</b> manage and monitor <b>today’s service appointments</b> in real-time. It allows them to update patient status, mark reports as done, handle cancellations, and postpone appointments - all from one place.` ,
        from: 'CoordinatorModule'
    },
    { 
      question: `What does the Entry action do ?`, 
      answer: `Clicking <b>Entry</b> marks that the patient has arrived and the service (e.g., lab, radiology, physiotherapy) has been initiated. It helps service departments know which patients are ready to be attended.` ,
        from: 'CoordinatorModule'
    },
    { 
      question: `When should I use the Report Done button ?`, 
      answer: `Once the service is completed and the <b>report is ready</b>, click <b>Report Done</b>. This updates the appointment as completed and ensures it's visible in the Completed Appointments section.` ,
        from: 'CoordinatorModule'
    },
    { 
      question: `How do I cancel a service appointment ?`, 
      answer: `Click the <b>Cancel</b> button next to the patient’s entry. You’ll be asked to provide a <b>reason for cancellation</b> (e.g., patient didn’t arrive, test not required). Once confirmed, the appointment will be moved to the Cancelled tab.` ,
        from: 'CoordinatorModule'
    },
    { 
      question: `Can I postpone a patient’s appointment to another time ?`, 
      answer: `Yes. Use the <b>Postpone</b> option to shift the appointment to a <b>later time or date</b>. This is helpful when patients request a delay or the service team needs to reassign the slot.` ,
        from: 'CoordinatorModule'
    },
    { 
      question: `Can I track all services scheduled for today ?`, 
      answer: `Yes. The <b>Today’s Services</b> view shows a complete list of patients scheduled for that day, along with their status (Pending, Entered, Report Done, Cancelled, Postponed).` ,
        from: 'CoordinatorModule'
    },
    { 
      question: `What happens after marking an appointment as Report Done ?`, 
      answer: `Once marked as <b>Report Done</b>, the appointment is considered <b>completed</b> and moves out of the active list. It also gets recorded for reporting and follow-up tracking.` ,
        from: 'CoordinatorModule'
    },
    { 
      question: `What is the Profile Management Module used for ?`, 
      answer: `The Profile Management module allows users to manage personal account details, reset passwords, and (for Admins/Super Admins) handle account creation, deletion, and monitor login activity. It ensures secure and accountable access to the system.` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `What can I view under the Profile Details tab ?`, 
      answer: `You can see :
      <ul>
      <li><b>User ID</b> (email or unique identifier)</li>
      <li><b>Assigned Role</b> (e.g., Admin, Sub Admin, Doctor)</li>
      <li><b>Appointments Handled </b> count (if applicable)</li>
      <li> A <b> Logout</b>button to securely sign out</li>
      </ul>` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `Who can reset passwords ?`, 
      answer: `
      <ul>
      <li><b>Super Admins</b> can reset passwords for any user from the <b>Reset Password</b> tab.</li>
      <li><b>Admins, Sub Admins, and Doctors</b> can only reset <b>their own passwords</b>.</li>
      </ul>` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `How do I reset my own password ?`, 
      answer: `Go to the <b>Reset Password </b>tab, enter your <b>new password</b> and <b>confirm it</b>. Click submit to update your password immediately.` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `How can Super Admins reset another user’s password ?`, 
      answer: `Super Admins can select a user from the dropdown list in the <b>Reset Password</b> tab, enter a new password, confirm it, and click submit to update.` ,
        from: 'ProfileManagementModule'
    },
    {
      question: `Who can create new user accounts ?`, 
      answer: `Only <b>Super Admins and Admins </b>have access to the <b>Account Creation</b> tab and can create :
      <ul>
      <li><b>Admin Accounts</b>(Manager, Senior Manager, etc.)</li>
      <li><b>Sub Admin Accounts</b> (Front Desk, Estimator, Coordinator, etc.)</li>
      <li><b>Doctor Accounts</b> (based on department and doctor list)</li>
      </ul>` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `What details are needed to create a new user ?`, 
      answer: `Each account type requires :
      <ul>
      <li><b>Name</b></li>
      <li><b>Employee ID</b></li>
      <li><b>Password</b></li>
      <li><b>Role-specific fields</b>like Admin Type, Sub Admin Type, or Department + Doctor for doctors</li>
      </ul>
      <div> All required fields must be filled to activate the <b>Create Account</b> button.</div>` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `Can I create multiple accounts at once ?`, 
      answer: `No, only one account type can be created at a time. Fields will adjust based on the selected account type (Admin, Sub Admin, or Doctor).` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `Who can delete a user account ?`, 
      answer: `Only <b>Super Admins and Admins</b> can access the <b>Delete Account</b> tab.They must select the <b>User ID</b> from the list and confirm to delete the account permanently.` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `Can a user delete their own account ?`, 
      answer: `No. Users cannot delete their own accounts. Only Admins and Super Admins have permission to perform account deletions.` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `What is shown in the Logged In Details section ?`, 
      answer: `This section (accessible only to Admins) shows :
      <ul>
      <li><b>Staff Name</b></li>
      <li><b>Role</b></li>
      <li><b>Account Created Date</b></li>
      <li><b>Last Login Date</b></li>
      <li><b>Login Time</b></li>
      </ul>
      <div>This helps monitor who is actively using the system and when.</div>` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `Can Sub Admins or Doctors view login history ?`, 
      answer: `No. Only <b>Admins and Super Admins</b> can access login logs for all users.` ,
        from: 'ProfileManagementModule'
    },
    { 
      question: `What is the Admin Analytics Dashboard used for ?`, 
      answer: `The Analytics Dashboard provides a real-time and historical overview of key hospital operations like OPD trends, appointment types, MHC bookings, estimations, waiting times, and doctor availability. It helps admins make informed decisions with data-backed insights.` ,
        from: 'Analytics'
    },
    { 
      question: `What does the OPD Request via chart show ?`, 
      answer: `It shows how patients booked their appointments over the past 7 days - categorized by <b>Online</b>, <b>Call</b>, and <b>Walk-In</b>. This helps track patient behavior and promote preferred booking channels.` ,
        from: 'Analytics'
    },
    { 
      question: `How can I compare Morning vs Evening OPD sessions ?`, 
      answer: `Use the <b>OPD Sessions</b> chart to view the number of patients visiting in the <b>Morning vs Evening</b> sessions. It helps with planning doctor slots and staff availability.` ,
        from: 'Analytics'
    },
    { 
      question: `What information is shown in the OPD Overview chart ?`, 
      answer: `This chart displays the overall status of OPD appointments, including :
      <ul>
      <li>Total Appointments</li>
      <li>Confirmed</li>
      <li>Cancelled</li>
      <li>Completed</li>
      <li>Check-Ins</li>
      </ul>
      <div>It helps monitor operational performance and spot trends in patient attendance.</div>` ,
        from: 'Analytics'
    },
    { 
      question: `What is shown in the OPD Type chart ?`, 
      answer: `It categorizes patient visits as :
      <ul>
      <li>Paid</li>
      <li>Follow-up</li>
      <li>Camp</li>
      <li>MHC</li>
      </ul>
      <div>This helps in understanding service demand and resource allocation.</div>` ,
        from: 'Analytics'
    },
    { 
      question: `What does the OPD Estimation Types chart indicate ?`, 
      answer: `It displays a breakdown of estimations initiated via OPD, categorized as :
      <ul>
      <li><b>MM (Medical Management)</b></li>
      <li><b>SM (Surgical Management)</b></li>
      <li><b>Maternity</b></li>
      </ul>
      <div>This helps identify the most common estimation types.</div>` ,
        from: 'Analytics'
    },
    { 
      question: `How do I monitor estimation progress ?`, 
      answer: `Use the <b>Estimation Status Overview</b> chart. It tracks estimations by status :
      <ul>
      <li>Pending</li>
      <li>Submitted</li>
      <li>Approved</li>
      <li>Confirmed</li>
      <li>Completed</li>
      <li>Cancelled</li>
      <li>Overdue</li>
      </ul>
      <div>You can easily identify bottlenecks and take follow-up actions.</div>` ,
        from: 'Analytics'
    },
    { 
      question: `What does the Average Waiting Time chart show ?`, 
      answer: `It highlights the number of patients who waited <b>over 40 minutes</b> for a consultation in the OPD. It helps identify and address delays in service flow.` ,
        from: 'Analytics'
    },
    { 
      question: `Can I see gender-wise patient data ?`, 
      answer: `Yes. The <b>Gender Overview</b> chart displays the male-to-female ratio of patients over the past 7 days. It gives demographic insights useful for planning services.` ,
        from: 'Analytics'
    },
    { 
      question: `What is the MHC Waiting Time chart for ?`, 
      answer: `It shows how many MHC patients had to wait <b>more than 30 minutes</b> before beginning their checkups. This helps improve package flow coordination.` ,
        from: 'Analytics'
    },
    { 
      question: `What does the MHC Overview chart display ?`, 
      answer: `This pie chart displays bookings for each MHC package type in the past 7 days :
      <ul>
      <li>Integrated Diabetic Care</li>
      <li>Annual Master Diabetes Care</li>
      <li>Senior Citizen Health Check</li>
      <li>Executive Health Check</li>
      </ul>` ,
        from: 'Analytics'
    },
    { 
      question: `What is the View More button used for ?`, 
      answer: `Clicking <b>View More</b> on any chart opens a <b> detailed, one-month view </b> of the data for deeper insights and comparison.` ,
        from: 'Analytics'
    },
    { 
      question: `What does the Details button do ?`, 
      answer: `It redirects you to the full <b>report section</b>, where you can filter data and <b>download reports in Excel format</b> for further analysis or presentation.` ,
        from: 'Analytics'
    },
    { 
      question: `What filters are available in the Analytics Dashboard ?`, 
      answer: `You can filter data by :
      <ul>
      <li><b>Date range</b></li>
      <li><b>Department</b></li>
      <li><b>Doctor</b></li>
      <li><b>MHC Package</b></li>
      </ul>
      <div> These filters help you refine insights based on what you need to analyze.</div>` ,
        from: 'Analytics'
    },
    { 
      question: `What does the Live Count Overview show ?`, 
      answer: `It gives real-time updates for the current day, including :
      <ul>
      <li><b>Total OPD Today</b></li>
      <li><b>Doctors Available</b></li>
      <li><b>Doctors Absent</b></li>
      <li><b>Doctors Unavailable</b></li>
      <li><b>MHC Confirmed</b></li>
      <li><b>Estimation Confirmed</b></li>
      </ul>
      <div>This gives admins a quick snapshot of daily operations.</div>` ,
        from: 'Analytics'
    },
    { 
      question: `What does the Sub-Admin Dashboard show ?`, 
      answer: `The dashboard gives a <b>real-time overview</b> of hospital operations for the day, including OPD activity, doctor availability, pending appointments, and system notifications.` ,
        from: 'Dashboard'
    },
    { 
      question: `What is shown under Number of OPDs for the Day ?`, 
      answer: `This shows the <b>total number of OPD appointments scheduled</b> for the current day, across all departments.` ,
        from: 'Dashboard'
    },
    { 
      question: `How do I track how many patients have checked in ?`, 
      answer: `The <b>Total Checked-In Appointments</b> card displays the number of patients who have already checked in and are waiting for or undergoing consultation.` ,
        from: 'Dashboard'
    },
    { 
      question: `How can I view available doctors for today ?`, 
      answer: `The <b>Available Doctors</b> section shows a list of doctors who are currently active and attending OPDs. You can see their names and quickly identify their status.` ,
        from: 'Dashboard'
    },
    { 
      question: `What’s the difference between Absent, On Leave, and Unavailable ?`, 
      answer: `
      <ul>
      <li><b>Absent Doctors</b> – Doctors marked absent for the day.</li>
      <li><b>Doctors on Leave</b> – Doctors with planned leaves for future dates.</li>
      <li><b>Unavailable Doctors</b> – Doctors temporarily unavailable (e.g., not in OPD during their assigned slot).</li>
      </ul>` ,
        from: 'Dashboard'
    },
    { 
      question: `What does the Doctors Overview section display ?`, 
      answer: `It shows up to <b>four doctors</b> along with their availability icons. Clicking <b>“See All”</b>redirects to the full Doctors page with complete schedules.` ,
        from: 'Dashboard'
    },
    { 
      question: `How do I view all pending appointments ?`, 
      answer: `The <b>Pending Appointments</b> section displays up to four upcoming or pending appointments (not yet confirmed or checked-in). Click ><b>“See All”</b> to go to the full list under <b>Website Requests</b> in the Appointment Module.` ,
        from: 'Dashboard'
    },
    { 
      question: `Where can I see my hospital name and profile details ?`, 
      answer: `The top of the dashboard shows the <b>Hospital Name</b>, along with your <b>Username and Role</b>.` ,
        from: 'Dashboard'
    },
    { 
      question: `What kind of notifications do I receive ?`, 
      answer: `You’ll receive real-time notifications for :
      <ul>
      <li>Appointment requests from the website</li>
      <li>MHC package requests</li>
      <li>Incomplete or cancelled appointments (sent hourly to receptionists)</li>
      <li>Estimation requests from doctors (sent to estimators)</li>
      <li>Submitted estimations (notified to approvers)</li>
      <li>Pending web requests (for receptionists and tele-callers)</li>
      </ul>` ,
        from: 'Dashboard'
    },
    { 
      question: `Where do I find quick profile actions ?`, 
      answer: `Click your <b>User Profile</b> to access :
      <ul>
      <li><b>Logout</b></li>
      <li><b>Settings</b></li>
      <li><b>Reports</b></li>
      </ul>
      <div>These shortcuts let you quickly navigate without leaving the dashboard.</div>` ,
        from: 'Dashboard'
    },
  ];


  activeQuestion: string | null = null;

  toggleQuestion(question: string) {
    this.activeQuestion = this.activeQuestion === question ? null : question;
  } 
  
 }
  

