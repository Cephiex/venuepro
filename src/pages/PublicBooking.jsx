import { useState, useEffect, useCallback } from 'react';
import { SendEmail } from '@/integrations/Core';
import { getPublicBookingData } from '@/functions/getPublicBookingData';
import { submitPublicBooking } from '@/functions/submitPublicBooking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import DateTimePicker from '@/components/ui/DateTimePicker';

export default function PublicBookingPage() {
    const [searchParams] = useSearchParams();
    const buildingId = searchParams.get('buildingId');
    
    const [building, setBuilding] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitStatus, setSubmitStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [conflictError, setConflictError] = useState('');
    const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
    const [conflictingRooms, setConflictingRooms] = useState(new Map()); // Store Map<Room ID, Organization Name>
    
    const [formData, setFormData] = useState({
        organization_id: '',
        contact_name: '',
        contact_email: '',
        event_title: '',
        event_description: '',
        start_datetime: '',
        end_datetime: '',
        special_requirements: ''
    });
    
    const [selectedRooms, setSelectedRooms] = useState([]);

    const loadPublicData = useCallback(async () => {
        setIsLoading(true);
        setError('');

        if (!buildingId) {
            setError("No building specified. This booking form is not properly configured.");
            setIsLoading(false);
            return []; // Return empty array if no buildingId
        }

        try {
            // Use our backend function to get public booking data
            const response = await getPublicBookingData({ building_id: buildingId });
            const data = response.data;
            
            setBuilding(data.building);
            setOrganizations(data.organizations);
            setRooms(data.rooms);
            return data.bookings || []; // Return bookings for conflict check
        } catch (err) {
            setError("Could not load booking form. The building may not exist or public booking may be disabled.");
            console.error("Error loading public booking data:", err);
            return []; // Return empty array on error
        } finally {
            setIsLoading(false);
        }
    }, [buildingId]);

    useEffect(() => {
        loadPublicData();
    }, [loadPublicData]);

    // Find all unavailable rooms for a given time slot
    const findUnavailableRooms = useCallback(async (startDateTime, endDateTime) => {
        if (!startDateTime || !endDateTime || !buildingId) {
            return new Map();
        }

        try {
            setIsCheckingConflicts(true);
            const response = await getPublicBookingData({ building_id: buildingId }); // Re-fetch for fresh data
            const existingBookings = response.data.bookings || [];

            const startTime = new Date(startDateTime);
            const endTime = new Date(endDateTime);

            const conflictMap = new Map();
            existingBookings.forEach(existingBooking => {
                const existingStart = new Date(existingBooking.start_datetime);
                const existingEnd = new Date(existingBooking.end_datetime);
                if (startTime < existingEnd && endTime > existingStart) {
                    existingBooking.rooms?.forEach(roomId => {
                        const actualRoomId = typeof roomId === 'object' ? roomId.id : roomId;
                        if (!conflictMap.has(actualRoomId)) {
                            conflictMap.set(actualRoomId, existingBooking.organization_name || 'Another Org');
                        }
                    });
                }
            });
            return conflictMap;
        } catch (error) {
            console.error('Error finding unavailable rooms:', error);
            return new Map();
        } finally {
            setIsCheckingConflicts(false);
        }
    }, [buildingId]);

    // Debounced availability checking
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (!formData.start_datetime || !formData.end_datetime) {
                setConflictingRooms(new Map());
                setConflictError('');
                return;
            }
            
            if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
                setConflictingRooms(new Map()); // Clear conflicting rooms if dates are invalid
                setConflictError('End time must be after start time.');
                return;
            }

            const unavailableRoomMap = await findUnavailableRooms(
                formData.start_datetime, 
                formData.end_datetime
            );
            setConflictingRooms(unavailableRoomMap);
            
            const selectedButUnavailable = selectedRooms.filter(id => unavailableRoomMap.has(id));
            if (selectedButUnavailable.length > 0) {
                const unavailableNames = selectedButUnavailable.map(id => rooms.find(r => r.id === id)?.name || 'Unknown').join(', ');
                setConflictError(`The following selected room(s) are already booked: ${unavailableNames}. Please unselect them.`);
            } else {
                setConflictError('');
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.start_datetime, formData.end_datetime, selectedRooms, rooms, findUnavailableRooms]);

    const resetSuccessState = () => {
        if (submitStatus?.type === 'success') {
            setSubmitStatus(null);
        }
        setConflictError('');
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const updatedData = { ...prev, [name]: value };
            
            // Auto-adjust end time if it's before start time
            if (name === 'start_datetime' && value) {
                const startTime = new Date(value);
                const currentEndTime = prev.end_datetime ? new Date(prev.end_datetime) : null;
                
                // If end time is not set, or is before or equal to start time, set it to 1 hour after start time
                if (!currentEndTime || currentEndTime <= startTime) {
                    const newEndTime = new Date(startTime);
                    newEndTime.setHours(newEndTime.getHours() + 1);
                    // Format to 'YYYY-MM-DDTHH:MM' for datetime-local input
                    updatedData.end_datetime = newEndTime.toISOString().slice(0, 16);
                }
            }
            
            return updatedData;
        });
        
        resetSuccessState();
    };

    const handleOrgChange = (value) => {
        setFormData(prev => ({...prev, organization_id: value}));
        resetSuccessState();
    }

    const handleRoomToggle = (roomId) => {
        setSelectedRooms(prev => 
            prev.includes(roomId) 
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId]
        );
        resetSuccessState();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);
        setConflictError(''); // Clear previous conflict error on new submission attempt
        
        // Final client-side validation
        if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
            setConflictError('End time must be after start time.');
            setIsSubmitting(false);
            return;
        }

        const selectedButUnavailable = selectedRooms.filter(id => conflictingRooms.has(id));
        if (selectedButUnavailable.length > 0) {
            const unavailableNames = selectedButUnavailable.map(id => rooms.find(r => r.id === id)?.name || 'Unknown').join(', ');
            setConflictError(`Cannot submit. Please unselect the conflicting rooms: ${unavailableNames}.`);
            setIsSubmitting(false);
            return;
        }
        
        try {
            const selectedOrg = organizations.find(org => org.id === formData.organization_id);
            if (!selectedOrg) {
                throw new Error("Please select an organization");
            }
            
            if (selectedRooms.length === 0) {
                throw new Error("Please select at least one room");
            }
            
            const bookingToCreate = {
                building_id: buildingId,
                organization_id: selectedOrg.id,
                contact_name: formData.contact_name,
                contact_email: formData.contact_email,
                event_title: formData.event_title,
                event_description: formData.event_description,
                rooms: selectedRooms,
                start_datetime: new Date(formData.start_datetime).toISOString(),
                end_datetime: new Date(formData.end_datetime).toISOString(),
                special_requirements: formData.special_requirements
            };
            
            // Use the backend function for submission
            const response = await submitPublicBooking(bookingToCreate);
            
            // Check if the response is successful
            if (response.status >= 200 && response.status < 300) {
                const createdBooking = response.data;
                
                // Send confirmation email
                const roomNames = selectedRooms.map(roomId => {
                    const room = rooms.find(r => r.id === roomId);
                    return room?.name || 'Unknown Room';
                }).join(', ');
                
                const manageUrl = `https://venumgmt.pro${createPageUrl(`ManageBooking?token=${createdBooking.public_token}`)}`;
                
                const emailSubject = `Booking Confirmation: ${formData.event_title}`;
                const emailBody = `
Hello ${formData.contact_name || 'there'},

Your booking request has been ${building.require_admin_approval ? 'submitted and is pending approval' : 'confirmed'}.

Event Details:
- Title: ${formData.event_title}
- Organization: ${selectedOrg.name}
- Room(s): ${roomNames}
- Date & Time: ${format(new Date(formData.start_datetime), 'PPP p')} - ${format(new Date(formData.end_datetime), 'p')}

You can view, edit, or cancel your booking using this link:
${manageUrl}

${building.require_admin_approval ? 'You will receive another email once your booking is reviewed by an administrator.' : ''}

Best regards,
${building.name} Management
                `;
                
                try {
                    await SendEmail({
                        to: formData.contact_email,
                        subject: emailSubject,
                        body: emailBody
                    });
                } catch (emailError) {
                    console.error("Error sending confirmation email:", emailError);
                    // Don't fail the whole process if email fails
                }
                
                setSubmitStatus({
                    type: 'success',
                    message: `Booking request submitted successfully! ${building.require_admin_approval ? 'Your request is pending approval.' : 'Your booking is confirmed.'} Check your email for details and a management link.`
                });
                
                // Reset form
                setFormData({
                    organization_id: '',
                    contact_name: '',
                    contact_email: '',
                    event_title: '',
                    event_description: '',
                    start_datetime: '',
                    end_datetime: '',
                    special_requirements: ''
                });
                setSelectedRooms([]);
                setConflictingRooms(new Map()); // Clear conflicting rooms on success
                setConflictError(''); // Ensure conflict error is cleared on success
                
            } else {
                // Handle error response
                throw new Error(response.data?.error || 'Failed to submit booking request');
            }
            
        } catch (error) {
            console.error("Error submitting booking:", error);
            
            // Better error handling for different error types
            let errorMessage = 'Failed to submit booking request. Please try again.';
            
            if (error.response) {
                // HTTP error response (e.g., from axios)
                if (error.response.data?.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response.status) {
                    errorMessage = `Server error: ${error.response.status}`;
                }
            } else if (error.data?.error) {
                // Custom error structure from our backend function
                errorMessage = error.data.error;
            } else if (error.message) {
                // Standard JavaScript error
                errorMessage = error.message;
            }
            
            setSubmitStatus({
                type: 'error',
                message: errorMessage
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Loading Booking Form</h2>
                        <p className="text-slate-600">Please wait while we prepare the form...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Booking Unavailable</h2>
                        <p className="text-slate-600">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                {submitStatus && submitStatus.type === 'error' && (
                    <div className={`p-4 sm:p-6 rounded-lg mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-800`}>
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="font-medium text-sm sm:text-base leading-relaxed">{submitStatus.message}</p>
                        </div>
                    </div>
                )}

                {/* Conflict Error Display */}
                {conflictError && (
                    <div className="p-4 sm:p-6 rounded-lg mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-800">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="font-medium text-sm sm:text-base leading-relaxed">{conflictError}</p>
                        </div>
                    </div>
                )}

                <Card>
                    <CardContent className="p-4 sm:p-6">
                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            {/* Organization Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="organization_id" className="text-sm sm:text-base font-medium">Organization *</Label>
                                <Select value={formData.organization_id} onValueChange={handleOrgChange} required>
                                    <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                                        <SelectValue placeholder="Select organization..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations.map(org => (
                                            <SelectItem key={org.id} value={org.id} className="text-sm sm:text-base">{org.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contact_name" className="text-sm sm:text-base font-medium">Contact Name *</Label>
                                    <Input id="contact_name" name="contact_name" value={formData.contact_name} onChange={handleChange} required className="h-10 sm:h-11 text-sm sm:text-base" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_email" className="text-sm sm:text-base font-medium">Email *</Label>
                                    <Input id="contact_email" name="contact_email" type="email" value={formData.contact_email} onChange={handleChange} required className="h-10 sm:h-11 text-sm sm:text-base" />
                                </div>
                            </div>

                            {/* Event Information */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="event_title" className="text-sm sm:text-base font-medium">Event Title *</Label>
                                    <Input id="event_title" name="event_title" value={formData.event_title} onChange={handleChange} required className="h-10 sm:h-11 text-sm sm:text-base" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="event_description" className="text-sm sm:text-base font-medium">Event Description</Label>
                                    <Textarea id="event_description" name="event_description" value={formData.event_description} onChange={handleChange} rows={3} className="text-sm sm:text-base resize-none" />
                                </div>
                            </div>

                            {/* Date & Time Selection */}
                            <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_datetime" className="text-sm sm:text-base font-medium">Start Date & Time *</Label>
                                    <DateTimePicker
                                      value={formData.start_datetime}
                                      onChange={(newDateTime) => handleChange({ target: { name: 'start_datetime', value: newDateTime } })}
                                      className={`h-10 sm:h-11 text-sm sm:text-base ${conflictError ? 'border-red-300' : ''}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_datetime" className="text-sm sm:text-base font-medium">End Date & Time *</Label>
                                    <DateTimePicker
                                      value={formData.end_datetime}
                                      onChange={(newDateTime) => handleChange({ target: { name: 'end_datetime', value: newDateTime } })}
                                      className={`h-10 sm:h-11 text-sm sm:text-base ${conflictError ? 'border-red-300' : ''}`}
                                    />
                                </div>
                            </div>

                            {isCheckingConflicts && (
                                <div className="flex items-center gap-2 text-sm text-blue-600 justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Checking availability...</span>
                                </div>
                            )}

                            {/* Room Selection */}
                            <div className="space-y-3">
                                <Label className="text-sm sm:text-base font-medium">Select Rooms *</Label>
                                <div className="space-y-3">
                                    {rooms.map(room => {
                                        const conflictOrgName = conflictingRooms.get(room.id);
                                        const isConflicting = !!conflictOrgName;
                                        const isSelected = selectedRooms.includes(room.id);
                                        return (
                                            <div 
                                                key={room.id} 
                                                className={`flex items-start space-x-3 p-3 sm:p-4 border rounded-lg touch-manipulation transition-all ${
                                                    isConflicting
                                                        ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-70'
                                                        : 'hover:bg-slate-50'
                                                } ${
                                                    isSelected && isConflicting
                                                        ? 'border-red-300 bg-red-50'
                                                        : ''
                                                }`}
                                            >
                                                <Checkbox 
                                                  id={`room-${room.id}`} 
                                                  checked={isSelected} 
                                                  onCheckedChange={() => handleRoomToggle(room.id)}
                                                  disabled={isConflicting}
                                                  className="mt-1"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <Label htmlFor={`room-${room.id}`} className={`font-medium ${isConflicting ? 'cursor-not-allowed' : 'cursor-pointer'} text-sm sm:text-base block leading-tight`}>
                                                      {room.name}
                                                      {isConflicting && <span className="text-red-600 font-semibold ml-2">(Booked by {conflictOrgName})</span>}
                                                    </Label>
                                                    <div className="text-xs sm:text-sm text-slate-500 mt-1">
                                                        {building?.show_capacity_publicly && room.capacity && <p>Capacity: {room.capacity}</p>}
                                                        {building?.show_rate_publicly && room.hourly_rate ? (
                                                            <p>${room.hourly_rate}/hr</p>
                                                        ) : (building?.show_rate_publicly && <p>Contact for rate</p>)}
                                                    </div>
                                                    {room.description && (
                                                      <p className="text-xs sm:text-sm text-slate-500 mt-1 break-words">{room.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {selectedRooms.length > 0 && (
                                    <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">Selected Rooms:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRooms.map(roomId => {
                                                const room = rooms.find(r => r.id === roomId);
                                                return (
                                                    <Badge key={roomId} variant="secondary" className="bg-blue-100 text-blue-800 text-xs sm:text-sm">
                                                        {room?.name || 'Unknown Room'}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Special Requirements */}
                            <div className="space-y-2">
                                <Label htmlFor="special_requirements" className="text-sm sm:text-base font-medium">Special Requirements</Label>
                                <Textarea 
                                  id="special_requirements" 
                                  name="special_requirements" 
                                  value={formData.special_requirements} 
                                  onChange={handleChange} 
                                  placeholder="Any special setup, catering, or equipment needs..." 
                                  rows={3}
                                  className="text-sm sm:text-base resize-none"
                                />
                            </div>

                            {submitStatus?.type === 'success' ? (
                                <Button 
                                    disabled 
                                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium bg-green-600 hover:bg-green-600 cursor-not-allowed"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    {submitStatus.message}
                                </Button>
                            ) : (
                                <Button 
                                  type="submit" 
                                  disabled={isSubmitting || selectedRooms.length === 0 || !formData.organization_id || !formData.contact_name || !formData.contact_email || !formData.event_title || !formData.start_datetime || !formData.end_datetime || !!conflictError || isCheckingConflicts} 
                                  className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium touch-manipulation"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Submit Booking Request
                                </Button>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}