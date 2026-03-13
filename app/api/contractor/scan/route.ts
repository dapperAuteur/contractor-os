// app/api/contractor/scan/route.ts
// POST: upload multiple images/PDFs → classify + extract data from each
// Returns array of extraction results with prefill suggestions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { filesToImageParts, classifyDocument, extractDocument } from '@/lib/ocr';
import type {
  PayStubExtraction,
  CallSheetExtraction,
  InvoiceExtraction,
  ExtractionResult,
} from '@/lib/ocr';

const MAX_FILES = 10;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const manualType = formData.get('document_type') as string | null;

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 });
  }

  try {
    const imageParts = await filesToImageParts(files, MAX_FILES);

    // Classify if no manual type provided
    let documentType = manualType;
    let classification = null;
    if (!documentType) {
      classification = await classifyDocument(imageParts);
      documentType = classification.document_type;
    }

    // Extract data using the appropriate extractor
    const result = await extractDocument(documentType as ExtractionResult['type'], imageParts);

    // Build prefill suggestions based on document type
    const prefills = buildPrefills(result);

    return NextResponse.json({
      classification: classification ?? { document_type: documentType, confidence: 1, reasoning: 'Manual selection' },
      extraction: result,
      prefills,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Document scan failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildPrefills(result: ExtractionResult) {
  const prefills: {
    job?: Record<string, unknown>;
    invoice?: Record<string, unknown>;
    time_entry?: Record<string, unknown>;
  } = {};

  if (result.type === 'pay_stub') {
    const d = result.data as PayStubExtraction;
    let pay_rate: number | null = null;
    let ot_rate: number | null = null;
    let dt_rate: number | null = null;
    let st_hours: number | null = null;
    let ot_hours: number | null = null;
    let dt_hours: number | null = null;

    for (const e of d.earnings ?? []) {
      const type = e.type?.toUpperCase();
      if (type === 'ST') { st_hours = e.hours; pay_rate = e.rate; }
      else if (type === 'OT') { ot_hours = e.hours; ot_rate = e.rate; }
      else if (type === 'DT') { dt_hours = e.hours; dt_rate = e.rate; }
    }

    prefills.job = {
      job_number: d.job_number,
      client_name: d.client_name,
      event_name: d.event_name,
      location_name: d.location_name,
      poc_name: d.poc_name,
      crew_coordinator_name: d.crew_coordinator,
      pay_rate, ot_rate, dt_rate,
      est_pay_date: d.est_pay_date,
    };
    prefills.time_entry = {
      work_date: d.work_date,
      time_in: d.time_in,
      time_out: d.time_out,
      total_hours: d.total_hours,
      st_hours, ot_hours, dt_hours,
    };
  }

  if (result.type === 'call_sheet') {
    const d = result.data as CallSheetExtraction;
    prefills.job = {
      job_number: d.job_number,
      client_name: d.client_name,
      event_name: d.event_name,
      location_name: d.location_name,
      poc_name: d.poc_name,
      poc_phone: d.poc_phone,
      crew_coordinator_name: d.crew_coordinator_name,
      crew_coordinator_phone: d.crew_coordinator_phone,
      department: d.department,
      union_local: d.union_local,
      start_date: d.work_dates?.[0] ?? null,
      end_date: d.work_dates?.length ? d.work_dates[d.work_dates.length - 1] : null,
      scheduled_dates: d.work_dates ?? [],
      is_multi_day: (d.work_dates?.length ?? 0) > 1,
      notes: d.notes,
    };
  }

  if (result.type === 'invoice') {
    const d = result.data as InvoiceExtraction;
    prefills.invoice = {
      contact_name: d.vendor,
      invoice_number: d.invoice_number,
      invoice_date: d.date,
      due_date: d.due_date,
      subtotal: d.subtotal,
      tax_amount: d.tax,
      total: d.total,
      notes: d.notes,
      line_items: d.line_items?.map((item, i) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        sort_order: i,
      })) ?? [],
    };
  }

  return prefills;
}
