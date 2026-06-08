import { useState, useEffect } from 'react';
import { Booking, Room, User, Organization, Building } from '@/entities/all';
import { SendEmail } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MoreVertical, Eye, CheckCircle, XCircle, Edit, Trash2, Calendar, MapPin, Repeat, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import BookingForm from '../components/bookings/BookingForm';
import BookingDetails from '../components/bookings/BookingDetails';

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [building, setBuilding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [user, setUser] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);

  useEffect(() => {
    loadData();
    
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['all', 'pending', 'approved', 'rejected', 'cancelled'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      
      if (!userData?.building_id) {
        setIsLoading(false);
        return;
      }
      
      const [bookingsData, roomsData, buildingData] = await Promise.all([
        Booking.filter({ building_id: userData.building_id }, 'start_datetime'),
        Room.filter({ building_id: userData.building_id }),
        Building.get(userData.building_id)
      ]);

      setBookings(bookingsData);
      setRooms(roomsData);
      setBuilding(buildingData);

      if (userData.organization_ids && userData.organization_ids.length > 0) {
        const orgPromises = userData.organization_ids.map(id => Organization.get(id));
        const orgsData = await Promise.all(orgPromises);
        setUserOrganizations(orgsData);
      } else {
        setUserOrganizations([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleAddNew = () => {
    setEditingBooking(null);
    setIsFormOpen(true);
  };

  const handleView = (booking) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
  };
  
  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setIsFormOpen(true);
  };
  
  const handleDelete = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await Booking.delete(bookingId);
        loadData();
      } catch (error) {
        console.error("Error deleting booking:", error);
      }
    }
  };

  const handleDeleteSeries = async (recurringId) => {
    if (window.confirm('Are you sure you want to delete this entire recurring series? This action cannot be undone.')) {
      try {
        const seriesBookings = await Booking.filter({ recurring_id: recurringId });
        const deletePromises = seriesBookings.map(b => Booking.delete(b.id));
        await Promise.all(deletePromises);
        loadData();
      } catch (error) {
        console.error("Error deleting booking series:", error);
      }
    }
  };

  const handleApprove = async (booking) => {
    try {
      await Booking.update(booking.id, { status: 'approved' });
      loadData();
    } catch (error) {
      console.error("Error approving booking:", error);
    }
  };

  const handleReject = async (booking) => {
    try {
      await Booking.update(booking.id, { status: 'rejected' });
      loadData();
    } catch (error) {
      console.error("Error rejecting booking:", error);
    }
  };

  const handleApproveSeries = async (booking) => {
    if (!booking.recurring_id) return;
    try {
      const seriesBookings = await Booking.filter({
        recurring_id: booking.recurring_id,
        status: 'pending'
      });
      const updatePromises = seriesBookings.map(b => 
        Booking.update(b.id, { status: 'approved' })
      );
      await Promise.all(updatePromises);
      loadData();
    } catch (error) {
      console.error("Error approving booking series:", error);
    }
  };

  const handleRejectSeries = async (booking) => {
    if (!booking.recurring_id) return;
    try {
      const seriesBookings = await Booking.filter({
        recurring_id: booking.recurring_id,
        status: 'pending'
      });
      const updatePromises = seriesBookings.map(b => 
        Booking.update(b.id, { status: 'rejected' })
      );
      await Promise.all(updatePromises);
      loadData();
    } catch (error) {
      console.error("Error rejecting booking series:", error);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      // This is now the object from BookingForm: { type, booking/bookings }
      const { type, booking: singleBooking, bookings: seriesBookings } = data;

      if (type === 'create_series') {
        const createPromises = seriesBookings.map(b => Booking.create({ ...b, building_id: user.building_id, status: 'pending' }));
        await Promise.all(createPromises);
        
        // Send notification to admins about the recurring series
        if (seriesBookings.length > 0) {
          await notifyAdminsOfNewBooking(seriesBookings[0], true, seriesBookings.length);
        }
      } else if (type === 'create_single') {
        const dataWithBuilding = { ...singleBooking, building_id: user.building_id, status: 'pending' };
        const createdBooking = await Booking.create(dataWithBuilding);
        
        // Send notification to admins
        await notifyAdminsOfNewBooking(createdBooking, false);
      } else if (type === 'update_series') {
        const dataToUpdate = { ...singleBooking, building_id: user.building_id };
        const originalBooking = editingBooking;
        const currentBookingDate = new Date(originalBooking.start_datetime);

        const allSeriesBookings = await Booking.filter({ recurring_id: originalBooking.recurring_id });
        const futureBookings = allSeriesBookings.filter(b => new Date(b.start_datetime).getTime() >= currentBookingDate.getTime());
        
        const originalStart = new Date(originalBooking.start_datetime);
        const newStart = new Date(dataToUpdate.start_datetime);
        const originalEnd = new Date(originalBooking.end_datetime);
        const newEnd = new Date(dataToUpdate.end_datetime);
        const timeDiff = newStart.getTime() - originalStart.getTime();
        
        // Calculate duration difference separately
        const originalDuration = originalEnd.getTime() - originalStart.getTime();
        const newDuration = newEnd.getTime() - newStart.getTime();

        const updatePromises = futureBookings.map(futureBooking => {
            const futureStart = new Date(futureBooking.start_datetime);
            
            const updatedData = {
              ...dataToUpdate,
              start_datetime: new Date(futureStart.getTime() + timeDiff).toISOString(),
              end_datetime: new Date(futureStart.getTime() + timeDiff + newDuration).toISOString(),
            };
            delete updatedData.id; // Ensure we don't try to update the ID
            return Booking.update(futureBooking.id, updatedData);
        });
        
        await Promise.all(updatePromises);
      } else if (type === 'single_update') {
        const dataToUpdate = { ...singleBooking, building_id: user.building_id };
        await Booking.update(editingBooking.id, dataToUpdate);
      }

      setIsFormOpen(false);
      setEditingBooking(null);
      loadData();
    } catch (error) {
      console.error("Error saving booking:", error);
    }
  };

  const notifyAdminsOfNewBooking = async (booking, isRecurring = false, occurrences = 1) => {
    try {
      // Get all admin users for this building
      const adminUsers = await User.filter({ 
        building_id: user.building_id, 
        role: 'admin' 
      });

      if (adminUsers.length === 0) {
        console.warn("No admin users found for notifications.");
        return;
      }

      const roomNames = getRoomNames(booking.rooms);
      const bookingUrl = `https://venumgmt.pro${createPageUrl('Bookings?tab=pending')}`;

      const subject = `New Booking Request: ${booking.event_title}`;
      const body = `
Hello,

A new booking request has been submitted and requires your review.

${isRecurring ? `📅 Recurring Event (${occurrences} occurrences)` : '📅 Single Event'}

Event Details:
- Title: ${booking.event_title}
- Organization: ${booking.organization_name}
- Contact: ${booking.contact_name || 'N/A'} (${booking.contact_email})
- Room(s): ${roomNames}
- Date & Time: ${format(new Date(booking.start_datetime), 'PPP p')} - ${format(new Date(booking.end_datetime), 'p')}
${booking.event_description ? `- Description: ${booking.event_description}` : ''}
${booking.special_requirements ? `- Special Requirements: ${booking.special_requirements}` : ''}

Review and approve this booking here:
${bookingUrl}

Best regards,
${building.name} Management System
      `;

      // Send email to all admins
      const emailPromises = adminUsers.map(admin => 
        SendEmail({
          to: admin.email,
          subject: subject,
          body: body
        }).catch(err => console.error(`Failed to send email to ${admin.email}:`, err))
      );

      await Promise.all(emailPromises);
      console.log(`Email notifications sent to ${adminUsers.length} admins.`);
    } catch (error) {
      console.error("Error notifying admins:", error);
      // Don't fail the booking creation if email fails
    }
  };

  const getRoomNames = (roomIds) => {
    if (!roomIds || !rooms) return 'Unknown Room';
    return roomIds.map(roomId => {
      const room = rooms.find(r => r.id === roomId);
      return room ? room.name : 'Unknown Room';
    }).join(', ');
  };

  const formatDateTime = (dateTime) => {
    return format(new Date(dateTime), 'MMM d, yyyy • h:mm a');
  };

  const getFilteredBookings = (status) => {
    const now = new Date();
    
    if (status === 'all') {
      return bookings.filter(booking => new Date(booking.end_datetime) >= now);
    }
    
    const statusFiltered = bookings.filter(booking => booking.status === status);
    
    if (['pending', 'approved'].includes(status)) {
      return statusFiltered.filter(booking => new Date(booking.end_datetime) >= now);
    }

    return statusFiltered;
  };

  const getStatusCount = (status) => {
    return getFilteredBookings(status).length;
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (bookingsList) => {
    if (bookingsList.every(b => selectedIds.has(b.id))) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        bookingsList.forEach(b => next.delete(b.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        bookingsList.forEach(b => next.add(b.id));
        return next;
      });
    }
  };

  const handleBulkCancel = async () => {
    if (!window.confirm(`Cancel ${selectedIds.size} selected booking(s)? This cannot be undone.`)) return;
    setIsBulkCancelling(true);
    try {
      await Promise.all([...selectedIds].map(id => Booking.update(id, { status: 'cancelled' })));
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      console.error("Error bulk cancelling bookings:", error);
    }
    setIsBulkCancelling(false);
  };

  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Booking Management</h1>
            <p className="text-slate-600 mt-2">Manage room bookings and requests.</p>
          </div>
          <Button onClick={handleAddNew} className="bg-blue-900 hover:bg-blue-800 w-full md:w-auto">
            <Plus className="w-5 h-5 mr-2" /> New Booking
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-2">
            <TabsList className="grid w-max grid-cols-5 bg-white p-1 rounded-xl border shadow-sm">
              <TabsTrigger value="all" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
                Upcoming ({getStatusCount('all')})
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
                Pending ({getStatusCount('pending')})
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Approved ({getStatusCount('approved')})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                Rejected ({getStatusCount('rejected')})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-gray-500 data-[state=active]:text-white">
                Cancelled ({getStatusCount('cancelled')})
              </TabsTrigger>
            </TabsList>
          </div>

          {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(status => (
            <TabsContent key={status} value={status} className="space-y-6">
              {getFilteredBookings(status).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-lg shadow-sm border">
                  <h2 className="text-xl md:text-2xl font-semibold text-slate-800">
                    No {status === 'all' ? 'upcoming' : status} bookings found
                  </h2>
                  <p className="text-slate-500 mt-2 mb-6">
                    {status === 'all' 
                      ? 'Get started by creating your first booking request.' 
                      : `No bookings with status "${status}" at this time.`}
                  </p>
                  {status === 'all' && (
                    <Button onClick={handleAddNew} className="bg-blue-900 hover:bg-blue-800">
                      <Plus className="w-5 h-5 mr-2" /> Create First Booking
                    </Button>
                  )}
                </div>
              ) : (() => {
                const filteredList = getFilteredBookings(status);
                const allSelected = filteredList.length > 0 && filteredList.every(b => selectedIds.has(b.id));
                const someSelected = filteredList.some(b => selectedIds.has(b.id));
                const visibleSelected = filteredList.filter(b => selectedIds.has(b.id));
                return (
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  {isAdmin && someSelected && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-200">
                      <span className="text-sm font-medium text-blue-800">{visibleSelected.length} selected</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleBulkCancel}
                        disabled={isBulkCancelling}
                        className="ml-2"
                      >
                        <X className="w-4 h-4 mr-1" />
                        {isBulkCancelling ? 'Cancelling...' : `Cancel ${visibleSelected.length} Booking${visibleSelected.length > 1 ? 's' : ''}`}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-blue-700">
                        Clear selection
                      </Button>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        {isAdmin && (
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => toggleSelectAll(filteredList)}
                            />
                          </TableHead>
                        )}
                        <TableHead className="font-semibold">Event</TableHead>
                        <TableHead className="font-semibold">Organization</TableHead>
                        <TableHead className="font-semibold">Date & Time</TableHead>
                        <TableHead className="font-semibold">Room(s)</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.map(booking => (
                        <TableRow key={booking.id} className={`hover:bg-slate-50 ${selectedIds.has(booking.id) ? 'bg-blue-50' : ''}`}>
                          {isAdmin && (
                            <TableCell className="w-10">
                              <Checkbox
                                checked={selectedIds.has(booking.id)}
                                onCheckedChange={() => toggleSelect(booking.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium text-slate-900">{booking.event_title}</p>
                                {booking.recurring_id && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs mt-1">
                                    <Repeat className="w-3 h-3 mr-1" />
                                    Recurring
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-slate-700 font-medium">{booking.organization_name}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Calendar className="w-4 h-4" />
                              {formatDateTime(booking.start_datetime)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="w-4 h-4" />
                              {getRoomNames(booking.rooms)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[booking.status]} border font-medium`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleView(booking)}>
                                    <Eye className="w-4 h-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(booking)}>
                                    <Edit className="w-4 h-4 mr-2" /> Edit Booking
                                  </DropdownMenuItem>
                                  
                                  {booking.status === 'pending' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleApprove(booking)}>
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleReject(booking)}>
                                        <XCircle className="w-4 h-4 mr-2 text-red-600" /> Reject
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600" 
                                    onClick={() => handleDelete(booking.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleView(booking)}
                              >
                                <Eye className="w-4 h-4 mr-2" /> View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                );
              })()}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <BookingForm 
        open={isFormOpen}
        setOpen={setIsFormOpen}
        booking={editingBooking}
        rooms={rooms}
        onSubmit={handleFormSubmit}
        userOrganizations={userOrganizations}
        buildingId={user?.building_id}
        building={building}
        isAdmin={isAdmin}
      />

      <BookingDetails
        open={isDetailsOpen}
        setOpen={setIsDetailsOpen}
        booking={selectedBooking}
        rooms={rooms}
      />
    </div>
  );
}