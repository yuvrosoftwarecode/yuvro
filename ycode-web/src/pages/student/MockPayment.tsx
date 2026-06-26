import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { contestService } from '@/services/contestService';
import { toast } from 'sonner';

const MockPayment: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { contestId } = useParams<{ contestId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isPublic = location.pathname.startsWith('/public/');
    const basePath = isPublic ? '/public/contests' : '/student/contests';

    const [status, setStatus] = useState<'pending' | 'processing' | 'success' | 'error'>('pending');

    useEffect(() => {
        if (!token) {
            toast.error('Invalid payment session');
            navigate(basePath);
        }
    }, [token, navigate, basePath]);

    const handleSimulatePayment = async () => {
        setStatus('processing');
        try {
            // Wait 2 seconds to simulate processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const response = await contestService.verifyPayment(contestId!, token!);
            
            if (response.status === 'success') {
                setStatus('success');
                // Auto redirect after 2s
                setTimeout(() => {
                    navigate(`${basePath}/${contestId}`);
                }, 2000);
            } else {
                throw new Error(response.message || 'Payment verification failed');
            }
        } catch (error: any) {
            console.error(error);
            setStatus('error');
            toast.error(error.response?.data?.error || error.message || 'Payment verification failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Mock Payment Gateway</h2>
                
                {status === 'pending' && (
                    <>
                        <p className="text-gray-600">
                            Click below to simulate a successful payment transaction.
                        </p>
                        <Button 
                            onClick={handleSimulatePayment}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                        >
                            Simulate Successful Payment
                        </Button>
                    </>
                )}

                {status === 'processing' && (
                    <div className="flex flex-col items-center gap-4 text-indigo-600">
                        <Loader2 className="h-12 w-12 animate-spin" />
                        <p className="font-medium animate-pulse">Processing Payment...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 text-green-600">
                        <CheckCircle className="h-16 w-16" />
                        <h3 className="text-xl font-bold">Payment Successful!</h3>
                        <p className="text-gray-600 text-sm">Redirecting back to contest...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4 text-red-600">
                        <AlertCircle className="h-16 w-16" />
                        <h3 className="text-xl font-bold">Payment Failed</h3>
                        <Button 
                            variant="outline"
                            onClick={() => setStatus('pending')}
                            className="mt-4"
                        >
                            Try Again
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MockPayment;
