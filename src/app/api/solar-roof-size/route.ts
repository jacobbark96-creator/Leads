import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

    const apiKey = process.env.SOLAR_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Google Maps API key not configured.' }, { status: 500 });

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();

    if (!geocodeData.results || geocodeData.results.length === 0) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const location = geocodeData.results[0].geometry.location;
    const { lat, lng } = location;

    const solarUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${apiKey}`;
    const solarRes = await fetch(solarUrl);
    
    if (!solarRes.ok) {
      const errorText = await solarRes.text();
      return NextResponse.json({ error: `Solar API Error: ${errorText}` }, { status: solarRes.status });
    }

    const solarData = await solarRes.json();
    if (!solarData.solarPotential || !solarData.solarPotential.wholeRoofStats) {
       return NextResponse.json({ error: 'Roof data not available for this location' }, { status: 404 });
    }

    const areaMeters2 = solarData.solarPotential.wholeRoofStats.areaMeters2;
    
    return NextResponse.json({ 
      roof_size: Math.round(areaMeters2),
      lat,
      lng
    });

  } catch (error: any) {
    console.error('Solar API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch roof size' }, { status: 500 });
  }
}
