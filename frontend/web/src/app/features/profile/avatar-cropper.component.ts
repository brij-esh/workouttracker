import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  signal
} from '@angular/core';

@Component({
  selector: 'app-avatar-cropper',
  standalone: true,
  templateUrl: './avatar-cropper.component.html',
  styleUrl: './avatar-cropper.component.scss'
})
export class AvatarCropperComponent implements OnDestroy {
  @Input({ required: true }) imageUrl!: string;
  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly confirm = new EventEmitter<Blob>();

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLElement>;

  readonly zoom = signal(1);
  readonly offsetX = signal(0);
  readonly offsetY = signal(0);
  readonly busy = signal(false);

  private naturalW = 0;
  private naturalH = 0;
  private baseScale = 1;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private objectUrlToRevoke: string | null = null;

  ngOnDestroy(): void {
    if (this.objectUrlToRevoke) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
    }
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalW = img.naturalWidth;
    this.naturalH = img.naturalHeight;
    this.autoFit();
  }

  autoFit(): void {
    const size = this.stageSize();
    if (!this.naturalW || !this.naturalH || !size) {
      return;
    }
    // Cover the circle (auto-adjust)
    this.baseScale = Math.max(size / this.naturalW, size / this.naturalH);
    this.zoom.set(1);
    this.offsetX.set(0);
    this.offsetY.set(0);
  }

  onZoomInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.zoom.set(value);
    this.clampOffset();
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.offsetX.update((x) => x + dx);
    this.offsetY.update((y) => y + dy);
    this.clampOffset();
  }

  onPointerUp(event: PointerEvent): void {
    this.dragging = false;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.cancel.emit();
  }

  imageTransform(): string {
    const scale = this.baseScale * this.zoom();
    return `translate(-50%, -50%) translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${scale})`;
  }

  async save(): Promise<void> {
    if (!this.naturalW || this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const output = 512;
      const canvas = document.createElement('canvas');
      canvas.width = output;
      canvas.height = output;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not crop image');
      }

      const stage = this.stageSize();
      const scale = this.baseScale * this.zoom();
      // Image is drawn centered at stage/2 + offset, scaled by `scale`
      // Map circle viewport to source image coordinates
      const centerX = this.naturalW / 2 - this.offsetX() / scale;
      const centerY = this.naturalH / 2 - this.offsetY() / scale;
      const srcSize = stage / scale;
      const sx = centerX - srcSize / 2;
      const sy = centerY - srcSize / 2;

      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, output, output);
      ctx.beginPath();
      ctx.arc(output / 2, output / 2, output / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const img = await this.loadImage(this.imageUrl);
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, output, output);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Could not export photo'))),
          'image/jpeg',
          0.92
        );
      });
      this.confirm.emit(blob);
    } finally {
      this.busy.set(false);
    }
  }

  private stageSize(): number {
    return this.stageRef?.nativeElement?.clientWidth || 280;
  }

  private clampOffset(): void {
    const size = this.stageSize();
    const scale = this.baseScale * this.zoom();
    const scaledW = this.naturalW * scale;
    const scaledH = this.naturalH * scale;
    const maxX = Math.max(0, (scaledW - size) / 2);
    const maxY = Math.max(0, (scaledH - size) / 2);
    this.offsetX.update((x) => Math.min(maxX, Math.max(-maxX, x)));
    this.offsetY.update((y) => Math.min(maxY, Math.max(-maxY, y)));
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load image'));
      img.crossOrigin = 'anonymous';
      img.src = src;
    });
  }
}
