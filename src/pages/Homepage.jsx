import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  Calendar, 
  Wrench,
  ShieldCheck,
  Zap,
  LogIn
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Event & Room Booking",
    description: "A centralized calendar to manage all room bookings, events, and availability with ease."
  },
  {
    icon: Users,
    title: "Organization Management",
    description: "Manage member organizations, assign users, and control room access permissions."
  },
  {
    icon: Wrench,
    title: "Maintenance Ticketing",
    description: "Streamline repair requests with a simple ticketing system for all maintenance issues."
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description: "Secure your dashboard with administrator and user roles for controlled access."
  },
];

const featureScreenshots = [
  {
    title: "Centralized Dashboard",
    description: "Get a high-level overview of all building activities, including recent bookings, pending approvals, and open maintenance tickets.",
    imgSrc: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60"
  },
  {
    title: "Intuitive Calendar",
    description: "View and manage all events in a clean, interactive calendar. Quickly see availability and schedule new bookings with ease.",
    imgSrc: "https://images.unsplash.com/photo-1636572481949-c417436c65ea?w=800&auto=format&fit=crop&q=60"
  },
  {
    title: "Room & User Management",
    description: "Easily configure rooms, set permissions for different organizations, and manage all user accounts from one place.",
    imgSrc: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=60"
  },
  {
    title: "Streamlined Repairs",
    description: "Keep track of all maintenance requests through a simple and effective ticketing system, from submission to completion.",
    imgSrc: "https://images.unsplash.com/photo-1611095965923-89b7a4d5d3e0?w=800&auto=format&fit=crop&q=60"
  }
];

export default function Homepage() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        await User.me();
        // User is logged in, redirect to dashboard.
        navigate(createPageUrl("Dashboard"));
      } catch (e) {
        // User is not logged in, show the homepage.
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  const handleLogin = async () => {
    // This is the main call to action for new/logged-out users.
    await User.loginWithRedirect(window.location.origin + createPageUrl("Dashboard"));
  };
  
  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 bg-white">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            The All-In-One Management <br/>
            <span className="text-blue-600">Software for Your Building</span>
          </h1>
          <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto">
            From room bookings to maintenance tickets, VenuePro provides a simple, powerful dashboard to manage your association, club, or building's daily operations.
          </p>
          <div className="mt-10">
            <Button onClick={handleLogin} size="lg" className="px-10 py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700">
              <Zap className="w-6 h-6 mr-3" />
              Get Started for Free
            </Button>
            <p className="mt-3 text-sm text-slate-500">No credit card required.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Everything You Need in One Place
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-4">
              Stop juggling spreadsheets and emails. Centralize your building's management with our powerful, easy-to-use features.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              See VenuePro in Action
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto mt-4">
              Explore our core features through these snapshots. Each is designed for clarity and ease of use, helping you manage your building more effectively.
            </p>
          </div>

          <div className="space-y-16">
            {featureScreenshots.map((feature, index) => (
              <div key={index} className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${index % 2 !== 0 ? 'lg:grid-flow-col-dense' : ''}`}>
                <div className={`${index % 2 !== 0 ? 'lg:col-start-2' : ''}`}>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
                <div className={`${index % 2 !== 0 ? 'lg:col-start-1' : ''}`}>
                  <img 
                    src={feature.imgSrc} 
                    alt={feature.title}
                    className="rounded-xl shadow-2xl w-full h-auto"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}