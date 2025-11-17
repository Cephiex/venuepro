
import { useState, useEffect } from 'react';
import { RepairTicket, User } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from 'lucide-react';
import RepairTicketCard from '../components/repairs/RepairTicketCard';
import RepairTicketForm from '../components/repairs/RepairTicketForm';
import RepairTicketDetails from '../components/repairs/RepairTicketDetails';

export default function RepairsPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeTab, setActiveTab] = useState('open');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      
      if (!userData?.building_id) {
        setIsLoading(false);
        return;
      }
      
      const ticketsData = await RepairTicket.filter({ building_id: userData.building_id }, '-created_date');
      setTickets(ticketsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleAddNew = () => {
    setEditingTicket(null);
    setIsFormOpen(true);
  };

  const handleView = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailsOpen(true);
  };

  const handleStatusChange = async (ticket, status) => {
    try {
      const updateData = { status };
      if (status === 'completed' && !ticket.completed_date) {
        updateData.completed_date = new Date().toISOString();
      }
      await RepairTicket.update(ticket.id, updateData);
      loadData();
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const dataWithBuilding = { ...formData, building_id: user.building_id, status: 'open' };
      if (editingTicket) {
        await RepairTicket.update(editingTicket.id, formData);
      } else {
        await RepairTicket.create(dataWithBuilding);
      }
      setIsFormOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving ticket:", error);
    }
  };

  const getFilteredTickets = (status) => {
    if (status === 'all') return tickets;
    return tickets.filter(ticket => ticket.status === status);
  };

  const getStatusCount = (status) => {
    return tickets.filter(ticket => ticket.status === status).length;
  };

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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Repair Tickets</h1>
            <p className="text-slate-600 mt-2">Track and manage all building maintenance issues.</p>
          </div>
          <Button onClick={handleAddNew} className="bg-slate-900 hover:bg-slate-800 w-full md:w-auto">
            <Plus className="w-5 h-5 mr-2" /> New Ticket
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-2">
            <TabsList className="grid w-max grid-cols-4 bg-white p-1 rounded-xl border shadow-sm">
              <TabsTrigger value="open" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                Open ({getStatusCount('open')})
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
                In Progress ({getStatusCount('in_progress')})
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Completed ({getStatusCount('completed')})
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                All ({tickets.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {['open', 'in_progress', 'completed', 'all'].map(status => (
            <TabsContent key={status} value={status}>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {getFilteredTickets(status).map(ticket => (
                  <RepairTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onView={handleView}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>

              {getFilteredTickets(status).length === 0 && (
                <div className="text-center py-20 bg-white rounded-lg shadow-sm border">
                  <h2 className="text-xl md:text-2xl font-semibold text-slate-800">
                    No {status === 'all' ? '' : status} tickets found
                  </h2>
                  <p className="text-slate-500 mt-2">
                    {status === 'all' 
                      ? 'No repair tickets have been submitted yet.' 
                      : `No tickets with status "${status}" at this time.`}
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <RepairTicketForm 
        open={isFormOpen}
        setOpen={setIsFormOpen}
        ticket={editingTicket}
        onSubmit={handleFormSubmit}
        userEmail={user?.email}
      />

      <RepairTicketDetails
        open={isDetailsOpen}
        setOpen={setIsDetailsOpen}
        ticket={selectedTicket}
      />
    </div>
  );
}
