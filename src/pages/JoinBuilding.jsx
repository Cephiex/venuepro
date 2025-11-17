import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Building } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, LogIn, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function JoinBuildingPage() {
  const [searchParams] = useSearchParams();
  const [building, setBuilding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const buildingId = searchParams.get('building_id');

  useEffect(() => {
    if (!buildingId) {
      setError("No building specified. This invite link is invalid.");
      setIsLoading(false);
      return;
    }

    const processInvitation = async () => {
      try {
        const buildingData = await Building.get(buildingId);
        setBuilding(buildingData);

        // Check if user is logged in
        const user = await User.me();

        // User is logged in, process and redirect
        setIsProcessing(true);
        if (user.building_id && user.building_id !== buildingId) {
            // User already belongs to a different building
            setError("You are already a member of a different building. You cannot join another one.");
            setIsLoading(false);
            setIsProcessing(false);
        } else if (user.building_id === buildingId) {
            // Already a member, just redirect
            navigate(createPageUrl('Dashboard'));
        } else {
            // New user or user without a building, assign them
            await User.updateMyUserData({ building_id: buildingId });
            navigate(createPageUrl('Dashboard'));
        }
      } catch (e) {
        // User not logged in, show the invitation page.
        setIsLoading(false);
      }
    };

    processInvitation();
  }, [buildingId, navigate]);

  const handleLogin = async () => {
    setIsProcessing(true);
    // Redirect to login, then come back to this same page to process the invitation
    await User.loginWithRedirect(window.location.href);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="ml-4 text-slate-600">Verifying invitation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          {error ? (
            <CardTitle className="text-3xl font-bold text-red-600">Invitation Error</CardTitle>
          ) : (
            <CardTitle className="text-3xl font-bold">You're Invited!</CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            {error ? (
              <p className="text-slate-600 text-lg">{error}</p>
            ) : (
              <>
                <p className="text-lg text-slate-600">
                  You have been invited to join the management dashboard for
                  <br />
                  <strong className="text-2xl text-slate-900 block mt-2">{building?.name}</strong>
                </p>
                <p className="text-slate-500">
                  Please log in or create an account to accept your invitation.
                </p>
                <Button 
                  onClick={handleLogin} 
                  disabled={isProcessing} 
                  className="w-full p-6 text-lg font-semibold"
                >
                  {isProcessing ? 'Processing...' : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Log In or Sign Up to Join
                    </>
                  )}
                </Button>
              </>
            )}
             <Button 
                variant="link" 
                onClick={() => navigate(createPageUrl('Homepage'))}
                className="text-slate-600"
            >
                Go to Homepage
                <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}