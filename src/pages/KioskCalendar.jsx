import { useState, useEffect } from 'react';
import { getPublicCalendarData } from '@/functions/getPublicCalendarData';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday, 
  isSameMonth, 
  startOfMonth,
  endOfMonth,
  isSameDay
} from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function KioskCalendar() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [building, setBuilding] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const buildingId = urlParams.get('buildingId');

      if (!buildingId) {
        setError('Building ID is required');
        setIsLoading(false);
        return;
      }

      try {
        const response = await getPublicCalendarData({ buildingId });
        const data = response.data;
        
        setBuilding(data.building);
        setBookings(data.bookings || []);
        setRooms(data.rooms || []);
        setOrganizations(data.organizations || []);
      } catch (err) {
        setError('Failed to load calendar data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Unknown Room';
  };

  const getBookingsForDate = (date) => {
    return bookings.filter(booking => {
      if (booking.status !== 'approved') return false;
      
      const bookingStart = new Date(booking.start_datetime);
      const bookingEnd = new Date(booking.end_datetime);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      return (bookingStart <= dayEnd && bookingEnd >= dayStart);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !building) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <p className="text-gray-600">{error || 'Calendar not available'}</p>
        </div>
      </div>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="h-screen bg-white p-4 overflow-hidden">
      {/* Month Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-slate-900">
          {format(currentDate, 'MMMM yyyy')}
        </h1>
        <p className="text-slate-600 mt-1">{building.name}</p>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b-2 border-slate-300">
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
            <div key={day} className="p-3 text-center font-semibold text-slate-700 bg-slate-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
          {days.map((day, index) => {
            const dayBookings = getBookingsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toISOString()}
                className={`border-r border-b p-2 ${
                  !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
                } ${isToday(day) ? "bg-blue-50" : ""}`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-blue-600 font-bold" : ""}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-full">
                  {dayBookings.map(booking => {
                    const bookingStart = new Date(booking.start_datetime);
                    const bookingEnd = new Date(booking.end_datetime);
                    
                    const isStart = isSameDay(bookingStart, day) || index % 7 === 0;
                    const isEnd = isSameDay(bookingEnd, day) || index % 7 === 6;

                    let borderRadiusClass = 'rounded';
                    if (!isStart && !isEnd) borderRadiusClass = '';
                    else if (!isStart) borderRadiusClass = 'rounded-r';
                    else if (!isEnd) borderRadiusClass = 'rounded-l';
                    
                    return (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 ${borderRadiusClass}`}
                        style={{ 
                          backgroundColor: booking.organization_color || '#3b82f6',
                          opacity: 0.9
                        }}
                      >
                        <div className={`truncate font-medium text-white ${!isStart && 'opacity-0'}`}>
                          {isStart && `${format(bookingStart, "h:mma")} `}{booking.event_title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}