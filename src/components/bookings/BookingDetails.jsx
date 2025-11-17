
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Mail,
  Phone,
  DollarSign,
  User
} from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function BookingDetails({ open, setOpen, booking, rooms }) {
  if (!booking) return null;

  const getRoomNames = (roomIds) => {
    if (!roomIds || !rooms) return 'Unknown Room';
    return roomIds.map(roomId => {
      const room = rooms.find(r => r.id === roomId);
      return room ? room.name : 'Unknown Room';
    }).join(', ');
  };

  const formatDateTime = (dateTime) => {
    return format(new Date(dateTime), 'EEEE, MMMM d, yyyy • h:mm a');
  };

  const getDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const hours = Math.ceil((endTime - startTime) / (1000 * 60 * 60));
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-2xl w-[90vw] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-slate-900">
              {booking.event_title}
            </SheetTitle>
            <Badge className={`${statusColors[booking.status]} border font-medium`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </div>
          <SheetDescription className="text-lg font-medium text-slate-700">
            {booking.organization_name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Event Details */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Event Details</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Start Time</p>
                  <p className="text-slate-600">{formatDateTime(booking.start_datetime)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-slate-600">
                    {getDuration(booking.start_datetime, booking.end_datetime)} 
                    <span className="text-sm ml-2">
                      (until {format(new Date(booking.end_datetime), 'h:mm a')})
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-slate-600">{getRoomNames(booking.rooms)}</p>
                </div>
              </div>

              {booking.expected_attendance && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Expected Attendance</p>
                    <p className="text-slate-600">{booking.expected_attendance} people</p>
                  </div>
                </div>
              )}

              {booking.total_cost && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Total Cost</p>
                    <p className="text-slate-600">${booking.total_cost.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>

            {booking.event_description && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg">
                  {booking.event_description}
                </p>
              </div>
            )}
          </section>

          {/* Contact Information */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Contact Information</h3>
            <div className="grid gap-4">
              {booking.contact_name && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Contact Person</p>
                    <p className="text-slate-600">{booking.contact_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-slate-600">{booking.contact_email}</p>
                </div>
              </div>

              {booking.contact_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-slate-600">{booking.contact_phone}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Special Requirements */}
          {booking.special_requirements && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Special Requirements</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-slate-700 leading-relaxed">
                  {booking.special_requirements}
                </p>
              </div>
            </section>
          )}

          {/* Admin Notes */}
          {booking.admin_notes && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Admin Notes</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-slate-700 leading-relaxed">
                  {booking.admin_notes}
                </p>
              </div>
            </section>
          )}

          {/* Booking Metadata */}
          <section className="space-y-2 text-sm text-slate-500 border-t pt-4">
            <p>Booking created: {format(new Date(booking.created_date), 'MMM d, yyyy • h:mm a')}</p>
            <p>Booking ID: {booking.id}</p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
