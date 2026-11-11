import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const runtime = 'edge';

// We need to initialize the Google GenAI SDK.
// We'll define the tools that Gemini can call.

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database is not configured' }, { status: 500 });
    }
    if (!geminiKey) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { messages } = body; // Array of { role: 'user' | 'model', parts: [{ text: string }] }

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

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const searchInstallersSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search term for name or company' },
      },
    };

    const searchLeadsSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: 'Filter by lead status (e.g. available, sold, pending)' },
        location: { type: Type.STRING, description: 'Filter by location (e.g. London, Manchester)' }
      },
    };

    const getNotesSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        user_id: { type: Type.STRING, description: 'The UUID of the user/installer to fetch notes for' }
      },
      required: ['user_id']
    };

    const systemInstruction = `You are an expert CRM assistant for Openlead. You help admins manage their leads, installers (contractors), and notes.
You have access to tools to search the database. 
- Use 'search_installers' to find contractors/installers. It returns their IDs, names, company names, and email.
- Use 'search_leads' to find leads. It returns lead IDs, locations, status, and system size.
- Use 'get_installer_notes' to read the recent communication history (activities) for a specific installer by their user_id.

Always be concise, helpful, and professional. Synthesize the data you get from the tools to answer the user's question directly.`;

    // Process the tools
    let chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: [{
          functionDeclarations: [
            {
              name: 'search_installers',
              description: 'Search for installers/contractors by name or company.',
              parameters: searchInstallersSchema
            },
            {
              name: 'search_leads',
              description: 'Search for leads by status or location.',
              parameters: searchLeadsSchema
            },
            {
              name: 'get_installer_notes',
              description: 'Get the recent CRM notes/activities for a specific installer.',
              parameters: getNotesSchema
            }
          ]
        }]
      }
    });

    // We only need to run the generation once with the history, but the SDK's chat 
    // object handles history. Since we want to pass the history, we can just call generateContent
    // or simulate the chat. For edge API, it's easier to just use `generateContent` with the full history.

    let finalResponseText = '';
    
    // Convert our messages to Gemini format
    const formattedHistory = messages.map((m: any) => {
      // Clean up empty text parts that cause Gemini to crash
      const contentText = m.content && m.content.trim() !== '' ? m.content : ' ';
      return {
        role: m.role === 'model' ? 'model' : 'user', // strictly enforce roles for gemini
        parts: [{ text: contentText }]
      };
    });

    const lastMessage = formattedHistory.pop();

    if (!lastMessage) {
      return NextResponse.json({ error: 'No messages to process' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...formattedHistory, lastMessage] as any,
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: [{
          functionDeclarations: [
            {
              name: 'search_installers',
              description: 'Search for installers/contractors by name or company.',
              parameters: searchInstallersSchema
            },
            {
              name: 'search_leads',
              description: 'Search for leads by status or location.',
              parameters: searchLeadsSchema
            },
            {
              name: 'get_installer_notes',
              description: 'Get the recent CRM notes/activities for a specific installer.',
              parameters: getNotesSchema
            }
          ]
        }]
      }
    });

    // Check if the model wants to call a tool
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let toolResult = {};

      if (call.name === 'search_installers') {
        const query = call.args?.query as string | undefined;
        let dbQuery = supabase.from('users').select('id, name, company_name, email, role, phone').eq('role', 'client').limit(10);
        if (query) {
          dbQuery = dbQuery.or(`name.ilike.%${query}%,company_name.ilike.%${query}%`);
        }
        const { data } = await dbQuery;
        toolResult = { results: data || [] };
      } 
      else if (call.name === 'search_leads') {
        const status = call.args?.status as string | undefined;
        const location = call.args?.location as string | undefined;
        let dbQuery = supabase.from('leads').select('id, name, location, status, est_system_size').limit(10);
        if (status) dbQuery = dbQuery.eq('status', status);
        if (location) dbQuery = dbQuery.ilike('location', `%${location}%`);
        const { data } = await dbQuery;
        toolResult = { results: data || [] };
      }
      else if (call.name === 'get_installer_notes') {
        const user_id = call.args?.user_id as string | undefined;
        const { data } = await supabase.from('client_activities').select('activity_type, details, created_at').eq('user_id', user_id).order('created_at', { ascending: false }).limit(5);
        toolResult = { notes: data || [] };
      }

      // Send the tool result back to the model to get the final answer
      const followUpResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...formattedHistory,
          lastMessage,
          { role: 'model', parts: [{ functionCall: call }] },
          { role: 'user', parts: [{ functionResponse: { name: call.name, response: toolResult as object } }] }
        ] as any,
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] }
        }
      });
      
      finalResponseText = followUpResponse.text;
    } else {
      finalResponseText = response.text;
    }

    return NextResponse.json({ text: finalResponseText });
  } catch (error: any) {
    console.error('Error in AI assistant:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
