const apiKey = process.env.ELEVENLABS_API_KEY || ''; // I will just send a mock request to see the error

fetch('https://api.elevenlabs.io/v1/convai/twilio/register-call', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/html'
    },
    body: JSON.stringify({
    agent_id: "agent_1801m07bb3mzfjztt30pwv04c73b",
    from_number: "+11111111111",
    to_number: "+22222222222",
    direction: "outbound",
    conversation_initiation_client_data: {
        dynamic_variables: {
        leadId: "123",
        address: "Test"
        },
        custom_data: {
        leadId: "123"
        }
    }
    })
}).then(res => res.text().then(text => console.log(res.status, text)));
