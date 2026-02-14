import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Calendar, ArrowLeft } from "lucide-react";
import { batchService, Batch } from "@/services/batchService";
import { Department } from "@/services/departmentService";
import { Button } from "@/components/ui/button";

interface DepartmentDetailProps {
  department: Department;
  onBack?: () => void;
}

const DepartmentDetail: React.FC<DepartmentDetailProps> = ({ department, onBack }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBatches = async () => {
      try {
        setLoading(true);
        const data = await batchService.getBatches(department.id);
        setBatches(data);
      } catch (err) {
        console.error("Failed to load batches", err);
      } finally {
        setLoading(false);
      }
    };

    loadBatches();
  }, [department.id]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-orange-50 hover:text-orange-600">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-2xl font-bold text-gray-900">{department.name} Batches</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No batches found for this department.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <Card key={batch.id} className="hover:shadow-md transition-shadow border-orange-100">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{batch.name}</h4>
                  <p className="text-xs text-gray-500">Batch ID</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentDetail;
