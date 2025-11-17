
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getPublicOrganizationData } from '@/functions/getPublicOrganizationData';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlertTriangle,
  Globe,
  Mail,
  Phone,
  Download,
  ArrowLeft
} from "lucide-react";
import { format } from 'date-fns';

export default function PublicOrganization() {
    const [searchParams] = useSearchParams();
    const organizationId = searchParams.get('organizationId');
    const buildingId = searchParams.get('buildingId');

    const [organization, setOrganization] = useState(null);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [building, setBuilding] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await getPublicOrganizationData({ 
                organization_id: organizationId,
                building_id: buildingId
            });
            
            const data = response.data;
            if (data && data.error) {
                throw new Error(data.error);
            }
            if (!data || !data.organization) {
                throw new Error("Organization data could not be found. The link may be incorrect.");
            }

            setOrganization(data.organization);
            setUpcomingEvents(data.upcoming_events || []);
            setRooms(data.rooms || []);
            setBuilding(data.building);
        } catch (err) {
            console.error("Full error loading public organization data:", err);
            const errorMessage = err.message || "Could not load organization data.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, buildingId]);

    useEffect(() => {
        if (!organizationId || !buildingId) {
            setError("Invalid organization link. Missing required parameters.");
            setIsLoading(false);
            return;
        }
        loadData();
    }, [organizationId, buildingId, loadData]);

    const getRoomName = (roomId) => {
        if (!rooms || rooms.length === 0) return "Loading...";
        const room = rooms.find(r => r.id === roomId);
        return room?.name || "Unknown Room";
    };

    const handleDownloadCalendar = () => {
        if (!organizationId || !buildingId) return;
        const downloadUrl = `/orgCalendarFeed?organization_id=${organizationId}&building_id=${buildingId}`;
        window.location.href = downloadUrl;
    };

    const calendarUrl = buildingId ? createPageUrl(`PublicCalendar?buildingId=${buildingId}`) : '#';

    if (isLoading) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        );
    }

    if (error) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="border-red-200 bg-red-50 max-w-md w-full">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
                <p className="text-red-700">{error}</p>
                <Link to={calendarUrl}>
                    <Button 
                        variant="outline" 
                        className="mt-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back to Calendar
                    </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        );
    }

    if (!organization) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="border-yellow-200 bg-yellow-50 max-w-md w-full">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-yellow-800 mb-2">Organization Not Found</h2>
                    <p className="text-yellow-700">The organization you are looking for could not be found.</p>
                     <Link to={calendarUrl}>
                        <Button 
                            variant="outline" 
                            className="mt-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back to Calendar
                        </Button>
                    </Link>
                  </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto p-4 sm:p-6">
                <div className="mb-6">
                    <Link to={calendarUrl}>
                        <Button 
                            variant="ghost" 
                            className="mb-4 text-slate-600 hover:text-slate-900"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Calendar
                        </Button>
                    </Link>
                </div>

                <Card className="mb-8">
                    <CardHeader>
                        <div className="flex items-start gap-4">
                            {organization.logo_url && (
                                <img 
                                    src={organization.logo_url} 
                                    alt={`${organization.name} logo`}
                                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain border rounded-lg p-1"
                                />
                            )}
                            <div className="flex-1">
                                <CardTitle className="text-2xl sm:text-3xl font-bold">{organization.name}</CardTitle>
                                {organization.category && <Badge className="mt-2">{organization.category}</Badge>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {organization.description && <p className="text-slate-600 mb-4">{organization.description}</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {building && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                                    <span>{building.name}<br/>{building.address}</span>
                                </div>
                            )}
                            {organization.website && (
                                <div className="flex items-start gap-3">
                                    <Globe className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                                    <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{organization.website}</a>
                                </div>
                            )}
                            {organization.contact_email && (
                                <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                                    <a href={`mailto:${organization.contact_email}`} className="text-blue-600 hover:underline">{organization.contact_email}</a>
                                </div>
                            )}
                            {organization.contact_phone && (
                                <div className="flex items-start gap-3">
                                    <Phone className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                                    <span>{organization.contact_phone}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Upcoming Events</CardTitle>
                            {upcomingEvents.length > 0 && (
                                <Button onClick={handleDownloadCalendar} variant="outline" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Calendar
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {upcomingEvents.length > 0 ? (
                            <ul className="space-y-4">
                                {upcomingEvents.map(event => (
                                    <li key={event.id} className="p-4 bg-white rounded-lg border flex flex-col sm:flex-row gap-4">
                                        <div className="flex-shrink-0 text-center sm:text-left sm:border-r sm:pr-4">
                                            <p className="font-semibold text-blue-600">{format(new Date(event.start_datetime), 'MMM')}</p>
                                            <p className="text-2xl font-bold">{format(new Date(event.start_datetime), 'd')}</p>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">{event.event_title}</h3>
                                            <div className="text-slate-500 text-sm mt-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{format(new Date(event.start_datetime), 'p')} - {format(new Date(event.end_datetime), 'p')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{event.rooms?.map(getRoomName).join(', ')}</span>
                                                </div>
                                                {event.is_public && <Badge variant="secondary">Open to Public</Badge>}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-8">
                                <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">No upcoming events scheduled.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
