import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Unified sync endpoint that syncs all connected services
export async function POST(request: NextRequest) {
  try {
    const { services } = await request.json();
    const results: any = {};

    // Default to sync all services if none specified
    const servicesToSync = services || ['google-fit', 'dexcom', 'capitalone', 'quickbooks'];

    for (const service of servicesToSync) {
      try {
        let syncResult;
        
        switch (service) {
          case 'google-fit':
            syncResult = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sync/google-fit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            break;
            
          case 'dexcom':
            syncResult = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sync/dexcom`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            break;
            
          case 'capitalone':
            syncResult = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sync/capitalone`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            break;
            
          case 'quickbooks':
            syncResult = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sync/quickbooks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            break;
        }

        if (syncResult) {
          const data = await syncResult.json();
          results[service] = {
            success: syncResult.ok,
            data: data,
          };
        }
      } catch (error) {
        results[service] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    const successCount = Object.values(results).filter((r: any) => r.success).length;
    const totalCount = Object.keys(results).length;

    return NextResponse.json({
      success: successCount > 0,
      results,
      summary: `${successCount}/${totalCount} services synced successfully`,
    });

  } catch (error) {
    console.error('Unified sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync data sources' },
      { status: 500 }
    );
  }
}

// Get sync status for all services
export async function GET() {
  try {
    // This would check the connection status of each service
    // For now, return a basic status
    return NextResponse.json({
      services: {
        'google-fit': { connected: false, last_sync: null },
        'dexcom': { connected: false, last_sync: null },
        'capitalone': { connected: false, last_sync: null },
        'quickbooks': { connected: false, last_sync: null },
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}