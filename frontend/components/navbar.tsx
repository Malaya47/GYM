"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loginUser,
  logout,
  clearError,
  openLoginModal,
  closeLoginModal,
  openRegistrationModal,
} from "@/store/slices/authSlice";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading, error, loginModalOpen } = useAppSelector(
    (s) => s.auth,
  );

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/membership", label: "Membership" },
    { href: "/shop", label: "Shop" },
    { href: "/events", label: "Events" },
    { href: "/gallery", label: "Gallery" },
    { href: "/blog", label: "Blog" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleNav = (href: string) => {
    if (href !== "#") router.push(href);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(loginUser(loginForm));
    if (loginUser.fulfilled.match(result)) {
      dispatch(closeLoginModal());
      setLoginForm({ email: "", password: "" });
    }
  };

  const handleLoginOpenChange = (val: boolean) => {
    if (val) {
      dispatch(openLoginModal());
    } else {
      dispatch(closeLoginModal());
      setLoginForm({ email: "", password: "" });
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[9999] bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Nav Links */}
            <div className="hidden md:flex items-stretch gap-6 self-stretch">
              {navLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => handleNav(link.href)}
                  className={`h-full flex items-center text-sm transition-colors cursor-pointer select-none px-2 ${
                    isActive(link.href)
                      ? "text-red-500 font-medium"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <img
                  src="/gym-logo.png"
                  alt="Gym Logo"
                  className="h-12 w-auto"
                />
              </Link>
            </div>

            {/* Right Nav Links */}
            <div className="hidden md:flex items-stretch gap-6 self-stretch">
              {navLinks.slice(3).map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => handleNav(link.href)}
                  className={`h-full flex items-center text-sm transition-colors cursor-pointer select-none px-2 ${
                    isActive(link.href)
                      ? "text-red-500 font-medium"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <div className="self-center flex items-center gap-3">
                  <span className="text-white/80 text-sm flex items-center gap-1">
                    <User size={14} /> {user.firstName} {user.lastName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white px-2"
                    onClick={() => dispatch(logout())}
                  >
                    <LogOut size={14} />
                  </Button>
                </div>
              ) : (
                <Button
                  className="self-center btn-gradient hover:bg-red-700 text-white text-sm px-4 cursor-pointer"
                  onClick={() => dispatch(openLoginModal())}
                >
                  Member Login
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-white"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden bg-[#0a0a0a] border-t border-white/10 transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen
              ? "max-h-[600px] opacity-100"
              : "max-h-0 opacity-0 pointer-events-none"
          }`}
          style={{ willChange: "max-height, opacity" }}
        >
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`block text-sm cursor-pointer py-2 px-1 ${
                  isActive(link.href)
                    ? "text-red-500"
                    : "text-white/80 hover:text-white"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center justify-between mt-4">
                <span className="text-white/80 text-sm">
                  {user.firstName} {user.lastName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60"
                  onClick={() => dispatch(logout())}
                >
                  <LogOut size={14} />
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white text-sm mt-4"
                onClick={() => {
                  setIsOpen(false);
                  dispatch(openLoginModal());
                }}
              >
                Member Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Login Dialog */}
      <Dialog open={loginModalOpen} onOpenChange={handleLoginOpenChange}>
        <DialogContent
          className="max-w-sm w-full bg-[#08010a]"
          style={{ border: "2px solid #733EA6" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              Member Login
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLoginSubmit} className="space-y-4 mt-2">
            {error && (
              <div className="bg-red-900/40 border border-red-500 text-red-300 text-sm rounded px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="login-email" className="text-white mb-1 block">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
                required
                className="bg-[#18181b] text-white border-white/10"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="login-password" className="text-white mb-1 block">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                required
                className="bg-[#18181b] text-white border-white/10"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient hover:bg-red-700 text-white"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
            <p className="text-center text-white/50 text-xs">
              New member?{" "}
              <button
                type="button"
                className="text-red-400 hover:underline"
                onClick={() => {
                  dispatch(closeLoginModal());
                  if (pathname !== "/") router.push("/");
                  dispatch(openRegistrationModal());
                }}
              >
                Fill the registration form on the homepage
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
