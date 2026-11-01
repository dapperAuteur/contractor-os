import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface UncategorizedItem {
  id: string;
  display_name: string;
  date: string;
  entity_type: string;
}

interface ModuleGroup {
  label: string;
  count: number;
  items: UncategorizedItem[];
}

// Work.WitUS records only. CentenarianOS modules (tasks, workouts, focus, recipes) and travel
// (trips, routes, fuel, maintenance) were removed in plan 18 Phase 1.
const MODULE_CONFIG: Record<string, { table: string; label: string; fields: string; dateFn: (row: Record<string, unknown>) => string; nameFn: (row: Record<string, unknown>) => string }> = {
  transaction: {
    table: 'financial_transactions',
    label: 'Finance',
    fields: 'id, vendor, description, amount, type, transaction_date',
    dateFn: (r) => r.transaction_date as string,
    nameFn: (r) => {
      const sign = r.type === 'expense' ? '-' : '+';
      return `${r.vendor || r.description || 'Transaction'} ${sign}$${Number(r.amount).toFixed(2)}`;
    },
  },
  equipment: {
    table: 'equipment',
    label: 'Equipment',
    fields: 'id, name, created_at',
    dateFn: (r) => r.created_at ? new Date(r.created_at as string).toISOString().split('T')[0] : '',
    nameFn: (r) => (r.name as string) || 'Equipment',
  },
  invoice: {
    table: 'invoices',
    label: 'Invoices',
    fields: 'id, contact_name, total, invoice_date',
    dateFn: (r) => r.invoice_date as string,
    nameFn: (r) => r.contact_name ? `Invoice: ${r.contact_name}` : 'Invoice',
  },
};

// Date field name per table for .gte() filtering
const DATE_COLUMN: Record<string, string> = {
  financial_transactions: 'transaction_date',
  equipment: 'created_at',
  invoices: 'invoice_date',
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const period = parseInt(request.nextUrl.searchParams.get('period') || '30', 10);
  const since = new Date();
  since.setDate(since.getDate() - period);
  const sinceStr = since.toISOString();

  const db = getDb();

  // 1. Get all tagged entity IDs
  const { data: tagged } = await db
    .from('entity_life_categories')
    .select('entity_type, entity_id')
    .eq('user_id', user.id);

  const taggedSet = new Set((tagged || []).map((t) => `${t.entity_type}:${t.entity_id}`));

  // 2. Query each module in parallel
  const entries = Object.entries(MODULE_CONFIG);
  const results = await Promise.all(
    entries.map(async ([entityType, config]) => {
      const dateCol = DATE_COLUMN[config.table];
      let query = db
        .from(config.table)
        .select(config.fields)
        .eq('user_id', user.id)
        .order(dateCol, { ascending: false })
        .limit(50);

      if (dateCol) {
        query = query.gte(dateCol, sinceStr);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await query as { data: any[] | null };
      if (!rows) return { entityType, items: [], count: 0 };

      const uncategorized = rows
        .filter((row) => !taggedSet.has(`${entityType}:${row.id}`))
        .map((row) => ({
          id: row.id as string,
          display_name: config.nameFn(row as Record<string, unknown>),
          date: config.dateFn(row as Record<string, unknown>),
          entity_type: entityType,
        }));

      return {
        entityType,
        items: uncategorized.slice(0, 15),
        count: uncategorized.length,
      };
    }),
  );

  // 3. Build response grouped by module
  const uncategorized: Record<string, ModuleGroup> = {};
  let totalUncategorized = 0;

  for (const result of results) {
    if (result.count > 0) {
      const config = MODULE_CONFIG[result.entityType];
      uncategorized[result.entityType] = {
        label: config.label,
        count: result.count,
        items: result.items,
      };
      totalUncategorized += result.count;
    }
  }

  return NextResponse.json({ uncategorized, total_uncategorized: totalUncategorized });
}
