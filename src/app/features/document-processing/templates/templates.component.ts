import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ExtractionApiService } from '../../../core/services/extraction-api.service';
import { TemplateRecord } from '../../../core/models/extraction.model';

/**
 * IDP "Template" feature — upload a sample document to infer and store a
 * reusable extraction template, and browse templates already stored in Mongo.
 */
@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './templates.component.html',
  styleUrls: ['./templates.component.scss']
})
export class TemplatesComponent implements OnInit {
  private api = inject(ExtractionApiService);

  templates = signal<TemplateRecord[]>([]);
  loading = signal(false);
  error = signal('');

  selectedFile = signal<File | null>(null);
  templateName = signal('');
  useLlm = signal(true);
  uploading = signal(false);
  expanded = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.listTemplates().subscribe({
      next: t => { this.templates.set(t); this.loading.set(false); },
      error: () => { this.error.set('Failed to load templates. Is the extraction backend running?'); this.loading.set(false); }
    });
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    if (file && !this.templateName()) {
      this.templateName.set(file.name.replace(/\.[^.]+$/, ''));
    }
  }

  createTemplate() {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.error.set('');
    this.api.uploadTemplate(file, this.templateName() || undefined, this.useLlm()).subscribe({
      next: rec => {
        this.uploading.set(false);
        this.selectedFile.set(null);
        this.templateName.set('');
        this.templates.update(prev => [rec, ...prev.filter(p => p.template_id !== rec.template_id)]);
      },
      error: err => {
        this.uploading.set(false);
        this.error.set(err?.error?.error ?? 'Template inference failed.');
      }
    });
  }

  deleteTemplate(t: TemplateRecord, e: Event) {
    e.stopPropagation();
    if (!confirm(`Delete template "${t.name}"?`)) return;
    this.api.deleteTemplate(t.template_id).subscribe({
      next: () => this.templates.update(prev => prev.filter(p => p.template_id !== t.template_id)),
      error: () => alert('Failed to delete template.')
    });
  }

  toggle(id: string) {
    this.expanded.update(cur => (cur === id ? null : id));
  }
}
