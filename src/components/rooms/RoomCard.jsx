
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Wifi, Tv, Edit, EyeOff, Eye } from 'lucide-react';

const amenityIcons = {
  "AV Equipment": <Tv className="w-4 h-4" />,
  "WiFi": <Wifi className="w-4 h-4" />,
  "Projector": <Tv className="w-4 h-4" />,
  // Add more as needed
};

export default function RoomCard({ room, onEdit, onToggleActive, isAdmin }) {
  return (
    <Card 
      className="flex flex-col border-l-4 shadow-lg hover:shadow-xl transition-shadow duration-300"
      style={{ borderLeftColor: room.color || '#e5e7eb' }}
    >
      <CardHeader className="p-6">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-bold text-slate-900">{room.name}</CardTitle>
          <Badge variant={room.is_active ? "default" : "secondary"} className={room.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
            {room.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-grow">
        <p className="text-slate-600 mb-4">{room.description}</p>
        
        <div className="flex justify-between items-center text-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium">{room.capacity} Guests</span>
          </div>
          {room.hourly_rate && room.show_hourly_rate !== false && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-medium">${room.hourly_rate}/hr</span>
            </div>
          )}
          {room.show_hourly_rate === false && room.hourly_rate && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-500">Rate on request</span>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-sm text-slate-800 mb-2">Amenities</h4>
          <div className="flex flex-wrap gap-2">
            {room.amenities && room.amenities.map((amenity, index) => (
              <Badge key={index} variant="outline" className="border-blue-500/50 text-blue-700">
                {amenityIcons[amenity] || <Wifi className="w-4 h-4" />}
                <span className="ml-1">{amenity}</span>
              </Badge>
            ))}
            {!room.amenities || room.amenities.length === 0 && (
              <p className="text-xs text-slate-500">No amenities listed.</p>
            )}
          </div>
        </div>
      </CardContent>
      {isAdmin && (
        <CardFooter className="p-4 bg-slate-50 border-t">
          <div className="w-full flex gap-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(room)}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={() => onToggleActive(room)}>
              {room.is_active ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {room.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
