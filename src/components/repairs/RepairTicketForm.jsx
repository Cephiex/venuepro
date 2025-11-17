import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const categories = ["plumbing", "electrical", "hvac", "cleaning", "security", "equipment", "other"];
const priorities = ["low", "medium", "high", "urgent"];

export default function RepairTicketForm({ open, setOpen, ticket, onSubmit, userEmail }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title || '',
        description: ticket.description || '',
        location: ticket.location || '',
        priority: ticket.priority || 'medium',
        category: ticket.category || 'other',
        reported_by: ticket.reported_by || '',
        contact_email: ticket.contact_email || userEmail || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        location: '',
        priority: 'medium',
        category: 'other',
        reported_by: '',
        contact_email: userEmail || '',
      });
    }
  }, [ticket, open, userEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-2xl w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-slate-900">
            {ticket ? 'Edit Repair Ticket' : 'Submit New Repair Ticket'}
          </SheetTitle>
          <SheetDescription>
            {ticket ? 'Update the details of the maintenance issue.' : 'Provide details about the issue you are reporting.'}
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-6 px-1">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input id="title" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g., Leaky faucet in main lobby restroom" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={4} placeholder="Please provide as much detail as possible..."/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" name="location" value={formData.location} onChange={handleChange} required placeholder="e.g., Room 201, 3rd Floor East Wing"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level *</Label>
              <Select value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a priority level" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reported_by">Your Name *</Label>
                <Input id="reported_by" name="reported_by" value={formData.reported_by} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Your Email *</Label>
                <Input id="contact_email" name="contact_email" type="email" value={formData.contact_email} onChange={handleChange} required />
              </div>
            </div>
            {/* Image upload could be added here later */}
          </div>

          <SheetFooter className="mt-8">
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit">
              {ticket ? 'Save Changes' : 'Submit Ticket'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}