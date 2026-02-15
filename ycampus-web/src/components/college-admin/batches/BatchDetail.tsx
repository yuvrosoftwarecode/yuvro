import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ArrowLeft } from "lucide-react";
import { batchService, Batch } from "@/services/batchService";
import { Button } from "@/components/ui/button";

interface BatchDetailProps {
  batchName: string;
  onBack?: () => void;
}

const BatchDetail: React.FC<BatchDetailProps> = ({ batchName, onBack }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDepartmentsForBatch = async () => {
      try {
        setLoading(true);
        // We fetch all batches and filter by name to find departments
        const allBatches = await batchService.getBatches();
        const filtered = allBatches.filter(b => b.name === batchName);
        setBatches(filtered);
      } catch (err) {
        console.error("Failed to load departments for batch", err);
      } finally {
        setLoading(false);
      }
    };

    loadDepartmentsForBatch();
  }, [batchName]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-blue-50 hover:text-blue-600">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-2xl font-bold text-gray-900">Departments in Batch {batchName}</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No departments found for this batch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <Card key={batch.id} className="hover:shadow-md transition-shadow border-blue-100">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{batch.department_name}</h4>
                  <p className="text-xs text-gray-500">Department</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BatchDetail;
