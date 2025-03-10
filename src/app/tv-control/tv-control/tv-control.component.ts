import { Component } from '@angular/core';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { ChannelService } from '../../services/channel/channel.service';
import { MessageService } from 'primeng/api';
import { EventService } from '../../services/event.service';
import { Subscription, interval } from 'rxjs';
import { environment } from '../../../environment/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tv-control',
  templateUrl: './tv-control.component.html',
  styleUrls: ['./tv-control.component.css'],
})
export class TvControlComponent {
  constructor(
    private doctorService: DoctorServiceService,
    private channelService: ChannelService,
    private messageService: MessageService,
    private router: Router
  ) {
    this.loadDepartments();
    this.loadDoctors();
    this.loadChannels();
    this.fetchLatestAds()
  }


  channels: any = []; // Will be fetched from the backend
  channelLength: number = 0;
  departments: any = [];
  allDoctors: any = [];
  filteredDoctors: any = [];
  selectedDepartment = '';
  selectedDoctor: any = {};
  selectedChannelIndex: number = 0;
  selectedDoctorIndex: number = 0;
  isPopupOpen = false;
  roomNumber: string = '';
  isButtonClicked: boolean = true;
  latestTextAd = '';
  latestMediaAd = '';
  isImage = false;
  isVideo = false;
  popupInterval: any;
  selectedAdType = 'text';
  uploadedFile: File | null = null;
  textAd = '';
  ads: any[] = []
  adStatuses: { [key: string]: boolean } = {};
  existingAds: any = {}; 
  private eventSource: EventSource | null = null;



  ngOnInit() {
    this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);

