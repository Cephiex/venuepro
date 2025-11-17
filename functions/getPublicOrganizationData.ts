import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { organization_id, building_id } = await req.json();
        
        if (!organization_id || !building_id) {
            return new Response(JSON.stringify({ 
                error: 'organization_id and building_id are required' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Use service role for public access
        const [organization, building, rooms, bookings] = await Promise.all([
            base44.asServiceRole.entities.Organization.get(organization_id),
            base44.asServiceRole.entities.Building.get(building_id),
            base44.asServiceRole.entities.Room.filter({ building_id: building_id }),
            base44.asServiceRole.entities.Booking.filter({ 
                building_id: building_id,
                organization_id: organization_id,
                status: "approved",
                end_datetime: { $gte: new Date().toISOString() }
            }, "-start_datetime")
        ]);
        
        if (!organization || organization.building_id !== building_id) {
            return new Response(JSON.stringify({ 
                error: 'Organization not found in the specified building.' 
            }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            organization: organization,
            building: building,
            upcoming_events: bookings || [],
            rooms: rooms || []
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Error in getPublicOrganizationData:', error);
        return new Response(JSON.stringify({ 
            error: error.message || 'Failed to load organization data' 
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});