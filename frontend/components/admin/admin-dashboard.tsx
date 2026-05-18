"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminMemberships,
  fetchAdminOrders,
} from "@/store/slices/adminSlice";
import {
  Users,
  CreditCard,
  ShoppingBag,
  Clock,
  CheckCircle,
} from "lucide-react";

export function AdminDashboard() {
  const dispatch = useAppDispatch();
  const { stats, users, memberships, orders } = useAppSelector((s) => s.admin);

  useEffect(() => {
    dispatch(fetchAdminStats());
    dispatch(fetchAdminUsers());
    dispatch(fetchAdminMemberships(undefined));
    dispatch(fetchAdminOrders(undefined));
  }, [dispatch]);

  const statCards = [
    {
      label: "Total Customers",
      value: stats?.totalUsers ?? 0,
      icon: <Users size={20} />,
      color: "blue",
    },
    {
      label: "Pending Memberships",
      value: stats?.pendingMemberships ?? 0,
      icon: <Clock size={20} />,
      color: "yellow",
    },
    {
      label: "Approved Memberships",
      value: stats?.approvedMemberships ?? 0,
      icon: <CreditCard size={20} />,
      color: "green",
    },
    {
      label: "Pending Orders",
      value: stats?.pendingOrders ?? 0,
      icon: <ShoppingBag size={20} />,
      color: "red",
    },
    {
      label: "Approved Orders",
      value: stats?.approvedOrders ?? 0,
      icon: <CheckCircle size={20} />,
      color: "purple",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  };

  const recentUsers = [...users].slice(0, 5);
  const pendingMemberships = memberships
    .filter((m) => m.status === "PENDING")
    .slice(0, 5);
  const pendingOrders = orders
    .filter((o) => o.status === "PENDING")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 ${colorMap[card.color]}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span>{card.icon}</span>
              <span className="text-3xl font-bold text-white">
                {card.value}
              </span>
            </div>
            <p className="text-sm opacity-70">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Customers */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
            Recent Customers
          </h3>
          {recentUsers.length === 0 ? (
            <p className="text-white/30 text-sm">No customers yet</p>
          ) : (
            <ul className="space-y-3">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                    {u.firstName[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-white/30 truncate">{u.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending Memberships */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
            Pending Memberships
          </h3>
          {pendingMemberships.length === 0 ? (
            <p className="text-white/30 text-sm">No pending requests</p>
          ) : (
            <ul className="space-y-3">
              {pendingMemberships.map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5">
                  <p className="text-sm text-white truncate">
                    {m.user.firstName} {m.user.lastName}
                  </p>
                  <p className="text-xs text-white/30">
                    {m.plan.name} — {m.plan.currency} {m.plan.price}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending Orders */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wide">
            Pending Orders
          </h3>
          {pendingOrders.length === 0 ? (
            <p className="text-white/30 text-sm">No pending orders</p>
          ) : (
            <ul className="space-y-3">
              {pendingOrders.map((o) => (
                <li key={o.id} className="flex flex-col gap-0.5">
                  <p className="text-sm text-white truncate">
                    {o.user.firstName} {o.user.lastName}
                  </p>
                  <p className="text-xs text-white/30">
                    CHF {o.totalAmount.toFixed(2)} — {o.items.length} item(s)
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
