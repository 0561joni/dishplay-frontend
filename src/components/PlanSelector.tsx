import React, { useState } from 'react';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { Plan } from '../types';
import { useApp } from '../context/AppContext';

const plans: Plan[] = [
  {
    id: 'light',
    name: 'Light',
    price: 9,
    features: [
      'Up to 5 menu uploads per month',
      'Basic image recognition',
      'Standard support',
      '100 credits included'
    ]
  },
  {
    id: 'normal',
    name: 'Normal',
    price: 19,
    features: [
      'Up to 20 menu uploads per month',
      'Advanced image recognition',
      'Priority support',
      '500 credits included',
      'Multi-language support'
    ],
    popular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39,
    features: [
      'Unlimited menu uploads',
      'AI-powered menu optimization',
      '24/7 premium support',
      '2000 credits included',
      'Multi-language support',
      'Custom integrations',
      'Analytics dashboard'
    ]
  }
];

const planIcons = {
  light: Zap,
  normal: Star,
  pro: Crown
};

export function PlanSelector() {
  const { state } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const currentPlan = state.user?.plan || 'light';
  const currentPlanData = plans.find(p => p.id === currentPlan);
  const PlanIcon = planIcons[currentPlan];

  const handlePlanSelect = (planId: string) => {
    // TODO: Implement plan change logic
    console.log('Selected plan:', planId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full px-4 py-2 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 shadow-sm"
      >
        <PlanIcon className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">
          {currentPlanData?.name} Plan
        </span>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-20 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Plan selector modal */}
          <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 w-80 max-h-96 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Choose Your Plan
              </h3>
              
              <div className="space-y-4">
                {plans.map((plan) => {
                  const Icon = planIcons[plan.id];
                  const isCurrentPlan = plan.id === currentPlan;
                  
                  return (
                    <div
                      key={plan.id}
                      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                        isCurrentPlan
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      } ${plan.popular ? 'ring-2 ring-blue-200' : ''}`}
                      onClick={() => handlePlanSelect(plan.id)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${
                            plan.id === 'light' ? 'text-yellow-500' :
                            plan.id === 'normal' ? 'text-blue-500' :
                            'text-purple-500'
                          }`} />
                          <span className="font-semibold text-gray-900">{plan.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
                          <span className="text-sm text-gray-500">/month</span>
                        </div>
                      </div>
                      
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {isCurrentPlan && (
                        <div className="mt-3 text-center">
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                            <Check className="w-3 h-3" />
                            Current Plan
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  All plans include secure data handling and regular updates
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}