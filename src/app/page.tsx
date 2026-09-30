"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, X, AlertCircle } from "lucide-react";

interface RecordItem {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  interestType: "per_month" | "total";
  totalMonths: number;
  day: number;
  paidMonths: number;
  monthlyInstallment: number;
  totalAmount: number;
}

interface FormErrors {
  name?: string;
  principal?: string;
  interestRate?: string;
  totalMonths?: string;
  day?: string;
}

const STORAGE_KEY = "mobile_loan_simple_records_v2";

export default function UltraMiniPaymentApp() {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestType, setInterestType] = useState<"per_month" | "total">("per_month");
  const [totalMonths, setTotalMonths] = useState("6");
  const [day, setDay] = useState("5");
  const [errors, setErrors] = useState<FormErrors>({});

  // Load saved data
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setItems(JSON.parse(data));
      } else {
        setItems([
          {
            id: "1",
            name: "สมชาย",
            principal: 10000,
            interestRate: 2,
            interestType: "per_month",
            totalMonths: 5,
            day: 5,
            paidMonths: 1,
            monthlyInstallment: 2200,
            totalAmount: 11000,
          },
        ]);
      }
    } catch {
      // fallback
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

  // Currency Formatter
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

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "กรุณากรอกชื่อคน";
    } else if (name.trim().length < 2) {
      newErrors.name = "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร";
    }

    if (!principal.trim()) {
      newErrors.principal = "กรุณากรอกเงินต้น";
    } else {
      const p = parseFloat(principal);
      if (isNaN(p) || p <= 0) {
        newErrors.principal = "ต้องมากกว่า 0 บาท";
      }
    }

    if (interestRate.trim() !== "") {
      const rate = parseFloat(interestRate);
      if (isNaN(rate) || rate < 0) {
        newErrors.interestRate = "ต้องไม่ติดลบ";
      } else if (rate > 100) {
        newErrors.interestRate = "ไม่ควรเกิน 100%";
      }
    }

    if (!totalMonths.trim()) {
      newErrors.totalMonths = "ระบุจำนวนเดือน";
    } else {
      const m = Number(totalMonths);
      if (isNaN(m) || m < 1 || !Number.isInteger(m)) {
        newErrors.totalMonths = "ต้องเป็นจำนวนเต็มอย่างน้อย 1";
      } else if (m > 360) {
        newErrors.totalMonths = "ไม่เกิน 360 เดือน";
      }
    }

    if (!day.trim()) {
      newErrors.day = "ระบุวันที่";
    } else {
      const d = Number(day);
      if (isNaN(d) || d < 1 || d > 31 || !Number.isInteger(d)) {
        newErrors.day = "วันที่ 1 - 31";
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

  // Mark 1 Month Paid
  const handlePayMonth = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id && item.paidMonths < item.totalMonths) {
          return { ...item, paidMonths: item.paidMonths + 1 };
        }
        return item;
      })
    );
  };

  // Delete
  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (!isLoaded) return null;

  // Monthly active total
  const monthlyTotal = items
    .filter((i) => i.paidMonths < i.totalMonths)
    .reduce((sum, i) => sum + i.monthlyInstallment, 0);

  const activeCount = items.filter((i) => i.paidMonths < i.totalMonths).length;

  return (
    <div className="min-h-screen bg-neutral-50 flex justify-center text-neutral-800 font-sans antialiased">
      {/* Mobile Screen Container */}
      <div className="w-full max-w-sm min-h-screen flex flex-col relative pb-28 px-4">
        {/* Minimal Header */}
        <header className="pt-10 pb-4">
          <p className="text-[11px] font-medium text-neutral-400 tracking-wider uppercase">
            ยอดเรียกเก็บเดือนนี้
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              ฿{formatMoney(monthlyTotal)}
            </h1>
            <span className="text-xs text-neutral-400">
              {activeCount} กำลังผ่อน
            </span>
          </div>
        </header>

        {/* Minimal Cards List */}
        <main className="flex-1 space-y-2.5 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-24 text-neutral-300 text-sm">
              ยังไม่มีรายการ
            </div>
          ) : (
            items.map((item) => {
              const isDone = item.paidMonths >= item.totalMonths;
              const remainingMonths = item.totalMonths - item.paidMonths;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl transition-all ${
                    isDone
                      ? "bg-neutral-100/60 opacity-50"
                      : "bg-white border border-neutral-150/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  }`}
                >
                  {/* Row 1: Name & Monthly Installment */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-900 text-base">
                          {item.name}
                        </span>
                        {isDone && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-medium">
                            ครบแล้ว
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        ทุกวันที่ {item.day} • {item.paidMonths}/{item.totalMonths} งวด
                        {!isDone && ` (เหลือ ${remainingMonths})`}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        ต้น ฿{formatMoney(item.principal)}
                        {item.interestRate > 0
                          ? ` • ดอก ${item.interestRate}%`
                          : " • ไม่มีดอก"}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold text-neutral-900">
                        ฿{formatMoney(item.monthlyInstallment)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">/งวด</span>
                    </div>
                  </div>

                  {/* Row 2: Minimal Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => handlePayMonth(item.id)}
                      disabled={isDone}
                      className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all ${
                        isDone
                          ? "text-neutral-300 cursor-not-allowed"
                          : "bg-neutral-900 text-white active:scale-95 hover:bg-black"
                      }`}
                    >
                      {isDone ? "ชำระครบแล้ว" : "+ จ่าย 1 งวด"}
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"
                      title="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </main>

        {/* Floating Minimal Button: "+ เพิ่มรายการ" */}
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-10 pointer-events-none">
          <button
            onClick={() => {
              setErrors({});
              setShowAddModal(true);
            }}
            className="pointer-events-auto bg-neutral-900 hover:bg-black text-white px-5 py-3 rounded-full shadow-lg shadow-neutral-900/15 font-medium text-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            เพิ่มรายการ
          </button>
        </div>

        {/* Minimal Slide-up Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-1">
                <h3 className="font-bold text-base text-neutral-900">
                  เพิ่มรายการ
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdd} noValidate className="space-y-3 text-sm">
                {/* ชื่อ */}
                <div>
                  <input
                    type="text"
                    placeholder="ชื่อคน"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    className={`w-full p-3 rounded-xl text-neutral-900 text-sm focus:outline-none transition-all ${
                      errors.name
                        ? "bg-red-50 border border-red-300"
                        : "bg-neutral-100/70 focus:bg-neutral-100"
                    }`}
                  />
                  {errors.name && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* เงินต้น */}
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="ยอดเงินต้น (บาท)"
                    value={principal}
                    onChange={(e) => {
                      setPrincipal(e.target.value);
                      if (errors.principal) setErrors((prev) => ({ ...prev, principal: undefined }));
                    }}
                    className={`w-full p-3 rounded-xl text-neutral-900 text-sm focus:outline-none transition-all ${
                      errors.principal
                        ? "bg-red-50 border border-red-300"
                        : "bg-neutral-100/70 focus:bg-neutral-100"
                    }`}
                  />
                  {errors.principal && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.principal}
                    </p>
                  )}
                </div>

                {/* ดอกเบี้ย */}
                <div>
                  <div className="flex gap-1.5 mb-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setInterestType("per_month")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        interestType === "per_month"
                          ? "bg-neutral-900 text-white font-medium"
                          : "text-neutral-400 bg-neutral-100"
                      }`}
                    >
                      % ต่อเดือน
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterestType("total")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        interestType === "total"
                          ? "bg-neutral-900 text-white font-medium"
                          : "text-neutral-400 bg-neutral-100"
                      }`}
                    >
                      % รวม
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="ดอกเบี้ย % (ไม่ใส่ = ไม่มีดอก)"
                    value={interestRate}
                    onChange={(e) => {
                      setInterestRate(e.target.value);
                      if (errors.interestRate) setErrors((prev) => ({ ...prev, interestRate: undefined }));
                    }}
                    className={`w-full p-3 rounded-xl text-neutral-900 text-sm focus:outline-none transition-all ${
                      errors.interestRate
                        ? "bg-red-50 border border-red-300"
                        : "bg-neutral-100/70 focus:bg-neutral-100"
                    }`}
                  />
                  {errors.interestRate && (
                    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.interestRate}
                    </p>
                  )}
                </div>

                {/* จำนวนเดือน และ วันที่จ่าย */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      placeholder="ผ่อนกี่เดือน"
                      value={totalMonths}
                      onChange={(e) => {
                        setTotalMonths(e.target.value);
                        if (errors.totalMonths) setErrors((prev) => ({ ...prev, totalMonths: undefined }));
                      }}
                      className={`w-full p-3 rounded-xl text-neutral-900 text-sm focus:outline-none transition-all ${
                        errors.totalMonths
                          ? "bg-red-50 border border-red-300"
                          : "bg-neutral-100/70 focus:bg-neutral-100"
                      }`}
                    />
                    {errors.totalMonths && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.totalMonths}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="number"
                      placeholder="จ่ายทุกวันที่"
                      value={day}
                      onChange={(e) => {
                        setDay(e.target.value);
                        if (errors.day) setErrors((prev) => ({ ...prev, day: undefined }));
                      }}
                      className={`w-full p-3 rounded-xl text-neutral-900 text-sm focus:outline-none transition-all ${
                        errors.day
                          ? "bg-red-50 border border-red-300"
                          : "bg-neutral-100/70 focus:bg-neutral-100"
                      }`}
                    />
                    {errors.day && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.day}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subtle calculation preview */}
                {numPrincipal > 0 && (
                  <div className="bg-neutral-100/60 p-3 rounded-xl text-xs space-y-1 text-neutral-600">
                    <div className="flex justify-between font-semibold text-neutral-900">
                      <span>ยอดจ่ายต่องวด:</span>
                      <span>฿{formatMoney(calculatedMonthly)} /เดือน</span>
                    </div>
                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>ยอดรวมทั้งสิ้น:</span>
                      <span>฿{formatMoney(calculatedTotal)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-1/3 py-3 rounded-xl text-sm font-medium text-neutral-500 hover:bg-neutral-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3 bg-neutral-900 hover:bg-black text-white rounded-xl text-sm font-medium active:scale-98 transition-all"
                  >
                    บันทึก
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
