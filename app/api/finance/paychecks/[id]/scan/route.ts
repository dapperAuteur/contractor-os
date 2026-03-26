// app/api/finance/paychecks/[id]/scan/route.ts
// POST: extract paycheck data from an image using Gemini Vision.
// Returns structured data that the user can review and apply.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const GEMINI_MODEL = 'gemini-2.5-flash';

interface PaycheckScanResult {
  gross_pay: number | null;
  net_pay: number | null;
  pay_date: string | null;
  pay_period_start: string | null;
  pay_period_end: string | null;
  employer_name: string | null;
  check_number: string | null;
  taxes: { tax_type: string; label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  earnings: { label: string; hours: number | null; rate: number | null; amount: number }[];
  deposits: { label: string; account_last_four: string | null; amount: number }[];
  confidence_notes: string;
}

const PAYCHECK_PROMPT = `You are extracting data from a paycheck, pay stub, or direct deposit statement.

Extract ALL of the following into valid JSON:

{
  "gross_pay": number or null,
  "net_pay": number or null,
  "pay_date": "YYYY-MM-DD" or null,
  "pay_period_start": "YYYY-MM-DD" or null,
  "pay_period_end": "YYYY-MM-DD" or null,
  "employer_name": string or null,
  "check_number": string or null,
  "taxes": [
    { "tax_type": "federal|state|local|fica_ss|fica_medicare|state_disability|state_unemployment|other", "label": "display name", "amount": number }
  ],
  "deductions": [
    { "label": "description (e.g. H&W, Pension, Union Dues)", "amount": number }
  ],
  "earnings": [
    { "label": "ST|OT|DT|Per Diem|etc", "hours": number or null, "rate": number or null, "amount": number }
  ],
  "deposits": [
    { "label": "Checking|Savings|etc", "account_last_four": "1234" or null, "amount": number }
  ],
  "confidence_notes": "any uncertainties or items you could not read"
}

Rules:
- Extract every tax line individually (Federal, State, FICA SS, FICA Medicare, etc.)
- Extract every deduction line (union dues, H&W, pension, annuity, etc.)
- Extract every earnings line with hours and rate when visible
- Extract deposit splits if the stub shows direct deposit allocations
- All amounts should be positive numbers
- Dates in YYYY-MM-DD format
- Return ONLY valid JSON, no markdown fences`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify paycheck ownership
  const { data: paycheck } = await db
    .from('paychecks')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!paycheck) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get image URL from body
  const { image_url } = await request.json();
  if (!image_url) {
    return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY_WORK_WITUS;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 503 });
  }

  // Call Gemini Vision
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: PAYCHECK_PROMPT },
          { inlineData: undefined, fileData: undefined },
          ...(image_url.startsWith('data:')
            ? [{ inlineData: { mimeType: image_url.split(';')[0].split(':')[1], data: image_url.split(',')[1] } }]
            : [{ fileData: { mimeType: 'image/jpeg', fileUri: image_url } }]
          ),
        ].filter((p) => p.inlineData !== undefined || p.fileData !== undefined || p.text !== undefined),
      }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!geminiRes.ok) {
    return NextResponse.json({ error: `Gemini error: ${geminiRes.status}` }, { status: 502 });
  }

  const geminiJson = await geminiRes.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  let result: PaycheckScanResult;
  try {
    result = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: 'Failed to parse Gemini response', raw: rawText }, { status: 502 });
  }

  return NextResponse.json({ scan: result });
}
