import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers, rows) {
  const headerLine = headers.join(',');
  const rowLines = rows.map(row => headers.map(h => escapeCSV(row[h])).join(','));
  return [headerLine, ...rowLines].join('\n');
}

// Formatters for messy real-world variations
function formatPaymentAmount(amt, idx) {
  const mod = idx % 4;
  if (mod === 0) return `₹${amt.toLocaleString('en-IN')}.00`;
  if (mod === 1) return `${amt.toFixed(2)}`;
  if (mod === 2) return `₹ ${amt.toLocaleString('en-IN')}`;
  return `INR ${amt}`;
}

function formatBankAmount(amt, idx) {
  const mod = idx % 4;
  if (mod === 0) return `${amt.toLocaleString('en-IN')}.00`;
  if (mod === 1) return `${amt.toFixed(2)}`;
  if (mod === 2) return `₹${amt.toLocaleString('en-IN')}`;
  return `${amt}`;
}

function formatOrderAmount(amt, idx) {
  const mod = idx % 4;
  if (mod === 0) return `INR ${amt.toLocaleString('en-IN')}`;
  if (mod === 1) return `INR ${amt.toFixed(2)}`;
  if (mod === 2) return `${amt.toFixed(2)}`;
  return `₹${amt}`;
}

const CUSTOMERS = [
  'Arjun Nair', 'Kavita Menon', 'Siddharth Roy', 'Divya Chawla', 'Manish Bansal',
  'Sunita Rao', 'Harsh Vardhan', 'Shreya Sen', 'Deepak Tiwari', 'Bhavna Kulkarni',
  'Gaurav Chopra', 'Meera Deshmukh', 'Kunal Kapoor', 'Pooja Bhatt', 'Alok Pandey',
  'Swati Singhal', 'Tarun Jain', 'Nandini Das', 'Vivek Mathur', 'Ankit Saxena'
];

