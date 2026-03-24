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
        const pathParts = url.pathname.split('/');
        
        // Expected URL format: /api/event/booking-id.ics
        const eventIdWithExt = pathParts.pop() || '';
        const eventId = eventIdWithExt.replace('.ics', '');

        if (!eventId) {
            return new Response('Event ID not provided.', { status: 400 });
        }

        const event = await base44.entities.Booking.get(eventId);
        if (!event) {
            return new Response('Event not found.', { status: 404 });
        }

        const rooms = await base44.entities.Room.filter({ building_id: event.building_id });
        const getRoomNames = (roomIds) => {
            if (!roomIds || !rooms) return 'N/A';
            return roomIds.map(id => rooms.find(r => r.id === id)?.name || 'Unknown Room').join(', ');
        };

        const icsLines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//VenuePro//Event//EN',
            'BEGIN:VEVENT',
            `UID:${event.id}@venuepro.app`,
            `DTSTAMP:${formatICSDate(new Date())}`,
            `DTSTART:${formatICSDate(event.start_datetime)}`,
            `DTEND:${formatICSDate(event.end_datetime)}`,
            `SUMMARY:${event.event_title || 'Unnamed Event'}`,
            `DESCRIPTION:${(event.event_description || `Event by ${event.organization_name}`).replace(/\n/g, '\\n')}`,
            `LOCATION:${getRoomNames(event.rooms).replace(/,/g, '\\,')}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ];
        
        const icsContent = icsLines.join('\r\n');
        const filename = `${(event.event_title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;

        return new Response(icsContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error('ICS Event Generation Error:', error);
        return new Response(`Error generating event file: ${error.message}`, { status: 500 });
    }
});