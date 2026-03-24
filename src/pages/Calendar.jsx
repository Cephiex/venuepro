import { useState, useEffect } from "react";
import { Booking, Room, User, Organization, Building } from "@/entities/all";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  List,
  Grid,
  Share2,
  Copy,
  Check,
  Download,
  Filter
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay
} from "date-fns";
import { createPageUrl } from "@/utils";
import BookingForm from "../components/bookings/BookingForm";
import { SendEmail } from "@/integrations/Core";

const viewModes = [
  { id: "month", label: "Month", icon: Grid },
  { id: "week", label: "Week", icon: CalendarIcon },
  { id: "day", label: "Day", icon: Clock },
  { id: "list", label: "List", icon: List }
];

const statusConfig = {
  pending: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    dot: 'bg-yellow-500',
    label: 'Pending'
  },
  approved: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-800',
    dot: 'bg-green-500',
    label: 'Approved'
  },
  rejected: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    dot: 'bg-red-500',
    label: 'Rejected'
  },
  cancelled: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-800',
    dot: 'bg-gray-500',
    label: 'Cancelled'
  }
};

export default function Calendar() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [isLoading, setIsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState(null);
  const [user, setUser] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [defaultBookingData, setDefaultBookingData] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [building, setBuilding] = useState(null);
  const [statusFilters, setStatusFilters] = useState({
    approved: true,
    pending: true,
    rejected: false,
    cancelled: false
  });

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await User.me();
        setUser(userData);

        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        const validViewModes = viewModes.map(mode => mode.id);
        if (viewParam && validViewModes.includes(viewParam)) {
          setViewMode(viewParam);
        }

        if (userData?.building_id) {
          setBuildingId(userData.building_id);
          await loadData(userData.building_id);
          if (userData.organization_ids && userData.organization_ids.length > 0) {
            const orgPromises = userData.organization_ids.map(id => Organization.get(id));
            const orgsData = await Promise.all(orgPromises);
            setUserOrganizations(orgsData);
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadData = async (bId) => {
    setIsLoading(true);
    try {
      const [bookingsData, roomsData, organizationsData, buildingData] = await Promise.all([
        Booking.filter({ building_id: bId }, "-start_datetime"), // Changed to filter all statuses
        Room.filter({ building_id: bId }),
        Organization.filter({ building_id: bId }),
        Building.get(bId)
      ]);

      const bookingsWithColors = bookingsData.map(booking => {
        const organization = organizationsData.find(org => org.id === booking.organization_id);
        return {
          ...booking,
          organization_color: organization?.color || null
        };
      });

      setBookings(bookingsWithColors);
      setRooms(roomsData);
      setBuilding(buildingData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.name || "Unknown Room";
  };

  const getBookingsForDate = (date) => {
    return bookings.filter(booking => {
      // Filter by status
      if (!statusFilters[booking.status]) return false;
      
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
    switch (viewMode) {
      case "day":
        setCurrentDate(prev => direction === "next" ? addDays(prev, 1) : subDays(prev, 1));
        break;
      case "week":
        setCurrentDate(prev => direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1));
        break;
      case "month":
        setCurrentDate(prev => direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1));
        break;
    }
  };

  const toggleStatusFilter = (status) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const publicLink = buildingId ? `${window.location.origin}${createPageUrl(`PublicCalendar?buildingId=${buildingId}`)}` : '';
  const icsLink = buildingId ? `${window.location.origin}/calendar/${buildingId}.ics` : '';

  const handleCopy = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(publicLink).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const handleCopyIcs = () => {
    if (!icsLink) return;
    navigator.clipboard.writeText(icsLink).then(() => {
      setCopySuccess('ICS link copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const handleDayClick = (day) => {
    if (!isSameMonth(day, currentDate)) return;

    const startTime = format(day, "yyyy-MM-dd'T'09:00");
    const endTime = format(day, "yyyy-MM-dd'T'10:00");

    setDefaultBookingData({
      start_datetime: startTime,
      end_datetime: endTime,
      building_id: buildingId
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    try {
      const { type, booking, bookings } = data;
      if (type === 'create_series') {
        const createPromises = bookings.map(bookingData => {
          const dataWithBuilding = { ...bookingData, building_id: user.building_id, status: 'pending' };
          return Booking.create(dataWithBuilding);
        });
        await Promise.all(createPromises);
        
        await notifyAdminsOfNewBooking(bookings[0], true, bookings.length);
      } else {
        const dataWithBuilding = { ...booking, building_id: user.building_id, status: 'pending' };
        const createdBooking = await Booking.create(dataWithBuilding);
        
        await notifyAdminsOfNewBooking(createdBooking, false);
      }
      setIsFormOpen(false);
      setDefaultBookingData(null);
      await loadData(buildingId);
    } catch (error) {
      console.error("Error creating booking:", error);
    }
  };

  const notifyAdminsOfNewBooking = async (booking, isRecurring = false, occurrences = 1) => {
    try {
      if (!user || !user.building_id || !building) {
        console.warn("User, building ID, or building data not available for admin notification.");
        return;
      }

      const adminUsers = await User.filter({ 
        building_id: user.building_id, 
        role: 'admin' 
      });

      if (adminUsers.length === 0) {
        console.log("No admin users found to notify for new booking.");
        return;
      }

      const roomNames = Array.isArray(booking.rooms) ? booking.rooms.map(roomId => getRoomName(roomId)).join(', ') : 'N/A';
      const bookingUrl = `https://venumgmt.pro${createPageUrl('Bookings?tab=pending')}`;

      const subject = `New Booking Request: ${booking.event_title}`;
      const body = `
Hello,

A new booking request has been submitted and requires your review.

${isRecurring ? `📅 Recurring Event (${occurrences} occurrences)` : '📅 Single Event'}

Event Details:
- Title: ${booking.event_title}
- Organization: ${booking.organization_name || 'N/A'}
- Contact: ${booking.contact_name || 'N/A'} (${booking.contact_email || 'N/A'})
- Room(s): ${roomNames}
- Date & Time: ${format(new Date(booking.start_datetime), 'PPP p')} - ${format(new Date(booking.end_datetime), 'p')}
${booking.event_description ? `- Description: ${booking.event_description}` : ''}
${booking.special_requirements ? `- Special Requirements: ${booking.special_requirements}` : ''}

Review and approve this booking here:
${bookingUrl}

Best regards,
${building.name} Management System
      `;

      const emailPromises = adminUsers.map(admin => 
        SendEmail({
          to: admin.email,
          subject: subject,
          body: body
        }).catch(err => console.error(`Failed to send email to ${admin.email}:`, err))
      );

      await Promise.all(emailPromises);
    } catch (error) {
      console.error("Error notifying admins:", error);
    }
  };

  const renderMonthView = () => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="p-2 md:p-4 text-center font-semibold text-slate-600 bg-slate-50 border-r last:border-r-0 text-xs md:text-sm">
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayBookings = getBookingsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`min-h-24 md:min-h-32 p-1 md:p-2 border-r border-b last:border-r-0 ${
                  !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white hover:bg-blue-50 cursor-pointer transition-colors"
                } ${isToday(day) ? "bg-blue-50" : ""}`}
              >
                <div className={`text-xs md:text-sm font-medium mb-1 md:mb-2 ${isToday(day) ? "text-blue-600" : ""}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 2).map(booking => {
                    const bookingStart = new Date(booking.start_datetime);
                    const bookingEnd = new Date(booking.end_datetime);
                    
                    const isStart = isSameDay(bookingStart, day) || index % 7 === 0;
                    const isEnd = isSameDay(bookingEnd, day) || index % 7 === 6;

                    let borderRadiusClass = 'rounded';
                    if (!isStart && !isEnd) borderRadiusClass = '';
                    else if (!isStart) borderRadiusClass = 'rounded-r';
                    else if (!isEnd) borderRadiusClass = 'rounded-l';
                    
                    const status = statusConfig[booking.status] || statusConfig.approved;
                    
                    return (
                      <div
                        key={booking.id}
                        className={`text-[10px] md:text-xs p-1 pointer-events-none relative ${borderRadiusClass} border-l-2`}
                        style={{ 
                          backgroundColor: booking.organization_color || '#3b82f6',
                          borderLeftColor: status.dot,
                          opacity: booking.status === 'rejected' || booking.status === 'cancelled' ? 0.6 : 1
                        }}
                        title={`${format(bookingStart, "h:mm a")} - ${format(bookingEnd, "h:mm a")} ${booking.event_title} - ${booking.organization_name} [${status.label}]`}
                      >
                        <div className={`truncate font-medium hidden md:block text-white ${!isStart && 'opacity-0'}`}>
                          {isStart && `${format(new Date(booking.start_datetime), "h:mma")} `}{booking.event_title}
                        </div>
                        <div className={`truncate md:hidden text-white ${!isStart && 'opacity-0'}`}>
                          {isStart && `${format(new Date(booking.start_datetime), "h:mma")} `}{booking.event_title}
                        </div>
                      </div>
                    )
                  })}
                  {dayBookings.length > 2 && (
                    <div className="text-[10px] md:text-xs text-gray-500 pointer-events-none">
                      +{dayBookings.length - 2} more
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

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate)
    });

    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map(day => (
            <div key={day.toISOString()} className="p-2 md:p-4 text-center border-r last:border-r-0">
              <div className="font-semibold text-slate-600 text-xs md:text-base">{format(day, "EEE")}</div>
              <div className={`text-lg md:text-2xl font-bold mt-1 ${isToday(day) ? "text-blue-600" : "text-slate-900"}`}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-96">
          {weekDays.map((day, dayIndex) => {
            const dayBookings = getBookingsForDate(day);
            return (
              <div key={day.toISOString()} className="p-2 md:p-4 border-r last:border-r-0 space-y-2">
                {dayBookings.map(booking => {
                  const bookingStart = new Date(booking.start_datetime);
                  const bookingEnd = new Date(booking.end_datetime);
                  const isStart = isSameDay(bookingStart, day) || dayIndex === 0;
                  const isEnd = isSameDay(bookingEnd, day) || dayIndex === 6;
                  
                  let borderRadiusClass = 'rounded-lg';
                  if (!isStart && !isEnd) borderRadiusClass = '';
                  else if (!isStart) borderRadiusClass = 'rounded-r-lg';
                  else if (!isEnd) borderRadiusClass = 'rounded-l-lg';
                  
                  const status = statusConfig[booking.status] || statusConfig.approved;
                  
                  return (
                    <Card 
                      key={booking.id} 
                      className={`border-l-4 ${borderRadiusClass} ${status.bg}`}
                      style={{ borderLeftColor: booking.organization_color || '#3b82f6' }}
                    >
                      <CardContent className="p-2 md:p-3">
                        <div className={`flex items-center gap-1 mb-1 ${!isStart && 'opacity-0'}`}>
                          <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                          <Badge variant="outline" className={`text-[10px] ${status.text} ${status.bg} border ${status.border}`}>
                            {status.label}
                          </Badge>
                        </div>
                        <h4 className={`font-medium text-xs md:text-sm ${!isStart && 'opacity-0'}`}>
                          {booking.event_title}
                        </h4>
                        <p className={`text-[10px] md:text-xs text-gray-600 ${!isStart && 'opacity-0'}`}>
                          {booking.organization_name}
                        </p>
                        <div className={`flex items-center gap-1 mt-1 ${!isStart && 'opacity-0'}`}>
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] md:text-xs text-gray-600">
                            {format(new Date(booking.start_datetime), "h:mm a")} - {format(new Date(booking.end_datetime), "h:mm a")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);

    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-white rounded-xl shadow-sm border">
          <h2 className="text-xl md:text-3xl font-bold text-slate-900">{format(currentDate, "EEEE, MMMM d, yyyy")}</h2>
          <p className="text-slate-600 mt-2">{dayBookings.length} events scheduled</p>
        </div>

        {dayBookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Events Today</h3>
              <p className="text-gray-500">This date is available for bookings.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dayBookings.map(booking => {
              const status = statusConfig[booking.status] || statusConfig.approved;
              
              return (
                <Card 
                  key={booking.id} 
                  className={`border-l-4 hover:shadow-md transition-shadow ${status.bg}`}
                  style={{ borderLeftColor: booking.organization_color || '#3b82f6' }}
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${status.dot}`} />
                          <Badge className={`${status.bg} ${status.text} border ${status.border}`}>
                            {status.label}
                          </Badge>
                        </div>
                        <h3 className="text-lg md:text-xl font-semibold text-slate-900">{booking.event_title}</h3>
                        <p className="text-slate-600">{booking.organization_name}</p>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(booking.start_datetime), "h:mm a")} - {format(new Date(booking.end_datetime), "h:mm a")}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {booking.rooms?.map(roomId => getRoomName(roomId)).join(", ")}
                          </div>
                          {booking.expected_attendance && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {booking.expected_attendance} attendees
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    const now = new Date();
    const upcomingBookings = bookings.filter(booking => {
      // Filter by status
      if (!statusFilters[booking.status]) return false;
      const bookingEnd = new Date(booking.end_datetime);
      return bookingEnd >= now;
    });

    const sortedBookings = upcomingBookings.sort((a, b) => {
      const startA = new Date(a.start_datetime);
      const startB = new Date(b.start_datetime);
      return startA.getTime() - startB.getTime();
    });

    return (
      <div className="space-y-4">
        {sortedBookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <List className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Upcoming Events</h3>
              <p className="text-gray-500">No bookings match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          sortedBookings.map(booking => {
            const status = statusConfig[booking.status] || statusConfig.approved;
            
            return (
              <Card 
                key={booking.id} 
                className={`border-l-4 hover:shadow-md transition-shadow ${status.bg}`}
                style={{ borderLeftColor: booking.organization_color || '#3b82f6' }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status.dot}`} />
                        <Badge className={`${status.bg} ${status.text} border ${status.border}`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{booking.event_title}</h3>
                        <p className="text-slate-600">{booking.organization_name}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {format(new Date(booking.start_datetime), "MMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(booking.start_datetime), "h:mm a")} - {format(new Date(booking.end_datetime), "h:mm a")}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {booking.rooms?.map(roomId => getRoomName(roomId)).join(", ")}
                        </div>
                        {booking.expected_attendance && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {booking.expected_attendance} attendees
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Event Calendar</h1>
              <p className="text-slate-600 mt-2">View bookings and available dates</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" /> Filter Status
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Show bookings with status:</h4>
                    <div className="space-y-3">
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${key}`}
                            checked={statusFilters[key]}
                            onCheckedChange={() => toggleStatusFilter(key)}
                          />
                          <label
                            htmlFor={`status-${key}`}
                            className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                            {config.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Share Button */}
              {isAdmin && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <Share2 className="w-4 h-4 mr-2" /> Share
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Public Calendar Link</h4>
                        <p className="text-sm text-muted-foreground">
                          Anyone with this link can view your building's approved events.
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Input value={publicLink} readOnly />
                        <Button onClick={handleCopy} size="sm" className="px-3">
                          <span className="sr-only">Copy</span>
                          {copySuccess === 'Copied!' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      {copySuccess === 'Copied!' && <p className="text-sm text-green-600 font-medium">{copySuccess}</p>}

                      <div className="border-t pt-4 space-y-2">
                        <h4 className="font-medium leading-none">Calendar Subscription (.ics)</h4>
                        <p className="text-sm text-muted-foreground">
                          Subscribe to this calendar feed in Google Calendar, Apple Calendar, or Outlook.
                        </p>
                        <div className="flex space-x-2">
                          <Input value={icsLink} readOnly />
                          <Button onClick={handleCopyIcs} size="sm" className="px-3">
                            <span className="sr-only">Copy ICS Link</span>
                            {copySuccess === 'ICS link copied!' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        {copySuccess === 'ICS link copied!' && <p className="text-sm text-green-600 font-medium">{copySuccess}</p>}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* ICS Download Button for non-admin users */}
              {!isAdmin && icsLink && (
                <Button variant="outline" asChild>
                  <a href={icsLink} download>
                    <Download className="w-4 h-4 mr-2" /> Subscribe to Calendar
                  </a>
                </Button>
              )}

              {/* View Mode Switcher */}
              <div className="flex bg-white rounded-lg border shadow-sm p-1">
                {viewModes.map(mode => (
                  <Button
                    key={mode.id}
                    variant={viewMode === mode.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode(mode.id)}
                    className={`${viewMode === mode.id ? "bg-blue-600 text-white" : "text-slate-600"} rounded-md flex-1 sm:flex-none`}
                  >
                    <mode.icon className="w-4 h-4 md:mr-1" />
                    <span className="hidden md:inline">{mode.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        {viewMode !== "list" && (
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => navigateDate("prev")}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <h2 className="text-lg md:text-2xl font-bold text-slate-900 text-center">
              {viewMode === "day" && format(currentDate, "MMM d, yyyy")}
              {viewMode === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d")}`}
              {viewMode === "month" && format(currentDate, "MMMM yyyy")}
            </h2>

            <Button
              variant="outline"
              onClick={() => navigateDate("next")}
              className="flex items-center gap-2"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Calendar Views */}
        <div className="mb-8">
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
          {viewMode === "list" && renderListView()}
        </div>
      </div>

      <BookingForm
        open={isFormOpen}
        setOpen={setIsFormOpen}
        booking={null}
        rooms={rooms}
        onSubmit={handleFormSubmit}
        userOrganizations={userOrganizations}
        defaultBookingData={defaultBookingData}
        buildingId={buildingId}
        isAdmin={isAdmin}
        building={building}
      />
    </div>
  );
}