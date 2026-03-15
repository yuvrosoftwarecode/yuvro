import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Type, 
  Palette, 
  Settings, 
  Move,
  Eye,
  EyeOff
} from 'lucide-react';

interface SectionConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

interface FontOption {
  id: string;
  name: string;
  family: string;
}

interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

interface ResumePropertiesPanelProps {
  selectedFont: string;
  setSelectedFont: (font: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  lineSpacing: number;
  setLineSpacing: (spacing: number) => void;
  sectionOrder: SectionConfig[];
  setSectionOrder: (sections: SectionConfig[]) => void;
  fontOptions: FontOption[];
  colorSchemes: ColorScheme[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ResumePropertiesPanel: React.FC<ResumePropertiesPanelProps> = ({
  selectedFont,
  setSelectedFont,
  selectedColor,
  setSelectedColor,
  fontSize,
  setFontSize,
  lineSpacing,
  setLineSpacing,
  sectionOrder,
  setSectionOrder,
  fontOptions,
  colorSchemes,
  isCollapsed,
  onToggleCollapse
}) => {
  const toggleSectionVisibility = (sectionId: string) => {
    setSectionOrder(sectionOrder.map(section => 
      section.id === sectionId 
        ? { ...section, visible: !section.visible }
        : section
    ));
  };

  const moveSectionUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...sectionOrder];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      // Update order numbers
      newOrder.forEach((section, idx) => {
        section.order = idx;
      });
      setSectionOrder(newOrder);
    }
  };

  const moveSectionDown = (index: number) => {
    if (index < sectionOrder.length - 1) {
      const newOrder = [...sectionOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      // Update order numbers
      newOrder.forEach((section, idx) => {
        section.order = idx;
      });
      setSectionOrder(newOrder);
    }
  };

  // Since we're now using conditional rendering instead of fixed positioning,
  // we don't need the collapsed state UI
  return (
    <div className="h-full bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Resume Properties</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="hover:bg-gray-100"
          >
            ✕
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Font Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Type className="h-4 w-4 mr-2" />
              Typography
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Font Family */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Font Family (Current: {fontOptions.find(f => f.id === selectedFont)?.name || 'Unknown'})
              </label>
              <div className="grid grid-cols-1 gap-2">
                {fontOptions.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => {
                      console.log('Font button clicked:', font.id, font.name);
                      setSelectedFont(font.id);
                      console.log('Font state updated to:', font.id);
                    }}
                    className={`p-2 text-left text-sm border rounded-md transition-colors ${
                      selectedFont === font.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ fontFamily: font.family }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>

                <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-800">
                    Font Size
                  </label>
                  <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">
                    {fontSize}%
                  </span>
                </div>

                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  min={80}
                  max={120}
                  step={5}
                  className="w-full"
                />

                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Small</span>
                  <span>Default</span>
                  <span>Large</span>
                </div>
              </div>

            <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-800">
                Line Spacing
              </label>
              <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">
                {lineSpacing}
              </span>
            </div>

            <Slider
              value={[lineSpacing]}
              onValueChange={(value) => setLineSpacing(value[0])}
              min={1.0}
              max={2.0}
              step={0.1}
              className="w-full"
            />

            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Tight</span>
              <span>Normal</span>
              <span>Relaxed</span>
            </div>
          </div>

          </CardContent>
        </Card>

        {/* Color Scheme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              Color Scheme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => setSelectedColor(scheme.id)}
                  className={`p-3 text-left border rounded-md transition-colors ${
                    selectedColor === scheme.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{scheme.name}</span>
                    <div className="flex space-x-1">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: scheme.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: scheme.accent }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section Order */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Move className="h-4 w-4 mr-2" />
              Section Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sectionOrder.map((section, index) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleSectionVisibility(section.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {section.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <span className={`text-sm ${section.visible ? 'text-gray-900' : 'text-gray-400'}`}>
                      {section.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => moveSectionUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveSectionDown(index)}
                      disabled={index === sectionOrder.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResumePropertiesPanel;