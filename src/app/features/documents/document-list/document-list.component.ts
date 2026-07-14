import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UploadService } from '../../../core/services/upload.service';
import { CompressionService } from '../../../core/services/compression.service';
import { DocumentApiService } from '../../../core/services/document-api.service';
import { DocumentModel } from '../../../core/models/document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit {
  private uploadService = inject(UploadService);
  private compressionService = inject(CompressionService);
  private documentApiService = inject(DocumentApiService);
  private router = inject(Router);

  documents = this.uploadService.documents;
  searchQuery = signal('');
  loading = signal(false);
  error = signal('');

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.documents().filter(d => d.name.toLowerCase().includes(q));
  });

  ngOnInit() {
    this.loading.set(true);
    this.documentApiService.list().subscribe({
      next: docs => {
        this.uploadService.setDocuments(docs);
        this.loading.set(false);
      },
      error: err => {
        this.error.set('Failed to load documents. Is the backend running?');
        this.loading.set(false);
      }
    });
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  viewDocument(doc: DocumentModel) {
    this.router.navigate(['/documents', doc.id]);
  }

  deleteDocument(doc: DocumentModel, event: Event) {
    event.stopPropagation();
    if (confirm(`Delete "${doc.name}"?`)) {
      this.documentApiService.delete(doc.name).subscribe({
        next: () => this.uploadService.removeDocument(doc.id),
        error: () => alert('Failed to delete document.')
      });
    }
  }

  goToUpload() {
    this.router.navigate(['/upload']);
  }

  formatBytes(b: number) {
    return this.compressionService.formatBytes(b);
  }

  getIcon(type: string): string {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('text') || type.includes('csv')) return '📋';
    return '📁';
  }

  trackById(_: number, doc: DocumentModel) {
    return doc.id;
  }
}
