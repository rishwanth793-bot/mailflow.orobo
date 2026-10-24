import React from 'react';
import { Check, CheckCheck, AlertCircle } from 'lucide-react';

interface WhatsAppTicksProps {
  status: 'draft' | 'sending' | 'sent' | 'partial_failure' | 'failed' | 'delivered' | 'pending';
  size?: number;
}

export const WhatsAppTicks: React.FC<WhatsAppTicksProps> = ({ status, size = 14 }) => {
  if (status === 'delivered') {
    // Double blue tick (delivered to inboxes)
    return <CheckCheck size={size} className="text-[#53bdeb] shrink-0" />;
  }

  if (status === 'sent') {
    // Double grey tick (dispatched from server)
    return <CheckCheck size={size} className="text-[#8696a0] shrink-0" />;
  }

  if (status === 'sending' || status === 'draft' || status === 'pending') {
    // Single grey tick (queued / sending)
    return <Check size={size} className="text-[#8696a0] shrink-0" />;
  }

  if (status === 'partial_failure') {
    return <CheckCheck size={size} className="text-amber-500 shrink-0" />;
  }

  // Failed
  return <AlertCircle size={size} className="text-rose-500 shrink-0" />;
};
