const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/contractor-crm/contractor-v2/page.tsx', 'utf-8');

let newContent = content.replace(
  "const { id, created_at, clients, contractor_notes, other_contacts, csv_data, category, categories, min_system_size_kw, preferred_roof_types, ...updatePayload } = editForm as any;",
  "const { id, created_at, clients, contractor_notes, other_contacts, csv_data, category, categories, min_system_size_kw, preferred_roof_types, total_purchases, total_spent, avg_lead_cost, leads_won, conversion_rate, roi, ...updatePayload } = editForm as any;"
);

fs.writeFileSync('src/app/(dashboard)/contractor-crm/contractor-v2/page.tsx', newContent);
