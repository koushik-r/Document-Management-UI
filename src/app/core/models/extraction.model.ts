/**
 * Types mirroring the IDP extraction backend (Azure Functions + Mongo).
 * These match the shapes returned by function_app.py's `/api/idp/...` routes.
 */

export type DocumentStatus = 'uploaded' | 'processing' | 'extracted' | 'failed';

export interface ExtractionDocument {
  _id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  blob_container: string;
  blob_name: string;
  blob_url: string;
  status: DocumentStatus;
  template_id?: string | null;
  extraction_result_id?: string | null;
  overall_confidence?: number | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
  extraction_error?: string;
}

export interface ExtractedField {
  name: string;
  value: unknown;
  confidence: number;
  source_type: string;
  source_pages: number[];
  method: string;
  needs_review: boolean;
}

export interface ExtractionResult {
  method: string;
  template_id: string;
  fields: Record<string, ExtractedField>;
  usage: Usage;
  conflicts: unknown[];
  agreement_rate?: number | null;
  notes: string[];
}

export interface ExtractionResultRecord {
  _id: string;
  document_id: string;
  template_id: string;
  method: string;
  overall_confidence: number;
  result: ExtractionResult;
  created_at: string;
  updated_at: string;
}

export interface FieldSpec {
  name: string;
  description: string;
  type: string;
  prefers_table: boolean;
}

export interface TemplateDefinition {
  template_id: string;
  name: string;
  description: string;
  fields: FieldSpec[];
}

export interface TemplateRecord {
  _id: string;
  template_id: string;
  name: string;
  description: string;
  source: string;
  definition: TemplateDefinition;
  sample_document_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  api_calls: number;
  batch_count: number;
  pages_processed: number;
  elapsed_seconds: number;
}

export interface UsageRecord {
  _id: string;
  document_id: string;
  extraction_result_id?: string | null;
  template_id?: string | null;
  method: string;
  usage: Usage;
  created_at: string;
  updated_at: string;
}

export interface UsageSummary {
  totals: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    api_calls: number;
    runs: number;
  };
  records: UsageRecord[];
}