function generateBatch2() {
  const targetDir = path.join(__dirname, 'batch_2_q3_retail');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const paymentRows = [];
  const bankRows = [];
  const orderRows = [];
  const groundTruthRecords = [];

  const total = 50;

  for (let i = 1; i <= total; i++) {
    const txnRef = `TXN${2000 + i}`;
    const orderId = `ORD-30${String(i).padStart(3, '0')}`;
    const customer = CUSTOMERS[(i - 1) % CUSTOMERS.length];

    // Priority tiers based on amount
    let baseAmount;
    if (i % 8 === 0) {
      baseAmount = 55000; // Critical (>= 50,000)
    } else if (i % 3 === 0) {
      baseAmount = 14500 + (i * 250); // High (10,000 - 50,000)
    } else if (i % 2 === 0) {
      baseAmount = 2400 + (i * 120); // Medium (1,000 - 10,000)
    } else {
      baseAmount = 450 + (i * 10); // Low (< 1,000)
    }

    const baseHour = 10 + Math.floor(i / 10);
    const baseMin = (i * 7) % 60;
    const baseTimeStr = `2026-10-15 ${String(baseHour).padStart(2, '0')}:${String(baseMin).padStart(2, '0')}:00`;
    const paymentTimeStr = `2026-10-15 ${String(baseHour).padStart(2, '0')}:${String((baseMin + 3) % 60).padStart(2, '0')}:00`;
    const bankTimeStr = `2026-10-15 ${String(baseHour + 1).padStart(2, '0')}:${String((baseMin + 18) % 60).padStart(2, '0')}:00`;

    // Case assignment:
    // 1 to 36: Matched
    // 37 to 41: Amount mismatch
    // 42 to 44: Missing settlement
    // 45 to 46: Unknown credit
    // 47 to 48: Settlement delay
    // 49 to 50: Duplicate
    let category = 'matched';
    let expectedStatus = 'matched';
    let pAmt = baseAmount;
    let bAmt = baseAmount;
    let oAmt = baseAmount;
    let inPayment = true;
    let inBank = true;
    let inOrders = true;
    let actualBankTime = bankTimeStr;
    let note = 'All 3 sources match within SLA.';

    if (i >= 37 && i <= 41) {
      category = 'mismatch';
      expectedStatus = 'amount_mismatch';
      // Mismatch amounts
      const diff = 250 * (i - 36);
      pAmt = baseAmount;
      bAmt = baseAmount;
      oAmt = baseAmount + diff; // e.g. promo discount discrepancy
      note = `Order amount is ₹${diff} higher due to unapplied merchant discount.`;
    } else if (i >= 42 && i <= 44) {
      category = 'missing_settlement';
      expectedStatus = 'missing_settlement';
      inBank = false;
      bAmt = null;
      note = 'Payment and order captured, but bank settlement credit is missing.';
    } else if (i >= 45 && i <= 46) {
      category = 'unknown_credit';
      expectedStatus = 'unknown_credit';
      inPayment = false;
      inOrders = false;
      pAmt = null;
      oAmt = null;
      note = 'Direct bank deposit without corresponding payment gateway or order cart record.';
    } else if (i >= 47 && i <= 48) {
      category = 'delay';
      expectedStatus = 'settlement_delay';
      // Delay > 3 hours
      actualBankTime = `2026-10-15 ${String(baseHour + 4).padStart(2, '0')}:${String((baseMin + 30) % 60).padStart(2, '0')}:00`;
      note = 'Amounts match but bank settlement was delayed beyond the 2-hour SLA window.';
    } else if (i >= 49 && i <= 50) {
      category = 'duplicate';
      expectedStatus = 'duplicate';
      note = 'Duplicate transaction reference detected across sources.';
    }

    // Add to Payment Gateway
    if (inPayment) {
      paymentRows.push({
        transaction_id: txnRef,
        amount: formatPaymentAmount(pAmt, i),
        currency: 'INR',
        status: 'SUCCESS',
        payment_time: paymentTimeStr,
        payment_method: ['UPI', 'NetBanking', 'Credit Card', 'Debit Card'][i % 4],
        gateway_fee: (pAmt * 0.02).toFixed(2),
      });

      // If duplicate, push an extra row
      if (category === 'duplicate') {
        paymentRows.push({
          transaction_id: txnRef,
          amount: formatPaymentAmount(pAmt, i),
          currency: 'INR',
          status: 'SUCCESS',
          payment_time: paymentTimeStr,
          payment_method: 'UPI',
          gateway_fee: (pAmt * 0.02).toFixed(2),
        });
      }
    }

    // Add to Bank Statement
    if (inBank) {
      bankRows.push({
        bank_ref: txnRef,
        description: `UPI/CR/${txnRef}/SETTLEMENT`,
        credit_amount: formatBankAmount(bAmt, i),
        value_date: actualBankTime,
        status: 'CREDITED',
      });
    }

    // Add to Orders Database
    if (inOrders) {
      orderRows.push({
        order_id: orderId,
        txn_ref: txnRef,
        order_amount: formatOrderAmount(oAmt, i),
        order_date: baseTimeStr,
        customer_name: customer,
        order_status: 'COMPLETED',
      });
    }

    // Priority tier
    const evalAmount = Math.max(pAmt || 0, bAmt || 0, oAmt || 0);
    let priority = 'low';
    if (evalAmount >= 50000) priority = 'critical';
    else if (evalAmount >= 10000) priority = 'high';
    else if (evalAmount >= 1000) priority = 'medium';

    groundTruthRecords.push({
      txnRef,
      orderId,
      customer,
      expectedStatus,
      category,
      priority,
      baseAmount,
      paymentAmount: pAmt,
      bankAmount: bAmt,
      orderAmount: oAmt,
      inPaymentGateway: inPayment,
      inBankStatement: inBank,
      inOrders,
      explanation: note,
    });
  }

  // Write CSVs
  const paymentCSV = toCSV(
    ['transaction_id', 'amount', 'currency', 'status', 'payment_time', 'payment_method', 'gateway_fee'],
    paymentRows
  );
  fs.writeFileSync(path.join(targetDir, 'payment_gateway.csv'), paymentCSV, 'utf-8');

  const bankCSV = toCSV(
    ['bank_ref', 'description', 'credit_amount', 'value_date', 'status'],
    bankRows
  );
  fs.writeFileSync(path.join(targetDir, 'bank_statement.csv'), bankCSV, 'utf-8');

  const orderCSV = toCSV(
    ['order_id', 'txn_ref', 'order_amount', 'order_date', 'customer_name', 'order_status'],
    orderRows
  );
  fs.writeFileSync(path.join(targetDir, 'orders.csv'), orderCSV, 'utf-8');

  // Write Ground Truth JSON for documentation and evaluation
  const groundTruthData = {
    dataset: 'batch_2_q3_retail',
    totalRecords: total,
    distribution: {
      matched: 36,
      amount_mismatch: 5,
      missing_settlement: 3,
      unknown_credit: 2,
      settlement_delay: 2,
      duplicate: 2,
    },
    records: groundTruthRecords,
  };
  fs.writeFileSync(
    path.join(targetDir, 'ground_truth.json'),
    JSON.stringify(groundTruthData, null, 2),
    'utf-8'
  );

  console.log(`✓ Successfully generated Batch 2 dataset in ${targetDir}`);
  console.log(`  - payment_gateway.csv: ${paymentRows.length} rows`);
  console.log(`  - bank_statement.csv:  ${bankRows.length} rows`);
  console.log(`  - orders.csv:          ${orderRows.length} rows`);
}

generateBatch2();
