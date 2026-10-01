import { createClient } from '@supabase/supabase-js';
import { CommunicationProvider } from './types';
import { TwilioProvider } from './twilio';
import { TelnyxProvider } from './telnyx';

export async function getCommunicationProvider(): Promise<CommunicationProvider> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'communication_provider')
    .single();

  const providerType = setting?.value || 'twilio';

  if (providerType === 'telnyx') {
    return new TelnyxProvider();
  }

  return new TwilioProvider();
}
