export const TEMPLATES = {
  invoice: `
                           INVOICE
═══════════════════════════════════════════════════════
Date: ${new Date().toLocaleDateString()}
Invoice No: INV-${Math.floor(Math.random()*10000)}

Billed To:
[Client Name]
[Address]

Description                              Amount (₹)
───────────────────────────────────────────────────────
Professional Services                    5,000.00
Audit Fees                               2,500.00


───────────────────────────────────────────────────────

`,
  letter: `
Date: ${new Date().toLocaleDateString()}

To,
[Recipient Name]
[Company / Address]

Subject: [Enter Subject]

Dear [Name],

[Type your letter content here...]


Sincerely,

JEYAPRAGASH NARAYANAN
Auditor Office
`,
  quotation: `
                         QUOTATION
═══════════════════════════════════════════════════════
Date: ${new Date().toLocaleDateString()}
Ref No: QUO-${Math.floor(Math.random()*10000)}

Prepared For:
[Client Name]

Item                                     Est. Cost (₹)
───────────────────────────────────────────────────────
Service 1                                10,000.00
Service 2                                5,000.00


───────────────────────────────────────────────────────

`,
  receipt: `
                      CASH RECEIPT
═══════════════════════════════════════════════════════
Date: ${new Date().toLocaleDateString()}
Receipt No: REC-${Math.floor(Math.random()*10000)}

Received from: __________________________________
The sum of: ₹ _________________________________

For payment of: _________________________________


Authorized Signature: ___________________________
`
};
