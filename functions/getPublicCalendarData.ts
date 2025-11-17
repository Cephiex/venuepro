import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// This function provides public access to calendar data for embedding
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

        // Use service role to fetch data - bypassing RLS for public calendar access
        const [buildingData, bookingsData, roomsData, organizationsData] = await Promise.all([
            base44.asServiceRole.entities.Building.get(building_id),
            base44.asServiceRole.entities.Booking.filter({ 
                building_id: building_id, 
                status: "approved" 
            }, "-start_datetime"),
            base44.asServiceRole.entities.Room.filter({ building_id: building_id }),
            base44.asServiceRole.entities.Organization.filter({ building_id: building_id })
        ]);

        // Make sure organization logo URLs are publicly accessible
        const organizationsWithPublicLogos = organizationsData.map(org => ({
            ...org,
            // The UploadFile integration creates publicly accessible URLs by default
            logo_url: org.logo_url
        }));

        return new Response(JSON.stringify({
            building: buildingData,
            bookings: bookingsData,
            rooms: roomsData,
            organizations: organizationsWithPublicLogos
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Error fetching public calendar data:', error);
        return new Response(JSON.stringify({ 
            error: 'Could not load calendar data. The building may not exist or the link is incorrect.' 
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});