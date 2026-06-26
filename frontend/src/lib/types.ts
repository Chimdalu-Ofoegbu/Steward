// Shared types across server routes and client components.

export type ActionKind =
  | "delegate"
  | "undelegate"
  | "redelegate"
  | "rebalance"
  | "hold";

export interface JournalEntry {
  epoch: number;
  timestamp: number;
  action: ActionKind;
  amount_cspr: number;
  validator: string | null;
  confidence: number;
  rationale: string;
  cid: string;
  decision_hash: string;
  attestation_txn: string;
  staking_txn: string | null;
}

export interface ValidatorInfo {
  public_key: string;
  weight_cspr: number;
}

export interface DelegationInfo {
  validator: string;
  amount_cspr: number;
}

export interface TreasuryData {
  agent_public_key_hex: string;
  liquid_cspr: number;
  delegated_cspr: number;
  total_cspr: number;
  delegations: DelegationInfo[];
  validators: ValidatorInfo[];
  delegation_count: number;
  validator_count: number;
  block_height: number | null;
  state_root_hash: string | null;
  fetched_at: number;
  errors?: string[];
}

export interface VerifyResult {
  ok: boolean;
  steps: VerifyStep[];
  computed_hash?: string;
  onchain_hash?: string;
  onchain_cid?: string;
  attestation_txn?: string;
  block_hash?: string | null;
  agent_key?: string;
  error?: string;
}

export interface VerifyStep {
  id: string;
  title: string;
  detail: string;
  status: "ok" | "fail" | "pending";
}
