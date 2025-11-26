import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicCalendarData } from '@/functions/getPublicCalendarData';
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Building2,
  Calendar
} from "lucide-react";
import { format } from 'date-fns';

const SCROLL_SPEED_PX_PER_SEC = 35;

export default function PublicEventsScroller() {
    const [searchParams] = useSearchParams();
    const buildingId = searchParams.get('buildingId');

    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [animationDuration, setAnimationDuration] = useState(0);

    const scrollerRef = useRef(null);

    useEffect(() => {
        if (!buildingId) {
            setError("No building specified. This link is invalid.");
            setIsLoading(false);
            return;
        }
        loadData(buildingId);
    }, [buildingId]);

    useEffect(() => {
        if (upcomingBookings.length > 0 && scrollerRef.current) {
            const scrollerHeight = scrollerRef.current.scrollHeight / 2; // Height of one instance of the list
            if (scrollerHeight > 0) {
                const duration = scrollerHeight / SCROLL_SPEED_PX_PER_SEC;
                setAnimationDuration(duration);
            }
        }
    }, [upcomingBookings]);

    const loadData = async (bId) => {
        setIsLoading(true);
        setError('');
        try {
            const response = await getPublicCalendarData({ building_id: bId });
            const data = response.data;
            
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);

            const filteredBookings = data.bookings
                .filter(booking => {
                    const bookingStart = new Date(booking.start_datetime);
                    return bookingStart >= now && bookingStart <= thirtyDaysFromNow;
                })
                .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

            setUpcomingBookings(filteredBookings);
            setRooms(data.rooms);
            setOrganizations(data.organizations || []);
        } catch (err) {
            setError("Could not load calendar data.");
            console.error("Error loading public scroller data:", err);
        }
        setIsLoading(false);
    };

    const getRoomName = (roomId) => rooms.find(r => r.id === roomId)?.name || "Unknown Room";
    const getOrganization = (organizationId) => organizations.find(org => org.id === organizationId);

    const groupedBookings = upcomingBookings.reduce((acc, booking) => {
        const startDate = new Date(booking.start_datetime);
        // Use local date components to avoid timezone issues
        const dateKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(booking);
        return acc;
    }, {});

    const renderBookingList = () => (
        <div className="space-y-8">
            {Object.entries(groupedBookings).map(([date, dateBookings]) => {
                // Parse the date key back to a proper date for display
                const [year, month, day] = date.split('-').map(Number);
                const displayDate = new Date(year, month - 1, day);
                return (
                <div key={date}>
                    <div className="py-3 mb-4 border-b-2 border-slate-200">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                            {format(displayDate, "EEEE, MMMM d")}
                        </h2>
                    </div>
                    <div className="space-y-6">
                        {dateBookings.map(booking => {
                            const organization = getOrganization(booking.organization_id);
                            return (
                                <Card 
                                    key={booking.id} 
                                    className="shadow-sm border-transparent" 
                                    style={{ borderLeftColor: booking.organization_color || '#3b82f6', borderLeftWidth: '6px' }}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-stretch gap-6 min-h-[120px] md:min-h-[140px]">
                                            <div className="flex-1 flex flex-col justify-center space-y-4">
                                                <div>
                                                    <h3 className="text-xl md:text-2xl font-semibold text-slate-800 leading-tight">{booking.event_title}</h3>
                                                    <p className="text-base md:text-lg text-slate-600 mt-2">{booking.organization_name}</p>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 text-base md:text-lg text-slate-500">
                                                    <div className="flex items-center gap-3"><Clock className="w-5 h-5 md:w-6 md:h-6 shrink-0" /><span>{format(new Date(booking.start_datetime), "h:mm a")} - {format(new Date(booking.end_datetime), "h:mm a")}</span></div>
                                                    <div className="flex items-start gap-3"><MapPin className="w-5 h-5 md:w-6 md:h-6 shrink-0 mt-0.5" /><span>{booking.rooms?.map(getRoomName).join(", ")}</span></div>
                                                </div>
                                            </div>
                                            <div className="w-24 md:w-32 flex items-center justify-center shrink-0">
                                                {organization?.logo_url ? (
                                                    <img 
                                                        src={organization.logo_url} 
                                                        alt={`${organization.name} logo`} 
                                                        className="w-full h-full max-h-24 md:max-h-32 object-contain border rounded-lg bg-white"
                                                    />
                                                ) : (
                                                    <div className="w-full h-20 md:h-24 bg-slate-100 border rounded-lg flex items-center justify-center">
                                                        <Building2 className="w-12 h-12 md:w-16 md:h-16 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            );
            })}
        </div>
    );
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    if (error) {
        return <div className="p-6 text-center"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" /><h2 className="text-xl font-bold text-red-800">Error</h2><p className="text-red-700 mt-2">{error}</p></div>;
    }
    
    if (upcomingBookings.length === 0) {
        return <div className="p-6 text-center"><Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h2 className="text-xl font-semibold text-gray-700">No Upcoming Events</h2><p className="text-gray-500 mt-2">There are no events scheduled in the next 30 days.</p></div>;
    }

    return (
        <>
            <style>{`
                @keyframes scroll {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
            `}</style>
            <div className="h-screen w-full overflow-hidden bg-white">
                <div 
                    ref={scrollerRef} 
                    style={{ animation: animationDuration > 0 ? `scroll ${animationDuration}s linear infinite` : 'none' }}
                >
                    <div className="p-6 md:p-8">{renderBookingList()}</div>
                    <div className="p-6 md:p-8">{renderBookingList()}</div>
                </div>
            </div>
        </>
    );
}