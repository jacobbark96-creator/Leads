import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract lead data from URL params
    const ref = searchParams.get('ref') || '#D703F7FF';
    const exclusivePrice = searchParams.get('exclusivePrice') || '185';
    const leadsharePrice = searchParams.get('leadsharePrice') || '135';
    const monthlySpend = searchParams.get('monthlySpend') || '2,000';
    const location = searchParams.get('location') || 'St. Ives';
    const systemSize = searchParams.get('systemSize') || '16.8 kW';
    const timeframe = searchParams.get('timeframe') || '1 - 3 Months';
    const roofSize = searchParams.get('roofSize') || '100 SqM';
    const photoUrl = searchParams.get('photoUrl') || 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=800&q=80'; // Industrial roof
    
    // Additional details
    const ownership = searchParams.get('ownership') || 'Leased';
    const leaseLeft = searchParams.get('leaseLeft') || '6 Years';
    const electricalSupply = searchParams.get('electricalSupply') || 'Three Phase';
    const likelyToRenew = searchParams.get('likelyToRenew') || 'Yes';
    const solarLocation = searchParams.get('solarLocation') || 'Roof';
    const paymentOption = searchParams.get('paymentOption') || 'All options available';
    const mountType = searchParams.get('mountType') || 'No';
    const availability = searchParams.get('availability') || 'Anytime';
    const unitRate = searchParams.get('unitRate') || '0.26';
    const annualConsumption = searchParams.get('annualConsumption') || 'N/A';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#05050A', // Dark WhatsApp background feel
            padding: '20px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Main Card Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#11131A',
              border: '1px solid #1E212B',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '600px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#E0E7FF',
                  borderRadius: '12px',
                  width: '48px',
                  height: '48px',
                  marginRight: '16px',
                }}
              >
                {/* Shopping Cart Icon SVG */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 'bold' }}>New Lead Available</span>
                <span style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '4px' }}>Ref: {ref}</span>
              </div>
            </div>

            {/* Pricing Tier */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1E212B', borderBottom: '1px solid #1E212B', padding: '16px 0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#10B981', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px' }}>$</span> Exclusive Price
                </div>
                <span style={{ color: '#10B981', fontSize: '16px', fontWeight: 'bold' }}>£{exclusivePrice}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#60A5FA', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px' }}>🛒</span> Leadshare Price
                </div>
                <span style={{ color: '#60A5FA', fontSize: '16px', fontWeight: 'bold' }}>£{leadsharePrice}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#34D399', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px' }}>⏱</span> Monthly Spend
                </div>
                <span style={{ color: '#34D399', fontSize: '16px', fontWeight: 'bold' }}>£{monthlySpend}/mo</span>
              </div>
            </div>

            {/* Core Stats Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px' }}>📍</span> Location
                </div>
                <span style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '500' }}>{location}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px' }}>⚡</span> Est. System Size
                </div>
                <span style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '500' }}>{systemSize}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px' }}>🗓</span> Timeframe
                </div>
                <span style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '500' }}>{timeframe}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px' }}>🏠</span> Roof Size
                </div>
                <span style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '500' }}>{roofSize}</span>
              </div>
            </div>

            {/* Property Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ marginRight: '6px' }}>🖼</span> Property Photo
              </div>
              <div
                style={{
                  width: '100%',
                  height: '200px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Property"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            {/* Detailed Specs Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>👤 Ownership</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{ownership}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>⏳ Lease Left</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{leaseLeft}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>🔌 Electrical Supply</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{electricalSupply}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>🔄 Likely to Renew?</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{likelyToRenew}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>🏢 Solar Location</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{solarLocation}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>💳 Payment Option</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{paymentOption}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>🏗 Mount Type</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{mountType}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>🕒 Availability</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{availability}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>💷 Unit Rate</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>£{unitRate}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '12px', marginBottom: '2px' }}>📊 Annual Consumption</div>
                <span style={{ color: '#FFFFFF', fontSize: '14px' }}>{annualConsumption}</span>
              </div>
            </div>
            
          </div>
        </div>
      ),
      {
        width: 800,
        height: 1000,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}