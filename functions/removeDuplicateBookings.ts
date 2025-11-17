import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Helper function to introduce a delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// This function scans for and removes duplicate bookings from the system.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user and ensure they are an admin
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin' || !user.building_id) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required.' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { building_id } = user;

        // Fetch all bookings for the building
        const allBookings = await base44.asServiceRole.entities.Booking.filter({ building_id });

        const uniqueBookings = new Map();
        const duplicateIdsToDelete = [];

        for (const booking of allBookings) {
            // Normalize data for a consistent key. Trim and lowercase title.
            const title = booking.event_title?.trim().toLowerCase() || 'no_title';
            const orgId = booking.organization_id || 'no_org';
            // Normalize datetime to just the date and time (YYYY-MM-DDTHH:mm), ignoring seconds/milliseconds for broader matching.
            const startTime = new Date(booking.start_datetime).toISOString().slice(0, 16); 

            const key = `${title}|${orgId}|${startTime}`;

            if (uniqueBookings.has(key)) {
                // This is a duplicate, mark it for deletion.
                duplicateIdsToDelete.push(booking.id);
            } else {
                // First time seeing this booking, keep it.
                uniqueBookings.set(key, booking.id);
            }
        }

        if (duplicateIdsToDelete.length > 0) {
            // Delete duplicates one by one with a delay to avoid rate limits.
            for (const id of duplicateIdsToDelete) {
                await base44.asServiceRole.entities.Booking.delete(id);
                await sleep(100); // Wait 100ms between each deletion
            }
        }

        return new Response(JSON.stringify({
            duplicates_found: duplicateIdsToDelete.length,
            duplicates_removed: duplicateIdsToDelete.length
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Error removing duplicate bookings:', error);
        return new Response(JSON.stringify({ 
            error: `An error occurred during cleanup: ${error.message}`
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});