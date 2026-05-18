"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminMemberships,
  updateMembershipStatus,
} from "@/store/slices/adminSlice";
import { CreditCard, Check, X } from "lucide-react";

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

export function AdminMemberships() {
  const dispatch = useAppDispatch();
  const { memberships, loading, actionLoading } = useAppSelector(
    (s) => s.admin,
  );
  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("ALL");
  const [notesMap, setNotesMap] = useState<Record<number, string>>({});

  useEffect(() => {
    dispatch(fetchAdminMemberships(filter === "ALL" ? undefined : filter));
  }, [dispatch, filter]);

  const handleAction = (id: number, status: "APPROVED" | "REJECTED") => {
    dispatch(
      updateMembershipStatus({ id, status, notes: notesMap[id] || undefined }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CreditCard size={20} className="text-green-400" />
          Membership Purchases ({memberships.length})
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
      ) : memberships.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-xl p-10 text-center text-white/30">
          No membership records found.
        </div>
      ) : (
        <div className="space-y-3">
          {memberships.map((m) => (
            <div
              key={m.id}
              className="bg-[#111] border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">
                    {m.user.firstName} {m.user.lastName}
                  </span>
                  <span className="text-white/30 text-xs">{m.user.email}</span>
                  <span
                    className={`text-xs border px-2 py-0.5 rounded-full ${statusBadge(m.status)}`}
                  >
                    {m.status}
                  </span>
                  {m.registrationDetails?.contractNumber != null && (
                    <span className="text-xs border border-blue-500/20 bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                      {String(m.registrationDetails.contractNumber)}
                    </span>
                  )}
                  {m.registrationDetails?.customerNumber != null && (
                    <span className="text-xs border border-purple-500/20 bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                      {String(m.registrationDetails.customerNumber)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60">
                  Plan: <span className="text-white">{m.plan.name}</span> —{" "}
                  {m.plan.duration} — {m.plan.currency} {m.plan.price}
                </p>
                {m.additionalPlans && m.additionalPlans.length > 0 && (
                  <div className="text-sm text-white/60">
                    <span className="text-white/80 font-medium">Add-ons: </span>
                    {m.additionalPlans.map((ap, i) => (
                      <span key={ap.id}>
                        <span className="text-white/80">
                          {ap.name || ap.duration}
                        </span>
                        <span className="text-white/40">
                          {" "}
                          ({ap.currency} {ap.price})
                        </span>
                        {i < m.additionalPlans!.length - 1 && (
                          <span className="text-white/30">, </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/45">
                  <span>
                    Registration fee: {m.plan.currency}{" "}
                    {(m.registrationFee ?? 0).toFixed(2)}
                  </span>
                  <span>
                    Total: {m.plan.currency}{" "}
                    {(m.totalAmount ?? m.plan.price).toFixed(2)}
                  </span>
                  {m.paymentFrequency && (
                    <span>
                      Payment:{" "}
                      <span className="text-white/70 font-medium capitalize">
                        {m.paymentFrequency.charAt(0) +
                          m.paymentFrequency.slice(1).toLowerCase()}
                      </span>
                    </span>
                  )}
                  {m.startDate && (
                    <span>
                      Start date: {new Date(m.startDate).toLocaleDateString()}
                    </span>
                  )}
                  {m.emergencyContact && (
                    <span>Emergency: {m.emergencyContact}</span>
                  )}
                  {m.address && (
                    <span className="md:col-span-2">Address: {m.address}</span>
                  )}
                  <span>
                    Agreement: {m.acceptedAgreement ? "Accepted" : "Pending"}
                  </span>
                  <span>Terms: {m.acceptedTerms ? "Accepted" : "Pending"}</span>
                  <span>
                    Signature: {m.signatureDataUrl ? "Captured" : "Missing"}
                  </span>
                  {m.registrationDetails?.contractNumber != null && (
                    <span>
                      Contract No:{" "}
                      <span className="text-white/70 font-mono">
                        {String(m.registrationDetails.contractNumber)}
                      </span>
                    </span>
                  )}
                  {m.registrationDetails?.customerNumber != null && (
                    <span>
                      Customer No:{" "}
                      <span className="text-white/70 font-mono">
                        {String(m.registrationDetails.customerNumber)}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/30">
                  Requested: {new Date(m.createdAt).toLocaleString()}
                </p>
                {m.notes && (
                  <p className="text-xs text-white/40 italic">
                    Note: {m.notes}
                  </p>
                )}
              </div>

              {/* Actions (only for PENDING) */}
              {m.status === "PENDING" && (
                <div className="flex flex-col gap-2 min-w-50">
                  <input
                    type="text"
                    placeholder="Optional admin note..."
                    value={notesMap[m.id] || ""}
                    onChange={(e) =>
                      setNotesMap({ ...notesMap, [m.id]: e.target.value })
                    }
                    className="bg-[#1a1a1a] border border-white/10 text-white text-xs rounded px-3 py-1.5 placeholder:text-white/20 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(m.id, "APPROVED")}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/20 text-xs py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(m.id, "REJECTED")}
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
