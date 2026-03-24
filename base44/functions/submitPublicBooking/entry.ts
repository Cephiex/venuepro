import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const bookingData = await req.json();
        
        if (!bookingData.building_id) {
            return new Response(JSON.stringify({ error: 'building_id is required' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate required fields
        const requiredFields = ['organization_id', 'contact_name', 'contact_email', 'event_title', 'start_datetime', 'end_datetime'];
        for (const field of requiredFields) {
            if (!bookingData[field]) {
                return new Response(JSON.stringify({ error: `${field} is required` }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        if (!bookingData.rooms || bookingData.rooms.length === 0) {
            return new Response(JSON.stringify({ error: 'At least one room must be selected' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify building has public booking enabled
        const building = await base44.asServiceRole.entities.Building.get(bookingData.building_id);
        if (!building.public_booking_enabled) {
            return new Response(JSON.stringify({ error: 'Public booking is not enabled for this building' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get organization details
        const organization = await base44.asServiceRole.entities.Organization.get(bookingData.organization_id);
        if (!organization || !organization.is_active) {
            return new Response(JSON.stringify({ error: 'Invalid or inactive organization' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get room names for the email
        const roomPromises = bookingData.rooms.map(roomId => 
            base44.asServiceRole.entities.Room.get(roomId)
        );
        const rooms = await Promise.all(roomPromises);
        const roomNames = rooms.map(r => r.name).join(', ');

        // Prepare booking data
        const bookingToCreate = {
            building_id: bookingData.building_id,
            organization_id: organization.id,
            organization_name: organization.name,
            organization_color: organization.color,
            contact_name: bookingData.contact_name,
            contact_email: bookingData.contact_email,
            event_title: bookingData.event_title,
            event_description: bookingData.event_description || '',
            rooms: bookingData.rooms,
            start_datetime: bookingData.start_datetime,
            end_datetime: bookingData.end_datetime,
            special_requirements: bookingData.special_requirements || '',
            status: building.require_admin_approval ? 'pending' : 'approved',
            public_token: crypto.randomUUID(),
            is_public_booking: true
        };

        // Create booking using service role to bypass RLS
        const createdBooking = await base44.asServiceRole.entities.Booking.create(bookingToCreate);
        
        // If approval is required, send notification to admins
        if (building.require_admin_approval) {
            try {
                const adminUsers = await base44.asServiceRole.entities.User.filter({ 
                    building_id: bookingData.building_id, 
                    role: 'admin' 
                });

                const bookingUrl = `${new URL(req.url).origin}/Bookings?tab=pending`;

                const adminEmailSubject = `New Public Booking Request: ${bookingData.event_title}`;
                const adminEmailBody = `
Hello,

A new public booking request has been submitted and requires your review.

📅 Event Details:
- Title: ${bookingData.event_title}
- Organization: ${organization.name}
- Contact: ${bookingData.contact_name} (${bookingData.contact_email})
- Room(s): ${roomNames}
- Date & Time: ${new Date(bookingData.start_datetime).toLocaleString()} - ${new Date(bookingData.end_datetime).toLocaleTimeString()}
${bookingData.event_description ? `- Description: ${bookingData.event_description}` : ''}
${bookingData.special_requirements ? `- Special Requirements: ${bookingData.special_requirements}` : ''}

Review and approve this booking here:
${bookingUrl}

Best regards,
${building.name} Management System
                `;

                const adminEmailPromises = adminUsers.map(admin => 
                    base44.asServiceRole.integrations.Core.SendEmail({
                        to: admin.email,
                        subject: adminEmailSubject,
                        body: adminEmailBody
                    }).catch(err => console.error(`Failed to send admin notification to ${admin.email}:`, err))
                );

                await Promise.all(adminEmailPromises);
            } catch (error) {
                console.error('Error sending admin notifications:', error);
                // Don't fail the booking if admin emails fail
            }
        }
        
        return new Response(JSON.stringify(createdBooking), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Error creating public booking:', error);
        return new Response(JSON.stringify({ 
            error: error.message || 'Failed to create booking' 
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});