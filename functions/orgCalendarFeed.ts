import { createClient } from 'npm:@base44/sdk@0.7.1';

// Initialize a service client that does not depend on user authentication.
const base44 = createClient({
    service_role: Deno.env.get("BASE44_SERVICE_ROLE_KEY"),
});

const formatICSDate = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + 'Z';
};

Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);
        const organization_id = url.searchParams.get('organization_id');
        const building_id = url.searchParams.get('building_id');

        if (!organization_id || !building_id) {
            return new Response('Missing required parameters: organization_id and building_id', { status: 400 });
        }

        // Fetch data using the service client
        const [organization, bookings, rooms] = await Promise.all([
            base44.entities.Organization.get(organization_id),
            base44.entities.Booking.filter({ 
                organization_id: organization_id,
                building_id: building_id,
                status: 'approved',
                end_datetime: { $gte: new Date().toISOString() }
            }),
            base44.entities.Room.filter({ building_id: building_id })
        ]);

        if (!organization) {
            return new Response('Organization not found.', { status: 404 });
        }
        
        const getRoomNames = (roomIds) => {
            if (!roomIds || !rooms) return 'N/A';
            return roomIds.map(id => rooms.find(r => r.id === id)?.name || '').join(', ');
        };

        const icsLines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//VenuePro//Organization Calendar//EN',
            `X-WR-CALNAME:${organization.name}`,
            `X-WR-CALDESC:Public event calendar for ${organization.name}`,
            'X-WR-TIMEZONE:UTC',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        for (const event of bookings) {
            const eventDescription = event.event_description ? event.event_description.replace(/\n/g, '\\n') : `Event by ${event.organization_name}`;
            const location = getRoomNames(event.rooms).replace(/,/g, '\\,');

            const eventLines = [
                'BEGIN:VEVENT',
                `UID:${event.id}@venuepro.app`,
                `DTSTAMP:${formatICSDate(new Date())}`,
                `DTSTART:${formatICSDate(event.start_datetime)}`,
                `DTEND:${formatICSDate(event.end_datetime)}`,
                `SUMMARY:${event.event_title || 'Unnamed Event'}`,
                `DESCRIPTION:${eventDescription}`,
                `LOCATION:${location}`,
                `ORGANIZER;CN="${event.organization_name}":mailto:${organization.contact_email || 'noreply@venuepro.app'}`,
                'STATUS:CONFIRMED',
                'END:VEVENT'
            ];
            icsLines.push(...eventLines);
        }

        icsLines.push('END:VCALENDAR');
        
        const icsContent = icsLines.join('\r\n');
        const filename = `${organization.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_calendar.ics`;

        return new Response(icsContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error('Organization ICS Feed Generation Error:', error);
        return new Response(`Error generating calendar feed: ${error.message}`, { status: 500 });
    }
});