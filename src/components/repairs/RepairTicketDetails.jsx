import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Calendar, 
  MapPin, 
  Mail,
  User,
  Wrench,
  AlertTriangle,
  FileText,
  MessageSquare,
  ClipboardCheck
} from 'lucide-react';
import { format } from 'date-fns';

const statusInfo = {
  open: { color: "bg-blue-100 text-blue-800", label: "Open" },
  in_progress: { color: "bg-yellow-100 text-yellow-800", label: "In Progress" },
  completed: { color: "bg-green-100 text-green-800", label: "Completed" },
  cancelled: { color: "bg-gray-100 text-gray-800", label: "Cancelled" }
};

const priorityInfo = {
  low: { color: "bg-gray-100 text-gray-800", label: "Low" },
  medium: { color: "bg-yellow-100 text-yellow-800", label: "Medium" },
  high: { color: "bg-orange-100 text-orange-800", label: "High" },
  urgent: { color: "bg-red-100 text-red-800", label: "Urgent" }
};

export default function RepairTicketDetails({ open, setOpen, ticket }) {
  if (!ticket) return null;

  const currentStatus = statusInfo[ticket.status] || statusInfo.open;
  const currentPriority = priorityInfo[ticket.priority] || priorityInfo.low;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-2xl w-[90vw] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold text-slate-900 line-clamp-2">
              {ticket.title}
            </SheetTitle>
            <Badge className={`${currentStatus.color} border font-medium`}>
              {currentStatus.label}
            </Badge>
          </div>
          <SheetDescription className="text-lg font-medium text-slate-700">
            Ticket ID: {ticket.id}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Issue Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-slate-600">{ticket.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">Category</p>
                  <p className="text-slate-600 capitalize">{ticket.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">Priority</p>
                  <Badge className={`${currentPriority.color} border font-medium`}>
                    {currentPriority.label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Description
              </h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg">
                {ticket.description}
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Reporting Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">Reported By</p>
                  <p className="text-slate-600">{ticket.reported_by}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">Contact Email</p>
                  <p className="text-slate-600">{ticket.contact_email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">Reported On</p>
                  <p className="text-slate-600">{format(new Date(ticket.created_date), 'MMM d, yyyy • h:mm a')}</p>
                </div>
              </div>
            </div>
          </section>

          {(ticket.resolution_notes || ticket.status === 'completed') && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Resolution</h3>
              {ticket.completed_date && (
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Completed On</p>
                    <p className="text-slate-600">{format(new Date(ticket.completed_date), 'MMM d, yyyy • h:mm a')}</p>
                  </div>
                </div>
              )}
              {ticket.resolution_notes && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Resolution Notes
                  </h4>
                  <p className="text-slate-600 leading-relaxed bg-green-50 p-4 rounded-lg border border-green-200">
                    {ticket.resolution_notes}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}