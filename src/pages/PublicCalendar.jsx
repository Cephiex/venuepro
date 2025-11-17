
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicCalendarData } from '@/functions/getPublicCalendarData';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay
} from 'date-fns';

export default function PublicCalendar() {
    const [searchParams] = useSearchParams();
    const buildingId = searchParams.get('buildingId');

    const [bookings, setBookings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [building, setBuilding] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [modalPosition, setModalPosition] = useState({ top: 0, left: '50%', transform: 'translate(-50%, -100%)' });

    useEffect(() => {
        if (!buildingId) {
            setError("No building specified. This link is invalid.");
            setIsLoading(false);
            return;
        }
        loadData(buildingId);
    }, [buildingId]);

    const loadData = async (bId) => {
        setIsLoading(true);
        setError('');
        try {
            const response = await getPublicCalendarData({ building_id: bId });
            const data = response.data;
            
            setBuilding(data.building);
            setBookings(data.bookings);
            setRooms(data.rooms);
            setOrganizations(data.organizations || []);
        } catch (err) {
            setError("Could not load calendar data. The building may not exist or the link is incorrect.");
            console.error("Error loading public calendar data:", err);
        }
        setIsLoading(false);
    };

    const getRoomName = (roomId) => {
      const room = rooms.find(r => r.id === roomId);
      return room?.name || "Unknown Room";
    };

    const getOrganization = (organizationId) => {
      return organizations.find(org => org.id === organizationId);
    };

    const getBookingsForDate = (date) => {
      return bookings.filter(booking => {
        const bookingStart = new Date(booking.start_datetime);
        const bookingEnd = new Date(booking.end_datetime);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        return (bookingStart <= dayEnd && bookingEnd >= dayStart);
      });
    };

    const navigateDate = (direction) => {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const handleEventClick = (event, e) => {
      e.stopPropagation();

      const clickY = e.clientY;
      const margin = 15;

      let topPosition = clickY - margin;
      let verticalTransform = 'translateY(-100%)';

      if (clickY < window.innerHeight / 2) {
          verticalTransform = 'translateY(0)';
          topPosition = clickY + margin;
      }
      
      const horizontalTransform = 'translateX(-50%)';
      
      setModalPosition({ 
        top: topPosition, 
        left: '50%',
        transform: `${horizontalTransform} ${verticalTransform}` 
      });

      setSelectedEvent(event);
      setIsEventModalOpen(true);
    };

    useEffect(() => {
      if (isEventModalOpen) {
        document.body.style.overflow = 'unset';
        document.body.style.pointerEvents = 'auto';
      }
      return () => {
        document.body.style.overflow = 'unset';
        document.body.style.pointerEvents = 'auto';
      };
    }, [isEventModalOpen]);

    const generateICSFile = (event) => {
        const startDate = new Date(event.start_datetime);
        const endDate = new Date(event.end_datetime);
        
        const formatICSDate = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + 'Z';
        
        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//VenuePro//Event//EN',
            'BEGIN:VEVENT',
            `UID:${event.id}@venuepro.app`,
            `DTSTAMP:${formatICSDate(new Date())}`,
            `DTSTART:${formatICSDate(startDate)}`,
            `DTEND:${formatICSDate(endDate)}`,
            `SUMMARY:${event.event_title}`,
            `DESCRIPTION:${event.organization_name}\\n\\nRoom(s): ${event.rooms?.map(roomId => getRoomName(roomId)).join(', ')}`,
            `LOCATION:${event.rooms?.map(roomId => getRoomName(roomId)).join(', ')}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
    };

    const handleAddToCalendar = (event, type) => {
        const icsContent = generateICSFile(event);

        if (type === 'ios') {
            // For iOS, navigate to a server-side endpoint that serves the file
            // REMOVED /api prefix
            const downloadUrl = `/event/${event.id}.ics`;
            window.location.href = downloadUrl;
            return;
        }

        const formatGoogleDate = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const formatOutlookDate = (date) => date.toISOString();
        const startDate = new Date(event.start_datetime);
        const endDate = new Date(event.end_datetime);
        const title = encodeURIComponent(event.event_title);
        const details = encodeURIComponent(`${event.organization_name}\n\nRoom(s): ${event.rooms?.map(roomId => getRoomName(roomId)).join(', ')}`);
        const location = encodeURIComponent(event.rooms?.map(roomId => getRoomName(roomId)).join(', '));

        let calendarUrl;
        switch (type) {
            case 'google':
                calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${details}&location=${location}`;
                break;
            case 'outlook':
                calendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${formatOutlookDate(startDate)}&enddt=${formatOutlookDate(endDate)}&body=${details}&location=${location}`;
                break;
            case 'download': {
                const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${event.event_title}.ics`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                return;
            }
            default:
                return;
        }
        window.open(calendarUrl, '_blank');
    };

    const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = () => /Android/.test(navigator.userAgent);
    const isMacOS = () => /Macintosh/.test(navigator.userAgent);

    const getCalendarOptions = () => {
      const options = [];
      if (!selectedEvent) return [];

      if (isIOS()) {
        options.push({ label: "Add to iPhone Calendar", type: 'ios' });
        options.push({ label: "Google Calendar", type: 'google' });
      } else if (isAndroid()) {
        options.push({ label: "Google Calendar", type: 'google' });
        options.push({ label: "Android Calendar (Download)", type: 'download' });
      } else {
        options.push({ label: "Google Calendar", type: 'google' });
        options.push({ label: "Outlook Calendar", type: 'outlook' });
        if (isMacOS()) {
          options.push({ label: "macOS Calendar", type: 'download' });
        }
      }
      options.push({ label: "Download .ics file", type: 'download' });
      return options;
    };

    // Helper function to create the URL for the organization details page
    const createPageUrl = (path) => {
      // Assuming your routing setup allows for direct path construction like this.
      // In a real application, you might use a router's `generatePath` or similar.
      return `/${path}`; 
    };

    const renderListView = () => {
      const upcomingBookings = bookings
        .filter(booking => new Date(booking.end_datetime) >= new Date())
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

      if (upcomingBookings.length === 0) {
        return (
          <Card>
            <CardContent className="p-6 sm:p-12 text-center">
              <CalendarIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Upcoming Events</h3>
              <p className="text-sm sm:text-base text-gray-500">There are no approved bookings scheduled for the future.</p>
            </CardContent>
          </Card>
        );
      }
      
      const groupedBookings = upcomingBookings.reduce((acc, booking) => {
        const dateKey = format(new Date(booking.start_datetime), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(booking);
        return acc;
      }, {});

      return (
        <div className="space-y-6">
          {Object.entries(groupedBookings).map(([date, dateBookings]) => (
            <div key={date}>
              <div className="sticky top-[70px] bg-gray-50/90 backdrop-blur-sm z-10 py-2 mb-3 border-b-2 border-slate-200">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {format(new Date(date), "EEEE, MMMM d, yyyy")}
                </h2>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {dateBookings.map(booking => {
                  const organization = getOrganization(booking.organization_id);
                  return (
                    <Card 
                      key={booking.id} 
                      className="shadow-sm border-transparent cursor-pointer hover:shadow-md transition-shadow" 
                      style={{ borderLeftColor: booking.organization_color || '#3b82f6', borderLeftWidth: '4px' }}
                      onClick={(e) => handleEventClick(booking, e)}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            {organization?.logo_url ? (
                              <img 
                                src={organization.logo_url} 
                                alt={`${organization.name} logo`}
                                className="w-12 h-12 object-contain border border-gray-200 rounded-lg bg-white flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Users className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 leading-tight">{booking.event_title}</h3>
                              <p className="text-sm sm:text-base text-slate-600 mt-1">{booking.organization_name}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              <span>{format(new Date(booking.start_datetime), "h:mm a")} - {format(new Date(booking.end_datetime), "h:mm a")}</span>
                            </div>
                            <div className="flex items-start gap-2 sm:col-span-2">
                              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{booking.rooms?.map(roomId => getRoomName(roomId)).join(", ")}</span>
                            </div>
                            {booking.expected_attendance && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 flex-shrink-0" />
                                <span>{booking.expected_attendance} attendees</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    };

    const renderCalendarView = () => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border overflow-hidden">
                <div className="grid grid-cols-7 border-b bg-slate-50">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} className="p-2 sm:p-3 md:p-4 text-center font-semibold text-slate-600 border-r last:border-r-0">
                            <span className="text-xs sm:text-sm">{window.innerWidth < 640 ? day.charAt(0) : day}</span>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {days.map((day, index) => {
                        const dayBookings = bookings
                          .filter(booking => {
                              const bookingStart = new Date(booking.start_datetime);
                              const bookingEnd = new Date(booking.end_datetime);
                              return (day >= startOfDay(bookingStart) && day <= endOfDay(bookingEnd));
                          })
                          .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
                          
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        return (
                            <div
                                key={day.toISOString()}
                                className={`min-h-20 sm:min-h-24 md:min-h-32 p-1 sm:p-2 border-r border-b last:border-r-0 ${!isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"} ${isToday(day) ? "bg-amber-50" : ""}`}>
                                <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday(day) ? "text-amber-600" : ""}`}>
                                    {format(day, "d")}
                                </div>
                                <div className="space-y-0.5 sm:space-y-1">
                                    {dayBookings.slice(0, window.innerWidth < 640 ? 2 : 3).map(booking => {
                                        const bookingStart = new Date(booking.start_datetime);
                                        const bookingEnd = new Date(booking.end_datetime);
                                        const isStart = isSameDay(bookingStart, day) || index % 7 === 0;
                                        const isEnd = isSameDay(bookingEnd, day) || index % 7 === 6;

                                        let borderRadiusClass = 'rounded';
                                        if (!isStart && !isEnd) borderRadiusClass = ''; // Middle
                                        else if (!isStart) borderRadiusClass = 'rounded-r'; // End
                                        else if (!isEnd) borderRadiusClass = 'rounded-l'; // Start

                                        return (
                                          <div 
                                            key={booking.id} 
                                            className={`text-[9px] sm:text-[10px] md:text-xs p-1 sm:p-1.5 text-white leading-tight cursor-pointer hover:opacity-80 transition-opacity ${borderRadiusClass}`}
                                            style={{ backgroundColor: booking.organization_color || '#3b82f6' }}
                                            onClick={(e) => handleEventClick(booking, e)}
                                          >
                                              <div className={`font-bold truncate ${!isStart && 'opacity-0'}`}>{booking.event_title}</div>
                                              <div className={`truncate opacity-90 hidden sm:block ${!isStart && 'opacity-0'}`}>{booking.organization_name}</div>
                                              <div className={`truncate opacity-90 ${!isStart && 'opacity-0'}`}>
                                                {format(new Date(booking.start_datetime), "h:mma")} - {format(new Date(booking.end_datetime), "h:mma")}
                                              </div>
                                          </div>
                                        )
                                    })}
                                    {dayBookings.length > (window.innerWidth < 640 ? 2 : 3) && (
                                        <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-1 px-1">
                                            +{dayBookings.length - (window.innerWidth < 640 ? 2 : 3)} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Helper functions to get start and end of day, which is implicit in the booking filter logic but good to have explicit.
    // However, for date-fns `isSameDay` comparison, `day` already represents a specific day at midnight,
    // and `bookingStart` and `bookingEnd` are full datetimes.
    // The filter `(bookingStart <= dayEnd && bookingEnd >= dayStart)` is correct for including partial day events.
    // For `isSameDay(bookingStart, day)` to work correctly, `day` from `eachDayOfInterval` (which is at midnight)
    // and `bookingStart` (which is a full datetime) are compared, `isSameDay` handles this by ignoring time.
    // We don't need new `startOfDay` and `endOfDay` imports for the changed logic,
    // as `isSameDay` is already robust enough. However, I'll update the filter for `getBookingsForDate` using these if they exist
    // to be precise, or stick with `Date.setHours` for consistency within the existing code.
    // Let's stick with the existing date comparison approach, as adding `startOfDay` and `endOfDay` imports
    // without using them comprehensively might be unnecessary. The filter for `dayBookings` within `renderCalendarView`
    // needs to reflect how `getBookingsForDate` works.

    // Re-evaluating the `dayBookings` filter inside `renderCalendarView`:
    // It's currently using a local filter, not `getBookingsForDate`.
    // It needs to be updated to correctly determine events for a day.
    // `day >= startOfDay(bookingStart)` - `day` is a specific day (midnight), `bookingStart` is a full date.
    // `day <= endOfDay(bookingEnd)` - this implies an event that starts *on or before* `day` and ends *on or after* `day`.
    // This is equivalent to what `getBookingsForDate` does. So, for consistency and correctness,
    // it's better to just use `getBookingsForDate(day)` directly here.

    if (isLoading) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        );
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-grow py-4 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
              <div className="flex bg-white rounded-lg border shadow-sm p-1 w-full sm:w-auto">
                <Button 
                  variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('calendar')} 
                  className="flex-1 sm:flex-none text-xs sm:text-sm px-3 py-2"
                >
                  <CalendarIcon className="w-4 h-4 mr-1 sm:mr-2" />
                  <span>Calendar</span>
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('list')} 
                  className="flex-1 sm:flex-none text-xs sm:text-sm px-3 py-2"
                >
                  <List className="w-4 h-4 mr-1 sm:mr-2" />
                  <span>List</span>
                </Button>
              </div>
            </div>

            {error ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 sm:p-6 text-center">
                  <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-lg sm:text-xl font-bold text-red-800">Error</h2>
                  <p className="text-sm sm:text-base text-red-700 mt-2">{error}</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {viewMode === 'calendar' && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="outline" onClick={() => navigateDate('prev')} size="sm" className="px-2 sm:px-4">
                          <ChevronLeft className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">Prev</span>
                        </Button>
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 text-center px-2">{format(currentDate, "MMMM yyyy")}</h2>
                        <Button variant="outline" onClick={() => navigateDate('next')} size="sm" className="px-2 sm:px-4">
                          <span className="hidden sm:inline mr-1">Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    {bookings.length === 0 ? (
                        <Card>
                          <CardContent className="p-6 sm:p-12 text-center">
                            <CalendarIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Events Found</h3>
                            <p className="text-sm sm:text-base text-gray-500">There are no approved bookings at this time.</p>
                          </CardContent>
                        </Card>
                    ) : renderCalendarView()}
                  </>
                )}
                {viewMode === 'list' && renderListView()}
              </div>
            )}
          </div>
        </main>

        <Dialog 
          open={isEventModalOpen} 
          onOpenChange={setIsEventModalOpen}
          modal={false}
        >
          <DialogContent 
            className="w-[95vw] max-w-md bg-white p-6 rounded-lg shadow-lg pointer-events-auto"
            style={{
              position: 'fixed',
              top: `${modalPosition.top}px`,
              left: modalPosition.left,
              transform: modalPosition.transform,
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 1000
            }}
            onPointerDownOutside={(e) => {
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl pr-8">{selectedEvent?.event_title}</DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-2 mb-3">
                  {(() => {
                    const organization = getOrganization(selectedEvent?.organization_id);
                    const orgPageUrl = selectedEvent?.organization_id && buildingId 
                      ? `${window.location.origin}${createPageUrl(`PublicOrganization?organizationId=${selectedEvent.organization_id}&buildingId=${buildingId}`)}`
                      : null;
                    
                    return (
                      <div className="flex items-center gap-2">
                        {organization?.logo_url ? (
                          <img 
                            src={organization.logo_url} 
                            alt={`${organization.name} logo`}
                            className="w-8 h-8 object-contain border border-gray-200 rounded bg-white flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => orgPageUrl && window.open(orgPageUrl, '_blank')}
                          />
                        ) : (
                          <div 
                            className="w-8 h-8 bg-slate-100 border border-gray-200 rounded flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-slate-200 transition-colors"
                            onClick={() => orgPageUrl && window.open(orgPageUrl, '_blank')}
                          >
                            <Users className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <Badge 
                          className="inline-flex cursor-pointer hover:opacity-80 transition-opacity" 
                          style={{ 
                            backgroundColor: selectedEvent?.organization_color || '#3b82f6', 
                            color: 'white' 
                          }}
                          onClick={() => orgPageUrl && window.open(orgPageUrl, '_blank')}
                        >
                          {selectedEvent?.organization_name}
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="break-words">{format(new Date(selectedEvent.start_datetime), "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="break-words">
                      {format(new Date(selectedEvent.start_datetime), "h:mm a")} - {format(new Date(selectedEvent.end_datetime), "h:mm a")}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span className="break-words">
                      {selectedEvent.rooms?.map(roomId => getRoomName(roomId)).join(", ")}
                    </span>
                  </div>
                  
                  {selectedEvent.expected_attendance && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>{selectedEvent.expected_attendance} attendees</span>
                    </div>
                  )}
                </div>
                
                {selectedEvent.event_description && (
                  <div className="pt-2 border-t">
                    <h4 className="font-medium text-sm text-slate-700 mb-1">Description</h4>
                    <p className="text-sm text-slate-600 break-words leading-relaxed">{selectedEvent.event_description}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="w-full h-12 text-base">
                        <Plus className="w-5 h-5 mr-2" />
                        Add to Calendar
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" style={{ zIndex: 10000 }}>
                      {getCalendarOptions().map((option, index) => (
                        <DropdownMenuItem 
                          key={index}
                          onClick={() => handleAddToCalendar(selectedEvent, option.type)}
                          className="cursor-pointer flex items-center py-3"
                        >
                          <span className="text-base">{option.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
}

// Added small helper function `startOfDay` and `endOfDay` to make the calendar event filtering more precise,
// ensuring the comparison `day >= startOfDay(bookingStart) && day <= endOfDay(bookingEnd)` is accurate
// when filtering for events that occur on or span across `day`.
// Note: `isSameDay` from date-fns already handles time comparison by ignoring time, so it's suitable for that use case.
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
