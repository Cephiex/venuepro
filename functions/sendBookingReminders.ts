import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to access all buildings and bookings
        const buildings = await base44.asServiceRole.entities.Building.list();
        
        let totalRemindersSent = 0;
        const results = [];
        
        for (const building of buildings) {
            // Skip if reminders are disabled for this building
            if (!building.reminder_enabled) {
                continue;
            }
            
            const reminderHours = building.reminder_hours_before || 24;
            const now = new Date();
            const reminderWindowStart = new Date(now.getTime() + (reminderHours * 60 * 60 * 1000));
            const reminderWindowEnd = new Date(reminderWindowStart.getTime() + (60 * 60 * 1000)); // 1 hour window
            
            // Get all approved bookings for this building
            const bookings = await base44.asServiceRole.entities.Booking.filter({
                building_id: building.id,
                status: 'approved'
            });
            
            // Filter bookings that fall within the reminder window and haven't been sent a reminder yet
            const bookingsNeedingReminder = bookings.filter(booking => {
                const startTime = new Date(booking.start_datetime);
                return startTime >= reminderWindowStart && startTime <= reminderWindowEnd && !booking.reminder_sent;
            });
            
            // Get rooms for this building (for display in emails)
            const rooms = await base44.asServiceRole.entities.Room.filter({ building_id: building.id });
            
            // Get admins if needed
            let admins = [];
            if (building.reminder_to_admins) {
                admins = await base44.asServiceRole.entities.User.filter({
                    building_id: building.id,
                    role: 'admin'
                });
            }
            
            for (const booking of bookingsNeedingReminder) {
                try {
                    // Get room names
                    const roomNames = booking.rooms?.map(roomId => {
                        const room = rooms.find(r => r.id === roomId);
                        return room?.name || 'Unknown Room';
                    }).join(', ') || 'No rooms assigned';
                    
                    // Format dates
                    const startDateTime = new Date(booking.start_datetime);
                    const endDateTime = new Date(booking.end_datetime);
                    
                    const formatDateTime = (date) => {
                        return date.toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    };
                    
                    const formatTime = (date) => {
                        return date.toLocaleString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    };
                    
                    // Create email content
                    const subject = `Reminder: ${booking.event_title} - Tomorrow`;
                    const emailBody = `
Hello,

This is a friendly reminder about your upcoming booking at ${building.name}.

📅 Event Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event: ${booking.event_title}
Organization: ${booking.organization_name}
Date & Time: ${formatDateTime(startDateTime)}
End Time: ${formatTime(endDateTime)}
Location: ${roomNames}
${booking.expected_attendance ? `Expected Attendance: ${booking.expected_attendance} people` : ''}

${booking.event_description ? `Description:
${booking.event_description}
` : ''}
${booking.special_requirements ? `Special Requirements:
${booking.special_requirements}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 Contact Information:
${booking.contact_name ? `Name: ${booking.contact_name}` : ''}
Email: ${booking.contact_email}
${booking.contact_phone ? `Phone: ${booking.contact_phone}` : ''}

If you need to make any changes to this booking or have questions, please contact ${building.name} administration at ${building.admin_email}.

Thank you,
${building.name} Management System
                    `.trim();
                    
                    // Send to booking contact
                    if (building.reminder_to_contact && booking.contact_email) {
                        await base44.asServiceRole.integrations.Core.SendEmail({
                            to: booking.contact_email,
                            subject: subject,
                            body: emailBody
                        });
                        totalRemindersSent++;
                    }
                    
                    // Send to admins
                    if (building.reminder_to_admins && admins.length > 0) {
                        const adminSubject = `Reminder: Upcoming Event - ${booking.event_title}`;
                        const adminEmailPromises = admins.map(admin =>
                            base44.asServiceRole.integrations.Core.SendEmail({
                                to: admin.email,
                                subject: adminSubject,
                                body: emailBody
                            }).catch(err => console.error(`Failed to send reminder to admin ${admin.email}:`, err))
                        );
                        await Promise.all(adminEmailPromises);
                        totalRemindersSent += admins.length;
                    }
                    
                    // Mark reminder as sent
                    await base44.asServiceRole.entities.Booking.update(booking.id, {
                        reminder_sent: true
                    });
                    
                    results.push({
                        booking_id: booking.id,
                        event_title: booking.event_title,
                        status: 'sent'
                    });
                    
                } catch (error) {
                    console.error(`Failed to send reminder for booking ${booking.id}:`, error);
                    results.push({
                        booking_id: booking.id,
                        event_title: booking.event_title,
                        status: 'failed',
                        error: error.message
                    });
                }
            }
        }
        
        return Response.json({
            success: true,
            total_reminders_sent: totalRemindersSent,
            buildings_processed: buildings.length,
            results: results
        });
        
    } catch (error) {
        console.error('Error in sendBookingReminders:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});