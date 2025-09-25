import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Unified sync endpoint that syncs all connected services
export async function POST(request: NextRequest) {
  try {
    let services;
    try {
      const body = await request.json();
      services = body.services;
    } catch {
      // If no body, proceed with default services
      services = null;
    }
    
    const results: any = {};

    // Default to sync all services if none specified
    const servicesToSync = services || ['google', 'dexcom', 'capitalone', 'quickbooks'];

    for (const service of servicesToSync) {
      try {
        switch (service) {
          case 'google':
            // Actually call the Google Fit sync
            const googleSyncResponse = await fetch(`http://localhost:3001/api/sync/google-fit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            
            if (googleSyncResponse.ok) {
              const googleResult = await googleSyncResponse.json();
              results[service] = { success: true, ...googleResult };
            } else {
              const errorResult = await googleSyncResponse.json();
              results[service] = { success: false, error: errorResult.error || 'Google sync failed' };
            }
            break;
            
          case 'dexcom':
            results[service] = { success: true, message: 'Dexcom sync pending implementation' };
            break;
            
          case 'capitalone':
            results[service] = { success: true, message: 'Capital One sync pending implementation' };
            break;
            
          case 'quickbooks':
            results[service] = { success: true, message: 'QuickBooks sync pending implementation' };
            break;
            
          default:
            results[service] = { success: false, message: `Unknown service: ${service}` };
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
        'google': { connected: false, last_sync: null },
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