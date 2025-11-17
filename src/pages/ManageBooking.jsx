
import { useState, useEffect, useCallback } from 'react';
import { Booking, Room, Building } from '@/entities/all';
import { SendEmail } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, MapPin, Users, Clock, AlertTriangle, CheckCircle, Loader2, Edit, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';

export default function ManageBookingPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [booking, setBooking] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [building, setBuilding] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [actionStatus, setActionStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [editData, setEditData] = useState({});

    // Memoize loadBookingData to ensure it's a stable function and prevent unnecessary re-renders or useEffect re-runs.
    // React state setters (setIsLoading, setError, setBooking, setEditData, setRooms, setBuilding) are stable and do not need to be in dependencies.
    // Imported entities (Booking, Room, Building) are also stable.
    const loadBookingData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const bookings = await Booking.filter({ public_token: token });
            if (bookings.length === 0) {
                setError("Booking not found. This link may be invalid or expired.");
                setIsLoading(false);
                return;
            }
            
            const bookingData = bookings[0];
            setBooking(bookingData);
            setEditData({
                contact_name: bookingData.contact_name || '',
                contact_phone: bookingData.contact_phone || '',
                event_title: bookingData.event_title,
                event_description: bookingData.event_description || '',
                expected_attendance: bookingData.expected_attendance || '',
                special_requirements: bookingData.special_requirements || ''
            });
            
            const [roomsData, buildingData] = await Promise.all([
                Room.filter({ building_id: bookingData.building_id }),
                Building.get(bookingData.building_id)
            ]);
            
            setRooms(roomsData);
            setBuilding(buildingData);
        } catch (err) {
            setError("Could not load booking data. The link may be invalid.");
            console.error("Error loading booking:", err);
        }
        setIsLoading(false);
    }, [token]); // `token` is the only external dependency that can change and needs to trigger re-creation of this function

    useEffect(() => {
        if (!token) {
            setError("No booking token provided. This link is invalid.");
            setIsLoading(false);
            return;
        }
        loadBookingData();
    }, [token, loadBookingData]); // `loadBookingData` is now a stable dependency due to useCallback

    const getRoomNames = (roomIds) => {
        if (!roomIds || !rooms) return 'Unknown Rooms';
        return roomIds.map(roomId => {
            const room = rooms.find(r => r.id === roomId);
            return room?.name || 'Unknown Room';
        }).join(', ');
    };

    const handleEdit = () => {
        setIsEditing(true);
        setActionStatus(null);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditData({
            contact_name: booking.contact_name || '',
            contact_phone: booking.contact_phone || '',
            event_title: booking.event_title,
            event_description: booking.event_description || '',
            expected_attendance: booking.expected_attendance || '',
            special_requirements: booking.special_requirements || ''
        });
    };

    const handleUpdateBooking = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setActionStatus(null);
        
        try {
            await Booking.update(booking.id, editData);
            
            // Send notification email to admin and contact
            const emailSubject = `Booking Updated: ${editData.event_title}`;
            const emailBody = `
A booking has been updated:

Event: ${editData.event_title}
Organization: ${booking.organization_name}
Contact: ${editData.contact_name} (${booking.contact_email})
Date: ${format(new Date(booking.start_datetime), 'PPP p')} - ${format(new Date(booking.end_datetime), 'p')}
Rooms: ${getRoomNames(booking.rooms)}

Updated by the requester via public link.

Building: ${building?.name}
            `;
            
            await SendEmail({
                to: building?.admin_email,
                subject: emailSubject,
                body: emailBody
            });
            
            setActionStatus({
                type: 'success',
                message: 'Booking updated successfully! The building administrator has been notified.'
            });
            
            // Refresh booking data
            await loadBookingData();
            setIsEditing(false);
            
        } catch (error) {
            console.error("Error updating booking:", error);
            setActionStatus({
                type: 'error',
                message: 'Failed to update booking. Please try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
            return;
        }
        
        setIsSubmitting(true);
        setActionStatus(null);
        
        try {
            if (booking.recurring_id) {
                // Cancel all future bookings in the series
                const seriesBookings = await Booking.filter({ recurring_id: booking.recurring_id });
                const futureBookings = seriesBookings.filter(b => 
                    new Date(b.start_datetime) >= new Date(booking.start_datetime)
                );
                
                await Promise.all(futureBookings.map(b => 
                    Booking.update(b.id, { status: 'cancelled' })
                ));
            } else {
                await Booking.update(booking.id, { status: 'cancelled' });
            }
            
            // Send notification email
            const emailSubject = `Booking Cancelled: ${booking.event_title}`;
            const emailBody = `
A booking has been cancelled by the requester:

Event: ${booking.event_title}
Organization: ${booking.organization_name}
Contact: ${booking.contact_name} (${booking.contact_email})
Date: ${format(new Date(booking.start_datetime), 'PPP p')} - ${format(new Date(booking.end_datetime), 'p')}
Rooms: ${getRoomNames(booking.rooms)}

${booking.recurring_id ? 'All future occurrences in this recurring series have been cancelled.' : ''}

Building: ${building?.name}
            `;
            
            await SendEmail({
                to: building?.admin_email,
                subject: emailSubject,
                body: emailBody
            });
            
            setActionStatus({
                type: 'success',
                message: `Booking cancelled successfully! ${booking.recurring_id ? 'All future occurrences have been cancelled.' : ''}`
            });
            
            // Refresh booking data
            await loadBookingData();
            
        } catch (error) {
            console.error("Error cancelling booking:", error);
            setActionStatus({
                type: 'error',
                message: 'Failed to cancel booking. Please contact the building administrator.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Booking Not Found</h2>
                        <p className="text-slate-600">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const statusColors = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        approved: "bg-green-100 text-green-800 border-green-200",
        rejected: "bg-red-100 text-red-800 border-red-200",
        cancelled: "bg-gray-100 text-gray-800 border-gray-200"
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Manage Your Booking</h1>
                    <p className="text-lg text-slate-600">{building?.name}</p>
                </div>

                {actionStatus && (
                    <div className={`p-4 rounded-lg mb-6 ${
                        actionStatus.type === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                        <div className="flex items-center gap-2">
                            {actionStatus.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            <p className="font-medium">{actionStatus.message}</p>
                        </div>
                    </div>
                )}

                <Card className="mb-6">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl">{booking.event_title}</CardTitle>
                                <p className="text-lg text-slate-600 mt-1">{booking.organization_name}</p>
                            </div>
                            <Badge className={`${statusColors[booking.status]} border font-medium`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!isEditing ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="font-medium">Date & Time</p>
                                            <p className="text-slate-600">
                                                {format(new Date(booking.start_datetime), 'PPP p')} - {format(new Date(booking.end_datetime), 'p')}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="font-medium">Location</p>
                                            <p className="text-slate-600">{getRoomNames(booking.rooms)}</p>
                                        </div>
                                    </div>
                                    
                                    {booking.expected_attendance && (
                                        <div className="flex items-center gap-3">
                                            <Users className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium">Expected Attendance</p>
                                                <p className="text-slate-600">{booking.expected_attendance} people</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="font-medium">Booking ID</p>
                                            <p className="text-slate-600 font-mono text-sm">{booking.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {booking.event_description && (
                                    <div>
                                        <h4 className="font-medium mb-2">Event Description</h4>
                                        <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{booking.event_description}</p>
                                    </div>
                                )}
                                
                                {booking.special_requirements && (
                                    <div>
                                        <h4 className="font-medium mb-2">Special Requirements</h4>
                                        <p className="text-slate-600 bg-blue-50 p-3 rounded-lg">{booking.special_requirements}</p>
                                    </div>
                                )}
                                
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-2">Contact Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        {booking.contact_name && <p><strong>Name:</strong> {booking.contact_name}</p>}
                                        <p><strong>Email:</strong> {booking.contact_email}</p>
                                        {booking.contact_phone && <p><strong>Phone:</strong> {booking.contact_phone}</p>}
                                    </div>
                                </div>

                                {booking.status !== 'cancelled' && (
                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button onClick={handleEdit} variant="outline">
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Booking
                                        </Button>
                                        <Button onClick={handleCancelBooking} variant="outline" className="text-red-600 hover:text-red-700">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            {booking.recurring_id ? 'Cancel Series' : 'Cancel Booking'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleUpdateBooking} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="contact_name">Contact Name</Label>
                                        <Input 
                                            id="contact_name" 
                                            value={editData.contact_name} 
                                            onChange={(e) => setEditData(prev => ({...prev, contact_name: e.target.value}))} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contact_phone">Contact Phone</Label>
                                        <Input 
                                            id="contact_phone" 
                                            value={editData.contact_phone} 
                                            onChange={(e) => setEditData(prev => ({...prev, contact_phone: e.target.value}))} 
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="event_title">Event Title</Label>
                                    <Input 
                                        id="event_title" 
                                        value={editData.event_title} 
                                        onChange={(e) => setEditData(prev => ({...prev, event_title: e.target.value}))} 
                                        required 
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="event_description">Event Description</Label>
                                    <Textarea 
                                        id="event_description" 
                                        value={editData.event_description} 
                                        onChange={(e) => setEditData(prev => ({...prev, event_description: e.target.value}))} 
                                        rows={3}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="expected_attendance">Expected Attendance</Label>
                                    <Input 
                                        id="expected_attendance" 
                                        type="number"
                                        value={editData.expected_attendance} 
                                        onChange={(e) => setEditData(prev => ({...prev, expected_attendance: e.target.value}))} 
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="special_requirements">Special Requirements</Label>
                                    <Textarea 
                                        id="special_requirements" 
                                        value={editData.special_requirements} 
                                        onChange={(e) => setEditData(prev => ({...prev, special_requirements: e.target.value}))} 
                                        rows={3}
                                    />
                                </div>
                                
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Save Changes
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {booking.recurring_id && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium">This is part of a recurring booking series</span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
