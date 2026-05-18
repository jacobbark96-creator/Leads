const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://xyz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz');
const channel = supabase.channel('test-room', {
  config: {
    presence: { key: 'my-user-id' }
  }
});
channel.on('presence', { event: 'sync' }, () => {
  console.log(JSON.stringify(channel.presenceState(), null, 2));
  process.exit(0);
});
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    channel.track({ last_active_at: new Date().toISOString() });
  }
});
