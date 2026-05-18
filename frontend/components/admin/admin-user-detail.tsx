"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminUserDetail,
  clearSelectedUser,
} from "@/store/slices/adminSlice";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Target,
  Activity,
  CreditCard,
  ShoppingBag,
  CheckCircle,
  Clock,
  XCircle,
  Weight,
  Ruler,
} from "lucide-react";

interface Props {
  userId: number;
  onBack: () => void;
}

const statusConfig: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  APPROVED: {
    label: "Approved",
    icon: <CheckCircle size={12} />,
    className: "bg-green-500/10 text-green-400 border border-green-500/20",
  },
  PENDING: {
    label: "Pending",
    icon: <Clock size={12} />,
    className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  },
  REJECTED: {
    label: "Rejected",
    icon: <XCircle size={12} />,
    className: "bg-red-500/10 text-red-400 border border-red-500/20",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    icon: null,
    className: "bg-white/5 text-white/40",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-white/30">{icon}</span>
      <div>
        <p className="text-xs text-white/40 mb-0.5">{label}</p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

export function AdminUserDetail({ userId, onBack }: Props) {
  const dispatch = useAppDispatch();
  const { selectedUser, loading } = useAppSelector((s) => s.admin);

  useEffect(() => {
    dispatch(fetchAdminUserDetail(userId));
    return () => {
      dispatch(clearSelectedUser());
    };
  }, [dispatch, userId]);

  const genderLabel = (g?: string | null) => {
    if (!g) return null;
    return g.charAt(0) + g.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Customers
        </button>
      </div>

      {loading || !selectedUser ? (
        <div className="text-white/40 text-sm py-10 text-center">
          {loading ? "Loading user details…" : "User not found."}
        </div>
      ) : (
        <>
          {/* Profile card */}
          <div className="bg-[#111] border border-white/5 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-600/20 flex items-center justify-center text-red-400 text-xl font-bold shrink-0">
                {selectedUser.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <p className="text-sm text-white/40">{selectedUser.email}</p>
                <p className="text-xs text-white/25 mt-1">
                  Member since{" "}
                  {new Date(selectedUser.createdAt).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "long", day: "numeric" },
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-0.5 rounded-full">
                  {selectedUser.memberships.length} plan
                  {selectedUser.memberships.length !== 1 ? "s" : ""}
                </span>
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs px-2 py-0.5 rounded-full">
                  {selectedUser.orders.length} order
                  {selectedUser.orders.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Personal info grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <InfoItem
                icon={<Phone size={14} />}
                label="Phone"
                value={selectedUser.phone}
              />
              <InfoItem
                icon={<Calendar size={14} />}
                label="Age"
                value={
                  selectedUser.age != null ? `${selectedUser.age} yrs` : null
                }
              />
              <InfoItem
                icon={<User size={14} />}
                label="Gender"
                value={genderLabel(selectedUser.gender)}
              />
              <InfoItem
                icon={<Weight size={14} />}
                label="Weight"
                value={
                  selectedUser.weight != null
                    ? `${selectedUser.weight} kg`
                    : null
                }
              />
              <InfoItem
                icon={<Ruler size={14} />}
                label="Height"
                value={
                  selectedUser.height != null
                    ? `${selectedUser.height} cm`
                    : null
                }
              />
              <InfoItem
                icon={<Target size={14} />}
                label="Goal"
                value={selectedUser.goal}
              />
              <InfoItem
                icon={<Activity size={14} />}
                label="Experience"
                value={selectedUser.experience}
              />
            </div>
          </div>

          {/* Memberships */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
              <CreditCard size={15} className="text-blue-400" />
              Membership Plans ({selectedUser.memberships.length})
            </h3>

            {selectedUser.memberships.length === 0 ? (
              <div className="bg-[#111] border border-white/5 rounded-xl p-6 text-center text-white/30 text-sm">
                No membership purchases yet.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedUser.memberships.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#111] border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {m.plan.name}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {m.plan.duration} · {m.plan.currency}{" "}
                          {m.plan.price.toFixed(2)}
                        </p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    {/* Additional plans */}
                    {m.additionalPlans && m.additionalPlans.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.additionalPlans.map((ap) => (
                          <span
                            key={ap.id}
                            className="text-xs bg-white/5 border border-white/10 text-white/60 px-2 py-0.5 rounded-full"
                          >
                            + {ap.name} ({ap.currency} {ap.price.toFixed(2)})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {m.totalAmount != null && (
                        <div>
                          <p className="text-white/30">Total Paid</p>
                          <p className="text-white mt-0.5">
                            {m.plan.currency} {m.totalAmount.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {m.registrationFee != null && m.registrationFee > 0 && (
                        <div>
                          <p className="text-white/30">Reg. Fee</p>
                          <p className="text-white mt-0.5">
                            {m.plan.currency}{" "}
                            {(m.registrationFee as number).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {m.startDate && (
                        <div>
                          <p className="text-white/30">Start Date</p>
                          <p className="text-white mt-0.5">
                            {new Date(m.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {(m.registrationDetails as Record<string, unknown>)
                        ?.contractNumber && (
                        <div>
                          <p className="text-white/30">Contract No.</p>
                          <p className="text-blue-300 mt-0.5 font-mono text-xs">
                            {String(
                              (m.registrationDetails as Record<string, unknown>)
                                .contractNumber,
                            )}
                          </p>
                        </div>
                      )}
                      {(m.registrationDetails as Record<string, unknown>)
                        ?.customerNumber && (
                        <div>
                          <p className="text-white/30">Customer No.</p>
                          <p className="text-purple-300 mt-0.5 font-mono text-xs">
                            {String(
                              (m.registrationDetails as Record<string, unknown>)
                                .customerNumber,
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-white/30">Applied On</p>
                        <p className="text-white mt-0.5">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {m.address && (
                      <div className="mt-3">
                        <p className="text-xs text-white/30">Address</p>
                        <p className="text-xs text-white/60 mt-0.5">
                          {m.address}
                        </p>
                      </div>
                    )}
                    {m.emergencyContact && (
                      <div className="mt-2">
                        <p className="text-xs text-white/30">
                          Emergency Contact
                        </p>
                        <p className="text-xs text-white/60 mt-0.5">
                          {m.emergencyContact}
                        </p>
                      </div>
                    )}
                    {m.notes && (
                      <div className="mt-2 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
                        <p className="text-xs text-white/30">Admin Notes</p>
                        <p className="text-xs text-white/60 mt-0.5">
                          {m.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
              <ShoppingBag size={15} className="text-purple-400" />
              Shop Orders ({selectedUser.orders.length})
            </h3>

            {selectedUser.orders.length === 0 ? (
              <div className="bg-[#111] border border-white/5 rounded-xl p-6 text-center text-white/30 text-sm">
                No shop orders yet.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedUser.orders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-[#111] border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Order #{o.id}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          CHF {o.totalAmount.toFixed(2)}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {o.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-white/60">
                            {item.product.name}
                          </span>
                          <span className="text-white/40">
                            {item.quantity} × CHF {item.unitPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {o.notes && (
                      <div className="mt-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
                        <p className="text-xs text-white/30">Admin Notes</p>
                        <p className="text-xs text-white/60 mt-0.5">
                          {o.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
