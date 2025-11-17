
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { UploadFile } from '@/integrations/Core';
import { Check, X, Loader2 } from 'lucide-react';

const colors = [
  // Reds
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#f43f5e', '#e11d48',
  // Oranges
  '#f97316', '#ea580c', '#c2410c', '#9a3412', '#fb923c', '#fdba74',
  // Yellows & Ambers
  '#eab308', '#ca8a04', '#a16207', '#92400e', '#fbbf24', '#f59e0b',
  // Greens
  '#84cc16', '#65a30d', '#4d7c0f', '#365314', '#22c55e', '#16a34a',
  '#10b981', '#059669', '#047857', '#064e3b', '#34d399', '#6ee7b7',
  // Teals & Cyans
  '#14b8a6', '#0d9488', '#0f766e', '#134e4a', '#06b6d4', '#0891b2',
  '#0e7490', '#164e63', '#22d3ee', '#67e8f9',
  // Blues
  '#0ea5e9', '#0284c7', '#0369a1', '#1e40af', '#3b82f6', '#2563eb',
  '#1d4ed8', '#1e3a8a', '#60a5fa', '#93c5fd',
  // Indigos & Purples
  '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#8b5cf6', '#7c3aed',
  '#6d28d9', '#581c87', '#a78bfa', '#c4b5fd',
  // Pinks & Magentas
  '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#d946ef', '#c026d3',
  '#a21caf', '#86198f', '#f0abfc', '#f9a8d4',
  '#ec4899', '#db2777', '#be185d', '#9d174d',
  // Grays & Neutral
  '#6b7280', '#4b5563', '#374151', '#1f2937', '#71717a', '#52525b',
  '#3f3f46', '#27272a', '#94a3b8', '#64748b',
  // Additional vibrant colors
  '#ff6b35', '#ff8500', '#ffb700', '#8ac926', '#36c5f0', '#6f4cf8',
  '#ff006e', '#fb8500', '#219ebc', '#023047'
];

