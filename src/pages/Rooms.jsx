
import { useState, useEffect } from 'react';
import { Room, User } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import RoomCard from '../components/rooms/RoomCard';
import RoomForm from '../components/rooms/RoomForm';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      
      if (userData?.building_id) {
        const roomsData = await Room.filter({ building_id: userData.building_id }, '-created_date');
        setRooms(roomsData);
      } else {
        // Handle case where user has no building - maybe redirect or show message
        setRooms([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Not logged in or other error
      setUser(null);
    }
    setIsLoading(false);
  };

  const handleAddNew = () => {
    setEditingRoom(null);
    setIsFormOpen(true);
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (room) => {
    try {
      await Room.update(room.id, { is_active: !room.is_active });
      loadData();
    } catch (error) {
      console.error("Error updating room status:", error);
    }
  };

  const handleDelete = async (roomId) => {
    if (window.confirm('Are you sure you want to permanently delete this room? This action cannot be undone.')) {
      try {
        await Room.delete(roomId);
        setIsFormOpen(false); // Close the form after deletion
        loadData();
      } catch (error) {
        console.error("Error deleting room:", error);
        // Optionally, add a user-facing error message here
      }
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const dataWithBuilding = { ...formData, building_id: user.building_id };
      if (editingRoom) {
        await Room.update(editingRoom.id, dataWithBuilding);
      } else {
        await Room.create(dataWithBuilding);
      }
      setIsFormOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving room:", error);
    }
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Room Management</h1>
            <p className="text-slate-600 mt-2">View, add, and edit building rooms.</p>
          </div>
          {isAdmin && (
            <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" /> Add New Room
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {rooms.map(room => (
            <RoomCard 
              key={room.id}
              room={room}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              isAdmin={isAdmin}
            />
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border">
            <h2 className="text-2xl font-semibold text-slate-800">No Rooms Found</h2>
            <p className="text-slate-500 mt-2 mb-6">
              {isAdmin ? "Get started by adding your first room." : "No rooms have been configured by an administrator."}
            </p>
            {isAdmin && (
              <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-5 h-5 mr-2" /> Add a Room
              </Button>
            )}
          </div>
        )}
      </div>

      <RoomForm 
        open={isFormOpen}
        setOpen={setIsFormOpen}
        room={editingRoom}
        rooms={rooms}
        onSubmit={handleFormSubmit}
        onDelete={handleDelete}
      />
    </div>
  );
}
