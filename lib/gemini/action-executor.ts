// lib/gemini/action-executor.ts
// Processes parsed action blocks from AI responses and executes them.

import { SupabaseClient } from '@supabase/supabase-js';
import { GemAction, ActionType } from './gemini-parser';

export interface ActionResult {
  type: ActionType;
  success: boolean;
  message: string;
  entityId?: string;
}

export async function executeActions(
  db: SupabaseClient,
  userId: string,
  sessionId: string | null,
  gemPersonaId: string,
  actions: GemAction[],
  fileData?: { name: string; headers?: string[]; rows?: Record<string, string>[] }[],
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    let result: ActionResult;
    try {
      result = await executeSingleAction(db, userId, action, fileData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result = { type: action.type, success: false, message: msg };
    }

    results.push(result);

    // Audit log
    await db
      .from('gem_action_log')
      .insert({
        user_id: userId,
        session_id: sessionId,
        gem_persona_id: gemPersonaId,
        action_type: action.type,
        action_payload: action.data,
        result_status: result.success ? 'success' : 'error',
        result_data: result.success ? { entityId: result.entityId } : null,
        error_message: result.success ? null : result.message,
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log gem action:', error);
      });
  }

  return results;
}

async function executeSingleAction(
  db: SupabaseClient,
  userId: string,
  action: GemAction,
  fileData?: { name: string; headers?: string[]; rows?: Record<string, string>[] }[],
): Promise<ActionResult> {
  switch (action.type) {
    case 'CREATE_TRANSACTION':
      return createTransaction(db, userId, action.data);
    case 'IMPORT_TRANSACTIONS':
      return importTransactions(db, userId, action.data, fileData);
    default:
      return { type: action.type, success: false, message: `Unknown action type: ${action.type}` };
  }
}

// ── Action handlers ────────────────────────────────────────────────

async function createTransaction(
  db: SupabaseClient,
  userId: string,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  const amount = data.amount as number;
  const type = data.type as string;
  if (!amount || !type) {
    return { type: 'CREATE_TRANSACTION', success: false, message: 'Missing amount or type' };
  }

  const { data: tx, error } = await db
    .from('financial_transactions')
    .insert({
      user_id: userId,
      amount,
      type,
      transaction_date: (data.transaction_date as string) || new Date().toISOString().split('T')[0],
      vendor: (data.vendor as string) || null,
      notes: (data.notes as string) || null,
      category_id: (data.category_id as string) || null,
      tags: (data.tags as string[]) || [],
    })
    .select('id')
    .single();

  if (error || !tx) {
    return { type: 'CREATE_TRANSACTION', success: false, message: error?.message || 'Insert failed' };
  }

  return {
    type: 'CREATE_TRANSACTION',
    success: true,
    message: `${type === 'expense' ? 'Expense' : 'Income'} of $${amount.toFixed(2)} recorded`,
    entityId: tx.id,
  };
}

async function importTransactions(
  db: SupabaseClient,
  userId: string,
  data: Record<string, unknown>,
  fileData?: { name: string; headers?: string[]; rows?: Record<string, string>[] }[],
): Promise<ActionResult> {
  const sourceFile = data.source_file as string;
  const columnMapping = data.column_mapping as Record<string, string> | undefined;
  const defaults = (data.defaults as Record<string, string>) || {};

  if (!sourceFile || !columnMapping) {
    return { type: 'IMPORT_TRANSACTIONS', success: false, message: 'Missing source_file or column_mapping' };
  }

  // Find the file data by name
  const file = fileData?.find(f => f.name === sourceFile);
  if (!file?.rows?.length) {
    return { type: 'IMPORT_TRANSACTIONS', success: false, message: `No parsed data found for "${sourceFile}"` };
  }

  // Fetch existing budget categories for name matching
  const { data: categories } = await db
    .from('budget_categories')
    .select('id, name')
    .eq('user_id', userId);

  const catMap = new Map<string, string>();
  for (const c of categories || []) {
    catMap.set(c.name.toLowerCase(), c.id);
  }

  const payloads: Record<string, unknown>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < file.rows.length; i++) {
    const row = file.rows[i];

    // Map columns using the AI-provided mapping
    const dateCol = columnMapping.transaction_date;
    const amountCol = columnMapping.amount;
    const typeCol = columnMapping.type;
    const vendorCol = columnMapping.vendor;
    const descCol = columnMapping.description;
    const categoryCol = columnMapping.category_name;
    const notesCol = columnMapping.notes;

    // Extract values from CSV row using mapped column names
    let dateVal = dateCol ? row[dateCol]?.trim() : undefined;
    const amountVal = amountCol ? row[amountCol]?.trim() : undefined;
    const typeVal = typeCol ? row[typeCol]?.trim() : defaults.type;
    const vendorVal = vendorCol ? row[vendorCol]?.trim() : undefined;
    const descVal = descCol ? row[descCol]?.trim() : undefined;
    const categoryVal = categoryCol ? row[categoryCol]?.trim() : undefined;
    const notesVal = notesCol ? row[notesCol]?.trim() : undefined;

    // Validate and normalize date
    if (!dateVal) {
      errors.push(`Row ${i + 1}: missing date`);
      continue;
    }
    // Handle MM/DD/YYYY format
    const mdyMatch = dateVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      dateVal = `${mdyMatch[3]}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      errors.push(`Row ${i + 1}: invalid date "${dateVal}"`);
      continue;
    }

    // Validate amount
    const rawAmount = amountVal ? parseFloat(amountVal.replace(/[,$]/g, '')) : NaN;
    if (isNaN(rawAmount) || rawAmount === 0) {
      errors.push(`Row ${i + 1}: invalid amount "${amountVal}"`);
      continue;
    }

    // Determine type from amount sign or mapping or default
    let txType: string;
    if (typeVal) {
      txType = typeVal.toLowerCase().includes('income') ? 'income' : 'expense';
    } else {
      txType = rawAmount < 0 ? 'expense' : 'income';
    }

    // Resolve category by name
    const categoryId = categoryVal ? catMap.get(categoryVal.toLowerCase()) || null : null;

    payloads.push({
      user_id: userId,
      transaction_date: dateVal,
      amount: Math.abs(rawAmount),
      type: txType,
      description: descVal || null,
      vendor: vendorVal || null,
      category_id: categoryId,
      notes: notesVal || null,
      source: 'csv_import',
    });
  }

  if (payloads.length === 0) {
    return {
      type: 'IMPORT_TRANSACTIONS',
      success: false,
      message: `No valid rows to import. ${errors.length} errors: ${errors.slice(0, 3).join('; ')}`,
    };
  }

  // Bulk insert (Supabase supports up to ~1000 rows per insert)
  const BATCH_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { data: inserted, error } = await db
      .from('financial_transactions')
      .insert(batch)
      .select('id');

    if (error) {
      return {
        type: 'IMPORT_TRANSACTIONS',
        success: false,
        message: `Import failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}. ${totalInserted} rows imported before failure.`,
      };
    }
    totalInserted += inserted?.length || 0;
  }

  const skipped = file.rows.length - payloads.length;
  return {
    type: 'IMPORT_TRANSACTIONS',
    success: true,
    message: `Imported ${totalInserted} transactions from "${sourceFile}"${skipped > 0 ? ` (${skipped} rows skipped)` : ''}`,
  };
}
