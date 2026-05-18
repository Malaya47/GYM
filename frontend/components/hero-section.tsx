"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearError,
  openRegistrationModal,
  closeRegistrationModal,
} from "@/store/slices/authSlice";
import { SiteText, getImageUrl } from "@/lib/content";
import { StepperRegistrationForm } from "@/components/stepper-registration-form";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const DEFAULTS: SiteText = {
  hero_title: "FITNESS\nGOALS",
  hero_subtitle1: "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
  hero_subtitle2: "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
  hero_button_text: "Fill Form",
  hero_image:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/anastase-maragos-ehQimz6-1qM-unsplash%201-GdqLOCVXElCrEmbSonGZfnAdIqozNH.png",
};

export function HeroSection() {
  const dispatch = useAppDispatch();
  const { registrationModalOpen } = useAppSelector((s) => s.auth);
  const [text, setText] = useState<SiteText>(DEFAULTS);

  useEffect(() => {
    fetch(`${API}/content/text/hero`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setText((prev) => ({ ...prev, ...data })))
      .catch(() => {});
  }, []);

  // Reopen the registration modal when the user returns from the contract page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const contractResult = sessionStorage.getItem("gymContractResult");
    if (contractResult) {
      dispatch(openRegistrationModal());
    }
  }, [dispatch]);

  const handleOpenChange = (val: boolean) => {
    if (val) {
      dispatch(openRegistrationModal());
    } else {
      dispatch(closeRegistrationModal());
      dispatch(clearError());
    }
  };

  const heroImage = getImageUrl(text.hero_image) || DEFAULTS.hero_image;
  const titleLines = (text.hero_title || DEFAULTS.hero_title).split("\n");

  return (
    <section className="relative md:min-h-screen flex items-start md:items-center overflow-hidden">
      {/* Blur overlay when dialog is open */}
      {registrationModalOpen && (
        <div
          className="fixed inset-0 z-30 backdrop-blur-sm transition-all duration-300"
          style={{ pointerEvents: "none" }}
        />
      )}
      {/* Right-side man image — full-width on mobile, right 65% on desktop */}
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-[65%]">
        <Image
          src={heroImage}
          alt="Fitness background"
          fill
          className="object-cover object-[70%_center] md:object-center"
          priority
        />
        {/* Dark veil — stronger on mobile for text readability */}
        <div className="absolute inset-0 bg-black/60 md:bg-black/30" />
        {/* Left-side fade: image blends into dark background (desktop only) */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(to right, #08010a 0%, rgba(8,1,10,0.6) 20%, transparent 50%)",
          }}
        />
        {/* Top/bottom vignette matching the photo's natural darkening */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.65) 100%)",
          }}
        />
      </div>

      {/* Solid dark background for the left text panel (desktop only) */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          background:
            "linear-gradient(to right, #08010a 0%, #08010a 38%, rgba(8,1,10,0.4) 52%, transparent 65%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 pt-24 pb-8 sm:pt-28 sm:pb-0 md:pt-0 md:pb-0">
        <div className="max-w-lg">
          <h1 className="text-[2.75rem] sm:text-[6rem] lg:text-[7.5rem] font-black text-white leading-none tracking-tight mb-3 sm:mb-6 uppercase">
            {titleLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < titleLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="text-white/75 text-sm leading-snug mb-2 sm:mb-4 text-justify">
            {text.hero_subtitle1 || DEFAULTS.hero_subtitle1}
          </p>
          <p className="text-white/75 text-sm leading-snug mb-4 sm:mb-8 text-justify">
            {text.hero_subtitle2 || DEFAULTS.hero_subtitle2}
          </p>
          <Button
            className="bg-[#7a1a1a] hover:bg-[#8f1f1f] text-white px-7 py-5 text-sm font-semibold rounded-sm cursor-pointer"
            onClick={() => dispatch(openRegistrationModal())}
          >
            {text.hero_button_text || "Fill Form"}
          </Button>

          <Dialog open={registrationModalOpen} onOpenChange={handleOpenChange}>
            <DialogContent
              className="max-h-[80vh] w-[94vw] !max-w-[1220px] overflow-y-auto bg-[#08010a] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.75)] sm:!max-w-[1220px] sm:p-6 lg:w-[88vw]"
              style={{
                border: "2px solid #733EA6",
              }}
            >
              <StepperRegistrationForm
                onComplete={() => dispatch(closeRegistrationModal())}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
}
