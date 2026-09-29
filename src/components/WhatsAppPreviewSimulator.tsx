import React from 'react';
import { CheckCheck, ExternalLink, Phone, MessageSquare, ShieldCheck, ChevronLeft } from 'lucide-react';
import { WhatsAppTemplate } from '../types';

interface WhatsAppPreviewProps {
  template: WhatsAppTemplate;
  renderedBody?: string;
  businessName?: string;
  previewVariables?: Record<string, string>;
}

export const WhatsAppPreviewSimulator: React.FC<WhatsAppPreviewProps> = ({
  template,
  renderedBody,
  businessName = 'ABC Salon & Spa',
  previewVariables = {}
}) => {
  // If renderedBody not supplied, dynamically substitute variables
  const displayBody = renderedBody || (() => {
    let text = template.body_text;
    Object.entries(previewVariables).forEach(([k, v]) => {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), v || `[${k}]`);
    });
    return text;
  })();

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full max-w-[340px] mx-auto rounded-[32px] border-[6px] border-slate-800 bg-[#0b141a] shadow-2xl overflow-hidden font-sans select-none">
      {/* Phone Speaker Notch */}
      <div className="bg-slate-900 pt-2 pb-1 flex justify-center">
        <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-700 mr-2" />
          <div className="w-10 h-1.5 rounded-full bg-slate-700" />
        </div>
      </div>

      {/* WhatsApp Header Bar */}
      <div className="bg-[#1f2c34] text-white px-3 py-2.5 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center space-x-2">
          <ChevronLeft className="w-5 h-5 text-[#00a884] cursor-pointer" />
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-sm border border-emerald-400/40">
              {businessName.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#1f2c34] flex items-center justify-center">
              <ShieldCheck className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div className="leading-tight">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-xs tracking-wide text-white truncate max-w-[130px]">{businessName}</span>
              <span className="bg-emerald-500/20 text-[#00a884] text-[9px] px-1 py-0.2 rounded font-medium">Official</span>
            </div>
            <p className="text-[10px] text-slate-400">WhatsApp Official Business</p>
          </div>
        </div>

        <div className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.5 rounded font-mono font-medium">
          {template.category}
        </div>
      </div>

      {/* WhatsApp Chat Canvas */}
      <div className="relative p-3 min-h-[380px] flex flex-col justify-end bg-[#0b141a] bg-opacity-95"
           style={{
             backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
             backgroundSize: '16px 16px'
           }}>

        {/* Date separator */}
        <div className="flex justify-center mb-3">
          <span className="bg-[#182229] text-slate-400 text-[10px] px-2.5 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
            Today
          </span>
        </div>

        {/* Message Bubble */}
        <div className="relative max-w-[92%] bg-[#005c4b] text-white rounded-2xl rounded-tl-sm p-3 shadow-md border border-[#005c4b]/50">
          {/* Header */}
          {template.header_content && (
            <div className="pb-1.5 mb-1.5 border-b border-emerald-700/60 font-semibold text-xs text-emerald-200 flex items-center space-x-1.5">
              <span>{template.header_content}</span>
            </div>
          )}

          {/* Body */}
          <div className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
            {displayBody}
          </div>

          {/* Footer & Meta Info */}
          <div className="mt-2 pt-1 border-t border-emerald-700/40 flex items-end justify-between text-[10px] text-emerald-300/80">
            <span className="italic">{template.footer_text || 'Official Business Message'}</span>
            <div className="flex items-center space-x-1 text-[9px] text-emerald-200">
              <span>{currentTime}</span>
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            </div>
          </div>
        </div>

        {/* Interactive Buttons (WhatsApp Cloud API Format) */}
        {template.buttons && template.buttons.length > 0 && (
          <div className="mt-1.5 space-y-1 max-w-[92%]">
            {template.buttons.map((btn, idx) => (
              <div
                key={idx}
                className="bg-[#1f2c34] hover:bg-[#2a3942] transition-colors rounded-xl py-2 px-3 text-center text-xs font-medium text-[#53bdeb] flex items-center justify-center space-x-1.5 shadow-sm border border-slate-700/60 cursor-pointer"
              >
                {btn.type === 'QUICK_REPLY' && <MessageSquare className="w-3.5 h-3.5" />}
                {btn.type === 'URL' && <ExternalLink className="w-3.5 h-3.5" />}
                {btn.type === 'PHONE_NUMBER' && <Phone className="w-3.5 h-3.5" />}
                <span>{btn.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-3 text-[9px] text-slate-500 flex items-center justify-center space-x-1">
          <span>🔒 End-to-end encrypted via Meta Cloud API</span>
        </div>
      </div>

      {/* Input bar mockup */}
      <div className="bg-[#1f2c34] p-2 flex items-center space-x-2 border-t border-slate-700/50">
        <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-slate-400">
          Message
        </div>
        <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-white">
          <MessageSquare className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
