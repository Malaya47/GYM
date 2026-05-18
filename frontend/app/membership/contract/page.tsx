"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eraser, Loader2 } from "lucide-react";

type PlanInfo = {
  id: number;
  name: string;
  duration: string;
  price: number;
  currency: string;
  features: string[];
  category: string;
};

type PlanCategory = {
  id: number;
  name: string;
  label: string;
  order: number;
};

type RegState = {
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    emergencyContact: string;
    [key: string]: string;
  };
  selectedPlan: PlanInfo | null;
  selectedAdditionalPlans: PlanInfo[];
  plans: PlanInfo[];
  membershipStartDate: string;
  membershipEndDate: string;
  paymentFrequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  currency: string;
  registrationFee: number;
  discountAmount: number;
  discountLabel: string;
  total: number;
  planCategories: PlanCategory[];
  contractNumber: string;
  customerNumber: string;
  isMinor: boolean;
  selectedPlanId: number | null;
};

function money(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function planTitle(plan: PlanInfo) {
  return plan.name || plan.duration;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ContractField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-sm">
      <span className="text-gray-600 shrink-0 font-medium">{label}:</span>
      <span className="font-semibold text-gray-900 break-all">{value}</span>
    </div>
  );
}

export default function MembershipContractPage() {
  const router = useRouter();
  const [state, setState] = useState<RegState | null>(null);
  const [contractMemberSig, setContractMemberSig] = useState("");
  const [guardianSig, setGuardianSig] = useState("");
  const contractCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guardianCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contractDrawingRef = useRef(false);
  const guardianDrawingRef = useRef(false);
  const [error, setError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const contractDocRef = useRef<HTMLDivElement | null>(null);

  // Load state from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("gymRegState");
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setState(JSON.parse(raw));
    } catch {
      router.replace("/");
    }
  }, [router]);

  // Init member signature canvas
  useEffect(() => {
    if (!state || contractMemberSig) return;
    const t = setTimeout(() => {
      const canvas = contractCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
    }, 150);
    return () => clearTimeout(t);
  }, [state, contractMemberSig]);

  function contractPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = contractCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function beginContractDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = contractCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = contractPoint(event);
    contractDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function drawContractSig(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!contractDrawingRef.current) return;
    const ctx = contractCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = contractPoint(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    // Reset path so each segment is drawn independently (smooth incremental strokes)
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function endContractDraw() {
    if (!contractDrawingRef.current) return;
    contractDrawingRef.current = false;
    const dataUrl = contractCanvasRef.current?.toDataURL("image/png") || "";
    if (dataUrl) setContractMemberSig(dataUrl);
  }

  function clearContractSig() {
    const canvas = contractCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setContractMemberSig("");
  }

  function beginGuardianDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = guardianCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    guardianDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }

  function drawGuardianSig(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!guardianDrawingRef.current) return;
    const canvas = guardianCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function endGuardianDraw() {
    if (!guardianDrawingRef.current) return;
    guardianDrawingRef.current = false;
    const dataUrl = guardianCanvasRef.current?.toDataURL("image/png") || "";
    if (dataUrl) setGuardianSig(dataUrl);
  }

  function clearGuardianSig() {
    const canvas = guardianCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setGuardianSig("");
  }

  async function acceptContract() {
    setError("");
    if (!contractMemberSig) {
      setError("Please draw your member signature to proceed.");
      return;
    }
    setCapturing(true);
    try {
      let capturedPdfDataUri: string | undefined;
      if (contractDocRef.current) {
        const { default: html2canvas } = await import("html2canvas");
        const { default: jsPDF } = await import("jspdf");

        // Tailwind v4 uses oklch()/lab() colors that html2canvas v1.4.x can't parse.
        // Use a 1x1 canvas to convert any unsupported color to sRGB hex/rgba.
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 1;
        tempCanvas.height = 1;
        const colorCtx = tempCanvas.getContext("2d");
        function toSafeColor(val: string): string {
          if (!colorCtx) return "#000000";
          colorCtx.clearRect(0, 0, 1, 1);
          try {
            colorCtx.fillStyle = val;
            return colorCtx.fillStyle;
          } catch {
            return "#000000";
          }
        }

        const el = contractDocRef.current;
        // Capture the FULL element height (not just the visible viewport portion)
        const fullWidth = el.scrollWidth;
        const fullHeight = el.scrollHeight;

        const fullCanvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          // Force html2canvas to render the entire element, not just the visible area
          width: fullWidth,
          height: fullHeight,
          scrollX: 0,
          scrollY: 0,
          windowWidth: fullWidth,
          windowHeight: fullHeight,
          onclone: (_clonedDoc, clonedEl) => {
            // Hide UI-only elements (buttons) that shouldn't appear in the PDF
            clonedEl
              .querySelectorAll<HTMLElement>("[data-pdf-exclude]")
              .forEach((el) => (el.style.display = "none"));
            // Remove overflow-hidden so all sections render fully in the clone
            clonedEl.style.overflow = "visible";
            clonedEl.style.height = "auto";
            // Convert oklch/lab computed colors to plain sRGB
            const colorProps = [
              "color",
              "background-color",
              "border-top-color",
              "border-right-color",
              "border-bottom-color",
              "border-left-color",
              "outline-color",
            ];
            const all = [
              clonedEl,
              ...Array.from(clonedEl.querySelectorAll<HTMLElement>("*")),
            ];
            all.forEach((el) => {
              const cs = window.getComputedStyle(el);
              colorProps.forEach((prop) => {
                const val = cs.getPropertyValue(prop);
                if (val && (val.includes("oklch") || val.includes("lab("))) {
                  el.style.setProperty(prop, toSafeColor(val), "important");
                }
              });
            });
          },
        });

        // Build a multi-page A4 PDF by slicing the full canvas into page-sized chunks
        const A4_WIDTH_PT = 595.28;
        const A4_HEIGHT_PT = 841.89;

        // How many canvas pixels (at scale 2) correspond to one A4 page height
        const pixelsPerPageH = Math.ceil(
          (A4_HEIGHT_PT / A4_WIDTH_PT) * fullCanvas.width,
        );

        const pdf = new jsPDF({
          format: "a4",
          unit: "pt",
          orientation: "portrait",
        });

        let yStart = 0;
        let pageNum = 0;
        while (yStart < fullCanvas.height) {
          if (pageNum > 0) pdf.addPage();

          // Slice the canvas vertically for this page
          const sliceH = Math.min(pixelsPerPageH, fullCanvas.height - yStart);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = fullCanvas.width;
          pageCanvas.height = pixelsPerPageH; // always full page height (remainder is white)
          const ctx = pageCanvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            fullCanvas,
            0,
            yStart,
            fullCanvas.width,
            sliceH,
            0,
            0,
            fullCanvas.width,
            sliceH,
          );

          pdf.addImage(
            pageCanvas.toDataURL("image/jpeg", 0.85),
            "JPEG",
            0,
            0,
            A4_WIDTH_PT,
            A4_HEIGHT_PT,
          );

          yStart += pixelsPerPageH;
          pageNum++;
        }

        capturedPdfDataUri = pdf.output("datauristring");
      }

      // Store in window — no size limit, persists across client-side navigation
      if (capturedPdfDataUri) {
        (window as unknown as Record<string, unknown>).__gymContractPdf =
          capturedPdfDataUri;
      }
      sessionStorage.setItem(
        "gymContractResult",
        JSON.stringify({
          contractAccepted: true,
          contractMemberSig,
          guardianSig,
        }),
      );
    } catch (e) {
      console.error("Contract capture error:", e);
      sessionStorage.setItem(
        "gymContractResult",
        JSON.stringify({
          contractAccepted: true,
          contractMemberSig,
          guardianSig,
        }),
      );
    } finally {
      setCapturing(false);
      router.back();
    }
  }

  function cancelContract() {
    sessionStorage.setItem(
      "gymContractResult",
      JSON.stringify({ contractAccepted: false }),
    );
    router.back();
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-[#08010a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  const {
    form,
    selectedPlan,
    selectedAdditionalPlans,
    plans,
    membershipStartDate,
    membershipEndDate,
    paymentFrequency,
    currency,
    registrationFee,
    discountAmount,
    discountLabel,
    total,
    planCategories,
    contractNumber,
    customerNumber,
    isMinor,
    selectedPlanId,
  } = state;

  return (
    <div className="min-h-screen bg-[#08010a] py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/gym-logo.png"
            alt="Gym Logo"
            width={120}
            height={120}
            className="object-contain"
          />
        </div>

        {/* Back button */}
        <button
          type="button"
          onClick={cancelContract}
          className="mb-4 text-white/60 hover:text-white text-sm flex items-center gap-2 transition-colors"
        >
          ← Back to Registration
        </button>

        {/* Contract Document */}
        <div
          ref={contractDocRef}
          className="bg-white rounded-lg overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-[#100a0a] text-white px-5 py-4 flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-[130px]">
              <p className="text-base font-black tracking-widest text-red-500">
                SENTINATORS
              </p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">
                Keep Pumping Gym
              </p>
            </div>
            <div className="flex-1 text-center min-w-[150px]">
              <p className="text-sm font-black tracking-wide uppercase">
                Fitness Membership Contract
              </p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                Membership Agreement
              </p>
            </div>
            <div className="text-right text-xs space-y-1 min-w-[160px]">
              <div className="flex items-center justify-end gap-2">
                <span className="text-white/50">Contract Number:</span>
                <span className="font-mono font-bold">{contractNumber}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-white/50">Customer Number:</span>
                <span className="font-mono font-bold">{customerNumber}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-white/50">Date:</span>
                <span className="font-semibold">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 text-gray-900">
            {/* Sections 1 & 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                  1. Member Details
                </div>
                <div className="p-3 space-y-2">
                  <ContractField
                    label="First Name / Surname"
                    value={`${form.firstName} ${form.lastName}`.trim() || "-"}
                  />
                  <ContractField
                    label="Date of Birth"
                    value={
                      form.dateOfBirth ? formatDate(form.dateOfBirth) : "-"
                    }
                  />
                  <ContractField label="Address" value={form.address || "-"} />
                  <ContractField label="Telephone" value={form.phone || "-"} />
                  <ContractField label="E-Mail" value={form.email || "-"} />
                  <ContractField
                    label="Emergency Contact"
                    value={form.emergencyContact || "-"}
                  />
                </div>
              </div>

              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                  2. Subscription Selection
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-y-2 mb-3">
                    {plans.map((plan) => (
                      <label
                        key={plan.id}
                        className="flex items-center gap-1.5 cursor-default text-sm text-gray-900"
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={selectedPlanId === plan.id}
                          className="accent-red-700 w-3 h-3"
                        />
                        <span>{plan.name || plan.duration}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2 mt-1">
                    <ContractField
                      label="Start Date"
                      value={
                        membershipStartDate
                          ? formatDate(membershipStartDate)
                          : "-"
                      }
                    />
                    <ContractField
                      label="Valid until"
                      value={
                        membershipEndDate ? formatDate(membershipEndDate) : "-"
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sections 3 & 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                  3. Price Overview
                </div>
                <div className="p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">
                      {selectedPlan ? planTitle(selectedPlan) : "Plan"}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {selectedPlan ? money(currency, selectedPlan.price) : "-"}
                    </span>
                  </div>
                  {selectedAdditionalPlans.map((ap) => (
                    <div key={ap.id} className="flex justify-between">
                      <span className="text-gray-700">+ {planTitle(ap)}</span>
                      <span className="font-semibold text-gray-900">
                        {money(ap.currency, ap.price)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-gray-700">
                      Registration Fee (one-time)
                    </span>
                    <span className="font-semibold text-gray-900">
                      {money(currency, registrationFee)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-700 font-medium">
                      <span>{discountLabel}</span>
                      <span>- {money(currency, discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t-2 border-gray-300 text-gray-900">
                    <span>Total</span>
                    <span>{money(currency, total)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-3">
                    {(["MONTHLY", "QUARTERLY", "YEARLY"] as const).map((f) => (
                      <label
                        key={f}
                        className="flex items-center gap-1.5 cursor-default text-gray-900"
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={paymentFrequency === f}
                          className="accent-red-700 w-3 h-3"
                        />
                        <span>{f.charAt(0) + f.slice(1).toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                  4. Membership Category
                </div>
                <div className="p-3 space-y-2 text-sm">
                  {planCategories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-1.5 cursor-default text-gray-900"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={selectedPlan?.category === cat.name}
                        className="accent-red-700 w-3 h-3"
                      />
                      <span>{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 5: Contract Conditions */}
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                5. Contract Conditions
              </div>
              <div className="p-3">
                {[
                  {
                    title: "Term",
                    text: "The selected membership begins on the start date and runs for the agreed term. An automatic extension occurs only if no timely cancellation is made.",
                  },
                  {
                    title: "Notice Period",
                    text: "Cancellation must be declared in writing and must be received at least 4 weeks before the end of the respective term.",
                  },
                  {
                    title: "Payment Obligation",
                    text: "The membership fee is to be paid in advance according to the chosen payment method and due date. In case of late payment, we reserve the right to charge reminder fees and suspend the membership.",
                  },
                  {
                    title: "House Rules",
                    text: "The membership is subject to the house rules of the gym. These are posted in the studio and can be viewed on our website. With your signature, you acknowledge these rules.",
                  },
                  {
                    title: "Liability",
                    text: "The gym is not liable for items brought in. Use of the equipment is at your own risk. Parents are liable for their children.",
                  },
                  {
                    title: "Data Protection",
                    text: "Your data will be used exclusively for contract processing and member support. Further information can be found in our privacy policy.",
                  },
                  {
                    title: "Health Responsibility",
                    text: "With your signature, you confirm that you are healthy enough to participate in training. In case of doubt, we recommend a medical clarification.",
                  },
                ].map(({ title, text }) => (
                  <div
                    key={title}
                    className="py-2 border-b border-gray-200 last:border-0"
                  >
                    <p className="font-bold text-sm text-gray-900 mb-0.5">
                      {title}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 6: Signatures */}
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="bg-[#1a0a0a] text-white px-3 py-2 text-sm font-bold uppercase tracking-wider">
                6. Signatures
              </div>
              <div className="p-5 space-y-6">
                {/* Signature grid */}
                <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
                  {/* Place & Date */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Place / Date
                    </span>
                    <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex flex-col justify-between min-h-[110px]">
                      <p className="text-base font-bold text-gray-900">
                        {new Date().toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-auto pt-3 border-t border-gray-300">
                        Date of signing
                      </p>
                    </div>
                  </div>

                  {/* Member Signature */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Member Signature
                        {contractMemberSig ? (
                          <span className="ml-1.5 text-green-600 font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </span>
                      {contractMemberSig ? (
                        <button
                          type="button"
                          onClick={() => setContractMemberSig("")}
                          className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Eraser size={11} /> Re-sign
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={clearContractSig}
                          className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Eraser size={11} /> Clear
                        </button>
                      )}
                    </div>
                    {contractMemberSig ? (
                      <div className="rounded-lg border-2 border-green-200 bg-green-50 overflow-hidden min-h-[110px] flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={contractMemberSig}
                          alt="Member signature"
                          className="max-h-[110px] w-full object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white overflow-hidden min-h-[110px] hover:border-gray-400 transition-colors">
                        <canvas
                          ref={contractCanvasRef}
                          onPointerDown={beginContractDraw}
                          onPointerMove={drawContractSig}
                          onPointerUp={endContractDraw}
                          onPointerLeave={endContractDraw}
                          className="h-[110px] w-full touch-none cursor-crosshair"
                        />
                        <div className="absolute bottom-2 left-3 right-3 border-b border-gray-300 pointer-events-none" />
                        <p className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-gray-300 pointer-events-none select-none">
                          Sign above
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Gym Signature (3rd column — static placeholder) */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Gym Signature
                    </span>
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 min-h-[110px] flex flex-col items-center justify-center gap-1.5">
                      <p className="text-xs font-medium text-gray-400">
                        To be signed by gym staff
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gym Stamp */}
                <div className="flex flex-col gap-2 sm:max-w-xs">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Gym Stamp
                  </span>
                  <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 h-[90px] flex items-center justify-center">
                    <p className="text-xs font-medium text-gray-400">
                      Official gym stamp
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                    {error}
                  </div>
                )}

                {/* Action buttons — excluded from PDF capture via data-pdf-exclude */}
                <div
                  data-pdf-exclude
                  className="flex gap-3 justify-between items-center pt-2 border-t border-gray-100"
                >
                  <button
                    type="button"
                    onClick={cancelContract}
                    className="px-5 py-2.5 rounded-lg border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={acceptContract}
                    disabled={capturing}
                    className="px-6 py-2.5 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {capturing && (
                      <Loader2 size={15} className="animate-spin" />
                    )}
                    {capturing ? "Generating PDF…" : "Accept & Sign Contract"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
