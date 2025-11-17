
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Plus, Tag, Trash2, Check, X } from 'lucide-react';

const colors = [
  '#ef4444', '#dc2626', '#b91c1c', '#f97316', '#ea580c', '#c2410c',
  '#eab308', '#ca8a04', '#a16207', '#84cc16', '#65a30d', '#4d7c0f',
  '#22c55e', '#16a34a', '#10b981', '#059669', '#14b8a6', '#0d9488',
  '#06b6d4', '#0891b2', '#0ea5e9', '#0284c7', '#3b82f6', '#2563eb',
  '#6366f1', '#4f46e5', '#8b5cf6', '#7c3aed', '#a855f7', '#9333ea',
  '#d946ef', '#c026d3', '#ec4899', '#db2777', '#be185d', '#71717a', 
  '#52525b', '#3f3f46', '#27272a', '#94a3b8', '#64748b', '#475569'
];

export default function RoomForm({ open, setOpen, room, rooms, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({});
  const [amenities, setAmenities] = useState([]);
  const [currentAmenity, setCurrentAmenity] = useState('');
  const [selectedColor, setSelectedColor] = useState('#64748b');

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name || '',
        building: room.building || 'Main Building',
        capacity: room.capacity || 0,
        description: room.description || '',
        hourly_rate: room.hourly_rate || 0,
        show_hourly_rate: room.show_hourly_rate ?? true,
        image_url: room.image_url || '',
        is_active: room.is_active ?? true,
      });
      setAmenities(room.amenities || []);
      setSelectedColor(room.color || '#64748b');
    } else {
      // Reset for new room
      setFormData({
        name: '',
        building: 'Main Building',
        capacity: 0,
        description: '',
        hourly_rate: 0,
        show_hourly_rate: true,
        image_url: '',
        is_active: true,
      });
      setAmenities([]);
      setSelectedColor('#64748b');
    }
  }, [room, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
    }));
  };
  
  const handleSwitchChange = (field, checked) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const handleAddAmenity = () => {
    if (currentAmenity && !amenities.includes(currentAmenity)) {
      setAmenities([...amenities, currentAmenity]);
      setCurrentAmenity('');
    }
  };

  const handleRemoveAmenity = (amenityToRemove) => {
    setAmenities(amenities.filter(amenity => amenity !== amenityToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, amenities, color: selectedColor });
  };

  const handleDeleteClick = () => {
    if (room && onDelete) {
      onDelete(room.id);
    }
  };

  const getUsedColors = () => {
    if (!rooms) return [];
    return rooms
      .filter(r => r.id !== room?.id)
      .map(r => r.color)
      .filter(Boolean);
  };
  
  const usedColors = getUsedColors();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-slate-900">
            {room ? 'Edit Room' : 'Add New Room'}
          </SheetTitle>
          <SheetDescription>
            {room ? 'Update the details of this room.' : 'Fill in the details for the new room.'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-6 px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input id="building" name="building" value={formData.building} onChange={handleChange} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" name="capacity" type="number" value={formData.capacity} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" value={formData.hourly_rate} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room Color</Label>
              <div className="grid grid-cols-8 gap-2 p-4 border rounded-lg bg-slate-50 max-h-48 overflow-y-auto">
                {colors.map(color => {
                  const isUsed = usedColors.includes(color);
                  const isSelected = selectedColor === color;
                  
                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={isUsed}
                      className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 relative ${
                        isUsed 
                          ? 'opacity-40 cursor-not-allowed' 
                          : 'hover:scale-110 cursor-pointer'
                      }`}
                      style={{ 
                        backgroundColor: color,
                        borderColor: isSelected ? '#000' : 'rgba(0,0,0,0.1)',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none'
                      }}
                      onClick={() => !isUsed && setSelectedColor(color)}
                      aria-label={`Select color ${color}`}
                      title={isUsed ? `${color} (in use)` : color}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white mx-auto stroke-[3]" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }} />}
                      {isUsed && !isSelected && <X className="w-3 h-3 text-white mx-auto stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input id="image_url" name="image_url" value={formData.image_url} onChange={handleChange} placeholder="https://images.unsplash.com/..." />
            </div>

            <div className="space-y-4">
              <Label>Amenities</Label>
              <div className="flex gap-2">
                <Input 
                  value={currentAmenity}
                  onChange={(e) => setCurrentAmenity(e.target.value)}
                  placeholder="e.g. WiFi"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAmenity(); } }}
                />
                <Button type="button" variant="outline" onClick={handleAddAmenity}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 text-sm">
                    {amenity}
                    <button type="button" onClick={() => handleRemoveAmenity(amenity)} className="ml-2 p-0.5 rounded-full hover:bg-red-200">
                      <Tag className="w-3 h-3 text-red-500" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="show_hourly_rate" className="font-medium">Show Hourly Rate</Label>
                <Switch 
                  id="show_hourly_rate"
                  checked={formData.show_hourly_rate} 
                  onCheckedChange={(checked) => handleSwitchChange('show_hourly_rate', checked)}
                />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="is_active" className="font-medium">Room Active</Label>
                <Switch 
                  id="is_active"
                  checked={formData.is_active} 
                  onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                />
            </div>
          </div>
          <SheetFooter className="mt-8 flex sm:justify-between items-center flex-col-reverse sm:flex-row gap-4">
            <div>
              {room && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteClick}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Room
                </Button>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">Cancel</Button>
              </SheetClose>
              <Button type="submit" className="w-full sm:w-auto">
                {room ? 'Save Changes' : 'Create Room'}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
