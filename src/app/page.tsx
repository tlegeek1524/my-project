"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, Trash2, X, Calendar, Wallet, Percent, CircleDollarSign } from "lucide-react";

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

const STORAGE_KEY = "mobile_loan_simple_records_v2";

export default function MobilePaymentApp() {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [interestType, setInterestType] = useState<"per_month" | "total">("per_month");
  const [totalMonths, setTotalMonths] = useState("6");
  const [day, setDay] = useState("5");

  // Load saved data
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setItems(JSON.parse(data));
      } else {
        // Initial sample
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
          {
            id: "2",
            name: "สมหญิง",
            principal: 5000,
            interestRate: 0,
            interestType: "per_month",
            totalMonths: 5,
            day: 28,
            paidMonths: 5,
            monthlyInstallment: 1000,
            totalAmount: 5000,
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

  // Live calculation for the form
  const numPrincipal = parseFloat(principal) || 0;
  const numRate = parseFloat(interestRate) || 0;
  const numMonths = parseInt(totalMonths, 10) || 1;

  let calculatedInterest = 0;
  if (interestType === "per_month") {
    calculatedInterest = numPrincipal * (numRate / 100) * numMonths;
  } else {
    calculatedInterest = numPrincipal * (numRate / 100);
  }

  const calculatedTotal = numPrincipal + calculatedInterest;
  const calculatedMonthly = numMonths > 0 ? Math.round(calculatedTotal / numMonths) : 0;

  // Add Item
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || numPrincipal <= 0 || numMonths <= 0) return;

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
    setInterestRate("0");
    setInterestType("per_month");
    setTotalMonths("6");
    setDay("5");
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

  // Monthly active total (sum of monthly installments for ongoing records)
  const monthlyTotal = items
    .filter((i) => i.paidMonths < i.totalMonths)
    .reduce((sum, i) => sum + i.monthlyInstallment, 0);

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-800 font-sans">
      {/* Mobile Screen Container */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-lg relative pb-24">
        {/* Header */}
        <header className="p-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-600" />
              จดบันทึกเงินกู้/ค่างวด
            </h1>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
              {items.length} รายการ
            </span>
          </div>

          {/* Quick Summary Card */}
          <div className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-sm">
            <p className="text-xs text-blue-100">ยอดที่ต้องรับรวมทุกเดือน</p>
            <p className="text-2xl font-bold mt-0.5">
              ฿{monthlyTotal.toLocaleString()}{" "}
              <span className="text-xs font-normal opacity-80">/เดือน</span>
            </p>
          </div>
        </header>

        {/* List of People */}
        <main className="flex-1 p-4 space-y-3 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-base font-medium">ยังไม่มีรายการบันทึก</p>
              <p className="text-xs mt-1">กดปุ่ม "+ เพิ่มคน" ด้านล่างเพื่อเริ่มจด</p>
            </div>
          ) : (
            items.map((item) => {
              const isDone = item.paidMonths >= item.totalMonths;
              const remainingMonths = item.totalMonths - item.paidMonths;
              const remainingAmount = remainingMonths * item.monthlyInstallment;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDone
                      ? "bg-slate-50 border-slate-200 opacity-70"
                      : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  {/* Row 1: Name & Monthly Installment */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 leading-tight">
                        {item.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        จ่ายทุกวันที่ <strong className="text-slate-700">{item.day}</strong> ของเดือน
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold text-blue-600">
                        ฿{item.monthlyInstallment.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 block">/งวด</span>
                    </div>
                  </div>

                  {/* Row 2: Loan Breakdown (เงินต้น, ดอกเบี้ย, ยอดรวม) */}
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-xl text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>เงินต้น:</span>
                      <strong className="text-slate-800">฿{item.principal.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>ดอกเบี้ย:</span>
                      <span className="text-amber-700 font-medium">
                        {item.interestRate}% {item.interestType === "per_month" ? "/เดือน" : "รวม"}
                        {" "}(+฿{(item.totalAmount - item.principal).toLocaleString()})
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-700">
                      <span>ยอดรวมทั้งสัญญา:</span>
                      <strong className="text-slate-900">฿{item.totalAmount.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Row 3: Status & Progress */}
                  <div className="mt-2.5 pt-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">จ่ายแล้ว: </span>
                      <strong className="text-slate-900 font-semibold">
                        {item.paidMonths}/{item.totalMonths} เดือน
                      </strong>
                      {!isDone ? (
                        <span className="text-amber-600 ml-2 font-medium">
                          (ค้าง ฿{remainingAmount.toLocaleString()})
                        </span>
                      ) : (
                        <span className="text-emerald-600 ml-2 font-semibold">
                          (ครบแล้ว ✅)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Action Buttons (Only 2 buttons!) */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handlePayMonth(item.id)}
                      disabled={isDone}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all ${
                        isDone
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {isDone ? "ชำระครบแล้ว" : "จ่ายแล้ว (+1 งวด)"}
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </main>

        {/* Bottom Floating Bar: "+ เพิ่มคน / รายการใหม่" */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 max-w-md mx-auto z-10">
          <button
            onClick={() => setShowAddModal(true)}
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

              <form onSubmit={handleAdd} className="space-y-3 text-sm">
                {/* ชื่อ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ชื่อคน
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* เงินต้น */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    ยอดเงินต้น (บาท)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="เช่น 10000"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                  />
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
                    min="0"
                    step="0.1"
                    placeholder="เช่น 2 หรือ 0 หากไม่มีดอกเบี้ย"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* จำนวนเดือน และ วันที่จ่าย */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      จำนวนเดือนทั้งหมด
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="เช่น 10"
                      value={totalMonths}
                      onChange={(e) => setTotalMonths(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      จ่ายทุกวันที่
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      placeholder="1 - 31"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* สรุปคำนวณอัตโนมัติ (Live Preview) */}
                {numPrincipal > 0 && (
                  <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 text-xs space-y-1.5 text-blue-900">
                    <div className="flex justify-between">
                      <span className="text-blue-700">ดอกเบี้ยรวม:</span>
                      <strong className="text-blue-800">฿{calculatedInterest.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">ยอดรวมทั้งสิ้น (เงินต้น+ดอก):</span>
                      <strong className="text-blue-800">฿{calculatedTotal.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-blue-200/60 text-sm font-bold text-blue-900">
                      <span>ยอดที่ต้องจ่ายต่องวด:</span>
                      <span className="text-blue-600">฿{calculatedMonthly.toLocaleString()} /เดือน</span>
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
