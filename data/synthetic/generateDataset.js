import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Escape values for RFC 4180 CSV compliance
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

// Pseudo-random helper with seed for reproducible datasets
let seed = 42;
function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function getRandomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

// Generates realistic INR amount between ₹300 and ₹50,000
function getRealisticAmount(index) {
  // Balanced mix across Priority tiers:
  // Critical (>= 50,000), High (10,000-50,000), Medium (1,000-10,000), Low (< 1,000)
  const tier = index % 10;
  if (tier === 0) {
    // Critical (at or around 50k)
    return 50000;
  } else if (tier <= 3) {
    // High tier (₹10,000 - ₹48,000)
    const base = getRandomInt(10, 48) * 1000;
    const add = [0, 250, 499, 990, 750][getRandomInt(0, 4)];
    return base + add;
  } else if (tier <= 7) {
    // Medium tier (₹1,000 - ₹9,500)
    const base = getRandomInt(1, 9) * 1000;
    const add = [0, 150, 299, 499, 750, 990][getRandomInt(0, 5)];
    return base + add;
  } else {
    // Low tier (₹300 - ₹999)
    return [300, 399, 450, 499, 599, 650, 799, 850, 950][getRandomInt(0, 8)];
  }
}

function getPriority(amount) {
  if (amount >= 50000) return 'critical';
  if (amount >= 10000) return 'high';
  if (amount >= 1000) return 'medium';
  return 'low';
}

// Formatters to simulate messy real-world formats across 3 different systems:
// 1. Payment Gateway: e.g. "₹1,250.00", "1250.00", "₹ 1,250"
function formatGatewayAmount(amt, idx) {
  const variant = idx % 3;
  if (variant === 0) return `₹${amt.toLocaleString('en-IN')}.00`;
  if (variant === 1) return amt.toFixed(2);
  return `₹ ${amt.toLocaleString('en-IN')}`;
}

// 2. Bank Statement: e.g. "1,250.00", "1250.00", "₹1,250"
function formatBankAmount(amt, idx) {
  const variant = idx % 3;
  if (variant === 0) return amt.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  if (variant === 1) return amt.toFixed(2);
  return `₹${amt.toLocaleString('en-IN')}`;
}

// 3. Orders: e.g. "INR 1,250", "INR 1250.00", "1250.00", "₹1,250"
function formatOrderAmount(amt, idx) {
  const variant = idx % 4;
  if (variant === 0) return `INR ${amt.toLocaleString('en-IN')}`;
  if (variant === 1) return `INR ${amt.toFixed(2)}`;
  if (variant === 2) return amt.toFixed(2);
  return `₹${amt}`;
}

// Date formatters:
// Base date: 2026-09-04
function pad(n) {
  return n < 10 ? '0' + n : n;
}

function formatDateISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatGatewayDate(d, idx) {
  const variant = idx % 3;
  if (variant === 0) return formatDateISO(d);
  if (variant === 1) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}Z`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatBankDate(d, idx) {
  const variant = idx % 3;
  if (variant === 0) return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  if (variant === 1) return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatOrderDate(d, idx) {
  const variant = idx % 3;
  if (variant === 0) return formatDateISO(d);
  if (variant === 1) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CUSTOMERS = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Mehta', 'Sneha Reddy', 'Aditya Verma',
  'Ananya Iyer', 'Vikram Singh', 'Neha Gupta', 'Kabir Joshi', 'Divya Nair',
  'Siddharth Rao', 'Ishaan Malhotra', 'Kavya Choudhury', 'Harsh Trivedi', 'Pooja Agarwal'
];

const METHODS = ['UPI', 'NetBanking', 'Credit Card', 'Debit Card'];

export function generateSyntheticDataset() {
  // Total 100 transactions with deliberate distribution:
  // - 70 perfect matches (57 train, 13 eval)
  // - 10 amount mismatches (8 train, 2 eval)
  // - 5 missing bank entries (4 train, 1 eval)
  // - 5 missing payment entries (4 train, 1 eval)
  // - 4 settlement delays (3 train, 1 eval)
  // - 3 duplicate transactions (2 train, 1 eval)
  // - 3 unknown credits (2 train, 1 eval)
  //
  // Train: 57 + 8 + 4 + 4 + 3 + 2 + 2 = 80 records (TXN1001 - TXN1080)
  // Eval:  13 + 2 + 1 + 1 + 1 + 1 + 1 = 20 records (TXN1081 - TXN1100)

  const specGroups = [
    { type: 'matched', trainCount: 57, evalCount: 13 },
    { type: 'mismatch', trainCount: 8, evalCount: 2 },
    { type: 'missing_settlement', trainCount: 4, evalCount: 1 },
    { type: 'missing_payment', trainCount: 4, evalCount: 1 },
    { type: 'delay', trainCount: 3, evalCount: 1 },
    { type: 'duplicate', trainCount: 2, evalCount: 1 },
    { type: 'unknown_credit', trainCount: 2, evalCount: 1 },
  ];

  const trainSpecs = [];
  const evalSpecs = [];

  let nextId = 1001;

  // Build train specs
  for (const group of specGroups) {
    for (let i = 0; i < group.trainCount; i++) {
      trainSpecs.push({
        txnRef: `TXN${nextId++}`,
        category: group.type,
      });
    }
  }

  // Build eval specs
  for (const group of specGroups) {
    for (let i = 0; i < group.evalCount; i++) {
      evalSpecs.push({
        txnRef: `TXN${nextId++}`,
        category: group.type,
      });
    }
  }

  function processSet(specs, setName) {
    const gatewayRows = [];
    const bankRows = [];
    const orderRows = [];
    const groundTruth = [];

    const baseTimestamp = new Date('2026-09-04T08:00:00.000Z').getTime();

    specs.forEach((item, index) => {
      const { txnRef, category } = item;
      const baseAmount = getRealisticAmount(index + (setName === 'held_out_eval_set' ? 80 : 0));
      const priority = getPriority(baseAmount);
      const customer = CUSTOMERS[index % CUSTOMERS.length];
      const method = METHODS[index % METHODS.length];

      // Base time step spaced out across the business day
      const orderTimeMs = baseTimestamp + index * 8 * 60 * 1000;
      const orderDate = new Date(orderTimeMs);
      const paymentDate = new Date(orderTimeMs + 3 * 60 * 1000); // 3 mins after order
      let bankDate = new Date(orderTimeMs + 45 * 60 * 1000); // 45 mins after order (within 2 hours)

      let orderAmount = baseAmount;
      let paymentAmount = baseAmount;
      let bankAmount = baseAmount;
      let explanation = '';
      let notes = '';

      let hasGateway = true;
      let hasBank = true;
      let hasOrder = true;

      switch (category) {
        case 'matched': {
          explanation = `All 3 sources match: ₹${baseAmount.toLocaleString('en-IN')} confirmed within SLA window.`;
          notes = 'Perfect match across Payment Gateway, Bank Statement, and Orders.';
          break;
        }

        case 'mismatch': {
          // Order amount differs from payment & bank (e.g. promotional discount or fee discrepancy)
          const diff = [150, 200, 500, 1000][index % 4];
          orderAmount = baseAmount + diff;
          explanation = `Amount mismatch: Order is ₹${orderAmount.toLocaleString('en-IN')} but Gateway and Bank settled ₹${baseAmount.toLocaleString('en-IN')} (diff of ₹${diff}).`;
          notes = 'Order amount differs from payment/bank settlement.';
          break;
        }

        case 'missing_settlement': {
          // Payment + Order exist, Bank does not
          hasBank = false;
          bankAmount = null;
          explanation = `Missing settlement: Gateway collected ₹${baseAmount.toLocaleString('en-IN')}, but no corresponding deposit appears in Bank Statement.`;
          notes = 'Payment and order exist, bank settlement entry missing.';
          break;
        }

        case 'missing_payment': {
          // Bank + Order exist, Payment gateway entry missing
          hasGateway = false;
          paymentAmount = null;
          explanation = `Missing payment record: Bank received ₹${baseAmount.toLocaleString('en-IN')} and Order exists, but Payment Gateway record is absent (possible direct NEFT/IMPS).`;
          notes = 'Bank deposit and order exist, payment gateway entry missing.';
          break;
        }

        case 'delay': {
          // Settlement delayed: bank timestamp is 8+ hours after payment
          const delayHours = 9 + (index % 6); // 9 to 14 hours delay
          bankDate = new Date(paymentDate.getTime() + delayHours * 60 * 60 * 1000);
          explanation = `Settlement delay: Bank deposit occurred ${delayHours} hours after gateway payment (exceeds standard 2-hour SLA window).`;
          notes = `Settlement delay: Bank deposit ${delayHours} hours after payment.`;
          break;
        }

        case 'duplicate': {
          // Same ref appears twice in payment gateway
          explanation = `Duplicate transaction: ${txnRef} captured twice in Payment Gateway file.`;
          notes = 'Duplicate transaction reference in payment gateway file.';
          break;
        }

        case 'unknown_credit': {
          // Bank entry with no matching payment or order
          hasGateway = false;
          hasOrder = false;
          paymentAmount = null;
          orderAmount = null;
          explanation = `Unknown credit: Bank deposited ₹${baseAmount.toLocaleString('en-IN')} with ref ${txnRef}, but neither Gateway nor Orders records exist.`;
          notes = 'Unidentified bank credit without matching payment or order.';
          break;
        }
      }

      // Add to Gateway if applicable
      if (hasGateway) {
        gatewayRows.push({
          transaction_id: txnRef,
          amount: formatGatewayAmount(paymentAmount, index),
          currency: 'INR',
          status: 'SUCCESS',
          payment_time: formatGatewayDate(paymentDate, index),
          payment_method: method,
          gateway_fee: (paymentAmount * 0.02).toFixed(2),
        });

        // If duplicate category, append a second record in payment_gateway.csv
        if (category === 'duplicate') {
          const duplicatePaymentDate = new Date(paymentDate.getTime() + 90 * 1000); // 90 seconds later
          gatewayRows.push({
            transaction_id: txnRef,
            amount: formatGatewayAmount(paymentAmount, index + 1),
            currency: 'INR',
            status: 'SUCCESS',
            payment_time: formatGatewayDate(duplicatePaymentDate, index + 1),
            payment_method: method,
            gateway_fee: (paymentAmount * 0.02).toFixed(2),
          });
        }
      }

      // Add to Bank if applicable
      if (hasBank) {
        bankRows.push({
          bank_ref: txnRef,
          description: `UPI/CR/${txnRef}/SETTLEMENT`,
          credit_amount: formatBankAmount(bankAmount, index),
          value_date: formatBankDate(bankDate, index),
          status: 'CREDITED',
        });
      }

      // Add to Orders if applicable
      if (hasOrder) {
        orderRows.push({
          order_id: `ORD-${20000 + index}`,
          txn_ref: txnRef,
          order_amount: formatOrderAmount(orderAmount, index),
          order_date: formatOrderDate(orderDate, index),
          customer_name: customer,
          order_status: 'COMPLETED',
        });
      }

      // Record in ground truth
      groundTruth.push({
        txnRef,
        expectedStatus: category,
        category,
        priority,
        baseAmount,
        orderAmount,
        paymentAmount,
        bankAmount,
        inPaymentGateway: hasGateway,
        inBankStatement: hasBank,
        inOrders: hasOrder,
        orderTime: formatDateISO(orderDate),
        paymentTime: hasGateway ? formatDateISO(paymentDate) : null,
        bankTime: hasBank ? formatDateISO(bankDate) : null,
        explanation,
        notes,
      });
    });

    return {
      gatewayCSV: toCSV(
        ['transaction_id', 'amount', 'currency', 'status', 'payment_time', 'payment_method', 'gateway_fee'],
        gatewayRows
      ),
      bankCSV: toCSV(
        ['bank_ref', 'description', 'credit_amount', 'value_date', 'status'],
        bankRows
      ),
      ordersCSV: toCSV(
        ['order_id', 'txn_ref', 'order_amount', 'order_date', 'customer_name', 'order_status'],
        orderRows
      ),
      groundTruth,
      summary: {
        totalRecords: specs.length,
        distribution: specs.reduce((acc, s) => {
          acc[s.category] = (acc[s.category] || 0) + 1;
          return acc;
        }, {}),
      },
    };
  }

  const trainData = processSet(trainSpecs, 'train_dev_set');
  const evalData = processSet(evalSpecs, 'held_out_eval_set');

  // Directory paths
  const baseDir = path.resolve(__dirname);
  const trainDir = path.join(baseDir, 'train_dev_set');
  const evalDir = path.join(baseDir, 'held_out_eval_set');

  fs.mkdirSync(trainDir, { recursive: true });
  fs.mkdirSync(evalDir, { recursive: true });

  // Write files for train_dev_set
  fs.writeFileSync(path.join(trainDir, 'payment_gateway.csv'), trainData.gatewayCSV, 'utf-8');
  fs.writeFileSync(path.join(trainDir, 'bank_statement.csv'), trainData.bankCSV, 'utf-8');
  fs.writeFileSync(path.join(trainDir, 'orders.csv'), trainData.ordersCSV, 'utf-8');
  fs.writeFileSync(
    path.join(trainDir, 'ground_truth.json'),
    JSON.stringify({ dataset: 'train_dev_set', ...trainData.summary, records: trainData.groundTruth }, null, 2),
    'utf-8'
  );

  // Write files for held_out_eval_set
  fs.writeFileSync(path.join(evalDir, 'payment_gateway.csv'), evalData.gatewayCSV, 'utf-8');
  fs.writeFileSync(path.join(evalDir, 'bank_statement.csv'), evalData.bankCSV, 'utf-8');
  fs.writeFileSync(path.join(evalDir, 'orders.csv'), evalData.ordersCSV, 'utf-8');
  fs.writeFileSync(
    path.join(evalDir, 'ground_truth.json'),
    JSON.stringify({ dataset: 'held_out_eval_set', ...evalData.summary, records: evalData.groundTruth }, null, 2),
    'utf-8'
  );

  return { trainData, evalData };
}

// Auto-run when executed directly via Node
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  console.log('🚀 Generating FinRecon AI synthetic dataset...');
  const { trainData, evalData } = generateSyntheticDataset();

  console.log('\n📊 Train / Dev Set (data/synthetic/train_dev_set/):');
  console.log(`   Total Records: ${trainData.summary.totalRecords}`);
  console.log('   Distribution:', JSON.stringify(trainData.summary.distribution, null, 2));

  console.log('\n📊 Held-out Eval Set (data/synthetic/held_out_eval_set/):');
  console.log(`   Total Records: ${evalData.summary.totalRecords}`);
  console.log('   Distribution:', JSON.stringify(evalData.summary.distribution, null, 2));

  const totalOverall = trainData.summary.totalRecords + evalData.summary.totalRecords;
  const overallDist = {};
  for (const [k, v] of Object.entries(trainData.summary.distribution)) {
    overallDist[k] = (overallDist[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(evalData.summary.distribution)) {
    overallDist[k] = (overallDist[k] || 0) + v;
  }

  console.log(`\n🎉 Generated ${totalOverall} total transactions across all sets!`);
  console.log('   Overall Distribution:', JSON.stringify(overallDist, null, 2));
  console.log('\nFiles generated:');
  console.log(' - data/synthetic/train_dev_set/payment_gateway.csv');
  console.log(' - data/synthetic/train_dev_set/bank_statement.csv');
  console.log(' - data/synthetic/train_dev_set/orders.csv');
  console.log(' - data/synthetic/train_dev_set/ground_truth.json');
  console.log(' - data/synthetic/held_out_eval_set/payment_gateway.csv');
  console.log(' - data/synthetic/held_out_eval_set/bank_statement.csv');
  console.log(' - data/synthetic/held_out_eval_set/orders.csv');
  console.log(' - data/synthetic/held_out_eval_set/ground_truth.json');
}
