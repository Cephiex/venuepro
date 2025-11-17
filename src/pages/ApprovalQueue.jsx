import { useState, useEffect } from 'react';
import { Booking, Room, User } from '@/entities/all';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import BookingListItem from '../components/bookings/BookingListItem';
import BookingDetails from '../components/bookings/BookingDetails';
import BookingForm from '../components/bookings/BookingForm';

export default function ApprovalQueuePage() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  const loadData = async (buildingId) => {
    setIsLoading(true);
    try {
      const [bookingsData, roomsData] = await Promise.all([
        Booking.filter({ building_id: buildingId, status: 'pending' }, 'created_date'),
        Room.filter({ building_id: buildingId })
      ]);
      setPendingBookings(bookingsData);
      setRooms(roomsData);
    } catch (error) {
      console.error("Error loading approval queue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkUserAndLoad = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        if (userData?.role !== 'admin') {
          setAccessDenied(true);
          setIsLoading(false);
        } else {
          loadData(userData.building_id);
        }
      } catch (error) {
        setAccessDenied(true);
        setIsLoading(false);
      }
    };
    checkUserAndLoad();
  }, []);

  const handleView = (booking) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    try {
      const { type, booking: singleBooking } = data;
      
      if (type === 'single_update') {
        const dataToUpdate = { ...singleBooking, building_id: user.building_id };
        await Booking.update(editingBooking.id, dataToUpdate);
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
        
        const originalDuration = originalEnd.getTime() - originalStart.getTime();
        const newDuration = newEnd.getTime() - newStart.getTime();

        const updatePromises = futureBookings.map(futureBooking => {
            const futureStart = new Date(futureBooking.start_datetime);
            
            const updatedData = {
              ...dataToUpdate,
              start_datetime: new Date(futureStart.getTime() + timeDiff).toISOString(),
              end_datetime: new Date(futureStart.getTime() + timeDiff + newDuration).toISOString(),
            };
            delete updatedData.id;
            return Booking.update(futureBooking.id, updatedData);
        });
        
        await Promise.all(updatePromises);
      }

      setIsFormOpen(false);
      setEditingBooking(null);
      loadData(user.building_id);
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  const handleApprove = async (booking) => {
    await Booking.update(booking.id, { status: 'approved' });
    loadData(user.building_id);
  };

  const handleReject = async (booking) => {
    await Booking.update(booking.id, { status: 'rejected' });
    loadData(user.building_id);
  };
  
  const handleApproveSeries = async (booking) => {
    if (!booking.recurring_id) return;
    const seriesBookings = await Booking.filter({ recurring_id: booking.recurring_id, status: 'pending' });
    const updatePromises = seriesBookings.map(b => Booking.update(b.id, { status: 'approved' }));
    await Promise.all(updatePromises);
    loadData(user.building_id);
  };

  const handleRejectSeries = async (booking) => {
    if (!booking.recurring_id) return;
    const seriesBookings = await Booking.filter({ recurring_id: booking.recurring_id, status: 'pending' });
    const updatePromises = seriesBookings.map(b => Booking.update(b.id, { status: 'rejected' }));
    await Promise.all(updatePromises);
    loadData(user.building_id);
  };

  const handleDelete = async (bookingId) => {
      await Booking.delete(bookingId);
      loadData(user.building_id);
  };

  const handleDeleteSeries = async (recurringId) => {
      const seriesBookings = await Booking.filter({ recurring_id: recurringId });
      const deletePromises = seriesBookings.map(b => Booking.delete(b.id));
      await Promise.all(deletePromises);
      loadData(user.building_id);
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
              You need administrator privileges to view the approval queue.
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Booking Approval Queue</h1>
            <p className="text-slate-600 mt-2">Review and approve or reject new booking requests.</p>
          </div>
        </div>

        {pendingBookings.length > 0 ? (
          <div className="space-y-4">
            {pendingBookings.map(booking => (
              <BookingListItem
                key={booking.id}
                booking={booking}
                rooms={rooms}
                onView={handleView}
                onEdit={handleEdit}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
                onDeleteSeries={handleDeleteSeries}
                onApproveSeries={handleApproveSeries}
                onRejectSeries={handleRejectSeries}
                isAdmin={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800">All Caught Up!</h2>
            <p className="text-slate-500 mt-2">There are no pending booking requests to review.</p>
          </div>
        )}
      </div>

      <BookingDetails
        open={isDetailsOpen}
        setOpen={setIsDetailsOpen}
        booking={selectedBooking}
        rooms={rooms}
      />

      <BookingForm 
        open={isFormOpen}
        setOpen={setIsFormOpen}
        booking={editingBooking}
        rooms={rooms}
        onSubmit={handleFormSubmit}
        userOrganizations={[]}
        buildingId={user?.building_id}
        isAdmin={true}
      />
    </div>
  );
}