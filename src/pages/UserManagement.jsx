
import { useState, useEffect } from 'react';
import { User, Organization } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createPageUrl } from "@/utils";
import { 
  Share2, 
  Copy,
  Check,
  Search, 
  Shield, 
  AlertCircle,
  Users,
  Info
} from 'lucide-react';
import UserCard from '../components/users/UserCard';
import UserForm from '../components/users/UserForm';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const inviteLink = currentUser?.building_id 
    ? `${window.location.origin}${createPageUrl(`JoinBuilding?building_id=${currentUser.building_id}`)}` 
    : '';

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setCurrentUser(userData);
      
      if (userData?.role !== 'admin') {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }
      
      loadData(userData.building_id);
    } catch (error) {
      console.error("Error checking admin access:", error);
      setAccessDenied(true);
      setIsLoading(false);
    }
  };

  const loadData = async (buildingId) => {
    try {
      const [usersData, organizationsData] = await Promise.all([
        User.filter({ building_id: buildingId }),
        Organization.filter({ building_id: buildingId })
      ]);
      setUsers(usersData);
      setOrganizations(organizationsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleUserFormSubmit = async (formData) => {
    try {
      if (editingUser) {
        await User.update(editingUser.id, formData);
      }
      setIsUserFormOpen(false);
      setEditingUser(null);
      loadData(currentUser.building_id);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      await User.update(user.id, { role: newRole });
      loadData(currentUser.building_id);
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };
  
  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      const matchesOrg = orgFilter === 'all' || 
        (orgFilter === 'unassigned' && (!user.organization_ids || user.organization_ids.length === 0)) ||
        (user.organization_ids && user.organization_ids.includes(orgFilter));
      
      return matchesSearch && matchesRole && matchesOrg;
    });
  };

  const getOrganizationNames = (orgIds) => {
    if (!orgIds || orgIds.length === 0) return 'Unassigned';
    return orgIds.map(orgId => {
      const org = organizations.find(o => o.id === orgId);
      return org ? org.name : 'Unknown';
    }).join(', ');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
            <p className="text-slate-600 mb-6">
              You need administrator privileges to access user management.
            </p>
            <div className="flex items-center gap-2 justify-center text-blue-600 bg-blue-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Contact your system administrator for access</span>
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-600 mt-2">Manage user accounts, roles, and organization assignments.</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 w-full md:w-auto">
                <Share2 className="w-5 h-5 mr-2" /> Share Invite Link
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
                <div className="space-y-4">
                  <div className="space-y-2">
                      <h4 className="font-medium leading-none">Shareable Invite Link</h4>
                      <p className="text-sm text-muted-foreground">
                        Anyone with this link can sign up and join your building.
                      </p>
                  </div>
                  <div className="flex space-x-2">
                      <Input value={inviteLink} readOnly className="text-xs" />
                      <Button onClick={handleCopy} size="icon" className="px-3 w-12">
                        {copySuccess ? <Check className="h-4 w-4 text-green-400"/> : <Copy className="h-4 w-4" />}
                      </Button>
                  </div>
                </div>
              </PopoverContent>
          </Popover>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <Label htmlFor="search">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <div className="text-sm text-slate-600">
                  <div className="font-medium">{getFilteredUsers().length} users</div>
                  <div>{users.filter(u => u.role === 'admin').length} admins</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">User Management Guidelines</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Use "Share Invite Link" to send an invitation URL to new users.</li>
                  <li>• Admins can manage organizations, users, and approve bookings.</li>
                  <li>• Assign users to organizations via the "Edit" button on their card.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredUsers().map(user => (
            <UserCard
              key={user.id}
              user={user}
              organizationName={getOrganizationNames(user.organization_ids)}
              onEdit={handleEditUser}
              onRoleChange={handleRoleChange}
              isCurrentUser={user.id === currentUser.id}
            />
          ))}
        </div>

        {getFilteredUsers().length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800">No Users Found</h2>
            <p className="text-slate-500 mt-2 mb-6">
              {users.length === 0 
                ? "No users have been added to your building yet." 
                : "No users match your current filters."}
            </p>
          </div>
        )}
      </div>

      <UserForm
        open={isUserFormOpen}
        setOpen={setIsUserFormOpen}
        user={editingUser}
        organizations={organizations}
        onSubmit={handleUserFormSubmit}
      />
    </div>
  );
}
