import { useState, useEffect, useCallback } from 'react';
import { Organization, Room, User } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Shield, AlertCircle } from 'lucide-react';
import OrganizationCard from '../components/organizations/OrganizationCard';
import OrganizationForm from '../components/organizations/OrganizationForm';
import UserManagement from '../components/organizations/UserManagement';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const loadData = useCallback(async (buildingId) => {
    try {
      const [organizationsData, roomsData, usersData] = await Promise.all([
        Organization.filter({ building_id: buildingId }, '-created_date'),
        Room.filter({ building_id: buildingId }),
        User.filter({ building_id: buildingId })
      ]);
      setOrganizations(organizationsData);
      setRooms(roomsData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  }, []);

  const checkAdminAccess = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      
      if (userData?.role !== 'admin') {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }
      
      if (userData.building_id) {
        loadData(userData.building_id);
      } else {
        console.warn("Admin user has no building_id. Access denied.");
        setAccessDenied(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking admin access:", error);
      setAccessDenied(true);
      setIsLoading(false);
    }
  }, [loadData]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const handleAddNew = () => {
    setEditingOrganization(null);
    setIsFormOpen(true);
  };

  const handleEdit = (organization) => {
    setEditingOrganization(organization);
    setIsFormOpen(true);
  };

  const handleManageUsers = (organization) => {
    setSelectedOrganization(organization);
    setIsUserManagementOpen(true);
  };

  const handleToggleActive = async (organization) => {
    try {
      await Organization.update(organization.id, { is_active: !organization.is_active });
      if (user?.building_id) {
        loadData(user.building_id);
      }
    } catch (error) {
      console.error("Error updating organization status:", error);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const dataWithBuilding = { ...formData, building_id: user.building_id };
      if (editingOrganization) {
        await Organization.update(editingOrganization.id, dataWithBuilding);
      } else {
        await Organization.create(dataWithBuilding);
      }
      setIsFormOpen(false);
      if (user?.building_id) {
        loadData(user.building_id);
      }
    } catch (error) {
      console.error("Error saving organization:", error);
    }
  };

  const getUserCount = (organizationId) => {
    return users.filter(user => user.organization_ids?.includes(organizationId)).length;
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
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
            <p className="text-slate-600 mb-6">
              You need administrator privileges to access organization management.
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Organization Management</h1>
            <p className="text-slate-600 mt-2">Manage member organizations, room access, and user assignments.</p>
          </div>
          <Button onClick={handleAddNew} className="bg-slate-900 hover:bg-slate-800 w-full md:w-auto">
            <Plus className="w-5 h-5 mr-2" /> Add New Organization
          </Button>
        </div>

        <div className="space-y-6">
          {organizations.map(organization => (
            <OrganizationCard
              key={organization.id}
              organization={organization}
              rooms={rooms}
              userCount={getUserCount(organization.id)}
              onEdit={handleEdit}
              onManageUsers={handleManageUsers}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>

        {organizations.length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border">
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800">No Organizations Found</h2>
            <p className="text-slate-500 mt-2 mb-6">Get started by adding your first member organization.</p>
            <Button onClick={handleAddNew} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-5 h-5 mr-2" /> Add an Organization
            </Button>
          </div>
        )}
      </div>

      <OrganizationForm 
        open={isFormOpen}
        setOpen={setIsFormOpen}
        organization={editingOrganization}
        organizations={organizations}
        rooms={rooms}
        onSubmit={handleFormSubmit}
      />

      <UserManagement
        open={isUserManagementOpen}
        setOpen={setIsUserManagementOpen}
        organization={selectedOrganization}
        buildingId={user?.building_id}
      />
    </div>
  );
}