"use client";

import { useState } from "react";
import { Calculator, X } from "lucide-react";

type Operator = "+" | "-" | "×" | "÷";

function applyOperator(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function formatDisplay(value: string): string {
  if (value.length > 14) return value.slice(0, 14);
  return value;
}

export function FloatingCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [operand, setOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [awaitingNext, setAwaitingNext] = useState(false);

  function inputDigit(digit: string) {
    if (awaitingNext) {
      setDisplay(digit);
      setAwaitingNext(false);
      return;
    }
    setDisplay((d) => (d === "0" ? digit : d + digit));
  }

  function inputDecimal() {
    if (awaitingNext) {
      setDisplay("0.");
      setAwaitingNext(false);
      return;
    }
    setDisplay((d) => (d.includes(".") ? d : d + "."));
  }

  function clearAll() {
    setDisplay("0");
    setOperand(null);
    setOperator(null);
    setAwaitingNext(false);
  }

  function backspace() {
    setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));
  }

  function toggleSign() {
    setDisplay((d) => (d.startsWith("-") ? d.slice(1) : d === "0" ? d : `-${d}`));
  }

  function inputPercent() {
    setDisplay((d) => String(Number(d) / 100));
  }

  function chooseOperator(nextOp: Operator) {
    const current = Number(display);
    if (operator && !awaitingNext && operand !== null) {
      const result = applyOperator(operand, current, operator);
      setDisplay(formatDisplay(String(result)));
      setOperand(result);
    } else {
      setOperand(current);
    }
    setOperator(nextOp);
    setAwaitingNext(true);
  }

  function calculate() {
    if (operator === null || operand === null) return;
    const current = Number(display);
    const result = applyOperator(operand, current, operator);
    setDisplay(formatDisplay(String(result)));
    setOperand(null);
    setOperator(null);
    setAwaitingNext(true);
  }

  const buttonClass =
    "flex h-11 items-center justify-center rounded-lg bg-black/5 text-sm font-medium text-foreground hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15";
  const opButtonClass =
    "flex h-11 items-center justify-center rounded-lg bg-primary/10 text-sm font-medium text-primary hover:bg-primary/20";

  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-xl border border-border bg-surface p-3 shadow-xl">
          <div className="mb-2 rounded-lg bg-black/5 px-3 py-2 text-right text-2xl font-semibold text-foreground dark:bg-white/10">
            {display}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button className={buttonClass} onClick={clearAll}>
              C
            </button>
            <button className={buttonClass} onClick={toggleSign}>
              +/-
            </button>
            <button className={buttonClass} onClick={inputPercent}>
              %
            </button>
            <button className={opButtonClass} onClick={() => chooseOperator("÷")}>
              ÷
            </button>

            <button className={buttonClass} onClick={() => inputDigit("7")}>
              7
            </button>
            <button className={buttonClass} onClick={() => inputDigit("8")}>
              8
            </button>
            <button className={buttonClass} onClick={() => inputDigit("9")}>
              9
            </button>
            <button className={opButtonClass} onClick={() => chooseOperator("×")}>
              ×
            </button>

            <button className={buttonClass} onClick={() => inputDigit("4")}>
              4
            </button>
            <button className={buttonClass} onClick={() => inputDigit("5")}>
              5
            </button>
            <button className={buttonClass} onClick={() => inputDigit("6")}>
              6
            </button>
            <button className={opButtonClass} onClick={() => chooseOperator("-")}>
              −
            </button>

            <button className={buttonClass} onClick={() => inputDigit("1")}>
              1
            </button>
            <button className={buttonClass} onClick={() => inputDigit("2")}>
              2
            </button>
            <button className={buttonClass} onClick={() => inputDigit("3")}>
              3
            </button>
            <button className={opButtonClass} onClick={() => chooseOperator("+")}>
              +
            </button>

            <button className={buttonClass} onClick={backspace}>
              ⌫
            </button>
            <button className={buttonClass} onClick={() => inputDigit("0")}>
              0
            </button>
            <button className={buttonClass} onClick={inputDecimal}>
              .
            </button>
            <button className={opButtonClass} onClick={calculate}>
              =
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "Close calculator" : "Open calculator"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
      >
        {open ? <X size={20} /> : <Calculator size={20} />}
      </button>
    </div>
  );
}
