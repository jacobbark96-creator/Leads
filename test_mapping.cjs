const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Testing data mapping...");
  
  let query = supabase
    .from('leads')
    .select(`
      *,
      categories!leads_category_id_fkey(name),
      users!leads_assigned_to_fkey(name),
      lead_purchases(
        client_id,
        clients!lead_purchases_client_id_fkey(
          user_id,
          users(email)
        )
      )
    `)
    .in('status', ['call back', 'qualified', 'marketplace', 'awaiting_sales', 'sold', 'fresh', 'no answer', 'voicemail', 'skipped'])
    .or(`assigned_to.eq.3445895c-9105-42ea-a3e8-c7f4202ef479,assigned_to.is.null`)
    .limit(10);

  const { data, error } = await query;
  if (error) {
    console.error("ERROR:", JSON.stringify(error, null, 2));
    return;
  }
  
  try {
    const enhancedLeads = data.map(lead => {
      const isLeadShare = (lead.status === 'marketplace' || (lead.purchase_count || 0) > 0) && (lead.is_exclusive_sold !== true);
      
      const getEmail = (p) => {
        const client = Array.isArray(p?.clients) ? p.clients[0] : p?.clients;
        const user = Array.isArray(client?.users) ? client.users[0] : client?.users;
        return user?.email?.toLowerCase()?.trim() || '';
      };

      const validPurchases = lead.lead_purchases?.filter((p) => {
        const email = getEmail(p);
        return email && !email.includes('test@example.com') && email !== '';
      }) || [];
      
      const validPurchaseCount = validPurchases.length;
      const hasTestPurchase = lead.lead_purchases?.some((p) => {
        const email = getEmail(p);
        return email && email.includes('test@example.com');
      });

      let commissionValue = 0;
      if (isLeadShare) {
        commissionValue = validPurchaseCount * 33;
      } else {
        const isManualSold = (lead.status === 'sold' || lead.marked_as_sold) && (lead.purchase_count || 0) === 0;
        const isExclusiveMarketplaceSold = lead.is_exclusive_sold && validPurchaseCount > 0;
        if (isManualSold || isExclusiveMarketplaceSold) {
          // Mock calculateCommission
          commissionValue = (lead.exclusive_price || lead.price || 0) * 0.1;
        }
      }

      return {
        id: lead.id,
        status: lead.status,
        is_leadshare: isLeadShare,
        has_test_purchase: hasTestPurchase,
        valid_purchase_count: validPurchaseCount,
        commission_value: commissionValue,
      };
    });
    
    console.log("Mapping successful! Sample output:");
    console.table(enhancedLeads);
  } catch (err) {
    console.error("MAPPING CRASHED:", err);
  }
}

run();
