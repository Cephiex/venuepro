
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  MapPin, 
  Repeat,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function BookingListItem({ 
  booking, 
  rooms, 
  onApprove, 
  onReject, 
  onView, 
  onEdit,
  onDelete,
  onDeleteSeries,
  isAdmin, 
  onApproveSeries, 
  onRejectSeries 
}) {
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

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      <CardContent className="p-4 flex-1 flex flex-col gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg text-slate-900 leading-tight">{booking.event_title}</h3>
            {booking.recurring_id && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs flex-shrink-0">
                <Repeat className="w-3 h-3 mr-1" />
                Recurring
              </Badge>
            )}
          </div>
          <p className="text-slate-600 font-medium">{booking.organization_name}</p>
          <div className="space-y-2 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDateTime(booking.start_datetime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{getRoomNames(booking.rooms)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <Badge className={`${statusColors[booking.status]} border font-medium`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
          
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(booking)}>
                  <Eye className="w-4 h-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(booking)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Booking
                </DropdownMenuItem>
                
                {booking.status === 'pending' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onApprove(booking)}>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReject(booking)}>
                      <XCircle className="w-4 h-4 mr-2 text-red-600" /> Reject
                    </DropdownMenuItem>
                    {booking.recurring_id && (
                      <>
                        <DropdownMenuItem onClick={() => onApproveSeries(booking)}>
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Approve Series
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => onRejectSeries(booking)}>
                          <XCircle className="w-4 h-4 mr-2 text-red-600" /> Reject Series
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(booking.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Booking
                </DropdownMenuItem>
                {booking.recurring_id && (
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDeleteSeries(booking.recurring_id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Series
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Button variant="outline" size="sm" onClick={() => onView(booking)}>
                <Eye className="w-4 h-4 mr-2" /> View
              </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
