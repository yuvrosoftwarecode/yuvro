import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { contestService } from '@/services/contestService';
import { toast } from 'sonner';
import { RestApiUtil } from '@/utils/RestApiUtil';
import { yhubApiAuthUtil } from '@/utils/RestApiAuthUtil';

const yhubApiUtil = yhubApiAuthUtil;

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if ((window as any).Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const PaymentPage: React.FC = () => {
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

    const getTokenAmount = () => {
        try {
            if (!token) return 0;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return parseFloat(payload.amount) || 49;
        } catch (e) {
            return 49;
        }
    };

    const handlePayment = async () => {
        setStatus('processing');
        
        try {
            const amount = getTokenAmount();
            
            const orderRes = await yhubApiUtil.post<{
                id: string;
                gateway_order_or_intent_id: string;
            }>('/payment/', {
                payment_gateway: 'RAZORPAY',
                amount: amount,
                item_type: 'contest',
                item_id: contestId
            });

            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast.error('Razorpay SDK failed to load. Are you online?');
                setStatus('error');
                return;
            }

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: amount,
                currency: 'INR',
                name: 'Yuvro Code',
                description: 'Contest Registration Payment',
                order_id: orderRes.gateway_order_or_intent_id, 
                handler: async function (response: any) {
                    try {
                       
                        const verifyRes = await yhubApiUtil.post<{ status: string; message: string }>('/payment/verify/', {
                            gateway_order_id: response.razorpay_order_id,
                            gateway_payment_id: response.razorpay_payment_id,
                            signature: response.razorpay_signature
                        });
                        
                        if (verifyRes.status === 'SUCCESS') {
                            const backendResponse = await contestService.verifyPayment(contestId!, token!);
                            
                            if (backendResponse.status === 'success') {
                                setStatus('success');
                                setTimeout(() => {
                                    navigate(`${basePath}/${contestId}`);
                                }, 2000);
                            } else {
                                throw new Error(backendResponse.message || 'Contest registration failed');
                            }
                        } else {
                            await yhubApiUtil.post('/payment/fail/', {
                                gateway_order_id: orderRes.gateway_order_or_intent_id,
                                reason: 'Payment signature verification failed'
                            });
                            throw new Error(verifyRes.message || 'Payment signature verification failed');
                        }
                    } catch (error: any) {
                        console.error(error);
                        setStatus('error');
                        toast.error(error.message || 'Payment verification failed');
                    }
                },
                prefill: {
                    name: 'Student',
                    email: 'student@example.com',
                },
                theme: {
                    color: '#4f46e5'
                },
                modal: {
                    ondismiss: async function() {
                        setStatus('pending');
                        toast.info('Payment cancelled');
                        try {
                            await yhubApiUtil.post('/payment/fail/', {
                                gateway_order_id: orderRes.gateway_order_or_intent_id,
                                reason: 'User closed the payment modal'
                            });
                        } catch (e) {
                            console.error('Failed to report cancellation', e);
                        }
                    }
                }
            };

            const paymentObject = new (window as any).Razorpay(options);
            
            paymentObject.on('payment.failed', async function (response: any) {
                try {
                    await yhubApiUtil.post('/payment/fail/', {
                        gateway_order_id: orderRes.gateway_order_or_intent_id,
                        gateway_payment_id: response.error.metadata.payment_id,
                        reason: response.error.description || 'Payment failed in gateway'
                    });
                } catch (e) {
                    console.error('Failed to report payment failure', e);
                }
            });

            paymentObject.open();

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            toast.error('Failed to initiate payment with the server.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Complete Registration</h2>
                
                {status === 'pending' && (
                    <>
                        <p className="text-gray-600">
                            Click below to securely pay and complete your contest registration.
                        </p>
                        <Button 
                            onClick={handlePayment}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                        >
                            Pay with Razorpay
                        </Button>
                    </>
                )}

                {status === 'processing' && (
                    <div className="flex flex-col items-center gap-4 text-indigo-600">
                        <Loader2 className="h-12 w-12 animate-spin" />
                        <p className="font-medium animate-pulse">Initializing Payment...</p>
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

export default PaymentPage;
