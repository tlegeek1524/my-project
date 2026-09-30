"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, Trash2, X, Calendar, Wallet, AlertCircle } from "lucide-react";

interface RecordItem {
  id: string;
  name: string;
  principal: number; // เงินต้น
  interestRate: number; // % ดอกเบี้ย
  interestType: "per_month" | "total"; // % ต่อเดือน หรือ % รวมทั้งหมด
  totalMonths: number; // จำนวนเดือน
  day: number; // จ่ายทุกวันที่
  paidMonths: number; // จ่ายแล้วกี่งวด
  monthlyInstallment: number; // ยอดจ่ายต่องวด
  totalAmount: number; // เงินต้น + ดอกเบี้ย
}

interface FormErrors {
  name?: string;
  principal?: string;
  interestRate?: string;
  totalMonths?: string;
  day?: string;
}

const STORAGE_KEY = "mobile_loan_records_v3";

export default function MobilePaymentApp() {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Swipe-to-delete states
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const [activeSwipingId, setActiveSwipingId] = useState<string | null>(null);

  // Auto-delete state for completed items
  const [finishingId, setFinishingId] = useState<string | null>(null);

  const DELETE_BTN_WIDTH = 80; // ความกว้างปุ่มลบ
  const SWIPE_LOCK_THRESHOLD = 70; // ต้องเลื่อนจนสุด (อย่างน้อย 70px) ถ้าไม่ถึงจะเด้งกลับทันที

  // Form State
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestType, setInterestType] = useState<"per_month" | "total">("per_month");
  const [totalMonths, setTotalMonths] = useState("6");
  const [day, setDay] = useState("5");

  // Validation Errors State
  const [errors, setErrors] = useState<FormErrors>({});

  // Load saved data (start clean with no sample data)
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setItems(JSON.parse(data));
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  // Helper to format currency
  const formatMoney = (val: number) =>
    val.toLocaleString("th-TH", {
      minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    });

  // Live calculation for the form
  const numPrincipal = parseFloat(principal) || 0;
  const numRate = interestRate.trim() === "" ? 0 : parseFloat(interestRate) || 0;
  const numMonths = parseInt(totalMonths, 10) || 1;

  let calculatedInterest = 0;
  if (interestType === "per_month") {
    calculatedInterest = numPrincipal * (numRate / 100) * numMonths;
  } else {
    calculatedInterest = numPrincipal * (numRate / 100);
  }

  calculatedInterest = Math.round(calculatedInterest * 100) / 100;
  const calculatedTotal = Math.round((numPrincipal + calculatedInterest) * 100) / 100;
  const calculatedMonthly =
    numMonths > 0 ? Math.round((calculatedTotal / numMonths) * 100) / 100 : 0;

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "กรุณากรอกชื่อคน";
    } else if (name.trim().length < 2) {
      newErrors.name = "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร";
    }

    if (!principal.trim()) {
      newErrors.principal = "กรุณากรอกยอดเงินต้น";
    } else {
      const p = parseFloat(principal);
      if (isNaN(p) || p <= 0) {
        newErrors.principal = "เงินต้นต้องเป็นตัวเลขมากกว่า 0 บาท";
      }
    }

    if (interestRate.trim() !== "") {
      const rate = parseFloat(interestRate);
      if (isNaN(rate) || rate < 0) {
        newErrors.interestRate = "อัตราดอกเบี้ยต้องไม่ติดลบ";
      } else if (rate > 100) {
        newErrors.interestRate = "อัตราดอกเบี้ยไม่ควรเกิน 100%";
      }
    }

    if (!totalMonths.trim()) {
      newErrors.totalMonths = "กรุณาระบุจำนวนเดือน";
    } else {
      const m = Number(totalMonths);
      if (isNaN(m) || m < 1 || !Number.isInteger(m)) {
        newErrors.totalMonths = "ต้องเป็นจำนวนเต็มอย่างน้อย 1 เดือน";
      } else if (m > 360) {
        newErrors.totalMonths = "สูงสุดไม่เกิน 360 เดือน";
      }
    }

    if (!day.trim()) {
      newErrors.day = "กรุณาระบุวันที่ชำระ";
    } else {
      const d = Number(day);
      if (isNaN(d) || d < 1 || d > 31 || !Number.isInteger(d)) {
        newErrors.day = "วันที่ต้องอยู่ระหว่าง 1 ถึง 31";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add Item
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newItem: RecordItem = {
      id: Date.now().toString(),
      name: name.trim(),
      principal: numPrincipal,
      interestRate: numRate,
      interestType,
      totalMonths: numMonths,
      day: parseInt(day, 10) || 1,
      paidMonths: 0,
      monthlyInstallment: calculatedMonthly,
      totalAmount: calculatedTotal,
    };

    setItems([newItem, ...items]);
    setName("");
    setPrincipal("");
    setInterestRate("");
    setInterestType("per_month");
    setTotalMonths("6");
    setDay("5");
    setErrors({});
    setShowAddModal(false);
  };

  // Mark 1 Month Paid (เมื่อจ่ายครบแล้วจะลบไปเองอัตโนมัติ)
  const handlePayMonth = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const nextPaidMonths = target.paidMonths + 1;

    if (nextPaidMonths >= target.totalMonths) {
      // 1. อัปเดตสถานะเป็นจ่ายครบ
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, paidMonths: item.totalMonths } : item
        )
      );
      setFinishingId(id);

      // 2. เมื่อจ่ายครบแล้ว ลบออกจากระบบอัตโนมัติอย่างนุ่มนวล
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setFinishingId(null);
      }, 600);
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, paidMonths: nextPaidMonths } : item
        )
      );
    }
  };

  // Delete
  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSwipedId(null);
  };

  // Swipe Touch Handlers (ต้องเลื่อนจนสุด ถ้าไม่สุดจะเด้งกลับ)
  const handleTouchStart = (id: string, clientX: number) => {
    setTouchStartX(clientX);
    setActiveSwipingId(id);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (id: string, clientX: number) => {
    if (touchStartX === null || activeSwipingId !== id) return;
    const diff = clientX - touchStartX;

    if (swipedId === id) {
      // Already open at -80px
      const newOffset = Math.min(0, Math.max(-DELETE_BTN_WIDTH, -DELETE_BTN_WIDTH + diff));
      setTouchDeltaX(newOffset - (-DELETE_BTN_WIDTH));
    } else {
      // Swiping to the left
      if (diff < 0) {
        setTouchDeltaX(Math.max(-DELETE_BTN_WIDTH, diff));
      } else {
        setTouchDeltaX(0);
      }
    }
  };

  const handleTouchEnd = (id: string) => {
    if (activeSwipingId !== id) return;

    if (swipedId === id) {
      if (touchDeltaX > 25) {
        setSwipedId(null);
      }
    } else {
      // ต้องเลื่อนจนสุด (แตะขีด SWIPE_LOCK_THRESHOLD) ถ้าไม่สุดจะเด้งกลับทันที!
      if (touchDeltaX <= -SWIPE_LOCK_THRESHOLD) {
        setSwipedId(id);
      } else {
        setSwipedId(null); // เด้งกลับ
      }
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
    setActiveSwipingId(null);
  };

  if (!isLoaded) return null;

  // Monthly active total
  const ongoingItems = items.filter((i) => i.paidMonths < i.totalMonths);
  const monthlyTotal = ongoingItems.reduce((sum, i) => sum + i.monthlyInstallment, 0);

  // Diff totals: ยอดรวมทั้งหมดที่จะได้ vs ยอดเงินที่คืนมาแล้ว
  const totalExpectedAmount = items.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalReturnedAmount = items.reduce(
    (sum, i) => sum + i.paidMonths * i.monthlyInstallment,
    0
  );
  const totalRemainingAmount = Math.max(0, totalExpectedAmount - totalReturnedAmount);
  const returnPercent =
    totalExpectedAmount > 0
      ? Math.min(100, Math.round((totalReturnedAmount / totalExpectedAmount) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-800 font-sans antialiased">
      {/* Mobile Screen Container */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-lg relative pb-24">
        {/* Header */}
        <header className="p-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-600" />
              จดบันทึกเงินกู้/ค่างวด
            </h1>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
              {items.length} รายการ
            </span>
          </div>

          {/* Quick Summary Card with Diff Progress Bar */}
          <div className="mt-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-blue-100 font-light">ยอดเก็บเดือนนี้</p>
                <p className="text-2xl font-bold mt-0.5">
                  ฿{formatMoney(monthlyTotal)}{" "}
                  <span className="text-xs font-normal opacity-80">/เดือน</span>
                </p>
              </div>
              {totalExpectedAmount > 0 && (
                <div className="text-right">
                  <span className="text-[11px] bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full font-medium">
                    คืนแล้ว {returnPercent}%
                  </span>
                </div>
              )}
            </div>

            {/* หลอด Diff ความคืบหน้ายอดเงิน: คืนมาแล้ว vs ทั้งหมดที่จะได้ */}
            {totalExpectedAmount > 0 && (
              <div className="mt-3 pt-3 border-t border-white/15">
                <div className="flex justify-between items-baseline text-xs mb-1.5 font-light">
                  <span>
                    คืนมาแล้ว:{" "}
                    <strong className="font-semibold text-emerald-300">
                      ฿{formatMoney(totalReturnedAmount)}
                    </strong>
                  </span>
                  <span className="text-blue-100/90 text-[11px]">
                    ทั้งหมดที่จะได้:{" "}
                    <strong className="font-semibold text-white">
                      ฿{formatMoney(totalExpectedAmount)}
                    </strong>
                  </span>
                </div>

                {/* หลอด Progress Bar */}
                <div className="w-full bg-black/25 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${returnPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-blue-100/80 mt-1.5 font-light">
                  <span>ค้างรับอีก: ฿{formatMoney(totalRemainingAmount)}</span>
                  <span>{returnPercent}%</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* List of People */}
        <main className="flex-1 p-3.5 space-y-3 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-base font-medium">ยังไม่มีรายการบันทึก</p>
              <p className="text-xs mt-1 text-slate-400">
                กดปุ่ม "+ เพิ่มคน / รายการใหม่" ด้านล่างเพื่อเริ่มจด
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isDone = item.paidMonths >= item.totalMonths;
              const isFinishing = finishingId === item.id;
              const remainingMonths = item.totalMonths - item.paidMonths;
              const remainingAmount = remainingMonths * item.monthlyInstallment;

              const isSwiped = swipedId === item.id;
              const isActivelySwiping = activeSwipingId === item.id;
              const currentOffset = isActivelySwiping
                ? (isSwiped ? -DELETE_BTN_WIDTH + touchDeltaX : touchDeltaX)
                : (isSwiped ? -DELETE_BTN_WIDTH : 0);

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden rounded-2xl select-none transition-all duration-500 ${
                    isFinishing ? "opacity-0 scale-95 max-h-0 my-0 py-0" : ""
                  }`}
                >
                  {/* Background Red Delete Button (Revealed on Swipe Left) */}
                  <div className="absolute inset-y-0 right-0 w-[80px] bg-red-500 flex flex-col items-center justify-center text-white rounded-r-2xl z-0 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="w-full h-full flex flex-col items-center justify-center gap-1 text-white font-medium text-xs active:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2.2]" />
                      <span>ลบ</span>
                    </button>
                  </div>

                  {/* Foreground Swipeable Card */}
                  <div
                    style={{ transform: `translateX(${currentOffset}px)` }}
                    onTouchStart={(e) => handleTouchStart(item.id, e.touches[0].clientX)}
                    onTouchMove={(e) => handleTouchMove(item.id, e.touches[0].clientX)}
                    onTouchEnd={() => handleTouchEnd(item.id)}
                    onMouseDown={(e) => handleTouchStart(item.id, e.clientX)}
                    onMouseMove={(e) => {
                      if (activeSwipingId === item.id) {
                        handleTouchMove(item.id, e.clientX);
                      }
                    }}
                    onMouseUp={() => handleTouchEnd(item.id)}
                    onClick={() => {
                      if (isSwiped) setSwipedId(null);
                    }}
                    className={`relative z-10 p-3.5 rounded-2xl border ${
                      isActivelySwiping
                        ? "transition-none"
                        : "transition-transform duration-300 ease-out"
                    } ${
                      isDone || isFinishing
                        ? "bg-emerald-50/60 border-emerald-300 shadow-sm"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    {/* Row 1: Name & Monthly Installment */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900 leading-tight">
                            {item.name}
                          </h2>
                          {isDone ? (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                              ครบแล้ว ✅
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                              เหลือ {remainingMonths} ด.
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-light">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          จ่ายทุกวันที่ <strong className="text-slate-700 font-medium">{item.day}</strong> ของเดือน
                        </p>
                      </div>

                      <div className="text-right shrink-0 whitespace-nowrap pt-0.5">
                        <span className="text-base sm:text-lg font-bold text-blue-600">
                          ฿{formatMoney(item.monthlyInstallment)}
                        </span>
                        <span className="text-xs text-slate-400 font-normal ml-1">/งวด</span>
                      </div>
                    </div>

                    {/* Row 2: Loan Breakdown (Clean 3-Column Grid Layout) */}
                    <div className="mt-3 bg-slate-50/90 p-2 rounded-xl grid grid-cols-3 gap-1 text-center text-xs border border-slate-100">
                      <div className="border-r border-slate-200/70 pr-1">
                        <span className="text-[11px] text-slate-400 block font-light">เงินต้น</span>
                        <strong className="text-slate-800 text-xs font-semibold">
                          ฿{formatMoney(item.principal)}
                        </strong>
                      </div>
                      <div className="border-r border-slate-200/70 px-1">
                        <span className="text-[11px] text-slate-400 block font-light">ดอกเบี้ย</span>
                        {item.interestRate > 0 ? (
                          <span className="text-amber-700 font-medium text-xs">
                            {item.interestRate}% <span className="text-[10px]">{item.interestType === "per_month" ? "/ด." : "รวม"}</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-xs">0%</span>
                        )}
                      </div>
                      <div className="pl-1">
                        <span className="text-[11px] text-slate-400 block font-light">ยอดรวม</span>
                        <strong className="text-slate-900 text-xs font-semibold">
                          ฿{formatMoney(item.totalAmount)}
                        </strong>
                      </div>
                    </div>

                    {/* Row 3: Status & Progress (2-Column Grid / Flex) */}
                    <div className="mt-2.5 pt-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500">จ่ายแล้ว: </span>
                        <strong className="text-slate-900 font-semibold">
                          {item.paidMonths}/{item.totalMonths} เดือน
                        </strong>
                      </div>
                      <div>
                        {!isDone ? (
                          <span className="text-amber-700 font-medium text-xs">
                            ค้าง ฿{formatMoney(remainingAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-xs">
                            ชำระเสร็จสิ้น
                          </span>
                        )}
                      </div>
                    </div>

                    {/* หลอด Diff ความคืบหน้าของแต่ละคน */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((item.paidMonths / item.totalMonths) * 100))}%`,
                        }}
                      />
                    </div>

                    {/* Row 4: Action Button (Full Width Clean Green Button) */}
                    <div className="mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayMonth(item.id);
                        }}
                        disabled={isDone || isFinishing}
                        className={`w-full py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all ${
                          isDone || isFinishing
                            ? "bg-emerald-600 text-white shadow-sm cursor-not-allowed opacity-90"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {isDone || isFinishing ? "ชำระครบแล้ว! กำลังนำออก... ✅" : "จ่ายแล้ว (+1 งวด)"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>

        {/* Bottom Floating Bar: "+ เพิ่มคน / รายการใหม่" */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 max-w-md mx-auto z-20">
          <button
            onClick={() => {
              setErrors({});
              setShowAddModal(true);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-base transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            เพิ่มคน / รายการใหม่
          </button>
        </div>

        {/* Modal / Popup Form */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  เพิ่มรายการเงินกู้ / ค่างวด
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdd} noValidate className="space-y-3 text-sm">
                {/* ชื่อ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ชื่อคน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น สมชาย ใจดี"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    className={`w-full p-2.5 rounded-xl text-slate-900 text-sm focus:outline-none transition-all ${
                      errors.name
                        ? "bg-red-50/50 border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                        : "bg-slate-50 border border-slate-200 focus:border-blue-500"
                    }`}
                  />
                  {errors.name && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-normal">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* เงินต้น */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ยอดเงินต้น (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="เช่น 10000"
                    value={principal}
                    onChange={(e) => {
                      setPrincipal(e.target.value);
                      if (errors.principal) setErrors((prev) => ({ ...prev, principal: undefined }));
                    }}
                    className={`w-full p-2.5 rounded-xl text-slate-900 text-sm focus:outline-none transition-all ${
                      errors.principal
                        ? "bg-red-50/50 border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                        : "bg-slate-50 border border-slate-200 focus:border-blue-500"
                    }`}
                  />
                  {errors.principal && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-normal">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.principal}
                    </p>
                  )}
                </div>

                {/* ดอกเบี้ย % และประเภทดอกเบี้ย */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      อัตราดอกเบี้ย (%)
                    </label>
                    <div className="flex text-[11px] bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setInterestType("per_month")}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                          interestType === "per_month"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-500"
                        }`}
                      >
                        % ต่อเดือน
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterestType("total")}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                          interestType === "total"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-500"
                        }`}
                      >
                        % รวมทั้งสัญญา
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="0 (ไม่ใส่ = ไม่มีดอกเบี้ย)"
                    value={interestRate}
                    onChange={(e) => {
                      setInterestRate(e.target.value);
                      if (errors.interestRate) setErrors((prev) => ({ ...prev, interestRate: undefined }));
                    }}
                    className={`w-full p-2.5 rounded-xl text-slate-900 text-sm focus:outline-none transition-all ${
                      errors.interestRate
                        ? "bg-red-50/50 border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                        : "bg-slate-50 border border-slate-200 focus:border-blue-500"
                    }`}
                  />
                  {errors.interestRate && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-normal">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.interestRate}
                    </p>
                  )}
                </div>

                {/* จำนวนเดือน และ วันที่จ่าย */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      จำนวนเดือนทั้งหมด <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="เช่น 10"
                      value={totalMonths}
                      onChange={(e) => {
                        setTotalMonths(e.target.value);
                        if (errors.totalMonths) setErrors((prev) => ({ ...prev, totalMonths: undefined }));
                      }}
                      className={`w-full p-2.5 rounded-xl text-slate-900 text-sm focus:outline-none transition-all ${
                        errors.totalMonths
                          ? "bg-red-50/50 border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                          : "bg-slate-50 border border-slate-200 focus:border-blue-500"
                      }`}
                    />
                    {errors.totalMonths && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-normal">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.totalMonths}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      จ่ายทุกวันที่ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="1 - 31"
                      value={day}
                      onChange={(e) => {
                        setDay(e.target.value);
                        if (errors.day) setErrors((prev) => ({ ...prev, day: undefined }));
                      }}
                      className={`w-full p-2.5 rounded-xl text-slate-900 text-sm focus:outline-none transition-all ${
                        errors.day
                          ? "bg-red-50/50 border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                          : "bg-slate-50 border border-slate-200 focus:border-blue-500"
                      }`}
                    />
                    {errors.day && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-normal">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.day}
                      </p>
                    )}
                  </div>
                </div>

                {/* สรุปคำนวณอัตโนมัติ (Live Preview) */}
                {numPrincipal > 0 && (
                  <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 text-xs space-y-1.5 text-blue-900">
                    <div className="flex justify-between">
                      <span className="text-blue-700">ดอกเบี้ย:</span>
                      {numRate > 0 ? (
                        <strong className="text-blue-800">
                          {numRate}% {interestType === "per_month" ? "/เดือน" : "รวม"} (+฿{formatMoney(calculatedInterest)})
                        </strong>
                      ) : (
                        <span className="text-emerald-700 font-medium">
                          ไม่มีดอกเบี้ย (0%)
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">ยอดรวมทั้งสิ้น:</span>
                      <strong className="text-blue-800">฿{formatMoney(calculatedTotal)}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-blue-200/60 text-sm font-bold text-blue-900">
                      <span>ยอดที่ต้องจ่ายต่องวด:</span>
                      <span className="text-blue-600">฿{formatMoney(calculatedMonthly)} /เดือน</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-1/3 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md active:scale-98"
                  >
                    บันทึกรายการ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
