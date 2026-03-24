import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import PageHeader from '@/components/common/PageHeader';
import { batchService, Batch } from '@/services/batchService';
import BatchList from '@/components/college-admin/batches/BatchList';
import BatchDetail from '@/components/college-admin/batches/BatchDetail';
import { toast } from 'sonner';

const BatchesScreen: React.FC = () => {
    const { user } = useAuth();
    const [uniqueBatchNames, setUniqueBatchNames] = useState<string[]>([]);
    const [selectedBatchName, setSelectedBatchName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBatches();
    }, []);

    const loadBatches = async () => {
        try {
            setLoading(true);
            const data = await batchService.getBatches();
            // Extract unique batch names
            const names = Array.from(new Set(data.map(b => b.name)));
            setUniqueBatchNames(names.sort());
        } catch (err) {
            console.error("Failed to load batches", err);
            toast.error("Failed to load batches");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <PageHeader
                            title="Batch IDs"
                            subtitle="Overview of all student batches across departments"
                        />
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : selectedBatchName ? (
                            <BatchDetail 
                                batchName={selectedBatchName} 
                                onBack={() => setSelectedBatchName(null)} 
                            />
                        ) : (
                            <BatchList 
                                batchNames={uniqueBatchNames} 
                                onSelectBatch={setSelectedBatchName} 
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchesScreen;
