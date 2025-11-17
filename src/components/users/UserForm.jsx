
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";


import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";

export default function UserForm({ open, setOpen, user, organizations, onSubmit }) {
  const [formData, setFormData] = useState({});
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);

  useEffect(() => {
    if (user) {
      setFormData({
        title: user.title || '',
        phone: user.phone || ''
      });
      setSelectedOrgIds(user.organization_ids || []);
    } else {
      setFormData({
        title: '',
        phone: ''
      });
      setSelectedOrgIds([]);
    }
  }, [user, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrgToggle = (orgId) => {
    setSelectedOrgIds(prev => 
      prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = {};
    Object.keys(formData).forEach(key => {
      if (formData[key] !== '') {
        cleanedData[key] = formData[key];
      }
    });
    // Add organization_ids to the submission data
    cleanedData.organization_ids = selectedOrgIds;
    onSubmit(cleanedData);
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-slate-900">
            Edit User - {user.full_name}
          </SheetTitle>
          <SheetDescription>
            Update user details and organization assignment.
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-6 px-1">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><strong>Name:</strong> {user.full_name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Basic information cannot be edited here. Contact platform support if changes are needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Organizations</Label>
                <div className="p-4 border rounded-lg max-h-48 overflow-y-auto space-y-3">
                  {organizations.map(org => (
                    <div key={org.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`org-${org.id}`}
                        checked={selectedOrgIds.includes(org.id)}
                        onCheckedChange={() => handleOrgToggle(org.id)}
                      />
                      <Label htmlFor={`org-${org.id}`} className="font-medium cursor-pointer">
                        {org.name}
                      </Label>
                    </div>
                  ))}
                  {organizations.length === 0 && (
                     <p className="text-sm text-slate-500 text-center">No organizations available.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title/Position</Label>
                <Input 
                  id="title" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleChange}
                  placeholder="e.g., Board Member, Treasurer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  placeholder="e.g., (555) 123-4567"
                />
              </div>
            </div>
          </div>
          
          <SheetFooter className="mt-8">
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit">
              Save Changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
