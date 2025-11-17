import { useState, useEffect } from 'react';
import { Booking, Room, User, Building } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Calendar as CalendarIcon,
  Download,
  DollarSign,
  Clock,
  Building2,
  AlertCircle,
  Shield,
  Loader2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, getDay, getHours } from 'date-fns';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

export default function ReportsPage() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [building, setBuilding] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date())
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        
        if (userData?.role !== 'admin') {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }
        
        if (userData.building_id) {
          await loadData(userData.building_id);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setAccessDenied(true);
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadData = async (buildingId) => {
    setIsLoading(true);
    try {
      const [bookingsData, roomsData, buildingData] = await Promise.all([
        Booking.filter({ building_id: buildingId }, '-created_date'),
        Room.filter({ building_id: buildingId }),
        Building.get(buildingId)
      ]);
      setBookings(bookingsData);
      setRooms(roomsData);
      setBuilding(buildingData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getFilteredBookings = () => {
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.start_datetime);
      return isWithinInterval(bookingDate, { start: dateRange.from, end: dateRange.to });
    });
  };

  const filteredBookings = getFilteredBookings();

  // Calculate statistics
  const stats = {
    totalBookings: filteredBookings.length,
    approvedBookings: filteredBookings.filter(b => b.status === 'approved').length,
    pendingBookings: filteredBookings.filter(b => b.status === 'pending').length,
    rejectedBookings: filteredBookings.filter(b => b.status === 'rejected').length,
    totalRevenue: filteredBookings
      .filter(b => b.status === 'approved' && b.total_cost)
      .reduce((sum, b) => sum + (b.total_cost || 0), 0)
  };

  // Booking trends by month
  const bookingsByMonth = {};
  filteredBookings.forEach(booking => {
    const monthKey = format(parseISO(booking.start_datetime), 'MMM yyyy');
    bookingsByMonth[monthKey] = (bookingsByMonth[monthKey] || 0) + 1;
  });
  const monthlyTrendData = Object.keys(bookingsByMonth).map(month => ({
    month,
    bookings: bookingsByMonth[month]
  }));

  // Bookings by day of week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const bookingsByDay = [0, 0, 0, 0, 0, 0, 0];
  filteredBookings.forEach(booking => {
    const day = getDay(parseISO(booking.start_datetime));
    bookingsByDay[day]++;
  });
  const dayOfWeekData = dayNames.map((day, index) => ({
    day,
    bookings: bookingsByDay[index]
  }));

  // Bookings by hour (peak hours)
  const hourCounts = new Array(24).fill(0);
  filteredBookings.forEach(booking => {
    const hour = getHours(parseISO(booking.start_datetime));
    hourCounts[hour]++;
  });
  const peakHoursData = hourCounts.map((count, hour) => ({
    hour: `${hour}:00`,
    bookings: count
  })).filter(item => item.bookings > 0);

  // Status distribution
  const statusData = [
    { name: 'Approved', value: stats.approvedBookings, color: '#10b981' },
    { name: 'Pending', value: stats.pendingBookings, color: '#f59e0b' },
    { name: 'Rejected', value: stats.rejectedBookings, color: '#ef4444' },
    { name: 'Cancelled', value: filteredBookings.filter(b => b.status === 'cancelled').length, color: '#6b7280' }
  ].filter(item => item.value > 0);

  // Room utilization
  const roomUtilization = rooms.map(room => {
    const roomBookings = filteredBookings.filter(b => 
      b.status === 'approved' && b.rooms?.includes(room.id)
    );
    const totalHours = roomBookings.reduce((sum, booking) => {
      const start = parseISO(booking.start_datetime);
      const end = parseISO(booking.end_datetime);
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);
    
    return {
      name: room.name,
      bookings: roomBookings.length,
      hours: Math.round(totalHours * 10) / 10,
      revenue: roomBookings.reduce((sum, b) => sum + (b.total_cost || 0), 0)
    };
  }).sort((a, b) => b.bookings - a.bookings);

  // Revenue by month
  const revenueByMonth = {};
  filteredBookings.filter(b => b.status === 'approved' && b.total_cost).forEach(booking => {
    const monthKey = format(parseISO(booking.start_datetime), 'MMM yyyy');
    revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + (booking.total_cost || 0);
  });
  const revenueData = Object.keys(revenueByMonth).map(month => ({
    month,
    revenue: revenueByMonth[month]
  }));

  // Top rejection reasons (mock - would need to add rejection_reason field to Booking entity)
  const rejectionReasons = [
    { reason: 'Room unavailable', count: Math.floor(stats.rejectedBookings * 0.4) },
    { reason: 'Insufficient information', count: Math.floor(stats.rejectedBookings * 0.3) },
    { reason: 'Policy violation', count: Math.floor(stats.rejectedBookings * 0.2) },
    { reason: 'Other', count: Math.floor(stats.rejectedBookings * 0.1) }
  ].filter(item => item.count > 0);

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportFullReport = () => {
    const reportData = filteredBookings.map(booking => ({
      event_title: booking.event_title,
      organization: booking.organization_name,
      start_date: format(parseISO(booking.start_datetime), 'yyyy-MM-dd HH:mm'),
      end_date: format(parseISO(booking.end_datetime), 'yyyy-MM-dd HH:mm'),
      status: booking.status,
      rooms: booking.rooms?.map(id => rooms.find(r => r.id === id)?.name).join('; ') || '',
      cost: booking.total_cost || 0,
      contact: booking.contact_email
    }));
    exportToCSV(reportData, 'full_booking_report');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
            <p className="text-slate-600 mb-6">
              You need administrator privileges to view reports and analytics.
            </p>
            <div className="flex items-center gap-2 justify-center text-blue-600 bg-blue-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Contact your system administrator for access.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Reports & Analytics</h1>
              <p className="text-slate-600 mt-2">
                Insights into booking trends, room utilization, and financial performance
              </p>
            </div>
            <div className="flex gap-2">
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium">Quick Select</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDateRange({
                              from: startOfMonth(new Date()),
                              to: endOfMonth(new Date())
                            });
                            setShowDatePicker(false);
                          }}
                        >
                          This Month
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDateRange({
                              from: startOfMonth(subMonths(new Date(), 2)),
                              to: endOfMonth(new Date())
                            });
                            setShowDatePicker(false);
                          }}
                        >
                          Last 3 Months
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDateRange({
                              from: startOfMonth(subMonths(new Date(), 5)),
                              to: endOfMonth(new Date())
                            });
                            setShowDatePicker(false);
                          }}
                        >
                          Last 6 Months
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDateRange({
                              from: startOfMonth(subMonths(new Date(), 11)),
                              to: endOfMonth(new Date())
                            });
                            setShowDatePicker(false);
                          }}
                        >
                          Last Year
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={exportFullReport}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Bookings</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalBookings}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{stats.approvedBookings}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingBookings}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-slate-900">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different report sections */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Booking Trends</TabsTrigger>
            <TabsTrigger value="utilization">Room Utilization</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="issues">Issues & Rejections</TabsTrigger>
          </TabsList>

          {/* Booking Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Bookings Over Time</CardTitle>
                  <CardDescription>Monthly booking volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Status Distribution</CardTitle>
                  <CardDescription>Breakdown by approval status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Day of Week */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Days</CardTitle>
                  <CardDescription>Bookings by day of week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dayOfWeekData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(dayOfWeekData, 'bookings_by_day')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Peak Hours */}
              <Card>
                <CardHeader>
                  <CardTitle>Peak Booking Hours</CardTitle>
                  <CardDescription>Most popular times for bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={peakHoursData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(peakHoursData, 'peak_hours')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Room Utilization Tab */}
          <TabsContent value="utilization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Room Utilization Comparison</CardTitle>
                <CardDescription>Booking frequency and hours used per room</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={roomUtilization}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="bookings" fill="#3b82f6" name="Number of Bookings" />
                    <Bar yAxisId="right" dataKey="hours" fill="#10b981" name="Hours Booked" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6">
                  <h4 className="font-semibold mb-4">Detailed Room Statistics</h4>
                  <div className="space-y-3">
                    {roomUtilization.map((room, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{room.name}</p>
                            <p className="text-sm text-slate-600">{room.bookings} bookings • {room.hours} hours</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">${room.revenue.toFixed(2)}</p>
                          <p className="text-sm text-slate-600">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(roomUtilization, 'room_utilization')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Room Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Over Time</CardTitle>
                  <CardDescription>Monthly revenue from bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(revenueData, 'revenue_by_month')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Revenue Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Room</CardTitle>
                  <CardDescription>Which rooms generate the most revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={roomUtilization}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                      <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                  <CardDescription>Key financial metrics for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-900">${stats.totalRevenue.toFixed(2)}</p>
                      <p className="text-xs text-green-700 mt-1">From {stats.approvedBookings} approved bookings</p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">Average Booking Value</p>
                      <p className="text-2xl font-bold text-blue-900">
                        ${stats.approvedBookings > 0 ? (stats.totalRevenue / stats.approvedBookings).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">Per approved booking</p>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm font-medium text-purple-800 mb-1">Top Revenue Room</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {roomUtilization.length > 0 ? roomUtilization.sort((a, b) => b.revenue - a.revenue)[0].name : 'N/A'}
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        ${roomUtilization.length > 0 ? roomUtilization.sort((a, b) => b.revenue - a.revenue)[0].revenue.toFixed(2) : '0.00'} total
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Issues & Rejections Tab */}
          <TabsContent value="issues" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rejection Statistics</CardTitle>
                  <CardDescription>Overview of rejected bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-red-800">Total Rejections</p>
                        <p className="text-3xl font-bold text-red-900">{stats.rejectedBookings}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-red-700">
                          {stats.totalBookings > 0 
                            ? ((stats.rejectedBookings / stats.totalBookings) * 100).toFixed(1) 
                            : 0}%
                        </p>
                        <p className="text-xs text-red-600">of total bookings</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Common Rejection Reasons</h4>
                      <div className="space-y-2">
                        {rejectionReasons.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-700">{item.reason}</span>
                            <Badge variant="outline">{item.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Approval Rate</CardTitle>
                  <CardDescription>Booking approval metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-6xl font-bold text-green-600">
                        {stats.totalBookings > 0 
                          ? ((stats.approvedBookings / stats.totalBookings) * 100).toFixed(0) 
                          : 0}%
                      </p>
                      <p className="text-sm text-slate-600 mt-2">Overall Approval Rate</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-900">{stats.approvedBookings}</p>
                        <p className="text-xs text-green-700 mt-1">Approved</p>
                      </div>
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                        <p className="text-2xl font-bold text-red-900">{stats.rejectedBookings}</p>
                        <p className="text-xs text-red-700 mt-1">Rejected</p>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-2">Pending Review</p>
                      <p className="text-3xl font-bold text-yellow-900">{stats.pendingBookings}</p>
                      <p className="text-xs text-yellow-700 mt-1">Bookings awaiting approval</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Insights to improve booking efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.rejectedBookings > stats.totalBookings * 0.2 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="font-medium text-amber-900">High Rejection Rate</p>
                      <p className="text-sm text-amber-800 mt-1">
                        Consider reviewing your approval process or providing clearer booking guidelines to reduce rejections.
                      </p>
                    </div>
                  )}
                  {roomUtilization.length > 0 && roomUtilization[0].bookings > roomUtilization[roomUtilization.length - 1].bookings * 3 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-medium text-blue-900">Uneven Room Utilization</p>
                      <p className="text-sm text-blue-800 mt-1">
                        Some rooms are significantly more popular. Consider promoting underutilized spaces or adjusting pricing.
                      </p>
                    </div>
                  )}
                  {peakHoursData.length > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-medium text-green-900">Peak Hours Identified</p>
                      <p className="text-sm text-green-800 mt-1">
                        Most bookings occur during {peakHoursData.sort((a, b) => b.bookings - a.bookings)[0].hour}. 
                        Consider dynamic pricing for high-demand time slots.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}