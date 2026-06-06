require('dotenv').config({path: '.env.local'});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function test() {
  const invoices = await stripe.invoices.list({ limit: 100 });
  const allInvoices = invoices.data;
  
  const invoiceReceiptNumbers = new Set(allInvoices.map(inv => inv.receipt_number).filter(Boolean));
  
  const charges = await stripe.charges.list({ limit: 100 });
  for (const charge of charges.data) {
    if (
        charge.status === 'succeeded' && 
        charge.receipt_url && 
        !charge.invoice && 
        (!charge.receipt_number || !invoiceReceiptNumbers.has(charge.receipt_number))
      ) {
        allInvoices.push({
          id: charge.id,
          created: charge.created,
          amount_paid: charge.amount,
          status: 'paid',
          invoice_pdf: charge.receipt_url,
          description: charge.description || 'One-off Payment',
          number: charge.receipt_number || charge.id,
          is_receipt: true
        });
      }
  }
  
  const formatted = allInvoices.map(inv => {
      if (inv.is_receipt) {
        return {
          id: inv.id,
          type: 'RECEIPT',
          url: inv.invoice_pdf,
        };
      }
      return {
        id: inv.id,
        type: 'INVOICE',
        url: inv.invoice_pdf || inv.hosted_invoice_url,
      };
    });
    
  console.log("Output:");
  for (const f of formatted) {
    if (f.id === 'in_1TdErPRmFiYSPZADAy5C1EHD' || f.id === 'ch_3TdEqyRmFiYSPZAD1ENXWhqR') {
      console.log(f);
    }
  }
}
test().catch(console.error);