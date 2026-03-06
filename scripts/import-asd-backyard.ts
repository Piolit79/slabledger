/**
 * import-asd-backyard.ts
 * One-time import of ASD Backyard data from Excel.
 *
 * Usage:
 *   npx tsx scripts/import-asd-backyard.ts
 *
 * Prerequisites:
 *   npm install tsx xlsx @supabase/supabase-js
 *   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!; // service role key for import

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Find the Excel file
const EXCEL_FILE = process.argv[2] || path.join(process.env.USERPROFILE!, 'Desktop', 'TEST - Master ledger.xlsx');

function parseAmount(val: any): number {
  if (!val) return 0;
  const s = String(val).replace(/[$,\s]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  // Excel dates are numbers
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (!s) return null;
  // Try to parse "M/D/YYYY" or "MM/DD/YYYY"
  const parts = s.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

async function run() {
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`Excel file not found: ${EXCEL_FILE}`);
    console.error('Usage: npx tsx scripts/import-asd-backyard.ts "path/to/excel.xlsx"');
    process.exit(1);
  }

  console.log(`Reading: ${EXCEL_FILE}`);
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetNames = workbook.SheetNames;
  console.log('Sheets found:', sheetNames.join(', '));

  // ─── 1. Create ASD Backyard project ────────────────────────────
  console.log('\n→ Creating ASD Backyard project...');
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      name: 'ASD Backyard',
      client_name: 'ASD',
      address: '',
      status: 'active',
      budget_hard_cost: 0,
      budget_fees: 0,
      draw_limit: 2800000, // from DRAW sheet — sum of draws
    })
    .select()
    .single();
  if (projErr) { console.error('Project error:', projErr.message); process.exit(1); }
  console.log('  Created project:', project.id);

  const projectId = project.id;
  const vendorMap: Record<string, string> = {}; // name → id

  // ─── 2. Import Vendors ──────────────────────────────────────────
  const vendorSheet = workbook.Sheets['VENDOR'];
  if (vendorSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(vendorSheet, { defval: '' });
    console.log(`\n→ Importing ${rows.length} vendors...`);

    for (const row of rows) {
      const name = String(row['Name'] || row['name'] || row['VENDOR NAME'] || '').trim();
      if (!name) continue;

      const vendorData = {
        name,
        detail: String(row['Detail'] || row['detail'] || row['DETAIL'] || row['Trade'] || '').trim() || null,
        type: (() => {
          const t = String(row['Type'] || row['type'] || row['TYPE'] || '').trim();
          const valid = ['Subcontractor', 'Vendor', 'Consultant', 'Organization'];
          return valid.includes(t) ? t : 'Subcontractor';
        })() as any,
        contact_name: String(row['Contact'] || row['contact'] || row['CONTACT'] || '').trim() || null,
        email: String(row['Email'] || row['email'] || row['EMAIL'] || '').trim() || null,
        phone: String(row['Phone'] || row['phone'] || row['PHONE'] || '').trim() || null,
      };

      const { data: v, error } = await supabase.from('vendors').insert(vendorData).select().single();
      if (error) {
        console.warn(`  Skipping vendor "${name}": ${error.message}`);
        continue;
      }
      vendorMap[name.toLowerCase()] = v.id;
      process.stdout.write('.');
    }
    console.log(`\n  Imported ${Object.keys(vendorMap).length} vendors`);
  }

  function findVendorId(name: string): string | null {
    if (!name) return null;
    const key = name.toLowerCase().trim();
    return vendorMap[key] || null;
  }

  // ─── 3. Import Contracts ────────────────────────────────────────
  const contractSheet = workbook.Sheets['CONTRACT'];
  if (contractSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(contractSheet, { defval: '' });
    console.log(`\n→ Importing ${rows.length} contract rows...`);
    let count = 0;

    for (const row of rows) {
      const vendorName = String(row['Vendor'] || row['vendor'] || row['SUB'] || row['Sub'] || row['Name'] || '').trim();
      const amount = parseAmount(row['Amount'] || row['amount'] || row['CONTRACT AMOUNT'] || row['VALUE']);
      if (!amount) continue;

      const typeRaw = String(row['Type'] || row['type'] || row['TYPE'] || 'Contract').trim();
      const type = typeRaw === 'Change Order' ? 'Change Order' : typeRaw === 'Credit' ? 'Credit' : 'Contract';

      const { error } = await supabase.from('contracts').insert({
        project_id: projectId,
        vendor_id: findVendorId(vendorName),
        date: parseDate(row['Date'] || row['date'] || row['DATE']),
        amount,
        type,
        notes: String(row['Notes'] || row['notes'] || row['DESCRIPTION'] || '').trim() || null,
      });

      if (error) { console.warn(`  Contract error: ${error.message}`); continue; }
      count++;
      process.stdout.write('.');
    }
    console.log(`\n  Imported ${count} contracts`);
  }

  // ─── 4. Import Payments ─────────────────────────────────────────
  // Category mapping from sheet columns
  const PAY_SHEET = workbook.Sheets['PAY'];
  if (PAY_SHEET) {
    const rows: any[] = XLSX.utils.sheet_to_json(PAY_SHEET, { defval: '' });
    console.log(`\n→ Importing ${rows.length} payment rows...`);
    let count = 0;

    // Detect category from column headers
    const headers = Object.keys(rows[0] || {}).map(h => h.toLowerCase());
    const categoryMap: Record<string, string> = {
      'contracted': 'contracted',
      'contract': 'contracted',
      'materials': 'materials_vendors',
      'materials & vendors': 'materials_vendors',
      'material': 'materials_vendors',
      'fixtures': 'fixtures_fittings',
      'fixtures & fittings': 'fixtures_fittings',
      'soft costs': 'soft_costs',
      'soft cost': 'soft_costs',
      'soft': 'soft_costs',
      'field labor': 'field_labor',
      'labor': 'field_labor',
    };

    for (const row of rows) {
      const vendorName = String(row['Vendor'] || row['vendor'] || row['SUB'] || row['Sub'] || row['Name'] || row['Payee'] || '').trim();
      const amount = parseAmount(row['Amount'] || row['amount'] || row['AMOUNT'] || row['Total'] || row['TOTAL']);
      if (!amount) continue;

      // Determine category
      let category: string = 'contracted';
      const catRaw = String(row['Category'] || row['category'] || row['CATEGORY'] || row['Type'] || '').trim().toLowerCase();
      for (const [key, val] of Object.entries(categoryMap)) {
        if (catRaw.includes(key)) { category = val; break; }
      }

      const formRaw = String(row['Form'] || row['form'] || row['Payment Form'] || row['METHOD'] || 'Check').trim();
      const validForms = ['Check', 'Wire', 'ACH', 'Credit', 'Refund'];
      const form = validForms.find(f => f.toLowerCase() === formRaw.toLowerCase()) || formRaw || 'Check';

      const { error } = await supabase.from('payments').insert({
        project_id: projectId,
        vendor_id: findVendorId(vendorName),
        date: parseDate(row['Date'] || row['date'] || row['DATE']),
        amount,
        form,
        check_number: String(row['Check #'] || row['check_number'] || row['CHECK'] || '').trim() || null,
        category: category as any,
        notes: String(row['Notes'] || row['notes'] || '').trim() || null,
      });

      if (error) { console.warn(`  Payment error: ${error.message}`); continue; }
      count++;
      process.stdout.write('.');
    }
    console.log(`\n  Imported ${count} payments`);
  }

  // ─── 5. Import Draws ────────────────────────────────────────────
  const drawSheet = workbook.Sheets['DRAW'];
  if (drawSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(drawSheet, { defval: '' });
    console.log(`\n→ Importing ${rows.length} draws...`);
    let count = 0;

    for (const row of rows) {
      const amount = parseAmount(row['Amount'] || row['amount'] || row['AMOUNT'] || row['Draw Amount']);
      if (!amount) continue;

      const drawNum = parseInt(String(row['Draw #'] || row['Draw Number'] || row['#'] || count + 1));

      const { error } = await supabase.from('draws').insert({
        project_id: projectId,
        date: parseDate(row['Date'] || row['date'] || row['DATE']),
        draw_number: isNaN(drawNum) ? count + 1 : drawNum,
        amount,
        notes: String(row['Notes'] || row['notes'] || '').trim() || null,
      });

      if (error) { console.warn(`  Draw error: ${error.message}`); continue; }
      count++;
      process.stdout.write('.');
    }
    console.log(`\n  Imported ${count} draws`);
  }

  // ─── 6. Import Budget Items ─────────────────────────────────────
  const budgetSheet = workbook.Sheets['BUDGET'];
  if (budgetSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(budgetSheet, { defval: '' });
    console.log(`\n→ Importing ${rows.length} budget items...`);
    let count = 0;
    let currentSection = 'General';

    for (const row of rows) {
      const name = String(row['Name'] || row['name'] || row['Item'] || row['ITEM'] || row['Description'] || '').trim();
      if (!name) continue;

      // Detect section headers (rows with no amounts)
      const labor = parseAmount(row['Labor'] || row['labor'] || row['LABOR']);
      const material = parseAmount(row['Material'] || row['material'] || row['MATERIAL'] || row['Materials']);
      const total = labor + material;

      // Section detection: rows like "SITE", "EXTERIOR", "INTERIOR" with no amounts
      if (!labor && !material && name === name.toUpperCase() && name.length > 2) {
        currentSection = name;
        continue;
      }

      const section = String(row['Section'] || row['section'] || row['SECTION'] || currentSection).trim();
      const vendorName = String(row['Vendor'] || row['vendor'] || row['Sub'] || '').trim();

      const statusRaw = String(row['Status'] || row['status'] || '').trim().toLowerCase();
      const statusMap: Record<string, string> = {
        'paid': 'paid_complete', 'paid/complete': 'paid_complete', 'complete': 'paid_complete',
        'contract': 'contracted', 'contracted': 'contracted',
        'proposed': 'proposed',
        'estimated': 'estimated', 'estimate': 'estimated',
      };
      const status = statusMap[statusRaw] || 'estimated';

      const { error } = await supabase.from('budget_items').insert({
        project_id: projectId,
        section: section || null,
        name,
        labor_amount: labor || null,
        material_amount: material || null,
        optional_amount: parseAmount(row['Optional'] || row['optional']) || null,
        vendor_id: findVendorId(vendorName),
        notes: String(row['Notes'] || row['notes'] || '').trim() || null,
        status: status as any,
      });

      if (error) { console.warn(`  Budget item error: ${error.message}`); continue; }
      count++;
      process.stdout.write('.');
    }
    console.log(`\n  Imported ${count} budget items`);
  }

  console.log('\n✓ Import complete!');
  console.log(`  Project ID: ${projectId}`);
  console.log('\nNext steps:');
  console.log('  1. Verify totals match Excel dashboard');
  console.log('  2. Go to /settings to create other projects');
  console.log('  3. Run the app: npm run dev');
}

run().catch(console.error);
