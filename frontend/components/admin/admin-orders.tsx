"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminOrders, updateOrderStatus } from "@/store/slices/adminSlice";
import { ShoppingBag, Check, X } from "lucide-react";

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

const statusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "APPROVED":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "REJECTED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-white/5 text-white/40 border-white/10";
  }
};

export function AdminOrders() {
  const dispatch = useAppDispatch();
  const { orders, loading, actionLoading } = useAppSelector((s) => s.admin);
  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("ALL");
  const [notesMap, setNotesMap] = useState<Record<number, string>>({});

  useEffect(() => {
    dispatch(fetchAdminOrders(filter === "ALL" ? undefined : filter));
  }, [dispatch, filter]);

  const handleAction = (id: number, status: "APPROVED" | "REJECTED") => {
    dispatch(
      updateOrderStatus({ id, status, notes: notesMap[id] || undefined }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShoppingBag size={20} className="text-purple-400" />
          Shop Orders ({orders.length})
        </h2>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === f
                  ? "bg-red-600/20 text-red-400 border-red-600/30"
                  : "bg-white/5 text-white/40 border-white/10 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-sm">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-xl p-10 text-center text-white/30">
          No orders found.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="bg-[#111] border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">
                    {o.user.firstName} {o.user.lastName}
                  </span>
                  <span className="text-white/30 text-xs">{o.user.email}</span>
                  <span
                    className={`text-xs border px-2 py-0.5 rounded-full ${statusBadge(o.status)}`}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="text-sm text-white/60">
                  Total:{" "}
                  <span className="text-white font-medium">
                    CHF {o.totalAmount.toFixed(2)}
                  </span>
                </p>
                <div className="space-y-0.5">
                  {o.items.map((item, i) => (
                    <p key={i} className="text-xs text-white/40">
                      {item.product.name} × {item.quantity} @ CHF{" "}
                      {item.unitPrice}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-white/30">
                  Placed: {new Date(o.createdAt).toLocaleString()}
                </p>
                {o.notes && (
                  <p className="text-xs text-white/40 italic">
                    Note: {o.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              {o.status === "PENDING" && (
                <div className="flex flex-col gap-2 min-w-50">
                  <input
                    type="text"
                    placeholder="Optional admin note..."
                    value={notesMap[o.id] || ""}
                    onChange={(e) =>
                      setNotesMap({ ...notesMap, [o.id]: e.target.value })
                    }
                    className="bg-[#1a1a1a] border border-white/10 text-white text-xs rounded px-3 py-1.5 placeholder:text-white/20 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(o.id, "APPROVED")}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/20 text-xs py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(o.id, "REJECTED")}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/20 text-xs py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
