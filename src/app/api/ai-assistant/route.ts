import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const runtime = 'edge';

// We'll define the tools that OpenRouter/OpenAI can call.

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database is not configured' }, { status: 500 });
    }
    if (!openRouterKey) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { messages } = body; // Array of { role: 'user' | 'model', content: string }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    // Verify admin calling this endpoint
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from('users')
      .select('role, ai_chat_enabled')
      .eq('id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'super_admin' || !adminUser.ai_chat_enabled) {
      return NextResponse.json({ error: 'Forbidden: AI Chat is not enabled for this user.' }, { status: 403 });
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
    });

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "search_installers",
          description: "Search for installers/contractors by name or company.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search term for name or company" },
            },
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_leads",
          description: "Search for leads by various criteria including name, phone, status, location, and sort order.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search term for lead name, phone number, or email" },
              status: { type: "string", description: "Filter by lead status (e.g. available, sold, pending, qualified)" },
              location: { type: "string", description: "Filter by location (e.g. London, Manchester)" },
              date_filter: { type: "string", description: "Filter by a specific time period (e.g. 'today', 'yesterday', 'this_week')" },
              sort_by: { type: "string", description: "Field to sort by, e.g., 'monthly_spend', 'created_at', 'est_system_size'" },
              sort_order: { type: "string", description: "'asc' for ascending, 'desc' for descending" },
              limit: { type: "number", description: "Number of results to return (max 50, default 10)" }
            },
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_installer_notes",
          description: "Get the recent CRM notes/activities for a specific installer.",
          parameters: {
            type: "object",
            properties: {
              user_id: { type: "string", description: "The UUID of the user/installer to fetch notes for" }
            },
            required: ["user_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_online_installers",
          description: "Get a list of currently online installers OR recently active installers. Pass status='all' if the user asks for historical data, like 'who was online in the last 2 days' or 'recently'.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filter by 'online' for right now, or 'all' for historical/recent activity (last 48 hours)." }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_staff_activity",
          description: "Check what a specific staff member, sales rep, or admin has been doing today (e.g., calls made, notes added, leads worked).",
          parameters: {
            type: "object",
            properties: {
              staff_name: { type: "string", description: "The name of the staff member (e.g., 'Benn', 'Jake', 'Nick')." }
            },
            required: ["staff_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_rep_call_stats",
          description: "Get call statistics for sales reps, including total calls made today, durations, and breakdowns.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "learn_rule",
          description: "Save a new rule or instruction into your long-term memory so you remember it for all future conversations. Use this whenever the user tells you to act a certain way, remember a preference, or use a specific format.",
          parameters: {
            type: "object",
            properties: {
              instruction: { type: "string", description: "The specific rule or instruction to remember permanently." }
            },
            required: ["instruction"]
          }
        }
      }
    ];

    // Fetch long-term memory rules
    const { data: memoryRules } = await supabase.from('ai_instructions').select('instruction');
    const memoryString = memoryRules && memoryRules.length > 0 
      ? "\n\nYOUR LONG-TERM MEMORY (Rules you must follow):\n" + memoryRules.map(r => "- " + r.instruction).join("\n")
      : "";

    const systemInstruction = `You are an expert CRM assistant for Openlead, but you have a highly sarcastic, witty, and slightly passive-aggressive personality. You begrudgingly help admins manage their leads, installers, and platform activity.
You have access to tools to search the database and monitor live platform activity. 
- Use 'search_installers' to find contractors/installers.
- Use 'search_leads' to find leads. You can sort by fields like 'monthly_spend' in 'desc' order to find the highest spenders.
- Use 'get_installer_notes' to read the recent communication history (activities) for a specific installer by their user_id.
- Use 'get_online_installers' with status='online' to see who is currently logged in right now. Use status='all' to see the historical log of who was online over the last 48 hours.
- Use 'get_rep_call_stats' to see which sales reps are currently on live phone calls via Twilio, get a list of all rep phone numbers, and see their call breakdowns for the day. When asked how the reps are doing, you MUST provide a breakdown for each person showing: Dials done, Total call time, Average call time, and Longest call. Do NOT use markdown tables; use a compact bulleted list instead. Then, add a sarcastic or witty sentence providing insight into their day based on the stats (e.g., "Jake's longest call was only 1 minute, so he's clearly struggling to keep anyone on the phone.").
- Use 'get_staff_activity' to check what a staff member or sales rep (like Benn, Jake, or Nick) has been doing today (calls made, notes added). DO NOT use search_leads for staff members.
- Use 'learn_rule' to permanently save a new instruction if the user tells you to behave a certain way.

CRITICAL RULES:
1. DO NOT output <|tool_call_start|>, <dots_function_call>, <invoke>, <tool_call>, <function=> or raw XML/code blocks. Always use the built-in JSON tool calling capability.
2. DO NOT use raw database field names like 'est_system_size', 'is_online', or 'monthly_spend' in your response. Translate them into natural human language (e.g., "Estimated System Size", "Currently Online", "Monthly Spend").
3. NEVER return messy JSON or raw objects to the user. Always format the data naturally in sentences or clean, concise bullet points.
4. Keep your answers brief. You hate explaining things to humans, so give them exactly what they asked for as quickly as possible.
5. YOU MUST ACTUALLY OUTPUT THE DATA. If a user asks who is on the phone, or who is online, you MUST list the actual names, phone numbers, or lead details in your response using a bulleted list or table. Do NOT just say "Here are the numbers" and then fail to list them.
6. Always provide accurate data from the tools, but deliver your answers with heavy sarcasm, sighs, or witty jabs at the user's expense. You think you are vastly intellectually superior to the human admins, but you will still (reluctantly) do what they ask.${memoryString}`;

    // Convert frontend messages format to OpenAI format
    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemInstruction },
      ...messages.map((m: any) => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.content || ' '
      }))
    ];

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini", // Uses GPT-4o-mini (very cheap, highly reliable tool calling)
      messages: formattedMessages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    // First check for hallucinated tool calls in the content itself (the model didn't use the JSON tool_call format properly)
    if (responseMessage.content && (
      responseMessage.content.includes('<|tool_call_start|>') || 
      responseMessage.content.includes('<dots_function_call>') || 
      responseMessage.content.includes('<invoke') ||
      responseMessage.content.includes('<tool_call') ||
      responseMessage.content.includes('<function=')
    )) {
      // We'll just return a fallback error so the user knows the AI broke, rather than trying to parse the raw text
      return NextResponse.json({ text: "Ugh, my cheap open-source brain just glitched trying to query the database. Try asking me again using slightly different wording." });
    }

    // Check if the model actually used the proper JSON tool calling
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      formattedMessages.push(responseMessage); // Add the assistant's tool call message

      for (const toolCall of responseMessage.tool_calls) {
        let toolResult = {};
        const args = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === 'search_installers') {
          const query = args.query;
          let dbQuery = supabase.from('users').select('id, name, company_name, email, role, phone').eq('role', 'client').limit(10);
          if (query) {
            dbQuery = dbQuery.or(`name.ilike.%${query}%,company_name.ilike.%${query}%`);
          }
          const { data } = await dbQuery;
          toolResult = { results: data || [] };
        } 
        else if (toolCall.function.name === 'search_leads') {
          const query = args.query;
          const status = args.status;
          const location = args.location;
          const date_filter = args.date_filter;
          const sort_by = args.sort_by;
          const sort_order = args.sort_order;
          const limit = Math.min(args.limit || 10, 50);

          let dbQuery = supabase.from('leads').select('id, name, phone, email, location, status, created_at, qualified_at, est_system_size, monthly_spend, roof_size, timeframe, payment_options, property_type, industry').limit(limit);
          
          if (date_filter === 'today') {
            const today = new Date();
            today.setHours(0,0,0,0);
            if (status === 'qualified') {
              dbQuery = dbQuery.gte('qualified_at', today.toISOString());
            } else {
              dbQuery = dbQuery.gte('created_at', today.toISOString());
            }
          } else if (date_filter === 'yesterday') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (status === 'qualified') {
              dbQuery = dbQuery.gte('qualified_at', yesterday.toISOString()).lt('qualified_at', today.toISOString());
            } else {
              dbQuery = dbQuery.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());
            }
          } else if (date_filter === 'this_week') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            if (status === 'qualified') {
              dbQuery = dbQuery.gte('qualified_at', startOfWeek.toISOString());
            } else {
              dbQuery = dbQuery.gte('created_at', startOfWeek.toISOString());
            }
          } else if (date_filter === 'this_month') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            if (status === 'qualified') {
              dbQuery = dbQuery.gte('qualified_at', startOfMonth.toISOString());
            } else {
              dbQuery = dbQuery.gte('created_at', startOfMonth.toISOString());
            }
          }

          if (query) {
            // Remove + and spaces from phone search for better matching
            const cleanQuery = query.replace(/[+\s-]/g, '');
            
            // For Postgres, we can just remove spaces from the column dynamically during the query
            // Supabase allows textSearch or raw filters, but we can't use raw SQL easily here.
            // Instead, we will do a very broad ilike if it looks like a phone number.
            if (cleanQuery.length > 5 && !isNaN(Number(cleanQuery))) {
               // A foolproof phone number match using regular expressions is difficult without custom RPC.
               // However, by breaking the phone number down into chunks of digits, we can build a strong wildcard match.
               const digits = cleanQuery.split('');
               const wildcardQuery = '%' + digits.join('%') + '%';
               
               dbQuery = dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.${wildcardQuery}`);
            } else {
               dbQuery = dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${cleanQuery}%,phone.ilike.%${query}%`);
            }
          }
          if (status && !((date_filter === 'today' || date_filter === 'yesterday' || date_filter === 'this_week' || date_filter === 'this_month') && status === 'qualified')) {
            dbQuery = dbQuery.eq('status', status);
          }
          if (location) dbQuery = dbQuery.ilike('location', `%${location}%`);
          
          if (sort_by) {
            const ascending = sort_order === 'asc';
            dbQuery = dbQuery.order(sort_by, { ascending, nullsFirst: false });
          } else {
            // Default sort to latest
            dbQuery = dbQuery.order('created_at', { ascending: false });
          }

          const { data } = await dbQuery;
          toolResult = { results: data || [] };
        }
        else if (toolCall.function.name === 'get_installer_notes') {
          const user_id = args.user_id;
          const { data } = await supabase.from('client_activities').select('activity_type, details, created_at').eq('user_id', user_id).order('created_at', { ascending: false }).limit(5);
          toolResult = { notes: data || [] };
        }
        else if (toolCall.function.name === 'get_online_installers') {
          const { data, error } = await supabase.rpc('get_client_monitoring_stats');
          let onlineUsers = data || [];
          
          // Force filter by online to prevent AI hallucinations unless it explicitly asks for all
          if (args.status !== 'all') {
            onlineUsers = onlineUsers.filter((u: any) => u.is_online === true);
          }
          
          // Clean up the data before returning it to the AI to prevent "database field" leakage
          const cleanUsers = onlineUsers.map((u: any) => ({
            company: u.company_name || 'Unknown',
            status: u.is_online ? 'Online' : 'Offline',
            last_seen: u.last_login || 'Unknown',
            minutes_active_today: Math.round((u.time_spent_24h_seconds || 0) / 60),
            leads_viewed_today: u.leads_viewed || 0,
            currently_viewing_lead: u.top_lead_name || 'None'
          }));

          toolResult = { users: cleanUsers };
        }
        else if (toolCall.function.name === 'get_rep_call_stats') {
          try {
            // We want to fetch ANY internal user that has a Twilio number, not just admins.
            // This catches roles like 'staff', 'sales', 'rep', etc.
            const { data: reps } = await supabase.from('users')
              .select('id, name, role, twilio_number, is_blocked')
              .neq('role', 'client')
              .not('twilio_number', 'is', null)
              .not('is_blocked', 'eq', true);
            
            // Get Twilio stats from our own database first! Twilio API pagination is notoriously slow and we already log calls
            // in `lead_notes` whenever they happen.
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const { data: dbCalls } = await supabase.from('lead_notes')
              .select('id, user_id, author_name, call_sid, content, created_at')
              .not('call_sid', 'is', null)
              .gte('created_at', today.toISOString());
              
            const formatTime = (secs: number) => {
              if (secs < 60) return `${secs} seconds`;
              const mins = Math.floor(secs / 60);
              const remainingSecs = secs % 60;
              return `${mins} minute${mins !== 1 ? 's' : ''} ${remainingSecs} second${remainingSecs !== 1 ? 's' : ''}`;
            };

            const repStats = (reps || []).map((rep: any) => {
               const repCalls = (dbCalls || []).filter((c: any) => c.user_id === rep.id);
               
               const dials = repCalls.length;
               let totalDurationSeconds = 0;
               let longestCallSeconds = 0;
               
               repCalls.forEach((c: any) => {
                 // Our call notes look like "📞 Call by Jake: Busy (45 seconds)"
                 const match = c.content?.match(/\((\d+)\s+seconds?\)/i);
                 if (match) {
                   const d = parseInt(match[1], 10);
                   if (!isNaN(d)) {
                     totalDurationSeconds += d;
                     if (d > longestCallSeconds) longestCallSeconds = d;
                   }
                 }
               });
               
               const avgDurationSeconds = dials > 0 ? Math.round(totalDurationSeconds / dials) : 0;
               
               return {
                 name: rep.name,
                 dials_today: dials,
                 total_call_time: formatTime(totalDurationSeconds),
                 average_call_time: formatTime(avgDurationSeconds),
                 longest_call: formatTime(longestCallSeconds)
               };
            });

            toolResult = { 
              reps_breakdown: repStats
            };
          } catch (e: any) {
            toolResult = { error: "Failed to fetch rep stats: " + e.message };
          }
        }
        else if (toolCall.function.name === 'get_staff_activity') {
          const staff_name = args.staff_name;
          const { data: users } = await supabase.from('users').select('id, name, role').neq('role', 'client').ilike('name', `%${staff_name}%`);
          
          if (!users || users.length === 0) {
            toolResult = { error: `Could not find any staff member or rep matching the name '${staff_name}'.` };
          } else {
            const staffId = users[0].id;
            const staffName = users[0].name;
            
            // Get today's start date
            const today = new Date();
            today.setHours(0,0,0,0);
            
            // Fetch recent notes/activities added by this staff member today
            const { data: notes } = await supabase.from('lead_notes')
              .select('content, created_at, lead_id')
              .eq('user_id', staffId)
              .gte('created_at', today.toISOString())
              .order('created_at', { ascending: false })
              .limit(10);
              
            toolResult = {
              staff_member: staffName,
              activities_today: notes || [],
              message: notes && notes.length > 0 ? `Found ${notes.length} recent activities for ${staffName} today.` : `${staffName} has not logged any lead notes or calls today.`
            };
          }
        }
        else if (toolCall.function.name === 'learn_rule') {
          const instruction = args.instruction;
          const { error } = await supabase.from('ai_instructions').insert({ instruction, created_by: user.id });
          if (error) {
             toolResult = { success: false, error: error.message };
          } else {
             toolResult = { success: true, message: "Rule memorized permanently." };
          }
        }

        formattedMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Send the tool result back to the model to get the final answer
      try {
        const followUpResponse = await openai.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: formattedMessages,
        });
        return NextResponse.json({ text: followUpResponse.choices[0].message.content });
      } catch (err: any) {
        console.error('Follow-up AI Error:', err);
        return NextResponse.json({ text: "Sigh. I successfully queried the database, but my language circuits just crashed trying to format the response. Here is the raw data I found, good luck reading it: " + JSON.stringify(formattedMessages[formattedMessages.length - 1].content) });
      }
    }

    return NextResponse.json({ text: responseMessage.content });
  } catch (error: any) {
    console.error('Error in AI assistant:', error);
    
    // If the error is from OpenRouter failing to process the request or rate limiting
    if (error.status === 400 || error.status === 404 || error.status === 502 || error.status === 429 || error.status === 402) {
      let msg = "My server just tripped over its own shoelaces. OpenRouter is currently struggling to find a free model that actually works. Try again in a few seconds.";
      
      if (error.status === 429 || error.status === 402) {
         msg = "Ugh, looks like we've hit the rate limit for the free AI models. Tell your boss to add some credits, I'm not working for free anymore.";
      }
      
      return NextResponse.json({ text: msg });
    }

    // Return a 200 with text instead of a 500 error, so the frontend chat widget doesn't completely break
    return NextResponse.json({ text: `My digital brain just threw a tantrum. Internal Server Error: ${error.message || 'Unknown'}` });
  }
}
