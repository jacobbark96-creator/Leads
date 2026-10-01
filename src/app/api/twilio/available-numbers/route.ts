import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const countryCode = url.searchParams.get('countryCode') || 'GB';
    const areaCode = url.searchParams.get('areaCode');
    const contains = url.searchParams.get('contains');
    const type = url.searchParams.get('type') || 'Local';

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioSid || !twilioToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);
    
    const resourceType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    let searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/AvailablePhoneNumbers/${countryCode}/${resourceType}.json?PageSize=10`;
    
    if (areaCode && resourceType === 'Local') searchUrl += `&AreaCode=${areaCode}`;
    if (contains) searchUrl += `&Contains=${contains}`;

    const response = await fetch(searchUrl, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      const errData = await response.json();
      return NextResponse.json({ error: errData.message || 'Failed to search numbers' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ 
      numbers: (data.available_phone_numbers || []).map((n: any) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        locality: n.locality,
        region: n.region,
        isoCountry: n.iso_country,
        price: "£1.00/mo"
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
