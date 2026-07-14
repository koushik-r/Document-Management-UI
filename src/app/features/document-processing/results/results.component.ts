import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ExtractionApiService } from '../../../core/services/extraction-api.service';
import { ExtractionDocument, UsageSummary } from '../../../core/models/extraction.model';
import { PreviewModalComponent } from '../preview-modal/preview-modal.component';

/**
 * Serves two IDP features from one list, driven by route data `mode`:
 *  - 'results' → "Extraction result & confidence" (modal opens split view)
 *  - 'preview' → "Document preview" (modal opens document view)
 *
 * Lists documents stored in Mongo (blob-backed) with status, confidence and a
 * token-usage summary, and opens the full-screen review modal.
 */
@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterLink, PreviewModalComponent],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit {
  private api = inject(ExtractionApiService);
  private route = inject(ActivatedRoute);

  mode = signal<'results' | 'preview'>('results');
  documents = signal<ExtractionDocument[]>([]);
  loading = signal(false);
  error = signal('');
  usage = signal<UsageSummary | null>(null);

  selected = signal<ExtractionDocument | null>(null);

  modalLayout = computed<'split' | 'doc'>(() => (this.mode() === 'preview' ? 'doc' : 'split'));

  heading = computed(() =>
    this.mode() === 'preview' ? 'Document Preview' : 'Extraction Results & Confidence'
  );

  ngOnInit() {
    this.mode.set((this.route.snapshot.data['mode'] as 'results' | 'preview') ?? 'results');
    this.load();
    if (this.mode() === 'results') {
      this.api.getUsage().subscribe({ next: u => this.usage.set(u), error: () => {} });
    }
  }

  load() {
    this.loading.set(true);
    this.api.listDocuments().subscribe({
      next: docs => { this.documents.set(docs); this.loading.set(false); },
      error: () => { this.error.set('Failed to load documents. Is the extraction backend running?'); this.loading.set(false); }
    });
  }

  open(doc: ExtractionDocument) { this.selected.set(doc); }
  close() { this.selected.set(null); }

  deleteDoc(doc: ExtractionDocument, e: Event) {
    e.stopPropagation();
    if (!confirm(`Delete "${doc.original_filename}"?`)) return;
    this.api.deleteDocument(doc._id).subscribe({
      next: () => this.documents.update(prev => prev.filter(d => d._id !== doc._id)),
      error: () => alert('Failed to delete document.')
    });
  }

  confidencePct(doc: ExtractionDocument): string {
    return doc.overall_confidence == null ? '—' : `${Math.round(doc.overall_confidence * 100)}%`;
  }

  confidenceClass(doc: ExtractionDocument): string {
    const c = doc.overall_confidence;
    if (c == null) return '';
    if (c >= 0.85) return 'conf-high';
    if (c >= 0.6) return 'conf-med';
    return 'conf-low';
  }

  icon(type: string): string {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    return '📁';
  }
}
