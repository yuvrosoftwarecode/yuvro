import React from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Sparkles, Trophy, Zap, Flame, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter Spark',
    price: 29,
    credits: 100,
    description: 'Perfect for quick practice sessions.',
    icon: Sparkles,
    color: 'from-blue-500/10 to-indigo-500/10 text-blue-500 border-blue-200',
    btnVariant: 'outline' as const,
    features: ['100 AI credits', 'Standard support', 'Access to practice tests', 'No expiry date']
  },
  {
    id: 'booster',
    name: 'Growth Booster',
    price: 59,
    credits: 220,
    description: '10% bonus credits for active learners.',
    icon: Zap,
    color: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200',
    popular: true,
    btnVariant: 'default' as const,
    features: ['220 AI credits (20 bonus)', 'Priority practice access', 'Detailed feedback reports', 'No expiry date']
  },
  {
    id: 'pro',
    name: 'Pro Learner',
    price: 99,
    credits: 450,
    description: '12% bonus credits for full preparation.',
    icon: Flame,
    color: 'from-teal-500/10 to-emerald-500/10 text-teal-600 border-teal-200',
    btnVariant: 'outline' as const,
    features: ['450 AI credits (50 bonus)', 'Full subject analytics', 'Access to mock interviews', 'No expiry date']
  },
  {
    id: 'elite',
    name: 'Elite Success',
    price: 199,
    credits: 1000,
    description: '25% bonus credits for the ambitious.',
    icon: Trophy,
    color: 'from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-200',
    btnVariant: 'outline' as const,
    features: ['1000 AI credits (200 bonus)', '1-on-1 AI mentorship sessions', 'Resume reviews', 'No expiry date']
  },
  {
    id: 'mastery',
    name: 'Mastery Unlimited',
    price: 299,
    credits: 1600,
    description: '33% bonus credits for ultimate excellence.',
    icon: Coins,
    color: 'from-rose-500/10 to-red-500/10 text-rose-600 border-rose-200',
    btnVariant: 'outline' as const,
    features: ['1600 AI credits (400 bonus)', 'Premium support', 'All features unlocked', 'No expiry date']
  }
];

const StudentUpgrade = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePurchase = (planName: string, credits: number) => {
    toast({
      title: 'Purchase Successful!',
      description: `Successfully purchased ${credits} credits under the ${planName} plan.`,
    });
    // Return to the previous dashboard page after a short delay
    setTimeout(() => {
      navigate(-1);
    }, 1500);
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-xl h-10 w-10 shrink-0 shadow-sm border-border"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Button>
          <div className="flex-1 -mt-4 sm:mt-0">
            <PageHeader
              title="Buy Credits"
              subtitle="Top up your credits to access premium practice tests, tasks, and AI interview prep."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-stretch">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden border ${
                  plan.popular 
                    ? 'border-[hsl(174,64%,33%)] shadow-md md:scale-105 z-10' 
                    : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-[hsl(174,64%,33%)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                
                <CardHeader className="space-y-2 pb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${plan.color.split(' ')[0]} ${plan.color.split(' ')[1]}`}>
                    <Icon className={`h-6 w-6 ${plan.color.split(' ')[2]}`} />
                  </div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-xs min-h-[32px]">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 flex-1">
                  <div className="space-y-1">
                    <div className="flex items-baseline text-3xl font-extrabold tracking-tight">
                      ₹{plan.price}
                    </div>
                    <p className="text-xs text-muted-foreground">One-time payment</p>
                  </div>

                  <div className="p-3.5 bg-muted/40 rounded-xl flex items-center gap-3 border border-border/30">
                    <Coins className="h-5 w-5 text-amber-500 animate-pulse" />
                    <div>
                      <div className="text-sm font-bold text-foreground">{plan.credits} Credits</div>
                      <div className="text-[10px] text-muted-foreground">Added to your balance</div>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4 pb-6">
                  <Button 
                    className={`w-full h-10 rounded-xl transition-all ${
                      plan.popular 
                        ? 'bg-[hsl(174,64%,33%)] hover:bg-[hsl(174,64%,28%)] text-white' 
                        : ''
                    }`}
                    variant={plan.btnVariant}
                    onClick={() => handlePurchase(plan.name, plan.credits)}
                  >
                    Buy Plan
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentUpgrade;