export default function OrganizationForm({ open, setOpen, organization, organizations, rooms, onSubmit }) {
  const [formData, setFormData] = useState({});
  const [allowedRooms, setAllowedRooms] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        description: organization.description || '',
        contact_email: organization.contact_email || '',
        contact_phone: organization.contact_phone || '',
        address: organization.address || '',
        website: organization.website || '',
        membership_type: organization.membership_type || 'standard',
        is_active: organization.is_active ?? true,
        notes: organization.notes || ''
      });
      setAllowedRooms(organization.allowed_rooms || []);
      setSelectedColor(organization.color || '#3b82f6');
      setLogoPreview(organization.logo_url || null);
    } else {
      setFormData({
        name: '',
        description: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        website: '',
        membership_type: 'standard',
        is_active: true,
        notes: ''
      });
      setAllowedRooms([]);
      setSelectedColor('#3b82f6');
      setLogoPreview(null);
    }
    setLogoFile(null);
  }, [organization, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };

  const handleRoomToggle = (roomId) => {
    setAllowedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let logoUrl = organization?.logo_url || null;
    
    // Upload logo if a new file was selected
    if (logoFile) {
      setIsUploadingLogo(true);
      try {
        // Use UploadFile which creates publicly accessible URLs
        const uploadResponse = await UploadFile({ file: logoFile });
        logoUrl = uploadResponse.file_url;
      } catch (error) {
        console.error('Error uploading logo:', error);
        alert('Failed to upload logo. Please try again.');
        setIsUploadingLogo(false);
        return;
      }
      setIsUploadingLogo(false);
    } else if (!logoFile && logoPreview === null && organization?.logo_url) {
      // User removed the logo
      logoUrl = null;
    }
    
    const submitData = { 
      ...formData, 
      allowed_rooms: allowedRooms, 
      color: selectedColor,
      logo_url: logoUrl
    };
    
    onSubmit(submitData);
  };

  // Get colors that are already in use by other organizations
  const getUsedColors = () => {
    if (!organizations) return [];
    return organizations
      .filter(org => org.id !== organization?.id) // Exclude current organization when editing
      .map(org => org.color)
      .filter(Boolean); // Remove null/undefined colors
  };

  // Get organization name that's using a specific color
  const getColorUser = (color) => {
    if (!organizations) return null;
    const org = organizations.find(org => org.color === color && org.id !== organization?.id);
    return org?.name || null;
  };

  const usedColors = getUsedColors();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-2xl w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-slate-900">
            {organization ? 'Edit Organization' : 'Add New Organization'}
          </SheetTitle>
          <SheetDescription>
            {organization ? 'Update the organization details and room permissions.' : 'Create a new member organization and assign room access.'}
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-6 px-1">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
              
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo">Organization Logo</Label>
                <div className="flex items-start gap-4">
                  {logoPreview && (
                    <div className="relative">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="w-16 h-16 object-contain border border-gray-200 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG up to 5MB. Recommended size: 200x200px
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="membership_type">Membership Type</Label>
                  <Select 
                    value={formData.membership_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, membership_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select membership type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  rows={3}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input 
                    id="contact_email" 
                    name="contact_email" 
                    type="email"
                    value={formData.contact_email} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input 
                    id="contact_phone" 
                    name="contact_phone" 
                    value={formData.contact_phone} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input 
                  id="website" 
                  name="website" 
                  value={formData.website} 
                  onChange={handleChange} 
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Room Permissions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Room Access Permissions</h3>
              <p className="text-sm text-slate-600">Select which rooms this organization can book:</p>
              
              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3">
                {rooms.filter(room => room.is_active).map(room => (
                  <div key={room.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <Checkbox 
                      id={`room-${room.id}`}
                      checked={allowedRooms.includes(room.id)}
                      onCheckedChange={() => handleRoomToggle(room.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`room-${room.id}`} className="font-medium cursor-pointer">
                        {room.name}
                      </Label>
                      <p className="text-sm text-slate-600 mt-1">
                        Capacity: {room.capacity} • {room.show_hourly_rate !== false && room.hourly_rate ? `$${room.hourly_rate}/hr` : 'Rate on request'} • {room.building}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {allowedRooms.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    Selected Rooms ({allowedRooms.length}):
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {allowedRooms.map(roomId => {
                      const room = rooms.find(r => r.id === roomId);
                      return (
                        <Badge key={roomId} variant="secondary" className="bg-green-100 text-green-800">
                          {room ? room.name : 'Unknown Room'}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Admin Settings</h3>
              
              {/* Organization Color Selection */}
              <div className="space-y-2">
                <Label>Organization Color</Label>
                <p className="text-xs text-slate-500 mb-3">
                  Choose a color that will represent this organization in calendars and bookings
                </p>
                <div className="grid grid-cols-8 gap-2 p-4 border rounded-lg bg-slate-50 max-h-48 overflow-y-auto">
                  {colors.map(color => {
                    const isUsed = usedColors.includes(color);
                    const colorUser = getColorUser(color);
                    const isSelected = selectedColor === color;
                    
                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={isUsed && !isSelected} // Only disable if used AND not currently selected
                        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 relative ${
                          isUsed && !isSelected
                            ? 'opacity-40 cursor-not-allowed' 
                            : 'hover:scale-110 cursor-pointer'
                        }`}
                        style={{ 
                          backgroundColor: color,
                          borderColor: isSelected ? '#000' : 'rgba(0,0,0,0.1)',
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none'
                        }}
                        onClick={() => {
                          if (!isUsed || isSelected) { // Allow selecting if not used, or if it's the currently selected color
                            setSelectedColor(color);
                          }
                        }}
                        aria-label={`Select color ${color}`}
                        title={isUsed && !isSelected ? `Color in use by ${colorUser}` : color}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white mx-auto stroke-[3]" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }} />}
                        {isUsed && !isSelected && (
                          <X className="w-3 h-3 text-white mx-auto stroke-[4]" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <span>Selected: {selectedColor}</span>
                </div>
                {usedColors.length > 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Colors marked with <X className="inline-block w-3 h-3 align-middle" /> are already in use by other organizations and cannot be selected.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="is_active" className="font-medium">Organization Active</Label>
                <Switch 
                  id="is_active"
                  checked={formData.is_active} 
                  onCheckedChange={handleSwitchChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleChange} 
                  rows={3}
                  placeholder="Internal notes about this organization..."
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-8">
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isUploadingLogo}>
              {isUploadingLogo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {organization ? 'Save Changes' : 'Create Organization'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
