import React from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

const PlacementSettings = () => {
  return (
    <PlacementLayout title="Settings">
      <div className="max-w-xl space-y-6">
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Settings className="h-4 w-4 text-[hsl(249,60%,69%)]" /> Notification Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {['New job posted', 'Recruiter resubmission', 'Student selection update', 'Offer uploaded'].map(label => (
              <div key={label} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Display Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Year-over-year comparison</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-hide expired jobs</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </PlacementLayout>
  );
};

export default PlacementSettings;
