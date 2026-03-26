import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Clock } from 'lucide-react';

interface TestSettingsDurationOnly {
  duration: number;
}

interface TestSettingsDurationOnlyProps {
  settings: TestSettingsDurationOnly;
  onSettingsChange: (settings: TestSettingsDurationOnly) => void;
}

export function TestSettingsDurationOnly({ settings, onSettingsChange }: TestSettingsDurationOnlyProps) {
  const handleDurationChange = (value: number) => {
    onSettingsChange({
      duration: value
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Test Settings</CardTitle>
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-purple-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          {/* Duration Only */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <div className="relative">
              <Input
                id="duration"
                type="number"
                step="0.1"
                min="0"
                value={settings.duration}
                onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 0)}
                className="pr-10"
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
