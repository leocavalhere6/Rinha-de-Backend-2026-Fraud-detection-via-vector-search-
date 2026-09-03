import fs from 'fs';
import path from 'path';

export interface TransactionPayload {
  id: string;
  transaction: { amount: number; installments: number; requested_at: string };
  customer: { avg_amount: number; tx_count_24h: number; known_merchants: string[] };
  merchant: { id: string; mcc: string; avg_amount: number };
  terminal: { is_online: boolean; card_present: boolean; km_from_home: number };
  last_transaction: { timestamp: string; km_from_current: number };
}

interface NormConst { min: number; max: number }
type NormConfig = Record<string, NormConst>;
type MccRiskConfig = Record<string, number>;

let normConfig: NormConfig = {};
let mccRiskConfig: MccRiskConfig = {};

export function loadConfigs(basePath: string) {
  const normPath = path.join(basePath, 'normalization.json');
  const mccPath = path.join(basePath, 'mcc_risk.json');

  if (fs.existsSync(normPath)) {
    normConfig = JSON.parse(fs.readFileSync(normPath, 'utf-8'));
  }
  if (fs.existsSync(mccPath)) {
    mccRiskConfig = JSON.parse(fs.readFileSync(mccPath, 'utf-8'));
  }
}

function normalize(value: number, key: string): number {
  const cfg = normConfig[key];
  if (!cfg || cfg.max === cfg.min) return 0.5;
  const clamped = Math.max(cfg.min, Math.min(cfg.max, value));
  return (clamped - cfg.min) / (cfg.max - cfg.min);
}

export function extractVector(payload: TransactionPayload): Uint8Array {
  const mccRisk = mccRiskConfig[payload.merchant.mcc] ?? 0.5;
  const knownMerchantMatch = payload.customer.known_merchants.includes(payload.merchant.id) ? 1.0 : 0.0;
  
  const rawFeatures = [
    normalize(payload.transaction.amount, 'amount'),
    normalize(payload.transaction.installments, 'installments'),
    normalize(payload.customer.avg_amount, 'cust_avg_amount'),
    normalize(payload.customer.tx_count_24h, 'cust_tx_count_24h'),
    normalize(payload.merchant.avg_amount, 'merch_avg_amount'),
    mccRisk,
    payload.terminal.is_online ? 1.0 : 0.0,
    payload.terminal.card_present ? 1.0 : 0.0,
    normalize(payload.terminal.km_from_home, 'km_from_home'),
    normalize(payload.last_transaction.km_from_current, 'km_from_current'),
    knownMerchantMatch,
    normalize(payload.transaction.amount / (payload.customer.avg_amount || 1), 'amount_ratio_cust'),
    normalize(payload.transaction.amount / (payload.merchant.avg_amount || 1), 'amount_ratio_merch'),
    normalize(new Date(payload.transaction.requested_at).getUTCHours(), 'utc_hour'),
  ];

  const quantized = new Uint8Array(14);
  for (let i = 0; i < 14; i++) {
    quantized[i] = Math.floor(Math.max(0, Math.min(1, rawFeatures[i])) * 255);
  }
  return quantized;
}
