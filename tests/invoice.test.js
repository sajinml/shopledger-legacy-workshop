const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

test('invoice GST and total match the billed HSN slab totals', function () {
  // This mirrors the order line created by routes/orders.js, which stores HSN
  // but does not store gstRate.
  const items = [{
    id: 1,
    name: 'Rice',
    sku: 'RICE-1',
    hsn: '1006',
    price: 100,
    qty: 2
  }];
  const billedTotals = pricing.computeTotals(items, '');
  const order = Object.assign({ id: 1001, items: items, coupon: '' }, billedTotals);

  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.equal(billedTotals.tax, 10);
  assert.equal(billedTotals.total, 210);
  assert.equal(invoiceFigures.rows[0].gstPercent, 5);
  assert.equal(invoiceFigures.rows[0].lineTax, 10);
  assert.equal(invoiceFigures.tax, billedTotals.tax);
  assert.equal(invoiceFigures.total, billedTotals.total);
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
});

test('invoice GST and total match the billed totals after a flat coupon discount', function () {
  const items = [{
    id: 2,
    name: 'Tea',
    sku: 'TEA-1',
    hsn: '0902',
    gstRate: 18,
    price: 500,
    qty: 1
  }];
  const billedTotals = pricing.computeTotals(items, 'FLAT50');
  const order = Object.assign({ id: 1002, items: items, coupon: 'FLAT50' }, billedTotals);

  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.equal(billedTotals.discount, 50);
  assert.equal(billedTotals.tax, 81);
  assert.equal(billedTotals.total, 531);
  assert.equal(invoiceFigures.discount, 50);
  assert.equal(invoiceFigures.rows[0].lineTax, billedTotals.lines[0].tax);
  assert.equal(invoiceFigures.tax, billedTotals.tax);
  assert.equal(invoiceFigures.total, billedTotals.total);
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
});

test('invoice ignores an inactive coupon just as the billing calculation does', function () {
  const items = [{
    id: 3,
    name: 'Coffee',
    price: 1000,
    qty: 1,
    gstRate: 18
  }];
  const billedTotals = pricing.computeTotals(items, 'DIWALI20');
  const order = Object.assign({ id: 1003, items: items, coupon: 'DIWALI20' }, billedTotals);

  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.equal(billedTotals.discount, 0);
  assert.equal(billedTotals.total, 1180);
  assert.equal(invoiceFigures.discount, billedTotals.discount);
  assert.equal(invoiceFigures.tax, billedTotals.tax);
  assert.equal(invoiceFigures.total, billedTotals.total);
  assert.doesNotMatch(invoice.render(order), /Coupon Discount \(DIWALI20\)/);
});
