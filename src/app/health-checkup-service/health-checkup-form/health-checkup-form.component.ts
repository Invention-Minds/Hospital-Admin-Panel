import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { DialogModule } from '@angular/cdk/dialog';
import { HealthCheckupServiceService } from '../../services/health-checkup/health-checkup-service.service';
import { MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { CanComponentDeactivate } from '../../guards/unsaved-changes.guard';
import { HealthCheckupConfirmedComponent } from '../health-checkup-confirmed/health-checkup-confirmed/health-checkup-confirmed.component';
import { request } from 'http';

@Component({
  selector: 'app-health-checkup-form',
  templateUrl: './health-checkup-form.component.html',
  styleUrls: ['./health-checkup-form.component.css'],
  providers: [ConfirmationService, MessageService],
})
export class HealthCheckupFormComponent implements OnInit {
  holidays: string[] = []; // Store fetched holidays
  isRepeatChecked: boolean = false;
  requestVia: string = 'Call';
  appointmentStatus: string = 'Confirm';
  conflictMessage: string = '';
  repeatedDates: string[] = []; // Store all calculated repeated dates
  defaultPackage: string = '';
  defaultTime: string = '';
  hasConflict: boolean = false;
  displayDialog: boolean = false; // Controls dialog visibility
  conflictDates: string[] = [];   // To store conflicting dates temporarily
  showConflictDialogs: boolean = false;
  isLoading: boolean = false;
  timeSlots: string[] = [];
  selectedDate: string = '';
  packages: any[] = []; // Store the list of packages
  isDirty: boolean = false;
  selectedPackageId: string = ''; // Selected package ID
  userId: string = ''; // User ID of the logged-in admin
  userName: string = ''; // Username of the logged-in admin
  role: string = ''; // Role of the logged-in admin
  minDate: Date = new Date();
  minDateString: string = this.minDate.toISOString().split('T')[0];
  smsSent?: boolean = false;
  messageSent?: boolean = false;
  emailSent?: boolean = false;


  constructor(private confirmationService: ConfirmationService, private healthCheckupService: HealthCheckupServiceService, private messageService: MessageService, private route: ActivatedRoute) { }
  @Input() serviceData: any = null; // Input data from the overview component
  @Output() closeForm = new EventEmitter<void>(); // Event to notify form close
  @Output() formStatus = new EventEmitter<boolean>(); // Emit dirty state
  @ViewChild('healthCheckupConfirmed') healthCheckupConfirmedComponent?: HealthCheckupConfirmedComponent;

  formData = {
    pnrNumber: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    packageId: null,
    packageName: '',
    appointmentDate: '',
    appointmentTime: '',
    repeatChecked: false,
    daysInterval: null,
    numberOfTimes: null,
    requestVia: '',
    appointmentStatus: '',
  };


  ngOnInit(): void {
    this.fetchPackages();
    const serviceId = this.route.snapshot.paramMap.get('id');
    // this.serviceData = history.state.data; // Retrieve data passed using state
    console.log(this.serviceData)

    if (this.serviceData) {
      this.populateForm(this.serviceData);
    } else {
      console.error('No service data found!');
    }
    this.userId = localStorage.getItem('userid') || '';
    this.userName = localStorage.getItem('username') || '';
    this.role = localStorage.getItem('role') || '';
  }
  populateForm(service: any): void {
    this.formData = { ...service }; // Pre-populate form fields
    this.requestVia = service.requestVia || 'Call'; // Default to 'Call' if undefined
    this.appointmentStatus = service.appointmentStatus || 'Confirm'; // Default to 'Confirm' if undefined
    this.selectedPackageId = service.packageId.toString();
    this.selectedDate = service.appointmentDate;
    this.formData.phoneNumber.startsWith('91') ? this.formData.phoneNumber = this.formData.phoneNumber.slice(2) : this.formData.phoneNumber;
    this.fetchAvailableSlots();
    this.repeatedDates = service.repeatedDates || [];
    this.isRepeatChecked = service.repeatChecked || false;

  }
  fetchPackages(): void {
    this.isLoading = true;
    this.healthCheckupService.getPackages().subscribe({
      next: (response) => {
        this.packages = response; // Store the fetched packages
        console.log('Packages fetched:', response);
      },
      error: (err) => {
        console.error('Error fetching packages:', err);
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
  onClose(): void {
    this.closeForm.emit(); // Notify parent component to switch back
  }
  fetchAvailableSlots(): void {
    if (!this.selectedDate) {

      return;
    }
    const now = new Date();
  const isToday = new Date(this.selectedDate).toDateString() === now.toDateString();
    this.healthCheckupService.getAvailableSlots(this.selectedDate, parseInt(this.selectedPackageId)).subscribe({
      next: (response) => {
        console.log('Available Slots:', response);
        if (Array.isArray(response.availableSlots)) {
          // this.timeSlots = response.availableSlots;
          // if (this.formData.appointmentTime) {
          //   this.timeSlots.push(this.formData.appointmentTime);
          // }
          let availableSlots = response.availableSlots;

          // Filter out past time slots if the selected date is today
          if (isToday) {
            const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
            availableSlots = availableSlots.filter((slot: string) => {
              const [hours, minutes] = slot.split(':').map(Number);
              const slotTimeInMinutes = hours * 60 + minutes;
              return slotTimeInMinutes >= currentTimeInMinutes; // Only include future slots
            });
          }
  
          this.timeSlots = availableSlots;
  
          // Include already selected appointment time if it exists
          if (this.formData.appointmentTime && !this.timeSlots.includes(this.formData.appointmentTime)) {
            this.timeSlots.push(this.formData.appointmentTime);
          }
        } else {
          console.error('Invalid API response: expected an array');
          this.timeSlots = []; // Fallback to empty array
        }

        console.log('Available Slots:', this.timeSlots);
      },
      error: (err) => {
        console.error('Failed to fetch available slots:', err);
      },
    });

  }

  fetchPublicHolidaysInRange(startDate: string, endDate: string, form: NgForm): void {
    const apiKey = 'AIzaSyC10pxMOv55Jq8XkkDuJ_WAWG4AUUZVX9g';
    const calendarId = 'en.indian#holiday@group.v.calendar.google.com';

    // Format the API URL with time range
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z`;

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error fetching holidays: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        const holidays = data.items.map((item: any) => ({
          name: item.summary,
          date: item.start.date
        }));
        const sundays = this.getSundaysInRange(startDate, endDate);
        sundays.forEach(date => holidays.push({ name: 'Sunday', date }));
        this.holidays = holidays
        console.log('Public Holidays in Range:', holidays);

        // // Check for conflicts with repeated dates
        // this.checkHolidayConflicts(holidays);
        const conflicts = this.repeatedDates.filter(date =>
          holidays.some((holiday: any) => holiday.date === date)
        );
        if (conflicts.length > 0) {
          this.hasConflict = true;
          // this.showConflictPopup(conflicts, form);
          this.showConflictDialog(conflicts);
        } else {
          console.log('No conflicts detected.');
          this.hasConflict = false;
        }
      })
      .catch(error => {
        console.error('Failed to fetch public holidays:', error);
      });
  }
  getSundaysInRange(startDate: string, endDate: string): string[] {
    const sundays: string[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
      if (currentDate.getDay() === 0) { // 0 represents Sunday
        sundays.push(currentDate.toISOString().split('T')[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return sundays;
  }
  showConflictDialog(conflicts: string[]): void {
    this.conflictDates = conflicts; // Populate conflict dates
    this.displayDialog = true;      // Show dialog
  }

  onAccept(): void {
    this.hasConflict = false;  // Enable the form submission
    this.displayDialog = false;
  }

  onReject(form: NgForm): void {
    this.repeatedDates = [];   // Clear repeated dates if rejected
    form.controls['days']?.setValue(null);
    form.controls['times']?.setValue(null);
    this.hasConflict = false;   // Keep button disabled
    this.displayDialog = false;
    form.controls['days']?.markAsPristine();
    form.controls['times']?.markAsPristine();
    form.controls['days']?.markAsUntouched();
    form.controls['times']?.markAsUntouched();

  }

  calculateRepeatedDates(startDate: string, daysOnce: number, times: number): string[] {
    const dates: string[] = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < times; i++) {
      currentDate.setDate(currentDate.getDate() + daysOnce); // Increment by specified days
      dates.push(currentDate.toISOString().split('T')[0]); // Format as 'YYYY-MM-DD'
    }

    return dates;
  }




  // Handle repeat checkbox logic
  onRepeatChange(isChecked: boolean): void {
    this.isRepeatChecked = isChecked;
    console.log('Repeat Checkbox:', isChecked);
  }
  onFieldChange(form: NgForm): void {
    this.isDirty = form.dirty || false;
    console.log(form.value.date, form.value.days, form.value.times);
    if (!form.value.days || !form.value.times) {
      this.repeatedDates = []; // Clear repeated dates
      return;
    }

    if (form.value.date && form.value.days && form.value.times) {
      // Calculate repeated dates
      this.repeatedDates = this.calculateRepeatedDates(form.value.date, form.value.days, form.value.times);

      // Derive validFrom and validTo dates
      const validFrom = this.repeatedDates[0];
      const validTo = this.repeatedDates[this.repeatedDates.length - 1];

      console.log(`Valid From: ${validFrom}, Valid To: ${validTo}`);

      // Fetch public holidays and check for conflicts

      if (this.repeatedDates.length > 0) {
        console.log("Fetching public holidays in range...");
        this.fetchPublicHolidaysInRange(validFrom, validTo, form);
      }
    }
  }
  canDeactivate(): boolean | Promise<boolean> {
    if (this.isDirty) {
      return confirm('You have unsaved changes. Do you want to leave this page?');
    }
    return true; // Allow navigation if the form is not dirty
  }
  showConflictPopup(conflicts: string[], form: NgForm): void {
    console.log('Conflicts Detected:', conflicts);
    this.confirmationService.confirm({
      message: `The following dates conflict with holidays: ${conflicts.join(
        ', '
      )}. Do you want to proceed?`,
      header: 'Conflict Detected',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.hasConflict = false; // Enable button
      },
      reject: () => {
        // Clear days and times on reject
        form.controls['days'].reset();
        form.controls['times'].reset();
        this.hasConflict = true; // Keep button disabled
      },
    });
  }


  resetForm(form: NgForm): void {
    form.resetForm({
      requestVia: 'Call',           // Default value for requestVia radio button
      appointmentStatus: 'Confirm', // Default value for appointmentStatus radio button
      package: this.defaultPackage, // Reset package dropdown to default
      time: this.defaultTime        // Reset time dropdown to default
    });
    this.requestVia = 'Call';
    this.appointmentStatus = 'Confirm';
    this.isRepeatChecked = false;   // Reset checkbox state
    this.hasConflict = false;
    this.repeatedDates = [];
  }
  // On form submission
  onSubmit(form: NgForm): void {
    if (form.valid) {
      console.log(this.repeatedDates)
      this.isLoading = true;
      const formattedPhoneNumber = form.value.phone.startsWith('91')
        ? form.value.phone
        : '91' + form.value.phone;
      const selectedPackage = this.packages.find(pkg => pkg.id === parseInt(this.selectedPackageId));
      const payload = {
        pnrNumber: form.value.pnr,
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        phoneNumber: formattedPhoneNumber,
        email: form.value.email,
        packageId: parseInt(this.selectedPackageId),
        packageName: selectedPackage ? selectedPackage.name : null,
        appointmentDate: form.value.date,
        appointmentTime: form.value.time,
        repeatChecked: this.isRepeatChecked,
        daysInterval: form.value.days,
        numberOfTimes: form.value.times,
        requestVia: form.value.requestVia,
        appointmentStatus: form.value.appointmentStatus,
        repeatedDates: this.repeatedDates, // Include all repeated dates
        userId: parseInt(this.userId),
        username: this.userName,
        role: this.role,
      };
      if (this.isRepeatChecked) {
        payload.daysInterval = form.value.days || 0; // Default to 0 if undefined
        payload.numberOfTimes = form.value.times || 0; // Default to 0 if undefined
        payload.repeatedDates = this.repeatedDates;
      } else {
        payload.daysInterval = null;
        payload.numberOfTimes = null;
        payload.repeatedDates = [];
      }
      console.log('Submitting Payload:', payload);

      if (this.serviceData?.id) {
        // Reschedule: Update the existing service
        console.log("repeatedDates", this.repeatedDates);
        if (
          this.repeatedDates.length > 0 &&
          typeof this.repeatedDates[0] === 'object' &&
          'date' in this.repeatedDates[0]
        ) {
          payload.repeatedDates = this.repeatedDates.map(
            (item: { date: string } | string) => (typeof item === 'object' ? item.date : item)
          );
        } else {
          payload.repeatedDates = this.repeatedDates;
        }
        this.isLoading = true;
        this.healthCheckupService.updateService(this.serviceData.id, payload).subscribe({
          next: (response) => {
            const serviceId = response.id; // Get the updated service ID
            console.log('Service Rescheduled Successfully:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Service Rescheduled',
              detail: 'Service has been rescheduled successfully!',
            });

            const isRescheduled =
              this.serviceData.appointmentDate !== payload.appointmentDate ||
              this.serviceData.appointmentTime !== payload.appointmentTime ||
              this.serviceData.packageName !== payload.packageName ||
              this.serviceData.repeatChecked !== payload.repeatChecked ||
              this.serviceData.daysInterval !== payload.daysInterval ||
              this.serviceData.numberOfTimes !== payload.numberOfTimes ||
              JSON.stringify(this.serviceData.repeatedDates) !== JSON.stringify(payload.repeatedDates);

            const status = isRescheduled ? 'rescheduled' : 'confirmed';

            payload.appointmentStatus = status; // Update the payload status
            const messagePayload = {
              packageName: selectedPackage ? selectedPackage.name : null,
              appointmentDate: form.value.date,
              appointmentTime: form.value.time,
              firstName: form.value.firstName,
              lastName: form.value.lastName,
              phoneNumber: formattedPhoneNumber,
              appointmentStatus: status,
              requestVia: form.value.requestVia
            }
            this.healthCheckupService.sendWhatsappMessageForService(messagePayload).subscribe({
              next: (response) => {
                console.log('Whatsapp message sent successfully:', response);
                const whatsappPayload ={
                  ...payload,
                  messageSent: true
                }
                this.healthCheckupService.updateService(serviceId, whatsappPayload).subscribe({
                  next: (updateResponse) => {
                    console.log('Service updated with messageSent status:', updateResponse);
                  },
                  error: (updateError) => {
                    console.error('Error updating messageSent status in service:', updateError);
                  },
                  complete: () => {
                    this.isLoading = false;
                  },
                });
              },
              error: (error) => {
                console.error('Error sending whatsapp message:', error);
              },
            });
            this.isLoading = false;
            this.resetForm(form);
            this.closeForm.emit()
          },
          error: (err) => {
            console.error('Error rescheduling service:', err);
            alert('Failed to reschedule the service. Please try again.');
            this.isLoading = false;
          },
        });
      } else {
        this.isLoading=true;
        // New Appointment: Create a new service
        this.healthCheckupService.createService(payload).subscribe({
          next: (response) => {
            console.log('Service Created Successfully:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Service Created',
              detail: 'Service created successfully!',
            });
            const serviceId = response.id; // Get the newly created service ID
            const messagePayload = {
              packageName: selectedPackage ? selectedPackage.name : null,
              appointmentDate: form.value.date,
              appointmentTime: form.value.time,
              firstName: form.value.firstName,
              lastName: form.value.lastName,
              phoneNumber: formattedPhoneNumber,
              appointmentStatus: 'confirmed',
              requestVia: form.value.requestVia
            }
            this.healthCheckupService.sendWhatsappMessageForService(messagePayload).subscribe({
              next: (response) => {
                console.log('Whatsapp message sent successfully:', response);
                const whatsappPayload ={
                  ...payload,
                  messageSent: true
                }
                this.healthCheckupService.updateService(serviceId, whatsappPayload).subscribe({
                  next: (updateResponse) => {
                    console.log('Service updated with messageSent status:', updateResponse);
                  },
                  error: (updateError) => {
                    console.error('Error updating messageSent status in service:', updateError);
                  },
                  complete: () => {
                    this.isLoading = false;
                  },
                });
                
              },
              error: (error) => {
                console.error('Error sending whatsapp message:', error);
              },
            });
            this.resetForm(form);
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error creating service:', err);
            alert('Failed to create service. Please try again.');
            this.isLoading = false;
          },
        });
      }

    }
    else {
      console.log('Form is Invalid');
      form.form.markAllAsTouched();
    }
  }
  cancelForm(form: any) {
    this.resetForm(form);
    if (this.serviceData?.id) {
      this.closeForm.emit;
    }

  }
  ngOnDestroy(): void {
    if (this.serviceData?.id) {
      const serviceId = this.serviceData.id; // Set activeServiceId

      console.log('Unlocking service with ID:', serviceId);

      // Make the API call to unlock the service
      this.healthCheckupService.unlockService(serviceId).subscribe({
        next: (response) => {
          console.log('Service unlocked successfully:', response);
        },
        error: (error) => {
          console.error('Error unlocking service:', error);
        },
      });
    } else {
      console.log('No service ID available to unlock.');
    }

    console.log('Component destroyed');
  }


}