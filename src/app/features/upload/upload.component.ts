import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UploadService } from '../../core/services/upload.service';
import { DocumentApiService } from '../../core/services/document-api.service';
import { DocumentModel } from '../../core/models/document.model';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface FileEntry {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv'
];

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  private uploadService = inject(UploadService);
  private documentApiService = inject(DocumentApiService);
  private router = inject(Router);

  entries = signal<FileEntry[]>([]);
  isDragOver = signal(false);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave() {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.addFiles(files);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.addFiles(files);
    input.value = '';
  }

  private addFiles(files: File[]) {
    const valid = files.filter(f => ACCEPTED_TYPES.includes(f.type));
    if (valid.length < files.length) {
      alert(`${files.length - valid.length} file(s) skipped — unsupported format.`);
    }
    const newEntries: FileEntry[] = valid.map(f => ({
      file: f,
      status: 'idle',
      progress: 0
    }));
    this.entries.update(prev => [...prev, ...newEntries]);
  }

  async uploadAll() {
    const pending = this.entries().filter(e => e.status === 'idle' || e.status === 'error');
    for (const entry of pending) {
      await this.processEntry(entry);
    }
  }

  private async processEntry(entry: FileEntry) {
    this.updateEntry(entry, { status: 'uploading', progress: 0 });

    try {
      for await (const progress of this.documentApiService.uploadWithProgress(entry.file)) {
        this.updateEntry(entry, { progress: progress.percent });

        if (progress.done && progress.doc) {
          this.uploadService.addDocument(progress.doc);
          this.updateEntry(entry, { status: 'done', progress: 100 });
        }
      }
    } catch (err) {
      this.updateEntry(entry, { status: 'error', progress: 0, error: String(err) });
    }
  }

  private updateEntry(entry: FileEntry, patch: Partial<FileEntry>) {
    this.entries.update(prev =>
      prev.map(e => (e.file === entry.file ? { ...e, ...patch } : e))
    );
  }

  removeEntry(entry: FileEntry) {
    this.entries.update(prev => prev.filter(e => e.file !== entry.file));
  }

  clearDone() {
    this.entries.update(prev => prev.filter(e => e.status !== 'done'));
  }

  get allDone() {
    return this.entries().length > 0 && this.entries().every(e => e.status === 'done');
  }

  get hasPending() {
    return this.entries().some(e => e.status === 'idle' || e.status === 'error');
  }

  goToDocuments() {
    this.router.navigate(['/documents']);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
