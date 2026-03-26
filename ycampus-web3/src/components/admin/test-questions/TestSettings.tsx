import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Settings } from 'lucide-react';

interface TestSettings {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: number;
}

interface TestSettingsProps {
  settings: TestSettings;
  onSettingsChange: (settings: TestSettings) => void;
}

export function TestSettings({ settings, onSettingsChange }: TestSettingsProps) {
  const handleInputChange = (field: keyof TestSettings, value: string | number) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  const calculateDuration = () => {
    if (settings.startDate && settings.startTime && settings.endDate && settings.endTime) {
      const startDateTime = new Date(`${settings.startDate}T${settings.startTime}`);
      const endDateTime = new Date(`${settings.endDate}T${settings.endTime}`);
      const diffInHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
      handleInputChange('duration', Math.max(0, diffInHours));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Test Settings</CardTitle>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 text-purple-600" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <div className="relative">
              <Input
                id="startDate"
                type="date"
                value={settings.startDate}
                onChange={(e) => {
                  handleInputChange('startDate', e.target.value);
                  calculateDuration();
                }}
                className="pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <div className="relative">
              <Input
                id="startTime"
                type="time"
                value={settings.startTime}
                onChange={(e) => {
                  handleInputChange('startTime', e.target.value);
                  calculateDuration();
                }}
                className="pr-10"
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <div className="relative">
              <Input
                id="endDate"
                type="date"
                value={settings.endDate}
                onChange={(e) => {
                  handleInputChange('endDate', e.target.value);
                  calculateDuration();
                }}
                className="pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <div className="relative">
              <Input
                id="endTime"
                type="time"
                value={settings.endTime}
                onChange={(e) => {
                  handleInputChange('endTime', e.target.value);
                  calculateDuration();
                }}
                className="pr-10"
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              step="0.1"
              min="0"
              value={settings.duration}
              onChange={(e) => handleInputChange('duration', parseFloat(e.target.value) || 0)}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 