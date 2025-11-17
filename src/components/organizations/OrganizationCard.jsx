import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Mail, 
  Phone, 
  Globe, 
  Edit, 
  UserPlus,
  Eye,
  EyeOff,
  Building2
} from 'lucide-react';

const membershipColors = {
  premium: "bg-purple-100 text-purple-800 border-purple-200",
  standard: "bg-blue-100 text-blue-800 border-blue-200",
  basic: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function OrganizationCard({ 
  organization, 
  rooms, 
  userCount = 0,
  onEdit, 
  onManageUsers,
  onToggleActive 
}) {
  const getAllowedRoomNames = () => {
    if (!organization.allowed_rooms || !rooms || organization.allowed_rooms.length === 0) return 'No rooms assigned';
    const roomNames = organization.allowed_rooms.map(roomId => {
      const room = rooms.find(r => r.id === roomId);
      return room ? room.name : null;
    }).filter(Boolean);

    if (roomNames.length === 0) return 'No rooms assigned';
    return roomNames.join(', ');
  };

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 w-full">
      <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start gap-4 md:gap-6">
        {/* Logo and Main Info */}
        <div className="flex-1 w-full">
          <div className="flex items-start gap-4 mb-2">
            {organization.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt={`${organization.name} logo`}
                className="w-12 h-12 object-contain border border-gray-200 rounded-lg bg-white flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-100 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">{organization.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${membershipColors[organization.membership_type]} border font-medium`}>
                  {organization.membership_type.charAt(0).toUpperCase() + organization.membership_type.slice(1)}
                </Badge>
                <Badge variant={organization.is_active ? "default" : "secondary"} 
                       className={organization.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {organization.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
          {organization.description && (
            <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
              {organization.description}
            </p>
          )}
        </div>

        {/* Details section */}
        <div className="w-full md:w-60 space-y-2 pt-4 md:pt-0 md:border-l md:pl-6">
          <h4 className="text-sm font-medium text-slate-800 mb-2 md:hidden">Details</h4>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4 text-slate-500" />
            <span className="truncate">{organization.contact_email}</span>
          </div>
          
          {organization.contact_phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>{organization.contact_phone}</span>
            </div>
          )}
          
          {organization.website && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Globe className="w-4 h-4 text-slate-500" />
              <a href={organization.website} target="_blank" rel="noopener noreferrer" 
                 className="text-blue-600 hover:underline truncate">
                View Website
              </a>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-4 h-4 text-slate-500" />
            <span>{userCount} member{userCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Rooms & Actions section */}
        <div className="w-full md:w-72 space-y-4 pt-4 md:pt-0 md:border-l md:pl-6">
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-1">Room Access</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-h-16 overflow-y-auto">
              {getAllowedRoomNames()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(organization)}>
              <Edit className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onManageUsers(organization)}>
              <UserPlus className="w-4 h-4 mr-1" /> Users
            </Button>
            <Button variant="outline" size="sm" onClick={() => onToggleActive(organization)}>
              {organization.is_active ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {organization.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}