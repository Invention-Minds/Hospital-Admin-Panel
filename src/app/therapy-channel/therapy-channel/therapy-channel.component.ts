// tv.component.ts
import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChannelService } from '../../services/channel/channel.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { EventService } from '../../services/event.service';
import { Subscription, interval } from 'rxjs';
import { environment } from '../../../environment/environment';
import { TherapyService } from '../../services/therapy/therapy.service';
import { trigger, transition, style, animate } from '@angular/animations';


@Component({
  selector: 'app-therapy-channel',
  templateUrl: './therapy-channel.component.html',
  styleUrl: './therapy-channel.component.css',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('400ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class TherapyChannelComponent {
  currentDate: string = '';
  currentTime: string = '';
  loading: boolean = false;
  today: string = ''
  private intervalId: any;
  private eventSource: EventSource | null = null;
  private eventSubscription: Subscription | null = null;
  showPopup = false;
  popupImage = '/popup.jpeg'; // Set a different popup image
  popupInterval: any;
  popupMedia = '';
  isImage = true;
  currentMediaIndex = 0;
  scrollingText = '';  // Scrolling text for marquee
  mediaFiles: { type: string, src: string }[] = [];
  ads: any[] = []
  adStatuses: { [key: string]: boolean } = {};
  existingAds: any = {};
  doctorSlideInterval: any;
  currentSlideIndex: number = 0;


  therapyAppointments: any[] = [];
  groupedRooms: { [key: string]: any[] } = {};
  visibleRooms: string[] = ['Room 101', 'Room 102'];
  allRooms: string[] = ['Room 101', 'Room 102', 'Room 103', 'Room 104'];
  slideIndex = 0;
  switchInterval: any;
  therapyRoomGroups: any[][] = [];

  @ViewChild('popupVideo') popupVideo!: ElementRef; // Reference for video tag
  constructor(
    private route: ActivatedRoute,
    private channelService: ChannelService,
    private appointmentService: AppointmentConfirmService,
    private eventService: EventService,
    private doctorService: DoctorServiceService,
    private router: Router,
    private authService: AuthServiceService,
    private therapyService: TherapyService,
  ) { }

  ngOnInit() {
    this.updateDateTime();
    // this.fetchLatestAds()
    this.startPopupRotation();
    this.fetchCheckedInAppointments();

    // Auto-switch rooms every 5 seconds
    this.switchInterval = setInterval(() => {
      this.nextSlide();
    }, 30000);

    this.intervalId = setInterval(() => {
      this.updateDateTime();
    }, 60000);

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.today = `${year}-${month}-${day}`;

    // Fetch channel ID from the URL and fetch doctors for that channel

    this.eventSubscription = this.eventService.consultationEvent$.subscribe((event) => {
    });
    this.eventSource = new EventSource(`${environment.apiUrl}/appointments/updates`);

    this.eventSource.addEventListener('load', (event: MessageEvent) => {
      const type = JSON.parse(event.data);
      // this.fetchLatestAds()

    });
    this.eventSource.addEventListener('loadTherapyTv', (event: MessageEvent) => {
      const type = JSON.parse(event.data);
      this.fetchCheckedInAppointments()

    });

  }

  fetchCheckedInAppointments() {
    this.loading = true;
    this.therapyService.todayCheckedInTherapiesChannel().subscribe({
      next: (data) => {
        this.loading = false;
        this.therapyAppointments = data.filter((appt: any) => !appt.therapyFinished);
        console.log('Fetched therapy appointments:', this.therapyAppointments);
        this.groupByRoom();
      },
      error: (err) => {
        console.error('Error fetching therapy appointments:', err);
        this.loading = false;
      },
    });
  }

  groupByRoom() {
    const grouped: { [key: string]: any } = {};
  
    this.therapyAppointments = this.therapyAppointments.filter(a => !a.therapyFinished);
  
    this.therapyAppointments.forEach(appt => {
      const room = appt.roomNumber || 'Unknown';
  
      if (!grouped[room]) {
        grouped[room] = {
          roomNumber: room,
          therapistName: appt.therapist?.name || 'N/A',
          patients: []
        };
      }
  
      grouped[room].patients.push(appt);
    });
  
    Object.keys(grouped).forEach(room => {
      const roomData = grouped[room];
  
      // Sort by time ascending
      roomData.patients.sort((a:any, b:any) => a.time.localeCompare(b.time));
  
      // ACTIVE INDEX: therapyStarted > entryDone > cleanedAfterUse
      let activeIndex = roomData.patients.findIndex((p:any) => p.therapyStarted);
      if (activeIndex === -1) activeIndex = roomData.patients.findIndex((p:any) => p.entryDone);
      if (activeIndex === -1) activeIndex = roomData.patients.findIndex((p:any) => p.cleanedAfterUse);
  
      // Map statuses
      roomData.patients.forEach((appt:any, i:any) => {
        const { displayStatus, color } = this.mapTherapyStatus(appt, i, activeIndex, roomData.patients);
        appt.displayStatus = displayStatus;
        appt.statusColor = color;
      });
  
      grouped[room] = roomData;
    });
  
    const roomsArray = Object.values(grouped);
    this.therapyRoomGroups = [];
  
    for (let i = 0; i < roomsArray.length; i += 2) {
      this.therapyRoomGroups.push(roomsArray.slice(i, i + 2));
    }
  }
  
  
  

  nextSlide() {
    if (this.therapyRoomGroups.length > 0) {
      this.slideIndex = (this.slideIndex + 1) % this.therapyRoomGroups.length;
    }
  }






  updateDateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    };
    this.currentDate = new Intl.DateTimeFormat('en-US', options).format(now);

    this.currentTime = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: true,
    }).format(now);
  }

  ngOnDestroy() {
    clearInterval(this.popupInterval);
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

  }

  trackByFn(index: number, item: any): number {
    return item.id; // Use a unique identifier for tracking
  }


  startPopupRotation() {
    if (this.popupInterval) {
      clearInterval(this.popupInterval);
    }

    this.popupInterval = setInterval(() => {
      // this.fetchLatestAds()
      if (this.mediaFiles.length === 0) return;

      const media = this.mediaFiles[this.currentMediaIndex];
      this.popupMedia = media.src;
      this.isImage = media.type === 'image';
      this.showPopup = true;

      if (this.isImage) {
        // ✅ If it's an image, hide after 5 seconds
        setTimeout(() => {
          this.showPopup = false;
        }, 24000); // 24 secs
      } else {
        // ✅ If it's a video, play only if allowed by the browser
        setTimeout(() => {
          if (this.popupVideo) {
            const videoElement = this.popupVideo.nativeElement;

            videoElement.muted = false; // ✅ Ensure the video starts muted
            videoElement.play().catch((error: any) => {
              console.error("Autoplay blocked. Waiting for user interaction:", error);
            });
          }
        }, 500);
      }

      // ✅ Move to the next media
      this.currentMediaIndex = (this.currentMediaIndex + 1) % this.mediaFiles.length;
    }, 90000); // 90secs once will image and once video
  }

  // ✅ Handle Video Playback When It Becomes Ready
  onVideoCanPlay() {
    if (this.popupVideo) {
      this.popupVideo.nativeElement.muted = false; // Unmute after autoplay
    }
  }

  fetchLatestAds() {
    const channelId = this.route.snapshot.paramMap.get('channelId');
    this.channelService.getAllAdsForChannel(channelId!).subscribe(response => {
      this.mediaFiles = []; // ✅ Clear previous ads
      this.scrollingText = ''; // ✅ Reset scrolling text

      console.log("Fetched All Ads:", response);

      // ✅ Store all ads for reference
      this.ads = response.ads;

      // ✅ Convert ads array into an object by type
      this.existingAds = response.ads.reduce((acc: any, ad: any) => {
        acc[ad.type] = ad;
        return acc;
      }, {});

      // ✅ Store active status of each ad type
      this.adStatuses = response.ads.reduce((acc: any, ad: any) => {
        acc[ad.type] = ad.isActive ?? false; // Default to false if null
        return acc;
      }, {});

      // ✅ Display only active text ad
      if (this.existingAds.text && this.existingAds.text.isActive) {
        this.scrollingText = this.existingAds.text.content;
        console.log(this.scrollingText)
      }

      // ✅ Display only active image/video ads
      response.ads.forEach((ad: any) => {
        // if ((ad.type === 'image' || ad.type === 'video') && ad.isActive) {
        //     this.mediaFiles.push({
        //         type: ad.type,
        //         src: ad.content
        //     });
        // }
        if (ad.type === 'image' && ad.AdvertisementMedia?.length > 0) {
          const activeMedia = ad.AdvertisementMedia.filter((media: any) => media.isActive);
          activeMedia.forEach((media: any) => {
            this.mediaFiles.push({
              type: 'image',
              src: media.url
            });
          });
        }

        if (ad.type === 'video' && ad.isActive && ad.content) {
          this.mediaFiles.push({
            type: 'video',
            src: ad.content
          });
        }
      });

      console.log("Updated Media Files:", this.mediaFiles);

      // ✅ Restart popup rotation if media ads exist
      if (this.mediaFiles.length > 0) {
        this.currentMediaIndex = 0;
        this.startPopupRotation();
      }


    });
  }

  handleImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = '/doctor-image.jpg'; // Fallback image
  }
  mapTherapyStatus(appt: any, index: number, activeIndex: number, appointments: any[]) {
    // 5️⃣ Remove finished appointments from display (you already filter outside)
    if (appt.therapyFinished) {
      return { displayStatus: '', color: '' };
    }
  
    // 4️⃣ Cleaning after use
    if (appt.cleanedAfterUse) {
      return { displayStatus: 'Cleaning Completed', color: 'blue' };
    }

    if (appt.cleaningEnded) {
      return { displayStatus: 'Cleaning Started', color: 'teal' };
    }
  
    // 4️⃣ NEW: Therapy Ended
    if (appt.therapyEnded) {
      return { displayStatus: 'Therapy Ended', color: 'pink' };
    }
  
  
    // 3️⃣ Therapy Started
    if (appt.therapyStarted) {
      return { displayStatus: 'Started', color: 'purple' };
    }
  
    // 2️⃣ Patient already entered
    if (appt.entryDone) {
      return { displayStatus: 'Patient In', color: 'green' };
    }
  
    // 6️⃣ Postponed
    if (appt.postponed || appt.status?.toLowerCase() === 'postponed') {
      return { displayStatus: 'Pending', color: 'yellow' };
    }
  
    // 1️⃣ Identify FIRST NEXT appointment
    // activeIndex = entryDoneIndex or therapyStartedIndex or cleanedIndex or -1 if none
    const nextIndex = activeIndex !== -1 ? activeIndex + 1 : 0;
  
    if (index === nextIndex) {
      return { displayStatus: 'Next', color: 'orange' };
    }
  
    // Default: Checked-In
    return { displayStatus: 'Checked-In', color: 'navy-blue' };
  }
  
  getTherapistNames(patient: any): string {
    if (!patient.therapists || patient.therapists.length === 0) return '-';

    return patient.therapists
        .map((t: any) => t.therapist?.name || '')
        .join(', ');
}

  
}
