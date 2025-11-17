
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// This function provides public access to booking form data for embedding
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { building_id } = await req.json();
        if (!building_id) {
            return new Response(JSON.stringify({ error: 'building_id is required' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Use service role to fetch data - bypassing RLS for public booking access
        const [buildingData, organizationsData, roomsData, bookingsData] = await Promise.all([
            base44.asServiceRole.entities.Building.get(building_id),
            base44.asServiceRole.entities.Organization.filter({ 
                building_id: building_id, 
                is_active: true 
            }),
            base44.asServiceRole.entities.Room.filter({ 
                building_id: building_id, 
                is_active: true 
            }),
            base44.asServiceRole.entities.Booking.filter({
                building_id: building_id,
                status: { $in: ['pending', 'approved'] }
            })
        ]);

        // Check if public booking is enabled
        if (!buildingData.public_booking_enabled) {
            return new Response(JSON.stringify({ 
                error: 'Public booking is not enabled for this building.' 
            }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400
            });
        }

        return new Response(JSON.stringify({
            building: buildingData,
            organizations: organizationsData,
            rooms: roomsData,
            bookings: bookingsData, // Include bookings for conflict checking
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Error fetching public booking data:', error);
        return new Response(JSON.stringify({ 
            error: 'Could not load booking form. The building may not exist or public booking may be disabled.' 
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