    this.eventSource.addEventListener('channelRemoval', (event: MessageEvent) => {
      const removedChannel = JSON.parse(event.data);
      console.log('Channel Removed:', removedChannel);

      const currentRoute = this.router.url;
      console.log(currentRoute)

      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([currentRoute]); // Refresh the current route
        // this.loadChannels()
      });

    });
  }

  openForm(channelIndex: number, doctorIndex: number) {
    this.selectedChannelIndex = channelIndex;
    this.selectedDoctorIndex = doctorIndex;
    this.isPopupOpen = true;
    this.filteredDoctors = [];
    this.selectedDepartment = '';
    this.selectedDoctor = '';
  }

  closeForm() {
    this.isPopupOpen = false;
    this.selectedChannelIndex = 0;
    this.selectedDoctorIndex = 0;
    this.selectedDoctor = '';
    this.selectedDepartment = '';
  }

  loadDoctors(): void {
    this.doctorService.getDoctors().subscribe(
      (doctors) => {
        this.allDoctors = doctors;
      },
      (error) => {
        console.error('Error fetching doctors:', error);
      }
    );
  }

  loadDepartments(): void {
    this.doctorService.getDepartments().subscribe(
      (departments) => {
        this.departments = departments;
      },
      (error) => {
        console.error('Error fetching departments:', error);
      }
    );
  }

  loadChannels(): void {
    console.log('load channels')
    this.channelService.getChannels().subscribe(
      (channels) => {
        console.log('Fetched Channels:', channels);

        // Map the backend channels to the frontend `channels` array
        this.channels = channels.map((channel: any) => {
          // Extract doctor assignments for the current channel
          const doctorAssignments = channel.doctorAssignments || [];
          console.log(doctorAssignments)

          // Map doctor assignments to the `doctors` array
          const doctors = doctorAssignments.map((assignment: any) => ({
            doctorId: assignment.doctor?.id || null,
            doctorName: assignment.doctor?.name || null,
            departmentName: assignment.departmentName || null,
            roomNo: assignment.doctor?.roomNo || null
          }));

          // Fill the remaining slots (if any) with `null` to ensure max 4 slots
          while (doctors.length < 4) {
            doctors.push(null);
          }

          return {
            id: channel.id,
            name: channel.name,
            channelId: channel.channelId,
            doctors,
          };
        });

        console.log('Processed Channels:', this.channels);
      },
      (error) => {
        console.error('Error fetching channels:', error);
      }
    );
  }

  filterDoctors() {
    const todayDate = new Date().toISOString().split('T')[0]; // Today's date
    const currentTime = this.timeToMinutes(new Date().toTimeString().substring(0, 5)); // Current time in minutes

    // Create a set of doctor IDs who are already assigned to channels
    const assignedDoctorIds = new Set<number>();
    this.channels.forEach((channel: any) => {
      channel.doctors.forEach((doctor: any) => {
        if (doctor && doctor.doctorId) {
          assignedDoctorIds.add(doctor.doctorId);
        }
      });
    });
    console.log(assignedDoctorIds,)

    // Filter doctors based on availability and assignment
    this.filteredDoctors = this.allDoctors.filter((doctor: any) => {
      const isAlreadyAssigned = assignedDoctorIds.has(doctor.id);
      const isVisitingConsultant = doctor.doctorType === 'Visiting Consultant';
      const isAvailableToday =
        doctor.availability?.some(
          (avail: any) =>
            avail.day.toLowerCase() ===
            new Date(todayDate).toLocaleString('en-us', { weekday: 'short' }).toLowerCase()
        ) &&
        !(doctor.unavailableDates || []).some((unavailableDate: any) => {
          const formattedUnavailableDate = new Date(unavailableDate.date).toISOString().split('T')[0];
          return formattedUnavailableDate === todayDate;
        });

      console.log(
        'Doctor:',
        doctor.name,
        'Assigned:',
        isAlreadyAssigned,
        'Visiting Consultant:',
        isVisitingConsultant,
        'Available Today:',
        isAvailableToday,
        'Department Match:',
        doctor.departmentName === this.selectedDepartment
      );

      return (
        isAvailableToday &&
        !isAlreadyAssigned &&
        !isVisitingConsultant &&
        doctor.departmentName === this.selectedDepartment
      );
    });
    console.log('Filtered Doctors:', this.filteredDoctors);

  }
  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }



  saveDoctor() {
    this.isButtonClicked = false;
    if (this.selectedDoctor && this.selectedDepartment && this.roomNumber) {
      console.log('Selected Doctor:', this.selectedDoctor);
      console.log('Selected Channel Index:', this.selectedChannelIndex, 'Selected Doctor Index:', this.selectedDoctorIndex);

      // Get the selected channel using the channel index
      const channel = this.channels[this.selectedChannelIndex];

      if (!channel) {
        console.error('Channel not found!');
        return;
      }

      console.log('Selected Channel:', channel);

      // Update the frontend channel array
      channel.doctors[this.selectedDoctorIndex] = {
        doctorName: this.selectedDoctor.name,
        departmentName: this.selectedDepartment,
      };

      console.log('Updated Channel:', channel);

      // Prepare data to send to the backend
      const doctorData = {
        channelId: channel.channelId, // Use the channelId from the selected channel
        doctorId: this.selectedDoctor.id,
        departmentName: this.selectedDepartment,
      };

      this.selectedDoctor.roomNo = this.roomNumber;
      console.log(this.selectedDoctor)

      // this.doctorService.updateDoctor(this.selectedDoctor).subscribe(
      //   (response) => {
      //     console.log('Doctor updated successfully:', response);
      //   },
      //   (error) => {
      //     console.error('Error updating doctor:', error);
      //   }
      // )
      this.doctorService.updateDoctorRoom(this.selectedDoctor.id, this.selectedDoctor.roomNo).subscribe({
        next: (response) => {
          console.log('Room updated successfully:', response);
          // alert('Room number updated successfully!');
        },
        error: (error) => {
          console.error('Error updating room:', error);
          // alert('Failed to update room number.');
        },
      });

      console.log('Doctor Data to Save:', doctorData);

      // Send the data to the backend
      this.channelService.assignDoctorToChannel(doctorData).subscribe(
        (response) => {
          console.log('Doctor assigned successfully:', response);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Doctor is assigned successfully',
          });
          // Close the form after saving
          this.closeForm();
        },
        (error) => {
          console.error('Error assigning doctor:', error);
        }
      );
    } else {
      this.isButtonClicked = true;
      // alert('Please select a department and a doctor!');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill all the details',
      });
    }
  }




  // removeDoctor(channelIndex: number, doctorIndex: number) {
  //   const doctor = this.channels[channelIndex].doctors[doctorIndex];

  //   if (doctor) {
  //     this.channelService
  //       .removeDoctorFromChannel({ channelId: doctor.doctorId })
  //       .subscribe(
  //         (response) => {
  //           console.log('Doctor removed successfully:', response);
  //           this.channels[channelIndex].doctors[doctorIndex] = null;
  //         },
  //         (error) => {
  //           console.error('Error removing doctor:', error);
  //         }
  //       );
  //   }
  // }

  removeDoctor(channelIndex: number, doctorIndex: number) {
    const channel = this.channels[channelIndex];
    const doctor = channel.doctors[doctorIndex];


    if (doctor) {
      const doctorData = {
        channelId: channel.channelId, // Use channelId from the selected channel
        doctorId: doctor.doctorId,   // Ensure doctor object has the correct doctorId
      };

      console.log('Removing Doctor:', doctorData);

      this.channelService.removeDoctorFromChannel(doctorData).subscribe(
        (response) => {
          console.log('Doctor removed successfully:', response);

          // Set the doctor position to null to maintain array structure
          channel.doctors[doctorIndex] = null;

          console.log('Updated Channel:', channel);
        },
        (error) => {
          console.error('Error removing doctor:', error);
        }
      );
    } else {
      console.warn('No doctor found at this position.');
    }
  }
  selectAdType(type: string) {
    this.selectedAdType = type;
    this.uploadedFile = null;
    this.textAd = '';
    if(this.existingAds.text){
      this.textAd = this.existingAds.text.content;
    }
  }

  onFileUpload(event: any) {
    if (event.target.files.length > 0) {
      this.uploadedFile = event.target.files[0];
      console.log(this.uploadedFile)
    }
  }

  isAdReady(): boolean {
    return this.selectedAdType === 'text' ? !!this.textAd : !!this.uploadedFile;
  }
  submitAd() {
    if (this.selectedAdType === 'text') {
      this.channelService.uploadTextAd(this.textAd).subscribe(() => {
        this.fetchLatestAds();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Text is updated successfully',
        });
      });
    } else {
      this.channelService.uploadMediaAd(this.selectedAdType, this.uploadedFile!).subscribe(() => {
        this.fetchLatestAds();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Media is uploaded successfully',
        });
      });
    }
  }
  fetchLatestAds() {

    this.channelService.getAllAds().subscribe(response => {
      this.existingAds = response.ads.reduce((acc: any, ad: any) => {
        acc[ad.type] = ad;
        return acc;
      }, {});
    
      this.ads = response.ads;
      this.adStatuses = response.ads.reduce((acc: any, ad: any) => {
        acc[ad.type] = ad.isActive ?? false;
        return acc;
      }, {});
    
      // ✅ Ensure UI updates after data is set
      setTimeout(() => {
        console.log("Existing Text Ad:", this.existingAds.text);
        if (this.existingAds.text) {
          this.textAd = this.existingAds.text.content;
        }
      }, 0);
    });
    

  }
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.add("drag-over");
  }

  // ✅ Remove drag-over effect when leaving the drop zone
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.remove("drag-over");
  }

  // ✅ Handle drop event
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.remove("drag-over");
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.uploadedFile = event.dataTransfer.files[0]; // Store the first dropped file
      console.log("Stored Dragged File:", this.uploadedFile);
    } else {
      console.warn("No files were dropped.");
    }
  }
  toggleAdStatus(type: string) {
    const isActive = !this.adStatuses[type];

    // ✅ Check if media exists before enabling Image/Video ads
    if (isActive && (type === 'image' || type === 'video')) {
      const mediaExists = this.ads.some(ad => ad.type === type && ad.content);

      if (!mediaExists) {
        alert(`No ${type} found. Please upload one first.`);
        return;
      }
    }

    this.channelService.updateAdStatus(type, isActive).subscribe(() => {
      alert(`Ad ${isActive ? "enabled" : "disabled"} successfully.`);
      this.fetchLatestAds();
    });
  }

}
