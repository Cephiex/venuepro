
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Booking, Room, RepairTicket, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar,
  Building2,
  Wrench,
  Clock,
  Plus,
  Share2,
  Copy,
  Check
} from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    totalRooms: 0,
    openTickets: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const navigate = useNavigate();

  const inviteLink = user?.building_id 
    ? `${window.location.origin}${createPageUrl(`JoinBuilding?building_id=${user.building_id}`)}` 
    : '';

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const userData = await User.me();
        setUser(userData);
        
        if (!userData.building_id) {
          navigate(createPageUrl("CreateBuilding"));
          return;
        }
        
        loadDashboardData(userData.building_id);
      } catch (error) {
        // User not logged in, handled by layout/router
        console.error("Error during initialization:", error);
        setIsLoading(false);
      }
    };
    init();
  }, [navigate]);

  const loadDashboardData = async (buildingId) => {
    try {
      const [bookings, rooms, tickets] = await Promise.all([
        Booking.filter({ building_id: buildingId }, "-created_date", 50),
        Room.filter({ building_id: buildingId }),
        RepairTicket.filter({ building_id: buildingId }, "-created_date", 20)
      ]);

      setStats({
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === "pending").length,
        totalRooms: rooms.length,
        openTickets: tickets.filter(t => t.status !== "completed" && t.status !== "cancelled").length
      });

      setRecentBookings(bookings.slice(0, 5));
      setRecentTickets(tickets.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "open": return "bg-gray-100 text-gray-800";
      case "urgent": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome back{user ? `, ${user.full_name?.split(' ')[0]}` : ''}
              </h1>
              <p className="text-slate-600 mt-2">
                Here's what's happening at your building today
              </p>
            </div>
            
            {isAdmin && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-slate-300">
                    <Share2 className="w-4 h-4 mr-2" /> Invite Users
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Invite New Users</h4>
                        <p className="text-sm text-muted-foreground">
                          Share this link with anyone you want to join your building.
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <Input value={inviteLink} readOnly className="text-xs" />
                        <Button onClick={handleCopy} size="icon" className="px-3 w-12">
                          {copySuccess ? <Check className="h-4 w-4 text-green-400"/> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    {copySuccess && <p className="text-sm text-green-600 font-medium">Link copied!</p>}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Link to={`${createPageUrl("Calendar")}?view=list`}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Bookings</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-900">{stats.totalBookings}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={`${createPageUrl("Bookings")}?tab=pending`}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Pending Approvals</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-900">{stats.pendingBookings}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Rooms")}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Available Rooms</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-900">{stats.totalRooms}</p>
                  </div>
                  <div className="p-3 bg-sky-100 rounded-xl">
                    <Building2 className="w-6 h-6 text-sky-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Repairs")}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Open Tickets</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-900">{stats.openTickets}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <Wrench className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Link to={createPageUrl("Bookings")}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">New Booking</h3>
                <p className="text-slate-600 text-sm">Reserve rooms for your event</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Repairs")}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Wrench className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Report Issue</h3>
                <p className="text-slate-600 text-sm">Submit a maintenance request</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Calendar")}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">View Calendar</h3>
                <p className="text-slate-600 text-sm">Check room availability</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">Recent Bookings</CardTitle>
              <Link to={createPageUrl("Bookings")}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No bookings yet</p>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map(booking => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <h4 className="font-semibold text-slate-900">{booking.event_title}</h4>
                        <p className="text-sm text-slate-600">{booking.organization_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(booking.start_datetime), "MMM d, yyyy • h:mm a")}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">Recent Repair Tickets</CardTitle>
              <Link to={createPageUrl("Repairs")}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentTickets.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No tickets yet</p>
              ) : (
                <div className="space-y-4">
                  {recentTickets.map(ticket => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          ticket.priority === "urgent" ? "bg-red-100" :
                          ticket.priority === "high" ? "bg-orange-100" :
                          ticket.priority === "medium" ? "bg-yellow-100" :
                          "bg-green-100"
                        }`}>
                          <Wrench className={`w-4 h-4 ${
                            ticket.priority === "urgent" ? "text-red-600" :
                            ticket.priority === "high" ? "text-orange-600" :
                            ticket.priority === "medium" ? "text-yellow-600" :
                            "text-green-600"
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{ticket.title}</h4>
                          <p className="text-sm text-slate-600">{ticket.location}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(ticket.created_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
