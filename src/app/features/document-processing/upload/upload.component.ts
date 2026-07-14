import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ExtractionApiService } from '../../../core/services/extraction-api.service';
import { ExtractionDocument, TemplateRecord } from '../../../core/models/extraction.model';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface Entry {
  file: File;
  status: UploadStatus;
  error?: string;
  result?: ExtractionDocument;
}

/**
 * IDP "Document upload" feature. Mirrors the existing uploader pattern but posts
 * to the extraction backend, which stores the file in Blob + Mongo and runs
 * extraction. An optional template can be selected to drive extraction.
 */
@Component({
  selector: 'app-extraction-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {
  private api = inject(ExtractionApiService);
  private router = inject(Router);

  entries = signal<Entry[]>([]);
  isDragOver = signal(false);
  templates = signal<TemplateRecord[]>([]);
  selectedTemplate = signal<string>('');

  ngOnInit() {
    this.api.listTemplates().subscribe({
      next: t => this.templates.set(t),
      error: () => {}
    });
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragOver.set(true); }
  onDragLeave() { this.isDragOver.set(false); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver.set(false);
    this.addFiles(Array.from(e.dataTransfer?.files ?? []));
  }
  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  private addFiles(files: File[]) {
    const added: Entry[] = files.map(f => ({ file: f, status: 'idle' as UploadStatus }));
    this.entries.update(prev => [...prev, ...added]);
  }

  removeEntry(entry: Entry) {
    this.entries.update(prev => prev.filter(e => e !== entry));
  }

  async uploadAll() {
    const pending = this.entries().filter(e => e.status === 'idle' || e.status === 'error');
    for (const entry of pending) {
      await this.upload(entry);
    }
  }

  private upload(entry: Entry): Promise<void> {
    this.patch(entry, { status: 'uploading', error: undefined });
    const templateId = this.selectedTemplate() || undefined;
    return new Promise(resolve => {
      this.api.uploadAndExtract(entry.file, templateId).subscribe({
        next: doc => { this.patch(entry, { status: 'done', result: doc }); resolve(); },
        error: err => {
          this.patch(entry, { status: 'error', error: err?.error?.error ?? String(err) });
          resolve();
        }
      });
    });
  }

  private patch(entry: Entry, patch: Partial<Entry>) {
    this.entries.update(prev => prev.map(e => (e === entry ? { ...e, ...patch } : e)));
  }

  get hasPending() {
    return this.entries().some(e => e.status === 'idle' || e.status === 'error');
  }

  viewResults() {
    this.router.navigate(['/idp/results']);
  }

  confidencePct(doc?: ExtractionDocument): string {
    if (!doc || doc.overall_confidence == null) return '—';
    return `${Math.round(doc.overall_confidence * 100)}%`;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
