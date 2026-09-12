"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { OrderChat } from "./OrderChat";

export function OrderChatToggle({
  orderId,
  currentUserId,
  className = "",
}: {
  orderId: string;
  currentUserId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700"
      >
        <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
        {open ? "Ocultar conversación" : "Ver conversación / comprobante"}
      </button>
      {open && (
        <div className="mt-3">
          <OrderChat orderId={orderId} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
}
