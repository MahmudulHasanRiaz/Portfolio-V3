import { FinanceError } from "./errors";

// Base currency is BDT. Every payment / expense / invoice stores its
// original currency and amount plus the exchange rate used and the BDT
// equivalent, so dashboard totals and summaries can always sum amount_bdt.

export interface BdtConversion {
  currency: string;
  exchangeRate: number;
  amountBdt: number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function resolveBdtConversion(
  currencyInput: string | null | undefined,
  amount: string | number | null | undefined,
  exchangeRateInput: string | number | null | undefined
): BdtConversion {
  const currency = (currencyInput ?? "BDT").toUpperCase();
  const value = Number(amount ?? 0);

  if (currency === "BDT") {
    return { currency, exchangeRate: 1, amountBdt: round2(value) };
  }

  const rate =
    exchangeRateInput === null || exchangeRateInput === undefined || exchangeRateInput === ""
      ? NaN
      : Number(exchangeRateInput);

  if (!rate || Number.isNaN(rate)) {
    throw new FinanceError(
      `Exchange rate is required for ${currency} transactions (base currency is BDT)`,
      "EXCHANGE_RATE_REQUIRED"
    );
  }

  return { currency, exchangeRate: rate, amountBdt: round2(value * rate) };
}
