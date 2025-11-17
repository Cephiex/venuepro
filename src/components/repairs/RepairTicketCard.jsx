import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  AlertTriangle,
  Wrench,
  Eye,
  Check,
  X,
  Hourglass
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusInfo = {
  open: { color: "bg-blue-100 text-blue-800", icon: <Wrench className="w-4 h-4 mr-1"/>, label: "Open" },
  in_progress: { color: "bg-yellow-100 text-yellow-800", icon: <Hourglass className="w-4 h-4 mr-1"/>, label: "In Progress" },
  completed: { color: "bg-green-100 text-green-800", icon: <Check className="w-4 h-4 mr-1"/>, label: "Completed" },
  cancelled: { color: "bg-gray-100 text-gray-800", icon: <X className="w-4 h-4 mr-1"/>, label: "Cancelled" }
};

const priorityInfo = {
  low: { color: "bg-gray-100 text-gray-800", label: "Low" },
  medium: { color: "bg-yellow-100 text-yellow-800", label: "Medium" },
  high: { color: "bg-orange-100 text-orange-800", label: "High" },
  urgent: { color: "bg-red-100 text-red-800", label: "Urgent" }
};

export default function RepairTicketCard({ ticket, onView, onStatusChange }) {
  const currentStatus = statusInfo[ticket.status] || statusInfo.open;
  const currentPriority = priorityInfo[ticket.priority] || priorityInfo.low;

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold text-slate-900 mb-1 line-clamp-2">
            {ticket.title}
          </CardTitle>
          <Badge className={`${currentPriority.color} border font-medium`}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            {currentPriority.label}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-slate-500 gap-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span>{ticket.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wrench className="w-4 h-4" />
            <span className="capitalize">{ticket.category}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 h-16">
          {ticket.description}
        </p>
        
        <div className="border-t pt-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(ticket)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Details
            </Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-40 justify-start">
                {currentStatus.icon}
                <span>{currentStatus.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(statusInfo).map(([statusKey, { label, icon }]) => (
                 <DropdownMenuItem 
                   key={statusKey}
                   onClick={() => onStatusChange(ticket, statusKey)}
                   disabled={ticket.status === statusKey}
                 >
                   {icon} {label}
                 </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}