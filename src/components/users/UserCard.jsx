
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Crown,
  Mail,
  Building2,
  Edit,
  Shield,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';

export default function UserCard({ 
  user, 
  organizationName, 
  onEdit, 
  onRoleChange, 
  isCurrentUser 
}) {
  const handleRoleChange = (newRole) => {
    if (newRole !== user.role && !isCurrentUser) {
      onRoleChange(user, newRole);
    }
  };

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              user.role === 'admin' ? 'bg-sky-100' : 'bg-blue-100'
            }`}>
              {user.role === 'admin' ? (
                <Crown className="w-6 h-6 text-sky-600" />
              ) : (
                <UserIcon className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                {user.full_name}
                {isCurrentUser && (
                  <span className="text-sm font-normal text-slate-500 ml-2">(You)</span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' ? 'Administrator' : 'User'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4 text-blue-600" />
            <span className="truncate">{user.email}</span>
          </div>
          
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <Building2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{organizationName}</span>
          </div>
        </div>

        <div className="border-t pt-4 text-xs text-slate-500">
          <p>Joined: {format(new Date(user.created_date), 'MMM d, yyyy')}</p>
          <p>ID: {user.id}</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(user)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          {!isCurrentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-3">
                  <Shield className="w-4 h-4 mr-1" />
                  Role
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={() => handleRoleChange('user')}
                  disabled={user.role === 'user'}
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  Make User
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleRoleChange('admin')}
                  disabled={user.role === 'admin'}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Make Admin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
