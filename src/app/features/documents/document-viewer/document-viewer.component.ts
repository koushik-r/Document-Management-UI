import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UploadService } from '../../../core/services/upload.service';
import { CompressionService } from '../../../core/services/compression.service';
import { DocumentApiService } from '../../../core/services/document-api.service';
import { DocumentModel } from '../../../core/models/document.model';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viewer-page">
      <header class="page-header">
        <button class="btn btn-outline" (click)="goBack()">← Back</button>
        <h1>Document Uploader</h1>
        <span></span>
      </header>

      @if (doc()) {
        <div class="viewer-container">
          <div class="viewer-meta">
            <h2>{{ doc()!.name }}</h2>
            <div class="meta-pills">
              <span class="pill">{{ doc()!.type || 'Unknown type' }}</span>
              <span class="pill">{{ formatBytes(doc()!.size) }}</span>
              @if (doc()!.compressedSize && doc()!.compressedSize! < doc()!.size) {
                <span class="pill pill-green">Compressed → {{ formatBytes(doc()!.compressedSize!) }}</span>
              }
              <span class="pill">{{ doc()!.uploadedAt | date:'medium' }}</span>
            </div>
          </div>

          <div class="viewer-content">
            @if (previewUrl()) {
              @if (doc()!.type.startsWith('image/')) {
                <img [src]="previewUrl()" [alt]="doc()!.name" class="preview-image" />
              } @else if (doc()!.type === 'application/pdf') {
                <iframe [src]="safePdfUrl()" class="preview-iframe" title="PDF preview"></iframe>
              } @else if (doc()!.type.startsWith('text/')) {
                <pre class="text-preview">{{ textContent() }}</pre>
              } @else {
                <div class="no-preview">
                  <div class="no-preview-icon">📄</div>
                  <p>Preview not available for this file type.</p>
                  <a [href]="previewUrl()" [download]="doc()!.name" class="btn btn-primary">Download</a>
                </div>
              }
            } @else {
              <div class="no-preview">
                <div class="no-preview-icon">📄</div>
                <p>Preview data not available. Re-upload the file to enable preview.</p>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="not-found">
          <p>Document not found.</p>
          <button class="btn btn-primary" (click)="goBack()">Go back</button>
        </div>
      }
    </div>
  `,
  styleUrls: ['./document-viewer.component.scss']
})
export class DocumentViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private uploadService = inject(UploadService);
  private compressionService = inject(CompressionService);
  private documentApiService = inject(DocumentApiService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  doc = signal<DocumentModel | undefined>(undefined);
  textContent = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const found = this.uploadService.getDocument(id);

    if (found) {
      this.doc.set(found);
      this.loadTextIfNeeded(found);
    } else {
      // Document not in local state — fetch from API by constructing a minimal model
      const downloadUrl = this.documentApiService.getDownloadUrl(id);
      const placeholder: DocumentModel = {
        id,
        name: id,
        size: 0,
        type: this.guessType(id),
        uploadedAt: new Date(),
        downloadUrl
      };
      this.doc.set(placeholder);
      this.loadTextIfNeeded(placeholder);
    }
  }

  private loadTextIfNeeded(doc: DocumentModel) {
    if (!doc.type.startsWith('text/')) return;

    if (doc.downloadUrl) {
      this.http.get(doc.downloadUrl, { responseType: 'text' }).subscribe({
        next: text => this.textContent.set(text),
        error: () => this.textContent.set('(Unable to load text content)')
      });
    } else if (doc.dataUrl) {
      const base64 = doc.dataUrl.split(',')[1];
      try {
        this.textContent.set(atob(base64));
      } catch {
        this.textContent.set('(Unable to decode text content)');
      }
    }
  }

  private guessType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
      txt: 'text/plain', csv: 'text/csv',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return ext ? (map[ext] ?? 'application/octet-stream') : 'application/octet-stream';
  }

  previewUrl(): string | undefined {
    const d = this.doc();
    return d?.downloadUrl ?? d?.dataUrl;
  }

  safePdfUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl() ?? '');
  }

  goBack() {
    this.router.navigate(['/documents']);
  }

  formatBytes(b: number) {
    return this.compressionService.formatBytes(b);
  }
}
