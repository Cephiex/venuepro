import { createClient } from 'npm:@base44/sdk@0.7.1';

// Initialize a service client that does not depend on user authentication.
const base44 = createClient({
    service_role: Deno.env.get("BASE44_SERVICE_ROLE_KEY"),
});

const formatICSDate = (date) => {
    // Converts JS Date to ICS format (YYYYMMDDTHHMMSSZ)
    if (!date) return '';
    return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + 'Z';
};

Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        
        // Expected URL format: /api/calendar/some-building-id.ics
        const buildingIdWithExt = pathParts.pop() || '';
        const buildingId = buildingIdWithExt.replace('.ics', '');

        if (!buildingId) {
            return new Response('Building ID not provided in URL.', { status: 400 });
        }

        // Fetch building and its approved bookings using the service client
        const [building, bookings, rooms] = await Promise.all([
            base44.entities.Building.get(buildingId),
            base44.entities.Booking.filter({ 
                building_id: buildingId,
                status: 'approved' 
            }),
            base44.entities.Room.filter({ building_id: buildingId })
        ]);

        if (!building) {
            return new Response('Building not found.', { status: 404 });
        }
        
        const getRoomNames = (roomIds) => {
            if (!roomIds || !rooms) return 'N/A';
            return roomIds.map(id => rooms.find(r => r.id === id)?.name || '').join(', ');
        };

        const icsLines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//VenuePro//Building Calendar//EN',
            `X-WR-CALNAME:${building.name}`,
            `X-WR-CALDESC:Public event calendar for ${building.name}`,
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
                `ORGANIZER;CN="${event.organization_name}":mailto:${event.contact_email || 'noreply@venuepro.app'}`,
                'STATUS:CONFIRMED',
                'END:VEVENT'
            ];
            icsLines.push(...eventLines);
        }

        icsLines.push('END:VCALENDAR');
        
        const icsContent = icsLines.join('\r\n');

        return new Response(icsContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="${building.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_calendar.ics"`
            }
        });

    } catch (error) {
        console.error('ICS Feed Generation Error:', error);
        return new Response(`Error generating calendar feed: ${error.message}`, { status: 500 });
    }
});