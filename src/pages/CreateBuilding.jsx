import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, User } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function CreateBuildingPage() {
  const [buildingName, setBuildingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!buildingName) {
      setError('Building name is required.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const user = await User.me();
      
      // Create the new building
      const newBuilding = await Building.create({
        name: buildingName,
        admin_email: user.email,
      });

      // Update the user record with the new building_id only
      // The role should be set manually through the platform's user management
      await User.updateMyUserData({
        building_id: newBuilding.id,
      });

      // Navigate to the new dashboard
      navigate(createPageUrl('Dashboard'));

    } catch (err) {
      console.error('Error creating building:', err);
      setError('Failed to create building. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Set Up Your Building</CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Welcome! Let's get your new management dashboard ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="building-name" className="text-lg font-medium">Building or Association Name</Label>
              <Input
                id="building-name"
                type="text"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g., The Grand Hall"
                required
                className="p-6 text-lg"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" disabled={isLoading} className="w-full p-6 text-lg font-semibold">
              {isLoading ? 'Creating...' : 'Create My Dashboard'}
              {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
            <div className="text-center">
              <p className="text-sm text-slate-500">
                After creating your building, you'll need to be assigned admin privileges by a platform administrator.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}