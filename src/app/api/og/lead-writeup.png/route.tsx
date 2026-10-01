import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const town = searchParams.get('town') || 'Unknown Area';
    const type = searchParams.get('type') || 'Residential';
    const system = searchParams.get('system') || 'Solar PV';
    const price = searchParams.get('price') || '185';
    
    // We decode the notes to handle newlines properly
    const rawNotes = searchParams.get('notes') || 'No details provided.';
    const notes = decodeURIComponent(rawNotes).substring(0, 400) + (rawNotes.length > 400 ? '...' : '');

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            padding: '60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: '40px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '32px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
                New Exclusive Lead
              </span>
              <span style={{ fontSize: '64px', color: '#111827', fontWeight: '900', marginTop: '10px' }}>
                {town}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '20px 40px',
                borderRadius: '20px',
                fontSize: '48px',
                fontWeight: 'bold',
              }}
            >
              £{price}
            </div>
          </div>

          {/* Details Row */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              gap: '20px',
              marginBottom: '40px',
            }}
          >
            <div style={{ display: 'flex', padding: '15px 30px', backgroundColor: '#f3f4f6', borderRadius: '15px', fontSize: '28px', color: '#374151', fontWeight: '600' }}>
              🏡 {type}
            </div>
            <div style={{ display: 'flex', padding: '15px 30px', backgroundColor: '#f3f4f6', borderRadius: '15px', fontSize: '28px', color: '#374151', fontWeight: '600' }}>
              ⚡ {system}
            </div>
          </div>

          {/* Write Up Box */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '24px',
              padding: '40px',
            }}
          >
            <span style={{ fontSize: '24px', color: '#64748b', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
              Project Write-Up
            </span>
            <span style={{ fontSize: '32px', color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {notes}
            </span>
          </div>
          
          {/* Footer */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', marginTop: '40px' }}>
            <span style={{ fontSize: '24px', color: '#94a3b8', fontWeight: 'bold' }}>
              OpenLead CRM
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
