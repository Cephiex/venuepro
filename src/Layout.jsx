
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Building } from "@/entities/all";
import {
  Calendar,
  Home,
  Building2,
  BookOpen,
  Wrench,
  LogOut,
  Menu,
  Loader2,
  LayoutDashboard,
  Users,
  Settings,
  Clock,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const publicPages = ["Homepage", "CreateBuilding", "PublicCalendar", "JoinBuilding", "PublicBooking", "ManageBooking", "PublicEventsScroller", "PublicOrganization", "KioskCalendar"];

const getNavigationItems = (isAdmin, building) => [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  ...(isAdmin && building?.require_admin_approval ? [{
    title: "Approval Queue",
    url: createPageUrl("ApprovalQueue"),
    icon: Clock,
  }] : []),
  {
    title: "Calendar",
    url: createPageUrl("Calendar"),
    icon: Calendar,
  },
  ...(isAdmin ? [{
    title: "Organizations",
    url: createPageUrl("Organizations"),
    icon: Users,
  }] : []),
  {
    title: "Rooms",
    url: createPageUrl("Rooms"),
    icon: Building2,
  },
  {
    title: "Bookings",
    url: createPageUrl("Bookings"),
    icon: BookOpen,
  },
  {
    title: "Repairs",
    url: createPageUrl("Repairs"),
    icon: Wrench,
  },
  ...(isAdmin ? [{
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
  }] : []),
  ...(isAdmin ? [{
    title: "Users",
    url: createPageUrl("UserManagement"),
    icon: Users,
  }] : []),
  { // Added Settings navigation item
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings
  }
];

function AdminSidebar({ currentPath }) {
  const [user, setUser] = useState(null);
  const [building, setBuilding] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserAndBuilding = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        if (userData.building_id) {
          const buildingData = await Building.get(userData.building_id);
          setBuilding(buildingData);
        }
      } catch (error) {
        // This is expected if the user is not logged in.
      }
    };
    loadUserAndBuilding();
  }, []);

  const handleLogout = async () => {
    try {
      await User.logout();
      // Clear local state
      setUser(null);
      setBuilding(null);
      // Navigate to homepage and force page reload to clear all cached user data
      window.location.href = createPageUrl("Homepage");
    } catch (error) {
      console.error("Error during logout:", error);
      // Still navigate even if logout fails
      window.location.href = createPageUrl("Homepage");
    }
  };

  const isAdmin = user?.role === 'admin';
  const navigationItems = getNavigationItems(isAdmin, building);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{building?.name || 'VenuePro'}</h2>
            <p className="text-xs text-slate-400">Building Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentPath === item.url
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

function PublicHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        await User.me();
        setIsAuthenticated(true);
      } catch (e) {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [location.pathname]);

  const handleScrollToFeatures = (e) => {
    e.preventDefault();
    if (location.pathname !== createPageUrl("Homepage")) {
      navigate(createPageUrl("Homepage"));
      // Wait for navigation to complete before scrolling
      setTimeout(() => {
        const element = document.getElementById('features');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } else {
      const element = document.getElementById('features');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleLogin = async () => {
    await User.loginWithRedirect(window.location.origin + createPageUrl("Dashboard"));
  };

  const handleLogout = async () => {
    try {
      await User.logout();
      setIsAuthenticated(false);
      // Force page reload to clear all cached user data
      window.location.href = createPageUrl("Homepage");
    } catch (error) {
      console.error("Error during logout:", error);
      // Still navigate even if logout fails
      setIsAuthenticated(false);
      window.location.href = createPageUrl("Homepage");
    }
  };

  const renderAuthButtons = () => {
    if (isLoading) {
      return (
        <Button disabled className="bg-slate-900 w-36">
          <Loader2 className="w-4 h-4 animate-spin" />
        </Button>
      );
    }
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Dashboard")}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      );
    }
    return (
      <Button onClick={handleLogin} className="bg-slate-900 hover:bg-slate-800 text-white">
        Member Login
      </Button>
    );
  };

  const renderMobileAuthButtons = () => {
    if (isLoading) {
      return (
        <Button disabled className="w-full bg-slate-900">
          <Loader2 className="w-4 h-4 animate-spin" />
        </Button>
      );
    }
    if (isAuthenticated) {
      return (
        <div className="space-y-3">
          <Link to={createPageUrl("Dashboard")} className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
               <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      );
    }
    return (
      <Button onClick={handleLogin} className="w-full bg-slate-900 hover:bg-slate-800">
        Member Login
      </Button>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <Link to={createPageUrl("Homepage")} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900">VenuePro</h1>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to={createPageUrl("Homepage")}
              className="text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Home
            </Link>
            <a
              href="#features"
              onClick={handleScrollToFeatures}
              className="text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Features
            </a>
            {renderAuthButtons()}
          </nav>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col gap-4 mt-8">
                <Link to={createPageUrl("Homepage")} className="text-lg font-medium">
                  Home
                </Link>
                <a
                  href="#features"
                  onClick={handleScrollToFeatures}
                  className="text-lg font-medium"
                >
                  Features
                </a>
                {renderMobileAuthButtons()}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const isPublicPage = publicPages.includes(currentPageName);

  if (isPublicPage) {
    // For standalone public pages, don't show any header
    if (currentPageName === "CreateBuilding" || currentPageName === "JoinBuilding" || currentPageName === "PublicBooking" || currentPageName === "ManageBooking" || currentPageName === "PublicCalendar" || currentPageName === "PublicEventsScroller" || currentPageName === "PublicOrganization" || currentPageName === "KioskCalendar") {
      return <>{children}</>;
    }
    // For Homepage only, show the public header
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <main className="flex-grow flex flex-col">
          {children}
        </main>
        <footer className="bg-white border-t mt-auto py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-slate-500">&copy; {new Date().getFullYear()} VenuePro. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <AdminSidebar currentPath={location.pathname} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <div className="lg:hidden">
          <div className="bg-gray-50 p-4 flex justify-end items-center">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-900 h-10 w-10">
                <Menu className="w-8 h-8" />
              </Button>
            </SheetTrigger>
        </div>
        </div>
        <SheetContent side="left" className="p-0 w-64">
          <AdminSidebar currentPath={location.pathname} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
