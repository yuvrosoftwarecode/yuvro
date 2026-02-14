import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Layers, ChevronRight } from "lucide-react";

interface BatchListProps {
  batchNames: string[];
  onSelectBatch: (batchName: string) => void;
  selectedName?: string;
}

const BatchList: React.FC<BatchListProps> = ({ batchNames, onSelectBatch, selectedName }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {batchNames.map((name) => (
        <Card 
          key={name} 
          className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
            selectedName === name ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-blue-200'
          }`}
          onClick={() => onSelectBatch(name)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{name}</h3>
                  <p className="text-sm text-gray-500">Academic Batch</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${selectedName === name ? 'rotate-90' : ''}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BatchList;
