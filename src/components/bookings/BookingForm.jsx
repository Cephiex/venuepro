import { useState, useEffect, useCallback } from 'react';
import { Organization, Booking } from '@/entities/all'; // Import Booking entity
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Repeat, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { addMonths, format, getDay, startOfMonth, addDays } from 'date-fns';
import DateTimePicker from '@/components/ui/DateTimePicker'; // New import

export default function BookingForm({ open, setOpen, booking, rooms, onSubmit, userOrganizations, defaultBookingData, buildingId, isAdmin, building }) {
  const [formData, setFormData] = useState({});
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [allOrganizations, setAllOrganizations] = useState([]); // Only for admin users
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState({
    frequency: 'weekly', // 'weekly' or 'monthly'
    weekInterval: 1, // every N weeks (for weekly)
    daysOfWeek: ['monday'], // for weekly: which days; for monthly: single day
    weekOfMonth: 'first', // for monthly
    startTime: '09:00',
    endTime: '10:00',
    occurrences: 12
  });
  const [selectedOrgId, setSelectedOrgId] = useState(''); // New state for selected organization ID
  const [conflictError, setConflictError] = useState('');
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictingRooms, setConflictingRooms] = useState(new Map()); // Store IDs of unavailable rooms -> org name

  useEffect(() => {
    // Only load all organizations if the user is an admin
    const loadAllOrganizations = async () => {
      if (!buildingId) return; // Prevent API call if buildingId is not yet available
      setIsLoadingOrgs(true);
      try {
        const orgsData = await Organization.filter({ building_id: buildingId, is_active: true });
        setAllOrganizations(orgsData);
      } catch (error) {
        console.error("Error loading all organizations:", error);
      }
      setIsLoadingOrgs(false);
    };
    
    if (open && buildingId && isAdmin) {
      loadAllOrganizations();
    }
  }, [open, buildingId, isAdmin]); // Dependencies correctly include all state/props used inside

  useEffect(() => {
    if (booking) {
      // For existing bookings, find the organization ID based on name and set selectedOrgId
      const orgList = isAdmin ? allOrganizations : userOrganizations;
      const currentOrg = orgList.find(org => org.name === booking.organization_name);
      setSelectedOrgId(currentOrg ? currentOrg.id : '');

      setFormData({
        organization_name: booking.organization_name || '',
        contact_name: booking.contact_name || '',
        contact_email: booking.contact_email || '',
        contact_phone: booking.contact_phone || '',
        event_title: booking.event_title || '',
        event_description: booking.event_description || '',
        start_datetime: booking.start_datetime ? new Date(booking.start_datetime).toISOString().slice(0, 16) : '',
        end_datetime: booking.end_datetime ? new Date(booking.end_datetime).toISOString().slice(0, 16) : '',
        special_requirements: booking.special_requirements || '',
      });
      setIsRecurring(false); // Don't allow recurring options for existing bookings
      setSelectedRooms(booking.rooms || []);
    } else {
      // Reset for new booking, pre-fill if user has only one organization or default data is provided
      const initialOrg = userOrganizations?.length === 1 ? userOrganizations[0] : null;
      setSelectedOrgId(initialOrg ? initialOrg.id : ''); // Set initial selected organization ID

      const initialData = {
        organization_name: initialOrg ? initialOrg.name : '', // Pre-fill name if one org is pre-selected
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        event_title: '',
        event_description: '',
        start_datetime: '',
        end_datetime: '',
        special_requirements: '',
        ...defaultBookingData
      };
      setFormData(initialData);
      setSelectedRooms([]);
      setIsRecurring(false);
      setRecurringPattern({
        frequency: 'weekly',
        weekInterval: 1,
        daysOfWeek: ['monday'],
        weekOfMonth: 'first',
        startTime: '09:00',
        endTime: '10:00',
        occurrences: 12
      });
    }
  }, [booking, open, userOrganizations, defaultBookingData, allOrganizations, isAdmin]); // Add allOrganizations and isAdmin as dependencies

  // Find all unavailable rooms for a given time slot
  const findUnavailableRooms = useCallback(async (startDateTime, endDateTime, excludeBookingId = null) => {
    if (!startDateTime || !endDateTime || !buildingId) {
      return new Map();
    }

    try {
      setIsCheckingConflicts(true);
      const existingBookings = await Booking.filter({ 
        building_id: buildingId,
        status: ['pending', 'approved']
      });

      const startTime = new Date(startDateTime);
      const endTime = new Date(endDateTime);

      const conflictMap = new Map();

      existingBookings.forEach(existingBooking => {
        if (excludeBookingId && existingBooking.id === excludeBookingId) {
          return;
        }
        const existingStart = new Date(existingBooking.start_datetime);
        const existingEnd = new Date(existingBooking.end_datetime);
        
        if (startTime < existingEnd && endTime > existingStart) {
          existingBooking.rooms?.forEach(roomId => {
            if (!conflictMap.has(roomId)) {
              conflictMap.set(roomId, existingBooking.organization_name);
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
      // Clear conflicts when inputs are not ready
      if (!formData.start_datetime || !formData.end_datetime) {
        setConflictingRooms(new Map()); // Kept as new Map() to match state initialization
        setConflictError('');
        return;
      }
      
      // Basic time validation
      if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
        setConflictError('End time must be after start time.');
        setConflictingRooms(new Map()); // Kept as new Map() to match state initialization
        return;
      }

      // If in recurring mode (for new bookings), this immediate check is only for the first occurrence dates
      // The full recurring series conflict check happens on submit.
      if (isRecurring && !booking) {
        // We still want to show unavailable rooms, but the conflict *error message*
        // should focus on the selected rooms vs. general room availability.
        // The detailed conflict for recurring series is shown upon submission.
        setConflictError(''); 
      }
      
      // Find all unavailable rooms for the selected time
      const unavailableRoomMap = await findUnavailableRooms(
        formData.start_datetime, 
        formData.end_datetime, 
        booking?.id
      );
      setConflictingRooms(unavailableRoomMap);

      // Check if any of the currently selected rooms are now unavailable
      const selectedButUnavailable = selectedRooms.filter(id => unavailableRoomMap.has(id));
      
      if (selectedButUnavailable.length > 0) {
        const unavailableNames = selectedButUnavailable.map(id => rooms.find(r => r.id === id)?.name || 'Unknown').join(', ');
        setConflictError(`The following selected room(s) are already booked during this time: ${unavailableNames}. Please unselect them to proceed.`);
      } else { // Changed from `else if (!isRecurring)` to `else` as per outline
        setConflictError('');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [
    formData.start_datetime, 
    formData.end_datetime, 
    selectedRooms, 
    rooms, 
    booking, 
    findUnavailableRooms, 
    isRecurring,
    setConflictError, // Added for dependency warning fix
    setConflictingRooms // Added for dependency warning fix
  ]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? parseFloat(value) || '' : value;
    
    setFormData(prev => {
      const updatedData = { ...prev, [name]: newValue };
      
      // Auto-adjust end time ONLY if it is not set.
      if (name === 'start_datetime' && value && !prev.end_datetime) {
        const startTime = new Date(value);
        const newEndTime = new Date(startTime);
        newEndTime.setHours(newEndTime.getHours() + 1);
        updatedData.end_datetime = newEndTime.toISOString().slice(0, 16);
      }
      
      return updatedData;
    });
  };

  // New handler for organization selection
  const handleOrgSelectChange = (orgId) => {
    setSelectedOrgId(orgId);
    // Determine which list to search (allOrganizations for admin, userOrganizations for user)
    const orgList = isAdmin ? allOrganizations : userOrganizations;
    const org = orgList.find(o => o.id === orgId);
    setFormData(prev => ({ ...prev, organization_name: org ? org.name : '' }));
  };

  const handleRecurringPatternChange = (field, value) => {
    setRecurringPattern(prev => ({ ...prev, [field]: value }));
  };

  const handleRoomToggle = (roomId) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const calculateTotalCost = () => {
    if (selectedRooms.length === 0) {
      return 0;
    }

    let hours = 0;
    if (isRecurring && !booking) {
        if (!recurringPattern.startTime || !recurringPattern.endTime) return 0;
        const [startHour, startMinute] = recurringPattern.startTime.split(':').map(Number);
        const [endHour, endMinute] = recurringPattern.endTime.split(':').map(Number);
        const start = new Date(0, 0, 0, startHour, startMinute);
        const end = new Date(0, 0, 0, endHour, endMinute);
        hours = Math.ceil((end - start) / (1000 * 60 * 60));
    } else { // This branch is taken for single bookings (new or existing) and when editing an existing recurring booking
        if (!formData.start_datetime || !formData.end_datetime) return 0;
        const start = new Date(formData.start_datetime);
        const end = new Date(formData.end_datetime);
        hours = Math.ceil((end - start) / (1000 * 60 * 60));
    }
    
    const roomCosts = selectedRooms.reduce((total, roomId) => {
      const room = rooms.find(r => r.id === roomId);
      // Only include hourly rate if room.show_hourly_rate is not explicitly false
      // And if building settings allow showing rates
      return total + (building?.show_rate_publicly && room && room.show_hourly_rate !== false ? room.hourly_rate || 0 : 0);
    }, 0);

    const baseCost = hours * roomCosts;
    // If calculating for a new recurring series, return total for all occurrences
    return isRecurring && !booking ? baseCost * recurringPattern.occurrences : baseCost;
  };

  // Calculate recurring dates based on pattern
  const calculateRecurringDates = () => {
    if (!isRecurring || !formData.start_datetime || !recurringPattern.startTime || !recurringPattern.endTime) return [];
    
    const startDate = new Date(formData.start_datetime);
    const [startHour, startMinute] = recurringPattern.startTime.split(':').map(Number);
    const [endHour, endMinute] = recurringPattern.endTime.split(':').map(Number);
    const dates = [];

    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    if (recurringPattern.frequency === 'weekly') {
      const selectedDays = recurringPattern.daysOfWeek.map(d => dayMap[d]);
      if (selectedDays.length === 0) return [];
      const interval = Math.max(1, recurringPattern.weekInterval || 1);

      // Find the Monday of the starting week
      const weekStart = new Date(startDate);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // go to Sunday
      weekStart.setDate(weekStart.getDate() + 1); // go to Monday as week anchor

      let occurrencesAdded = 0;
      let weekOffset = 0;

      while (occurrencesAdded < recurringPattern.occurrences) {
        const weekAnchor = new Date(weekStart);
        weekAnchor.setDate(weekAnchor.getDate() + weekOffset * 7);

        // Collect all matching days in this week, sorted
        const weekDates = selectedDays
          .map(dayNum => {
            const d = new Date(weekAnchor);
            // dayNum: 0=Sun...6=Sat; weekAnchor is Monday(1)
            d.setDate(d.getDate() + ((dayNum + 6) % 7)); // shift so Mon=0
            return d;
          })
          .sort((a, b) => a - b);

        for (const targetDate of weekDates) {
          if (occurrencesAdded >= recurringPattern.occurrences) break;
          // Skip dates before the chosen start date
          if (targetDate < new Date(startDate.toDateString())) continue;
          const recurringStart = new Date(targetDate);
          recurringStart.setHours(startHour, startMinute, 0, 0);
          const recurringEnd = new Date(targetDate);
          recurringEnd.setHours(endHour, endMinute, 0, 0);
          dates.push({ start: recurringStart, end: recurringEnd });
          occurrencesAdded++;
        }
        weekOffset += interval;
        if (weekOffset > 500) break; // safety cap
      }
    } else {
      // Monthly pattern
      const targetDayOfWeek = dayMap[recurringPattern.daysOfWeek[0] || 'monday'];
      for (let i = 0; i < recurringPattern.occurrences; i++) {
        const monthStart = startOfMonth(addMonths(startDate, i));
        let targetDate;
        switch (recurringPattern.weekOfMonth) {
          case 'second': targetDate = findNthWeekdayOfMonth(monthStart, targetDayOfWeek, 2); break;
          case 'third':  targetDate = findNthWeekdayOfMonth(monthStart, targetDayOfWeek, 3); break;
          case 'fourth': targetDate = findNthWeekdayOfMonth(monthStart, targetDayOfWeek, 4); break;
          case 'last':   targetDate = findLastWeekdayOfMonth(monthStart, targetDayOfWeek); break;
          default:       targetDate = findNthWeekdayOfMonth(monthStart, targetDayOfWeek, 1);
        }
        if (targetDate) {
          const recurringStart = new Date(targetDate);
          recurringStart.setHours(startHour, startMinute, 0, 0);
          const recurringEnd = new Date(targetDate);
          recurringEnd.setHours(endHour, endMinute, 0, 0);
          dates.push({ start: recurringStart, end: recurringEnd });
        }
      }
    }
    
    return dates;
  };

  // Helper function to find nth occurrence of weekday in a month
  const findNthWeekdayOfMonth = (monthStart, targetDayOfWeek, n) => {
    let current = new Date(monthStart);
    let count = 0;
    
    while (current.getMonth() === monthStart.getMonth()) {
      if (getDay(current) === targetDayOfWeek) {
        count++;
        if (count === n) {
          return current;
        }
      }
      current = addDays(current, 1);
    }
    
    return null;
  };

  // Helper function to find last occurrence of weekday in a month
  const findLastWeekdayOfMonth = (monthStart, targetDayOfWeek) => {
    const nextMonth = addMonths(monthStart, 1);
    let current = addDays(nextMonth, -1); // Last day of current month
    
    while (current.getMonth() === monthStart.getMonth()) {
      if (getDay(current) === targetDayOfWeek) {
        return current;
      }
      current = addDays(current, -1);
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final check for submission
    const selectedButUnavailable = selectedRooms.filter(id => conflictingRooms.has(id));
    if (selectedButUnavailable.length > 0) {
      const unavailableNames = selectedButUnavailable.map(id => rooms.find(r => r.id === id)?.name || 'Unknown').join(', ');
      setConflictError(`Cannot submit. The following selected room(s) are unavailable during this time: ${unavailableNames}. Please unselect them or adjust the time.`);
      return;
    }

    setConflictError(''); // Clear previous errors on submit attempt
    
    // Final validation checks
    if (!formData.start_datetime || !formData.end_datetime) {
      setConflictError('Start and end date/time are required.');
      return;
    }
    if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
      setConflictError('End time must be after start time.');
      return;
    }
    if (selectedRooms.length === 0) {
      setConflictError('At least one room must be selected.');
      return;
    }
    if (!selectedOrgId) {
      setConflictError('An organization must be selected.');
      return;
    }
    if (!formData.contact_email) {
      setConflictError('Contact email is required.');
      return;
    }
    if (!formData.event_title) {
      setConflictError('Event title is required.');
      return;
    }

    const orgList = isAdmin ? allOrganizations : userOrganizations;
    const selectedOrg = orgList.find(o => o.id === selectedOrgId);
    
    const preparedData = { 
      ...formData,
      organization_id: selectedOrgId,
      organization_color: selectedOrg ? selectedOrg.color : '#3b82f6'
    };

    if (isRecurring && !booking) {
      // Logic for creating a new recurring series
      const recurringId = crypto.randomUUID();
      const recurringDates = calculateRecurringDates();
      
      // Check conflicts for all occurrences
      let hasConflicts = false;
      const conflictingOccurrenceDates = [];
      for (let i = 0; i < recurringDates.length; i++) {
        const { start, end } = recurringDates[i];
        const unavailableForOccurrence = await findUnavailableRooms(start.toISOString(), end.toISOString(), null); // No booking ID to exclude for new bookings
        
        // Check if any of the rooms *currently selected by the user* are unavailable for this occurrence
        const selectedRoomsInConflict = selectedRooms.filter(roomId => unavailableForOccurrence.has(roomId));

        if (selectedRoomsInConflict.length > 0) {
          hasConflicts = true;
          conflictingOccurrenceDates.push(format(start, 'MMM d, yyyy h:mm a'));
        }
      }
      
      if (hasConflicts) {
        setConflictError(`Some occurrences in your recurring series have conflicts, e.g., on ${conflictingOccurrenceDates.slice(0, 3).join(', ')}. Please adjust the time or rooms.`);
        return;
      }
      
      const bookingsToCreate = recurringDates.map(({ start, end }) => ({
        ...preparedData,
        rooms: selectedRooms,
        total_cost: calculateTotalCost() / recurringPattern.occurrences, // Cost per occurrence
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        recurring_id: recurringId,
      }));
      
      onSubmit({ type: 'create_series', bookings: bookingsToCreate });
    } else {
      // Logic for single booking (new or existing) or updating existing recurring series
      const totalCost = calculateTotalCost(); // This will calculate for a single event as isRecurring is false for existing bookings
      
      const bookingData = { 
        ...preparedData,
        rooms: selectedRooms,
        total_cost: totalCost,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
      };

      if (booking) { // If editing an existing booking
        bookingData.id = booking.id;
        if (booking.recurring_id) { // If it's part of a recurring series
          bookingData.recurring_id = booking.recurring_id;
          onSubmit({ type: 'update_series', booking: bookingData }); // Indicate series update to the backend
        } else { // Single existing booking update
          onSubmit({ type: 'single_update', booking: bookingData });
        }
      } else { // New single booking
        onSubmit({ type: 'create_single', booking: bookingData });
      }
    }
  };

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : 'Unknown Room';
  };

  // Filter rooms based on user's selected organization's permissions
  const getAvailableRooms = () => {
    const orgs = isAdmin ? allOrganizations : userOrganizations;
    const selectedOrg = orgs.find(o => o.id === selectedOrgId);

    if (!selectedOrg || !selectedOrg.allowed_rooms) {
      // If admin and no org selected, show all active rooms.
      // If user and no org selected or selected org has no allowed_rooms, show no rooms.
      return isAdmin && !selectedOrgId ? rooms.filter(r => r.is_active) : [];
    }
    return rooms.filter(room => 
      room.is_active && selectedOrg.allowed_rooms.includes(room.id)
    );
  };

  const getOrganizationsForSelect = () => {
    return isAdmin ? allOrganizations : userOrganizations;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-2xl w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-slate-900">
            {booking ? 'Edit Booking' : 'New Booking Request'}
          </SheetTitle>
          <SheetDescription>
            {booking ? (
              booking.recurring_id ? 
                'Update this booking and all future occurrences in the series.' : 
                'Update the booking details.'
            ) : 'Fill in the details for the new booking request.'}
          </SheetDescription>
          {booking?.recurring_id && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-sm text-amber-800 font-medium">Recurring Event Notice</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Changes will be applied to this booking and all future bookings in this recurring series.
                  </p>
                </div>
              </div>
            </div>
          )}
        </SheetHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-6 px-1">
            {/* Conflict Error Display */}
            {conflictError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800 font-medium">{conflictError}</p>
                </div>
              </div>
            )}

            {/* Organization & Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Organization & Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization_id">Organization *</Label>
                   <Select 
                      value={selectedOrgId} 
                      onValueChange={handleOrgSelectChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingOrgs ? "Loading organizations..." : "Select an organization"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getOrganizationsForSelect().map(org => (
                          <SelectItem key={org.id} value={org.id}> {/* Value should be org.id */}
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  {(getOrganizationsForSelect().length === 0 && !isLoadingOrgs) && (
                    <p className="text-sm text-amber-600">
                      {isAdmin ? "No active organizations found in this building. Please contact an administrator." : "You are not assigned to any active organizations. Please contact an administrator."}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input 
                    id="contact_name" 
                    name="contact_name" 
                    value={formData.contact_name} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input 
                    id="contact_email" 
                    name="contact_email" 
                    type="email"
                    value={formData.contact_email} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input 
                    id="contact_phone" 
                    name="contact_phone" 
                    value={formData.contact_phone} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Event Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_title">Event Title *</Label>
                    <Input 
                      id="event_title" 
                      name="event_title" 
                      value={formData.event_title} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_description">Event Description</Label>
                    <Textarea 
                      id="event_description" 
                      name="event_description" 
                      value={formData.event_description} 
                      onChange={handleChange} 
                      rows={3}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_datetime">Start Date & Time *</Label>
                    <DateTimePicker
                      value={formData.start_datetime}
                      onChange={(newDateTime) => handleChange({ target: { name: 'start_datetime', value: newDateTime } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_datetime">End Date & Time *</Label>
                     <DateTimePicker
                      value={formData.end_datetime}
                      onChange={(newDateTime) => handleChange({ target: { name: 'end_datetime', value: newDateTime } })}
                    />
                  </div>
                </div>
                
                {isCheckingConflicts && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking availability...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recurring Event Options */}
            {!booking && ( // Only show recurring options for new bookings
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="recurring-event"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                  <Label htmlFor="recurring-event" className="flex items-center gap-2 font-medium cursor-pointer">
                    <Repeat className="w-4 h-4 text-blue-600" />
                    Recurring Event
                  </Label>
                </div>
                
                {isRecurring && (
                  <div className="p-4 border rounded-lg bg-blue-50 space-y-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-700">
                        Set up a series of bookings that repeat automatically. Select a start date above to begin from that date.
                      </p>
                    </div>

                    {/* Frequency selector */}
                    <div className="space-y-2">
                      <Label>Repeat Frequency</Label>
                      <div className="flex gap-2">
                        {['weekly', 'monthly'].map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => handleRecurringPatternChange('frequency', f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              recurringPattern.frequency === f
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {recurringPattern.frequency === 'weekly' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Repeat Every</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="12"
                                value={recurringPattern.weekInterval}
                                onChange={(e) => handleRecurringPatternChange('weekInterval', parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                              <span className="text-sm text-slate-600">week(s)</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Number of Occurrences</Label>
                            <Input
                              type="number"
                              min="1"
                              max="104"
                              value={recurringPattern.occurrences}
                              onChange={(e) => handleRecurringPatternChange('occurrences', parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>On these days</Label>
                          <div className="flex flex-wrap gap-2">
                            {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
                              const checked = recurringPattern.daysOfWeek.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const days = recurringPattern.daysOfWeek;
                                    handleRecurringPatternChange(
                                      'daysOfWeek',
                                      checked ? days.filter(d => d !== day) : [...days, day]
                                    );
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    checked
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {day.slice(0, 3).charAt(0).toUpperCase() + day.slice(1, 3)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {recurringPattern.frequency === 'monthly' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Week of Month</Label>
                          <Select
                            value={recurringPattern.weekOfMonth}
                            onValueChange={(value) => handleRecurringPatternChange('weekOfMonth', value)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="first">First</SelectItem>
                              <SelectItem value="second">Second</SelectItem>
                              <SelectItem value="third">Third</SelectItem>
                              <SelectItem value="fourth">Fourth</SelectItem>
                              <SelectItem value="last">Last</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Day of Week</Label>
                          <Select
                            value={recurringPattern.daysOfWeek[0] || 'monday'}
                            onValueChange={(value) => handleRecurringPatternChange('daysOfWeek', [value])}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(d => (
                                <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Number of Months</Label>
                          <Input
                            type="number"
                            min="1"
                            max="24"
                            value={recurringPattern.occurrences}
                            onChange={(e) => handleRecurringPatternChange('occurrences', parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={recurringPattern.startTime}
                          onChange={(e) => handleRecurringPatternChange('startTime', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={recurringPattern.endTime}
                          onChange={(e) => handleRecurringPatternChange('endTime', e.target.value)}
                        />
                      </div>
                    </div>

                    {formData.start_datetime && recurringPattern.startTime && recurringPattern.endTime && (() => {
                      const dates = calculateRecurringDates();
                      return dates.length > 0 ? (
                        <div className="text-sm text-slate-600 bg-white p-3 rounded border">
                          <strong>Preview ({dates.length} occurrence{dates.length !== 1 ? 's' : ''}):</strong>
                          <div className="mt-2 space-y-1">
                            {dates.slice(0, 4).map((date, index) => (
                              <div key={index} className="text-xs text-slate-700 ml-4">
                                • {format(date.start, 'EEE, MMM d, yyyy')} · {format(date.start, 'h:mm a')} – {format(date.end, 'h:mm a')}
                              </div>
                            ))}
                            {dates.length > 4 && (
                              <div className="text-xs text-slate-500 ml-4">
                                … and {dates.length - 4} more
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Room Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Room Selection *</h3>
              {selectedOrgId && ( // Only show this message if an organization has been selected
                <p className="text-sm text-slate-600">
                  Showing rooms available to <span className="font-medium">{formData.organization_name}</span>
                </p>
              )}
              <div className="grid grid-cols-1 gap-3">
                {getAvailableRooms().length > 0 ? (
                  getAvailableRooms().map(room => {
                    const conflictOrgName = conflictingRooms.get(room.id);
                    const isConflicting = !!conflictOrgName;
                    const isSelected = selectedRooms.includes(room.id);
                    return (
                      <div 
                        key={room.id} 
                        className={`flex items-start space-x-3 p-4 border rounded-lg transition-all ${
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
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`room-${room.id}`} 
                            className={`font-medium ${isConflicting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {room.name}
                            {isConflicting && <span className="text-red-600 font-semibold ml-2">(Booked by {conflictOrgName})</span>}
                          </Label>
                          <p className="text-sm text-slate-600 mt-1">
                            {building?.show_capacity_publicly && `Capacity: ${room.capacity}`}
                            {building?.show_capacity_publicly && building?.show_rate_publicly && room.show_hourly_rate !== false && room.hourly_rate ? ' • ' : ''}
                            {building?.show_rate_publicly && room.show_hourly_rate !== false && room.hourly_rate ? `$${room.hourly_rate}/hr` : (building?.show_rate_publicly ? 'Rate on request' : '')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      {selectedOrgId ? `No rooms are available for ${formData.organization_name}. Please contact an administrator.` : "Please select an organization to see available rooms."}
                    </p>
                  </div>
                )}
              </div>
              
              {selectedRooms.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-800">Selected Rooms:</h4>
                    {calculateTotalCost() > 0 ? (
                      <p className="text-lg font-bold text-blue-800">
                        {isRecurring ? `Total Cost (${calculateRecurringDates().length} occurrences): $${calculateTotalCost().toFixed(2)}` : `Estimated Cost: $${calculateTotalCost().toFixed(2)}`}
                      </p>
                    ) : (
                      building?.show_rate_publicly && (
                        <p className="text-sm text-blue-700">
                          Contact for pricing
                        </p>
                      )
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRooms.map(roomId => (
                      <Badge key={roomId} variant="secondary" className="bg-blue-100 text-blue-800">
                        {getRoomName(roomId)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Special Requirements */}
            <div className="space-y-2">
              <Label htmlFor="special_requirements">Special Requirements</Label>
              <Textarea 
                id="special_requirements" 
                name="special_requirements" 
                value={formData.special_requirements} 
                onChange={handleChange} 
                placeholder="Any special setup, catering, or equipment needs..."
                rows={3}
              />
            </div>
          </div>

          <SheetFooter className="mt-8">
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button 
              type="submit" 
              disabled={selectedRooms.length === 0 || !selectedOrgId || !!conflictError || isCheckingConflicts}
            >
              {booking ? 
                (booking.recurring_id ? 'Update Series' : 'Update Booking') : 
                (isRecurring ? `Create ${calculateRecurringDates().length} Recurring Bookings` : 'Submit Request')
              }
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}