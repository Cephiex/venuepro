
import { useState, useEffect } from 'react';
import { User, Organization, Room, Booking, Building } from '@/entities/all';
import { UploadFile, InvokeLLM } from '@/integrations/Core';
import { processCsvWithAI } from '@/functions/processCsvWithAI';
import { removeDuplicateBookings } from '@/functions/removeDuplicateBookings';
import { sendBookingReminders } from '@/functions/sendBookingReminders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, UploadCloud, Download, AlertTriangle, CheckCircle, Globe, Copy, Check, CalendarIcon, Trash2, Tv2 } from 'lucide-react';
import { createPageUrl } from "@/utils";

export default function SettingsPage() {
    const [user, setUser] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [profileData, setProfileData] = useState({ full_name: '', phone: '' });
    const [buildingData, setBuildingData] = useState({ 
        name: '', 
        public_booking_enabled: false, 
        require_admin_approval: true, 
        show_capacity_publicly: true, 
        show_rate_publicly: true,
        reminder_enabled: false,
        reminder_hours_before: 24,
        reminder_to_contact: true,
        reminder_to_admins: false,
    });
    const [initialBuilding, setInitialBuilding] = useState(null);

    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [organizationName, setOrganizationName] = useState('');

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingBuilding, setIsSavingBuilding] = useState(false);
    const [isSavingOrg, setIsSavingOrg] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isSendingReminders, setIsSendingReminders] = useState(false);
    
    const [csvFile, setCsvFile] = useState(null);
    const [importStatus, setImportStatus] = useState(null);

    const [copySuccess, setCopySuccess] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const userData = await User.me();
            setUser(userData);
            setProfileData({ full_name: userData.full_name || '', phone: userData.phone || '' });

            if (userData.building_id) {
                const buildingDbData = await Building.get(userData.building_id);
                setInitialBuilding(buildingDbData);
                setBuildingData({
                    name: buildingDbData.name || '',
                    public_booking_enabled: Boolean(buildingDbData.public_booking_enabled),
                    require_admin_approval: buildingDbData.require_admin_approval !== false,
                    show_capacity_publicly: buildingDbData.show_capacity_publicly !== false, // Default to true if undefined
                    show_rate_publicly: buildingDbData.show_rate_publicly !== false, // Default to true if undefined
                    reminder_enabled: buildingDbData.reminder_enabled !== false, // Default to true if undefined
                    reminder_hours_before: buildingDbData.reminder_hours_before || 24,
                    reminder_to_contact: buildingDbData.reminder_to_contact !== false, // Default to true if undefined
                    reminder_to_admins: buildingDbData.reminder_to_admins || false,
                });
                
                if (userData.role === 'admin') {
                    const [orgsData, roomsData] = await Promise.all([
                        Organization.filter({ building_id: userData.building_id }),
                        Room.filter({ building_id: userData.building_id })
                    ]);
                    setOrganizations(orgsData);
                    setRooms(roomsData);
                }
            }
        } catch (error) {
            console.error("Failed to load settings data", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        loadData();
    }, []);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            await User.update(user.id, profileData);
            setImportStatus({ type: 'success', message: 'Profile updated successfully!' });
        } catch (error) {
            setImportStatus({ type: 'error', message: 'Failed to update profile.' });
        } finally {
            setIsSavingProfile(false);
            setTimeout(() => setImportStatus(null), 3000);
        }
    };
    
    const handleBuildingUpdate = async (e) => {
        e.preventDefault();
        if (user?.role !== 'admin' || !initialBuilding) {
            setImportStatus({ type: 'error', message: 'Admin access required or no building data loaded.' });
            return;
        }

        setIsSavingBuilding(true);
        setImportStatus(null);
        
        try {
            await Building.update(user.building_id, {
                name: buildingData.name,
                admin_email: initialBuilding.admin_email,
                public_booking_enabled: buildingData.public_booking_enabled,
                require_admin_approval: buildingData.require_admin_approval,
                show_capacity_publicly: buildingData.show_capacity_publicly,
                show_rate_publicly: buildingData.show_rate_publicly,
                reminder_enabled: buildingData.reminder_enabled,
                reminder_hours_before: buildingData.reminder_hours_before,
                reminder_to_contact: buildingData.reminder_to_contact,
                reminder_to_admins: buildingData.reminder_to_admins,
            });

            // Reload building data
            const updatedBuilding = await Building.get(user.building_id);
            setInitialBuilding(updatedBuilding);
            setBuildingData({
                name: updatedBuilding.name || '',
                public_booking_enabled: Boolean(updatedBuilding.public_booking_enabled),
                require_admin_approval: updatedBuilding.require_admin_approval !== false,
                show_capacity_publicly: updatedBuilding.show_capacity_publicly !== false,
                show_rate_publicly: updatedBuilding.show_rate_publicly !== false,
                reminder_enabled: updatedBuilding.reminder_enabled !== false,
                reminder_hours_before: updatedBuilding.reminder_hours_before || 24,
                reminder_to_contact: updatedBuilding.reminder_to_contact !== false,
                reminder_to_admins: updatedBuilding.reminder_to_admins || false,
            });

            setImportStatus({ type: 'success', message: 'Building settings saved successfully!' });
        } catch (error) {
            setImportStatus({ type: 'error', message: `Save failed: ${error.message}` });
        } finally {
            setIsSavingBuilding(false);
            setTimeout(() => setImportStatus(null), 5000);
        }
    };

    const handleOrgUpdate = async (e) => {
        e.preventDefault();
        if (!selectedOrgId) return;
        setIsSavingOrg(true);
        try {
            await Organization.update(selectedOrgId, { name: organizationName });
            const orgsData = await Organization.filter({ building_id: user.building_id });
            setOrganizations(orgsData);
            setImportStatus({ type: 'success', message: 'Organization name updated!' });
        } catch (error) {
            setImportStatus({ type: 'error', message: 'Failed to update organization.' });
        } finally {
            setIsSavingOrg(false);
            setTimeout(() => setImportStatus(null), 3000);
        }
    };

    const handleOrgSelectChange = (orgId) => {
        setSelectedOrgId(orgId);
        const org = organizations.find(o => o.id === orgId);
        if (org) setOrganizationName(org.name);
    };

    const handleFileChange = (e) => {
        setCsvFile(e.target.files[0]);
        setImportStatus(null); // Clear status when a new file is selected
    };

    const handleImportBookings = async () => {
        if (!csvFile) {
            setImportStatus({ type: 'error', message: 'Please select a CSV file first.' });
            return;
        }
        setIsImporting(true);
        setImportStatus(null); // Clear status at the start of a new import

        try {
            // 1. Upload file
            const { file_url } = await UploadFile({ file: csvFile });
            setImportStatus({ type: 'info', message: 'File uploaded. Parsing CSV...' });

            // 2. Call the fast backend function to parse the CSV
            const response = await processCsvWithAI({ file_url });
            const parsedData = response.data;

            if (!parsedData || parsedData.length === 0) {
                throw new Error("The backend function did not return any parsed data. Please check the CSV file format.");
            }
            setImportStatus({ type: 'info', message: `CSV parsed. ${parsedData.length} rows found. Asking AI to validate...` });

            // 3. Call the AI model from the frontend for validation
            const orgNames = organizations.map(o => o.name).join(', ');
            const roomNamesList = rooms.map(r => r.name).join(', ');

            const validationResult = await InvokeLLM({
                prompt: `You are a data validation AI. You've received structured data parsed from a CSV. Your job is to validate it.

Parsed Data:
${JSON.stringify(parsedData, null, 2)}

Validation Context:
- Available Organizations: ${orgNames}
- Available Rooms: ${roomNamesList}

Tasks:
1.  **Map Columns**: The column names might be messy. Intelligently map them to: \`event_title\`, \`organization_name\`, \`contact_email\`, \`room_names\`, \`start_datetime\`, \`end_datetime\`.
2.  **Validate Each Row**:
    *   Match \`organization_name\` to an available organization (case-insensitive, fuzzy match).
    *   Match each room in \`room_names\` to an available room.
    *   Convert dates/times to ISO 8601 format. Ensure end time is after start time.
    *   Check for a valid email format.
    *   Ensure all required fields (event_title, organization_name, room_names, start_datetime, end_datetime) are present and valid.
3.  **Return JSON**: Return a strict JSON object containing \`valid_bookings\` and \`invalid_bookings\` with clear reasons for failure.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        valid_bookings: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    event_title: { type: "string" },
                                    organization_name: { type: "string" },
                                    contact_email: { type: "string" },
                                    room_names: { type: "string" }, // Comma-separated string of room names
                                    start_datetime: { type: "string", format: "date-time" },
                                    end_datetime: { type: "string", format: "date-time" }
                                },
                                required: ["event_title", "organization_name", "room_names", "start_datetime", "end_datetime"]
                            }
                        },
                        invalid_bookings: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    original_data: { type: "object" }, // The row as it was parsed from the CSV
                                    reason: { type: "string" } // Clear reason for failure
                                },
                                required: ["original_data", "reason"]
                            }
                        },
                        summary: { type: "string" }
                    },
                    required: ["valid_bookings", "invalid_bookings"]
                }
            });

            const { valid_bookings, invalid_bookings, summary } = validationResult;
            setImportStatus({ type: 'info', message: 'AI validation complete. Checking for duplicates...' });
            
            // 4. Check for existing bookings to prevent duplicates
            const existingBookings = await Booking.filter({ building_id: user.building_id });
            
            // 5. Prepare and create bookings in bulk (excluding duplicates)
            let createdCount = 0;
            let duplicateCount = 0;
            const detailMessages = [];

            if (valid_bookings && valid_bookings.length > 0) {
                const bookingsToCreate = [];
                for (const bookingData of valid_bookings) {
                    const org = organizations.find(o => 
                        o.name.toLowerCase() === bookingData.organization_name.toLowerCase()
                    );
                    // Ensure room_names is treated as a string then split
                    const bookingRoomNames = (bookingData.room_names || '').split(',').map(name => name.trim()).filter(Boolean);
                    const roomIds = rooms
                        .filter(r => bookingRoomNames.some(rn => rn.toLowerCase() === r.name.toLowerCase()))
                        .map(r => r.id);

                    if (org && roomIds.length > 0) {
                        // Check for duplicates
                        const startDateTime = new Date(bookingData.start_datetime).toISOString();
                        const isDuplicate = existingBookings.some(existing => 
                            existing.event_title?.toLowerCase() === bookingData.event_title?.toLowerCase() &&
                            existing.organization_name?.toLowerCase() === org.name.toLowerCase() &&
                            new Date(existing.start_datetime).toISOString() === startDateTime &&
                            // Check if there's at least one common room between the existing and new booking
                            existing.rooms?.some(roomId => roomIds.includes(roomId))
                        );

                        if (isDuplicate) {
                            duplicateCount++;
                            invalid_bookings.push({
                                original_data: bookingData,
                                reason: `Duplicate booking found: "${bookingData.event_title}" for ${org.name} at ${new Date(startDateTime).toLocaleString()}`
                            });
                        } else {
                            bookingsToCreate.push({
                                building_id: user.building_id,
                                organization_id: org.id,
                                organization_name: org.name,
                                organization_color: org.color, // Assuming orgs have a color property
                                event_title: bookingData.event_title || 'Untitled Event',
                                contact_email: bookingData.contact_email,
                                rooms: roomIds,
                                start_datetime: startDateTime,
                                end_datetime: new Date(bookingData.end_datetime).toISOString(),
                                status: 'approved', // Default to approved for AI imports
                            });
                        }
                    } else {
                        // This case means AI marked it valid, but our local lookup failed -
                        // this should ideally not happen if AI validation is good.
                        invalid_bookings.push({
                            original_data: bookingData,
                            reason: `AI validated but organization "${bookingData.organization_name}" or rooms "${bookingData.room_names}" not found in current system.`
                        });
                    }
                }

                if (bookingsToCreate.length > 0) {
                    await Booking.bulkCreate(bookingsToCreate);
                    createdCount = bookingsToCreate.length;
                }
            }

            // 6. Report the final status
            const totalProcessed = createdCount + (invalid_bookings?.length || 0);

            let statusType = 'success';
            if (createdCount > 0 && invalid_bookings?.length > 0) statusType = 'warning';
            else if (createdCount === 0 && totalProcessed > 0) statusType = 'error'; // All processed rows failed, or no rows found after processing
            else if (createdCount === 0 && totalProcessed === 0 && parsedData.length > 0) statusType = 'error'; // No data was processed at all but CSV had rows

            let statusMessage = `${createdCount} of ${totalProcessed} bookings successfully imported.`;
            if (invalid_bookings?.length > 0) {
                const nonDuplicateSkipped = invalid_bookings.length - duplicateCount;
                if (duplicateCount > 0) statusMessage += ` ${duplicateCount} duplicates skipped.`;
                if (nonDuplicateSkipped > 0) statusMessage += ` ${nonDuplicateSkipped} other bookings skipped.`;
            }
            
            if (summary) {
                detailMessages.push(summary);
            }
            if (invalid_bookings && invalid_bookings.length > 0) {
                detailMessages.push('--- Skipped Rows ---');
                invalid_bookings.forEach(item => {
                    // original_data might contain more fields, try event_title, or a generic 'Title'
                    const eventTitle = item.original_data?.event_title || item.original_data?.Title || 'Untitled';
                    detailMessages.push(`• Row with event "${eventTitle}": ${item.reason}`);
                });
            }

            setImportStatus({
                type: statusType,
                message: statusMessage,
                details: detailMessages,
            });

        } catch (error) {
            console.error('Import process failed:', error);
            let errorMessage = error.data?.error || error.message || 'An unknown error occurred.';
            let errorDetails = error.data?.details ? (Array.isArray(error.data.details) ? error.data.details : [error.data.details]) : [];

            // Specific check for rate limit error
            if (error.response?.status === 429 || errorMessage.includes('Rate limit exceeded')) {
                errorMessage = "Rate limit hit during import. Please try again in a moment.";
            } else if (error.response?.data?.error?.message) {
                errorMessage = `AI validation failed: ${error.response.data.error.message}`;
            } else if (error.cause?.message) { // For local errors during LLM call
                errorMessage = `AI validation failed: ${error.cause.message}`;
            }
            
            setImportStatus({ 
                type: 'error', 
                message: `Import failed: ${errorMessage}`,
                details: errorDetails
            });
        } finally {
            setIsImporting(false);
        }
    };
    
    const downloadTemplate = () => {
        // Generate example dates in ISO format for template
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const tomorrowFourHoursLater = new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000);

        const exampleOrg1 = organizations.length > 0 ? organizations[0].name : 'Example Org 1';
        const exampleOrg2 = organizations.length > 1 ? organizations[1].name : 'Example Org 2';
        const exampleRoom1 = rooms.length > 0 ? rooms[0].name : 'Room A';
        const exampleRoom2 = rooms.length > 1 ? rooms[1].name : 'Room B';
        const exampleRoom3 = rooms.length > 2 ? rooms[2].name : 'Room C';

        const csvContent = "data:text/csv;charset=utf-8," 
            + "event_title,organization_name,contact_email,room_names,start_datetime,end_datetime\n"
            + `Team Meeting,${exampleOrg1},john.doe@example.com,${exampleRoom1},${now.toISOString()},${twoHoursLater.toISOString()}\n`
            + `Client Presentation,${exampleOrg2},jane.smith@example.com,${exampleRoom2},${tomorrow.toISOString()},${tomorrowFourHoursLater.toISOString()}\n`
            + `Workshop,${exampleOrg1},contact@example.com,${exampleRoom1},${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()},${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString()}\n`
            + `Multiple Rooms Booking,${exampleOrg2},admin@example.com,"${exampleRoom2},${exampleRoom3}",${new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()},${new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString()}`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "booking_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopy = (textToCopy, type) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopySuccess(type);
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const handleRemoveDuplicates = async () => {
        if (!window.confirm('Are you sure you want to scan for and remove duplicate bookings? This action cannot be undone.')) {
            return;
        }

        setIsCleaning(true);
        setImportStatus({ type: 'info', message: 'Scanning for duplicate bookings...' });

        try {
            const response = await removeDuplicateBookings();
            const { duplicates_removed } = response.data;

            if (duplicates_removed > 0) {
                setImportStatus({
                    type: 'success',
                    message: `Successfully removed ${duplicates_removed} duplicate booking(s).`
                });
            } else {
                setImportStatus({
                    type: 'success',
                    message: 'No duplicate bookings were found.'
                });
            }
        } catch (error) {
            console.error('Failed to remove duplicates:', error);
            setImportStatus({
                type: 'error',
                message: `Cleanup failed: ${error.data?.error || error.message || 'An unknown error occurred.'}`
            });
        } finally {
            setIsCleaning(false);
            setTimeout(() => setImportStatus(null), 5000);
        }
    };

    const handleSendRemindersNow = async () => {
        if (!window.confirm('This will send reminder emails for all approved bookings in the configured time window. Continue?')) {
            return;
        }

        setIsSendingReminders(true);
        setImportStatus({ type: 'info', message: 'Checking for bookings that need reminders...' });

        try {
            const response = await sendBookingReminders();
            const { total_reminders_sent, results } = response.data;

            if (total_reminders_sent > 0) {
                const successCount = results.filter(r => r.status === 'sent').length;
                const failCount = results.filter(r => r.status === 'failed').length;
                
                let message = `Successfully sent ${successCount} reminder(s).`;
                let details = [];
                if (failCount > 0) {
                    message += ` ${failCount} failed.`;
                    details = results.filter(r => r.status === 'failed').map(r => 
                        `• Failed to send for event "${r.event_title}": ${r.error}`
                    );
                }
                
                setImportStatus({
                    type: successCount > 0 ? 'success' : 'error',
                    message: message,
                    details: details
                });
            } else {
                setImportStatus({
                    type: 'success',
                    message: 'No bookings currently need reminders.'
                });
            }
        } catch (error) {
            console.error('Failed to send reminders:', error);
            setImportStatus({
                type: 'error',
                message: `Failed to send reminders: ${error.data?.error || error.message || 'An unknown error occurred.'}`
            });
        } finally {
            setIsSendingReminders(false);
            setTimeout(() => setImportStatus(null), 5000);
        }
    };

    const publicBookingUrl = user?.building_id 
        ? `${window.location.origin}${createPageUrl(`PublicBooking?buildingId=${user.building_id}`)}` 
        : '';

    const publicCalendarUrl = user?.building_id 
        ? `${window.location.origin}${createPageUrl(`PublicCalendar?buildingId=${user.building_id}`)}` 
        : '';
        
    const publicScrollerUrl = user?.building_id
        ? `${window.location.origin}${createPageUrl(`PublicEventsScroller?buildingId=${user.building_id}`)}`
        : '';

    const kioskCalendarUrl = user?.building_id
        ? `${window.location.origin}${createPageUrl(`KioskCalendar?buildingId=${user.building_id}`)}`
        : '';

    const bookingIframeCode = user?.building_id 
        ? `<iframe src="${publicBookingUrl}" width="100%" height="800" frameborder="0" style="border: 1px solid #ccc; border-radius: 8px;"></iframe>`
        : '';

    const calendarIframeCode = user?.building_id 
        ? `<iframe src="${publicCalendarUrl}" width="100%" height="600" frameborder="0" style="border: 1px solid #ccc; border-radius: 8px;"></iframe>`
        : '';
        
    const scrollerIframeCode = user?.building_id
        ? `<iframe src="${publicScrollerUrl}" width="100%" height="600" frameborder="0" style="border: 0;"></iframe>`
        : '';

    const kioskIframeCode = user?.building_id
        ? `<iframe src="${kioskCalendarUrl}" width="100%" height="600" frameborder="0" style="border: 0;"></iframe>`
        : '';

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }
    
    const isAdmin = user?.role === 'admin';

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Settings</h1>
                <p className="text-slate-600 mb-8">Manage your profile, organization, and building settings.</p>

                {importStatus && (
                    <div className={`p-4 rounded-lg mb-6 border ${
                        importStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                        importStatus.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                        'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}>
                        <div className="flex items-center gap-2 mb-2">
                            {importStatus.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                            <p className="font-medium">{importStatus.message}</p>
                        </div>
                        {importStatus.details && importStatus.details.length > 0 && (
                            <div className="mt-3 text-sm space-y-1">
                                {importStatus.details.map((detail, index) => (
                                    <p key={`detail-${index}`} className={`${detail.startsWith('•') ? 'ml-4' : 'font-medium mt-2'}`}>
                                        {detail}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="space-y-8">
                    {/* Profile Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={user?.email} disabled /></div>
                                <div className="space-y-2"><Label htmlFor="full_name">Full Name</Label><Input id="full_name" value={profileData.full_name} onChange={(e) => setProfileData({...profileData, full_name: e.target.value})} /></div>
                                <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} /></div>
                                <Button type="submit" disabled={isSavingProfile}>{isSavingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Profile</Button>
                            </form>
                        </CardContent>
                    </Card>

                    {isAdmin && (
                    <>
                        <Card>
                            <CardHeader><CardTitle>Building Settings</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleBuildingUpdate} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="building-name">Building Name</Label>
                                        <Input 
                                            id="building-name" 
                                            value={buildingData.name} 
                                            onChange={(e) => setBuildingData(prev => ({ ...prev, name: e.target.value }))} 
                                        />
                                    </div>
                                    <div className="space-y-4 border-t pt-4">
                                        <h4 className="font-medium">Public Booking Settings</h4>
                                        <div className="flex items-center space-x-3">
                                            <Checkbox 
                                                id="public-booking" 
                                                checked={buildingData.public_booking_enabled} 
                                                onCheckedChange={(checked) => setBuildingData(prev => ({ ...prev, public_booking_enabled: Boolean(checked) }))} 
                                            />
                                            <Label htmlFor="public-booking" className="cursor-pointer">Enable public booking requests</Label>
                                        </div>
                                        {buildingData.public_booking_enabled && (
                                            <div className="ml-6 space-y-4">
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox 
                                                        id="require-approval" 
                                                        checked={buildingData.require_admin_approval} 
                                                        onCheckedChange={(checked) => setBuildingData(prev => ({ ...prev, require_admin_approval: Boolean(checked) }))} 
                                                    />
                                                    <Label htmlFor="require-approval" className="cursor-pointer">Require admin approval for public bookings</Label>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id="show-capacity"
                                                        checked={buildingData.show_capacity_publicly}
                                                        onCheckedChange={(checked) => setBuildingData(prev => ({ ...prev, show_capacity_publicly: Boolean(checked) }))}
                                                    />
                                                    <Label htmlFor="show-capacity" className="cursor-pointer">Show room capacity on public forms</Label>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id="show-rate"
                                                        checked={buildingData.show_rate_publicly}
                                                        onCheckedChange={(checked) => setBuildingData(prev => ({ ...prev, show_rate_publicly: Boolean(checked) }))}
                                                    />
                                                    <Label htmlFor="show-rate" className="cursor-pointer">Show room rate on public forms</Label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-4 border-t pt-4">
                                        <h4 className="font-medium">Automated Booking Reminders</h4>
                                        <div className="flex items-center space-x-3">
                                            <Checkbox 
                                                id="reminder-enabled" 
                                                checked={buildingData.reminder_enabled} 
                                                onCheckedChange={(checked) => setBuildingData(prev => ({ ...prev, reminder_enabled: Boolean(checked) }))} 
                                            />
                                            <Label htmlFor="reminder-enabled" className="cursor-pointer">Enable automated booking reminders</Label>
                                        </div>
                                        {buildingData.reminder_enabled && (
                                            <div className="ml-6 space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="reminder-hours">Send reminder this many hours before event</Label>
                                                    <Input
                                                        id="reminder-hours"
                                                        type="number"
                                                        min="1"
                                                        max="168"
                                                        value={buildingData.reminder_hours_before}
                                                        onChange={(e) => setBuildingData(prev => ({ ...prev, reminder_hours_before: parseInt(e.target.value) || 24 }))}
                                                        className="w-32"
                                                    />
                                                    <p className="text-sm text-slate-500">
                                                        Current setting: {buildingData.reminder_hours_before} hours ({Math.floor(buildingData.reminder_hours_before / 24)} days) before the event
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id="reminder-to-contact"
                                                        checked={buildingData.reminder_to_contact}
                                                        onCheckedChange={(checked) => setBuildingData(prev => ({ ...prev, reminder_to_contact: Boolean(checked) }))}
                                                    />
                                                    <Label htmlFor="reminder-to-contact" className="cursor-pointer">Send reminder to booking contact</Label>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id="reminder-to-admins"
                                                        checked={buildingData.reminder_to_admins}
                                                        onCheckedChange={(checked) => setBuildingData(prev => ({ ...prev, reminder_to_admins: Boolean(checked) }))}
                                                    />
                                                    <Label htmlFor="reminder-to-admins" className="cursor-pointer">Send reminder to building administrators</Label>
                                                </div>
                                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                                    <p className="font-medium mb-1">📧 How reminders work:</p>
                                                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                                                        <li>Reminders are sent automatically for approved bookings that are within the configured `reminder_hours_before` window.</li>
                                                        <li>Each booking receives only one reminder.</li>
                                                        <li>Reminders include event details and contact information.</li>
                                                        <li>Use the "Send Reminders Now" button in "Data Cleanup & Automation" to test or manually trigger reminders.</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isSavingBuilding}>
                                            {isSavingBuilding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} 
                                            Save Settings
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Public Booking Integration */}
                        {buildingData.public_booking_enabled && (
                        <Card>
                            <CardHeader><CardTitle>Public Booking Integration</CardTitle><CardDescription>Allow external users to request bookings through a public form.</CardDescription></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2"><Label>Public Booking URL</Label><div className="flex space-x-2"><Input value={publicBookingUrl} readOnly /><Button onClick={() => handleCopy(publicBookingUrl, 'BookingURL')} size="sm">{copySuccess === 'BookingURL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                                <div className="space-y-2"><Label>Embed Code (iframe)</Label><div className="flex space-x-2"><Input value={bookingIframeCode} readOnly /><Button onClick={() => handleCopy(bookingIframeCode, 'BookingIframe')} size="sm">{copySuccess === 'BookingIframe' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg"><div className="flex items-start gap-2"><Globe className="w-4 h-4 text-blue-600 mt-0.5" /><div><p className="text-sm text-blue-800 font-medium">Public Booking Active</p><p className="text-sm text-blue-700 mt-1">{buildingData.require_admin_approval ? 'Requests will need your approval.' : 'Requests will be auto-approved.'}</p></div></div></div>
                                {copySuccess && copySuccess.includes('Booking') && (<div className="text-center"><Badge variant="secondary">Booking {copySuccess.includes('URL') ? 'URL' : 'iframe'} copied!</Badge></div>)}
                            </CardContent>
                        </Card>
                        )}
                        
                        {/* Public Calendar Integration */}
                        <Card>
                            <CardHeader><CardTitle>Public Calendar Integration</CardTitle><CardDescription>Share your approved events calendar publicly or embed it on your website.</CardDescription></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2"><Label>Public Calendar URL</Label><div className="flex space-x-2"><Input value={publicCalendarUrl} readOnly /><Button onClick={() => handleCopy(publicCalendarUrl, 'CalendarURL')} size="sm">{copySuccess === 'CalendarURL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                                <div className="space-y-2"><Label>Embed Code (iframe)</Label><div className="flex space-x-2"><Input value={calendarIframeCode} readOnly /><Button onClick={() => handleCopy(calendarIframeCode, 'CalendarIframe')} size="sm">{copySuccess === 'CalendarIframe' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg"><div className="flex items-start gap-2"><CalendarIcon className="w-4 h-4 text-green-600 mt-0.5" /><div><p className="text-sm text-green-800 font-medium">Public Calendar Available</p><p className="text-sm text-green-700 mt-1">Shows all approved events from your building.</p></div></div></div>
                                {copySuccess && copySuccess.includes('Calendar') && (<div className="text-center"><Badge variant="secondary">Calendar {copySuccess.includes('URL') ? 'URL' : 'iframe'} copied!</Badge></div>)}
                            </CardContent>
                        </Card>

                        {/* Public Events Scroller Integration */}
                        <Card>
                            <CardHeader><CardTitle>Public Events Scroller</CardTitle><CardDescription>Embed a live, auto-scrolling list of upcoming events for display screens.</CardDescription></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2"><Label>Scroller URL</Label><div className="flex space-x-2"><Input value={publicScrollerUrl} readOnly /><Button onClick={() => handleCopy(publicScrollerUrl, 'ScrollerURL')} size="sm">{copySuccess === 'ScrollerURL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                                <div className="space-y-2"><Label>Embed Code (iframe)</Label><div className="flex space-x-2"><Input value={scrollerIframeCode} readOnly /><Button onClick={() => handleCopy(scrollerIframeCode, 'ScrollerIframe')} size="sm">{copySuccess === 'ScrollerIframe' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="flex items-start gap-2"><Tv2 className="w-4 h-4 text-indigo-600 mt-0.5" /><div><p className="text-sm text-indigo-800 font-medium">Live Events Display</p><p className="text-sm text-indigo-700 mt-1">Ideal for lobby TVs and digital signage, showing events in the next 30 days.</p></div></div></div>
                                {copySuccess && copySuccess.includes('Scroller') && (<div className="text-center"><Badge variant="secondary">Scroller {copySuccess.includes('URL') ? 'URL' : 'iframe'} copied!</Badge></div>)}
                            </CardContent>
                        </Card>
                        
                        {/* Kiosk Calendar Integration */}
                        <Card>
                            <CardHeader><CardTitle>Kiosk Calendar Display</CardTitle><CardDescription>A minimal month-view calendar perfect for kiosks, lobby displays, and embedding without any navigation or headers.</CardDescription></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2"><Label>Kiosk Calendar URL</Label><div className="flex space-x-2"><Input value={kioskCalendarUrl} readOnly /><Button onClick={() => handleCopy(kioskCalendarUrl, 'KioskURL')} size="sm">{copySuccess === 'KioskURL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                                <div className="space-y-2"><Label>Embed Code (iframe)</Label><div className="flex space-x-2"><Input value={kioskIframeCode} readOnly /><Button onClick={() => handleCopy(kioskIframeCode, 'KioskIframe')} size="sm">{copySuccess === 'KioskIframe' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg"><div className="flex items-start gap-2"><Tv2 className="w-4 h-4 text-purple-600 mt-0.5" /><div><p className="text-sm text-purple-800 font-medium">Clean Kiosk Display</p><p className="text-sm text-purple-700 mt-1">Shows current month calendar with no navigation. Perfect for embedding in kiosks, tablets, and public displays.</p></div></div></div>
                                {copySuccess && copySuccess.includes('Kiosk') && (<div className="text-center"><Badge variant="secondary">Kiosk {copySuccess.includes('URL') ? 'URL' : 'iframe'} copied!</Badge></div>)}
                            </CardContent>
                        </Card>
                        
                        {/* Organization Settings */}
                        <Card>
                            <CardHeader><CardTitle>Organization Settings</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleOrgUpdate} className="space-y-4">
                                    <div className="space-y-2"><Label>Select Organization</Label><Select onValueChange={handleOrgSelectChange}><SelectTrigger><SelectValue placeholder="Select an organization..." /></SelectTrigger><SelectContent>{organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}</SelectContent></Select></div>
                                    {selectedOrgId && (<div className="space-y-2"><Label htmlFor="org_name">Organization Name</Label><Input id="org_name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} /></div>)}
                                    <Button type="submit" disabled={isSavingOrg || !selectedOrgId}>{isSavingOrg && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Update Organization</Button>
                                </form>
                            </CardContent>
                        </Card>
                        
                        {/* Import Bookings */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Import Bookings with AI</CardTitle>
                                <CardDescription>
                                    Bulk upload bookings from a CSV file. Our AI will automatically map columns and process your data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label htmlFor="csv_import">CSV File</Label><Input id="csv_import" type="file" accept=".csv" onChange={handleFileChange} /></div>
                                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                                    <p className="font-medium mb-2">AI will intelligently map your columns to these fields:</p>
                                    <p className="font-mono text-xs mb-2"><code>event_title, organization_name, contact_email, room_names, start_datetime, end_datetime</code></p>
                                    <p className="font-medium mb-1">How it works:</p>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                        <li>Handles common variations in column names (e.g., "Event Title", "title").</li>
                                        <li>Matches organization and room names from your system (case-insensitive).</li>
                                        <li>Accepts various common date formats.</li>
                                        <li>Provides a detailed report on any rows that were skipped.</li>
                                        <li>**Prevents duplicate entries.**</li>
                                    </ul>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleImportBookings} disabled={isImporting || !csvFile}>
                                        {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        <UploadCloud className="w-4 h-4 mr-2" />
                                        {isImporting ? 'Processing...' : 'Import & Validate'}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={downloadTemplate}>
                                        <Download className="w-4 h-4 mr-2" />Template
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Data Cleanup & Automation */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Data Cleanup & Automation</CardTitle>
                                <CardDescription>
                                    Perform maintenance tasks and trigger automated processes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label htmlFor="send-reminders" className="font-medium">Send Booking Reminders Now</Label>
                                    <p className="text-sm text-slate-500 mt-1 mb-3">
                                        Manually trigger the reminder system to check for upcoming approved bookings and send reminder emails based on your settings above.
                                    </p>
                                    <Button 
                                        id="send-reminders"
                                        variant="default"
                                        onClick={handleSendRemindersNow} 
                                        disabled={isSendingReminders || !buildingData.reminder_enabled}
                                    >
                                        {isSendingReminders && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        <CalendarIcon className="w-4 h-4 mr-2" />
                                        {isSendingReminders ? 'Sending...' : 'Send Reminders Now'}
                                    </Button>
                                    {!buildingData.reminder_enabled && (
                                        <p className="text-sm text-amber-600 mt-2">
                                            Enable automated reminders in the Building Settings above to use this feature.
                                        </p>
                                    )}
                                </div>
                                
                                <div className="border-t pt-4">
                                    <Label htmlFor="remove-duplicates" className="font-medium">Remove Duplicate Bookings</Label>
                                    <p className="text-sm text-slate-500 mt-1 mb-3">
                                        Scans all bookings and removes entries that have the same title, organization, and start time.
                                    </p>
                                    <Button 
                                        id="remove-duplicates"
                                        variant="destructive"
                                        onClick={handleRemoveDuplicates} 
                                        disabled={isCleaning}
                                    >
                                        {isCleaning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {isCleaning ? 'Scanning...' : 'Remove Duplicates'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}
