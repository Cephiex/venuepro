
import { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  UserMinus,
  Search,
  Users,
  Crown,
  Send,
  Info
} from 'lucide-react';

export default function UserManagement({ open, setOpen, organization, buildingId }) {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [showInviteConfirmation, setShowInviteConfirmation] = useState(false);

  useEffect(() => {
    if (open && organization && buildingId) {
      loadUsers();
      // Reset invite fields when sheet opens/org changes
      setInviteEmail('');
      setInviteRole('user');
      setShowInviteConfirmation(false);
    }
  }, [open, organization, buildingId]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const [allUsersData] = await Promise.all([
        User.filter({ building_id: buildingId }),
      ]);
      setAllUsers(allUsersData);
      // Filter current org members from all users
      setUsers(allUsersData.filter(u => u.organization_ids?.includes(organization.id)));
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setIsLoading(false);
  };

  const handleRemoveUser = async (user) => {
    try {
      // Filter out the current organization.id from the user's organization_ids array
      const updatedOrgIds = user.organization_ids ? user.organization_ids.filter(id => id !== organization.id) : [];
      await User.update(user.id, { organization_ids: updatedOrgIds });
      loadUsers();
    } catch (error) {
      console.error("Error removing user from organization:", error);
    }
  };

  const handleAddUser = async (user) => {
    try {
      // Add the current organization.id to the user's organization_ids array
      // Handle cases where organization_ids might be null or undefined initially
      const updatedOrgIds = [...(user.organization_ids || []), organization.id];
      await User.update(user.id, { organization_ids: updatedOrgIds });
      loadUsers();
    } catch (error) {
      console.error("Error adding user to organization:", error);
    }
  };

  const handleInviteUser = (e) => {
    e.preventDefault();
    if (inviteEmail) {
      setShowInviteConfirmation(true);
    }
  };

  const getAvailableUsers = () => {
    return allUsers.filter(user =>
      // Check if the user's organization_ids array does NOT include the current organization.id
      !user.organization_ids?.includes(organization.id) &&
      (searchTerm === '' ||
       user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  if (!organization) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-4xl w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-slate-900">
            Manage Users - {organization.name}
          </SheetTitle>
          <SheetDescription>
            Add or remove users from this organization. Users can belong to multiple organizations.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 py-6">
          {/* Invite New User Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Invite New User</h3>
            </div>

            <form onSubmit={handleInviteUser} className="p-4 border rounded-lg bg-slate-50 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="new.user@example.com"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setShowInviteConfirmation(false);
                    }}
                    required
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger id="invite-role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full md:w-auto">
                <Send className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </form>

            {showInviteConfirmation && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800">Manual Invitation Required</h4>
                  <p className="text-sm text-blue-700">
                    To finalize the process, please go to the <strong>Users</strong> tab in your application dashboard and click 'Invite User'. You can then enter the email address <strong>({inviteEmail})</strong> and assign the role there. The new user must belong to your building.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Current Organization Members */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Current Members ({users.length})
              </h3>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No members assigned to this organization</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' && (
                              <Crown className="w-4 h-4 text-sky-500" />
                            )}
                            <span className="font-medium">{user.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveUser(user)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Add Existing Users */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Add Existing Users</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-search">Search Users</Label>
              <Input
                id="user-search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {getAvailableUsers().length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">
                  {searchTerm ? 'No users found matching your search' : 'All users are already members'}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAvailableUsers().map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' && (
                              <Crown className="w-4 h-4 text-sky-500" />
                            )}
                            <span className="font-medium">{user.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddUser(user)}
                            className="text-green-600 hover:text-green-700"
                          >
                            Add User
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
