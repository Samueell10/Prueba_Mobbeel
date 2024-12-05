import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  selectedFile: File | null = null;
  selectedFileName: string | null = null;
  captureTime: string | null = null;
  apiUrl = 'https://example.com/api';
  croppedImage: string | null = null;
  result: any;
  isCameraActive: boolean = false;
  isImagePopupOpen: boolean = false;
  popupImage: string | null = null;
  videoInterval: any;
  showCaptureButton: boolean = false;
  isAutoDetected: boolean = false; 

  @ViewChild('video') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasElement!: ElementRef<HTMLCanvasElement>;

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  // Handle file selection and update the corresponding variables.
  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
        this.selectedFile = target.files[0];
        this.selectedFileName = this.selectedFile.name;
        this.captureTime = null;
        this.croppedImage = null;
        this.result = null;
        this.showCaptureButton = false; 
        this.isAutoDetected = false; 
        this.cd.detectChanges(); 
    }
}

  // Send the selected file to the API for processing.
  onUpload() {
    // If a cropped image already exists (automatically or manually detected)
    if (this.croppedImage) {
      this.cd.detectChanges(); 
    } else if (this.selectedFile) {
      const formData = new FormData();
      formData.append('documentSide', 'front');
      formData.append('documentType', 'TD1');
      formData.append('image', this.selectedFile);
      formData.append('licenseId', 'mobbscan-challenge');
      formData.append('returnCroppedImage', 'true');
  
      this.http.post(this.apiUrl, formData).subscribe(response => {
        this.result = response;
  
        if (this.result && this.result.imageDocumentDetected) {
          this.croppedImage = this.result.imageDocumentDetected;
          this.cd.detectChanges();
  
          if (this.isAutoDetected) { // Update name only if it is auto-detection
            this.updateFileInfo();
          }
        } else {
          console.log('No document was detected in the new request');
          this.croppedImage = null;
          alert('No document was detected.');
        }
  
        this.stopCamera(); 
        this.resetFileInput();
        this.cd.detectChanges(); 
      }, error => {
        console.error('Error:', error);
        this.croppedImage = null;
        alert('An error occurred while processing the image.');
        this.stopCamera(); 
        this.cd.detectChanges(); 
      });
    } else {
      console.log('No file selected or document detected');
      alert('No document has been uploaded or detected.');
    }
  }
  
  
  // Open the camera to take a photo.
  openCamera() {
    if (this.isCameraActive) {
      console.warn('The camera is already open.');
      return; 
    }

    this.isCameraActive = true;
    this.showCaptureButton = true;
    this.cd.detectChanges(); 

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
        this.cd.detectChanges(); 
      })
      .catch(error => {
        console.error('Error accessing the camera:', error);
        alert('Could not access the camera.');
        this.isCameraActive = false; 
        this.cd.detectChanges(); 
      });
  }

  // Capture an image from the video and convert it into a file.
  captureImage() {
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (context) {
        const video = this.videoElement.nativeElement;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(blob => {
            if (blob) {
                this.selectedFile = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
                this.selectedFileName = this.selectedFile.name;

                const currentDateTime = new Date();
                this.captureTime = `${currentDateTime.getHours()}:${currentDateTime.getMinutes()}:${currentDateTime.getSeconds()}`;

                this.croppedImage = null;
                this.isAutoDetected = false; 
                this.cd.detectChanges(); 

                // Stop the camera and hide the capture button immediately
                this.stopCamera();
                this.resetFileInput();
                this.showCaptureButton = false; 
                this.cd.detectChanges(); 
            }
        }, 'image/jpeg');
    } else {
        console.error('Could not obtain the canvas context.');
    }
}

  // Start automatic document detection through the video.  
  startVideoDetection() {
    this.showCaptureButton = false;
    this.openCamera(); 
    this.videoInterval = setInterval(() => {
      this.detectDocument(); 
    }, 1000); 
    this.cd.detectChanges(); 
  }
  
  // Detect the document in the video stream.
  detectDocument() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');
  
    if (!video || !context) {
      console.error('Video context or element unavailable');
      return;
    }
  
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('documentSide', 'front');
        formData.append('documentType', 'TD1');
        formData.append('image', file);
        formData.append('licenseId', 'mobbscan-challenge');
        formData.append('returnCroppedImage', 'true');
  
        this.http.post(this.apiUrl, formData).subscribe(response => {
          this.result = response;
          if (this.result && this.result.imageDocumentDetected) {
            this.isAutoDetected = true; 
            this.updateFileInfo(); 
            this.stopCamera(); 
            this.showCaptureButton = false; 
            this.resetFileInput();
            this.cd.detectChanges(); 
          }
        }, error => {
          console.error('Error processing the frame:', error);
          this.cd.detectChanges(); 
        });
      }
    }, 'image/jpeg');
  }
  
  // Update the file information if a document was detected automatically.
  updateFileInfo() {
    if (this.isAutoDetected) {
      const currentDateTime = new Date();
      this.captureTime = `${currentDateTime.getHours()}:${currentDateTime.getMinutes()}:${currentDateTime.getSeconds()}`;
  
      this.selectedFile = new File([this.result.imageDocumentDetected], 'detected-document.jpg', { type: 'image/jpeg' });
      this.selectedFileName = this.selectedFile.name;
      
      this.croppedImage = this.result.imageDocumentDetected; 
      this.cd.detectChanges();
    }
  }

  // Stop the camera and clear the video stream.
  stopCamera() {
    const videoStream = this.videoElement.nativeElement.srcObject as MediaStream;
    if (videoStream) {
      const tracks = videoStream.getTracks();
      tracks.forEach(track => track.stop());
    }
    this.videoElement.nativeElement.srcObject = null;
    this.isCameraActive = false;
    clearInterval(this.videoInterval); 
    this.cd.detectChanges();
    console.log('Camera stopped.');
  }

  // Reset the file input field.
  resetFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = ''; 
    }
}
}
