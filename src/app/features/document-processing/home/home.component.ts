import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Feature {
  title: string;
  description: string;
  icon: string;
  route: string;
}

/**
 * IDP landing page. Reached via the "IDP" button on the default (upload) page.
 * Surfaces the four IDP features as navigable cards.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  features: Feature[] = [
    {
      title: 'Template',
      description: 'Upload a sample document to infer and store a reusable extraction template.',
      icon: '🧩',
      route: '/idp/templates'
    },
    {
      title: 'Document Upload',
      description: 'Send a document to the extraction backend to store it and run extraction.',
      icon: '📤',
      route: '/idp/upload'
    },
    {
      title: 'Extraction Result & Confidence',
      description: 'Review extracted fields with per-field confidence scores and token usage.',
      icon: '🎯',
      route: '/idp/results'
    },
    {
      title: 'Document Preview',
      description: 'Preview stored documents alongside their extracted data.',
      icon: '👁️',
      route: '/idp/preview'
    }
  ];
}
