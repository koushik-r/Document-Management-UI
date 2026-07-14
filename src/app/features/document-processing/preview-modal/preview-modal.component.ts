import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ExtractionApiService } from '../../../core/services/extraction-api.service';
import {
  ExtractedField,
  ExtractionResultRecord,
  ExtractionDocument
} from '../../../core/models/extraction.model';

type PreviewLayout = 'split' | 'doc' | 'fields';

interface FieldRow {
  name: string;
  value: string;
  confidence: number;
  sourcePages: number[];
  needsReview: boolean;
}

/**
 * Full-screen document review modal, used for both "Extraction result &
 * confidence" and "Document preview". Adapted from the reference command-center
 * modal into this project's SCSS idiom: a document view alongside the extracted
 * fields with per-field confidence scores, plus a small layout switcher.
 */
@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview-modal.component.html',
  styleUrls: ['./preview-modal.component.scss']
})
export class PreviewModalComponent {
  private api = inject(ExtractionApiService);
  private sanitizer = inject(DomSanitizer);

  /** The document to review. When set, the modal opens. */
  document = input<ExtractionDocument | null>(null);
  /** Which side to emphasise by default. */
  initialLayout = input<PreviewLayout>('split');

  closed = output<void>();

  isOpen = computed(() => this.document() !== null);
  activeLayout = signal<PreviewLayout>('split');

  extraction = signal<ExtractionResultRecord | null>(null);
  loadingExtraction = signal(false);
  extractionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const doc = this.document();
      this.activeLayout.set(this.initialLayout());
      this.extraction.set(null);
      this.extractionError.set(null);
      if (doc) {
        this.loadExtraction(doc);
      }
    });
  }

  private loadExtraction(doc: ExtractionDocument) {
    if (doc.status !== 'extracted') {
      return;
    }
    this.loadingExtraction.set(true);
    this.api.getExtraction(doc._id).subscribe({
      next: rec => {
        this.extraction.set(rec);
        this.loadingExtraction.set(false);
      },
      error: () => {
        this.extractionError.set('No extraction result available for this document.');
        this.loadingExtraction.set(false);
      }
    });
  }

  blobUrl = computed<SafeResourceUrl | null>(() => {
    const doc = this.document();
    if (!doc) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.api.blobUrl(doc._id));
  });

  rawBlobUrl = computed(() => {
    const doc = this.document();
    return doc ? this.api.blobUrl(doc._id) : '';
  });

  isImage = computed(() => (this.document()?.content_type ?? '').startsWith('image/'));
  isPdf = computed(() => (this.document()?.content_type ?? '') === 'application/pdf');

  fieldRows = computed<FieldRow[]>(() => {
    const rec = this.extraction();
    if (!rec) return [];
    return Object.values(rec.result.fields).map(f => this.toRow(f));
  });

  private toRow(f: ExtractedField): FieldRow {
    let value = '—';
    if (f.value !== null && f.value !== undefined && f.value !== '') {
      value = typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value);
    }
    return {
      name: f.name,
      value,
      confidence: f.confidence,
      sourcePages: f.source_pages ?? [],
      needsReview: f.needs_review
    };
  }

  overallConfidence = computed(() => this.extraction()?.overall_confidence ?? null);

  setLayout(layout: PreviewLayout) {
    this.activeLayout.set(layout);
  }

  handleClose() {
    this.closed.emit();
  }

  fieldLabel(name: string): string {
    return name.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  confidenceClass(conf: number): string {
    if (conf >= 0.85) return 'conf-high';
    if (conf >= 0.6) return 'conf-med';
    return 'conf-low';
  }

  formatConfidence(conf: number): string {
    return `${Math.round((conf ?? 0) * 100)}%`;
  }
}
