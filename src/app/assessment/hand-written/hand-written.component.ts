import { Component, ViewChild, ElementRef, Input, Output, EventEmitter, AfterViewInit, HostListener, SimpleChanges } from '@angular/core';
import { last } from 'rxjs';
import SignaturePad from 'signature_pad';
import paper from 'paper';



@Component({
  selector: 'app-hand-written',
  templateUrl: './hand-written.component.html',
  styleUrl: './hand-written.component.css'
})
export class HandWrittenComponent implements AfterViewInit {
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() label: string = '';
  @Input() readOnly: boolean = false;
  @Input() initialValue: string | null = null;
  @Output() valueChange = new EventEmitter<string>();
  @Output() saveEvent = new EventEmitter<string>();
  @Output() focusEvent = new EventEmitter<void>();


  private signaturePad!: SignaturePad;
  private minHeight = 200; // starting height
  private logicalHeight = this.minHeight; // CSS pixels

  private undoStack: any[] = [];   // store undone strokes
  eraserMode: boolean = false; // toggle erase mode


  ngAfterViewInit(): void {
    this.initSignaturePad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] && this.signaturePad) {
      const newVal = changes['initialValue'].currentValue;
      if (newVal) {
        try {
          this.signaturePad.fromDataURL(newVal);
        } catch (err) {
          console.error('Error reloading handwriting:', err);
        }
      } else {
        this.signaturePad.clear();
      }
    }
  }
  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
  }


  private initSignaturePad() {
    this.resizeCanvas();
    const canvas = this.canvasRef.nativeElement;

    // 👇 Add this before creating SignaturePad
    canvas.style.touchAction = 'none';  // disables pinch-zoom, scroll
    this.signaturePad = new SignaturePad(this.canvasRef.nativeElement, {
      minWidth: 1,
      maxWidth: 3,
      penColor: 'black',
      backgroundColor: 'white'
    });

    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      // ✅ Ignore multitouch to allow palm rejection
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });

      // ✅ Add pointer event filtering
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.pointerType !== 'pen') {
      e.preventDefault();
      return; // ignore finger/palm touches
    }
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (e.pointerType !== 'pen') {
      e.preventDefault();
      return;
    }
  });

  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    if (e.pointerType !== 'pen') {
      e.preventDefault();
      return;
    }
  });
    

  // When user starts a stroke, emit focus
  this.signaturePad.addEventListener("beginStroke", () => {
    this.focusEvent.emit();
  });

    this.signaturePad.addEventListener("afterUpdateStroke", (event: any) => {
      // event contains the latest stroke
      const stroke = this.signaturePad.toData().slice(-1)[0]; // last stroke
      if (stroke && stroke.points.length) {
        const lastPoint = stroke.points[stroke.points.length - 1];
        this.checkDynamicResize(lastPoint.y);
      }
    });
    this.signaturePad.addEventListener("endStroke", () => {
      this.undoStack = []; // clear redo stack after new stroke

      const data = this.signaturePad.toData();
      const lastStroke = data[data.length - 1];

      if (lastStroke && this.isClosedLoop(lastStroke.points)) {
        const newData = this.removeStrokesInsideCircle(data, lastStroke.points);
        if (newData.length < data.length - 1) {
          // ✅ Something was actually removed, so discard the loop too
          this.signaturePad.fromData(newData);
        } else {
          // ❌ Nothing inside, keep the loop as a valid stroke (like "0" or "O")
          this.signaturePad.fromData(data);
        }

      }

      this.emitChange();
    });






    if (this.initialValue) {
      try {
        this.signaturePad.fromDataURL(this.initialValue);
      } catch (err) {
        console.error("Error loading handwriting:", err);
      }
    }

    if (this.readOnly) {
      this.signaturePad.off();
    }
  }

  private isClosedLoop(points: any[]): boolean {
    if (points.length < 5) return false;
    const first = points[0];
    const last = points[points.length - 1];
    const dist = Math.hypot(first.x - last.x, first.y - last.y);
    return dist < 30; // adjust tolerance
  }

  private removeStrokesInsideCircle(data: any[], circlePoints: any[]): any[] {
    // Build polygon path from circle
    const polygon = circlePoints.map(p => [p.x, p.y]);

    // Filter strokes: keep only those NOT inside polygon
    return data.filter((stroke, index) => {
      if (index === data.length - 1) return false; // remove the circle itself
      // if ANY point of stroke is outside polygon → keep stroke
      return !stroke.points.every((p: any) => this.pointInPolygon(p, polygon));
    });
  }

  private pointInPolygon(point: any, vs: number[][]): boolean {
    // Ray-casting algorithm
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }


  /** UNDO last stroke */
  undo() {
    const data = this.signaturePad.toData();
    if (data.length) {
      const popped = data.pop();
      if (popped) {
        this.undoStack.push(popped);
      }
      this.signaturePad.fromData(data);
      this.emitChange();
    }
  }

  /** REDO last undone stroke */
  redo() {
    if (this.undoStack.length) {
      const stroke = this.undoStack.pop();
      const data = this.signaturePad.toData();
      data.push(stroke);
      this.signaturePad.fromData(data);
      this.emitChange();
    }
  }
  toggleEraser() {
    this.eraserMode = !this.eraserMode;
    this.signaturePad.penColor = this.eraserMode ? "white" : "black";

    const canvas = this.canvasRef.nativeElement;
    if (this.eraserMode) {
      canvas.classList.add("eraser-cursor");
      canvas.classList.remove("pen-cursor");
    } else {
      canvas.classList.add("pen-cursor");
      canvas.classList.remove("eraser-cursor");
    }
  }


  private emitChange() {
    const dataUrl = this.signaturePad.isEmpty() ? '' : this.signaturePad.toDataURL();
    this.valueChange.emit(dataUrl);
  }



  private checkDynamicResize(y: number) {
    const buffer = 100;
    if (y + buffer > this.logicalHeight) {
      this.resizeCanvas(this.logicalHeight + 200);
    }
  }


  private resizeCanvas(newHeight?: number) {
    const canvas = this.canvasRef.nativeElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth;
    const height = newHeight || this.logicalHeight;

    // Save current content as image (bitmap, not scaled)
    const oldCanvas = document.createElement('canvas');
    oldCanvas.width = canvas.width;
    oldCanvas.height = canvas.height;
    const oldCtx = oldCanvas.getContext('2d');
    oldCtx?.drawImage(canvas, 0, 0);

    this.logicalHeight = height;

    // Setup new size
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    ctx?.scale(ratio, ratio);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Restore previous content without stretching
    ctx?.drawImage(oldCanvas, 0, 0, width, oldCanvas.height / ratio);
  }


  clear() {
    this.signaturePad.clear();
    this.undoStack = [];

    // ✅ Reset canvas height to default
    this.logicalHeight = this.minHeight;
    this.resizeCanvas(this.minHeight);
  
    this.valueChange.emit('');
  }

  save() {
    if (!this.signaturePad.isEmpty()) {
      const dataUrl = this.signaturePad.toDataURL();
      // console.log(dataUrl)
      this.valueChange.emit(dataUrl); // still emit if you want real-time binding
      this.saveEvent.emit(dataUrl);   // emit only on save click
    }
  }
  setReadOnly(value: boolean): void {
    this.readOnly = value;
    const canvas = this.canvasRef.nativeElement;
    if (value) {
      this.signaturePad.off();
      canvas.classList.add('readonly-canvas');
    } else {
      this.signaturePad.on();
      canvas.classList.remove('readonly-canvas');
    }
  }
  
  
  
}
