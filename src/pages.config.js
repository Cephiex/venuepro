import Homepage from './pages/Homepage';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Bookings from './pages/Bookings';
import Organizations from './pages/Organizations';
import Repairs from './pages/Repairs';
import CreateBuilding from './pages/CreateBuilding';
import PublicCalendar from './pages/PublicCalendar';
import UserManagement from './pages/UserManagement';
import JoinBuilding from './pages/JoinBuilding';
import Settings from './pages/Settings';
import PublicBooking from './pages/PublicBooking';
import ManageBooking from './pages/ManageBooking';
import ApprovalQueue from './pages/ApprovalQueue';
import PublicEventsScroller from './pages/PublicEventsScroller';
import PublicOrganization from './pages/PublicOrganization';
import Reports from './pages/Reports';
import KioskCalendar from './pages/KioskCalendar';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Homepage": Homepage,
    "Calendar": Calendar,
    "Dashboard": Dashboard,
    "Rooms": Rooms,
    "Bookings": Bookings,
    "Organizations": Organizations,
    "Repairs": Repairs,
    "CreateBuilding": CreateBuilding,
    "PublicCalendar": PublicCalendar,
    "UserManagement": UserManagement,
    "JoinBuilding": JoinBuilding,
    "Settings": Settings,
    "PublicBooking": PublicBooking,
    "ManageBooking": ManageBooking,
    "ApprovalQueue": ApprovalQueue,
    "PublicEventsScroller": PublicEventsScroller,
    "PublicOrganization": PublicOrganization,
    "Reports": Reports,
    "KioskCalendar": KioskCalendar,
}

export const pagesConfig = {
    mainPage: "Homepage",
    Pages: PAGES,
    Layout: __Layout,
};