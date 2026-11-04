// =============================================================================
// Procore types (lean — only fields Top Builder AI actually consumes).
// =============================================================================
// We deliberately type narrowly. The full Procore response is stored in
// rawData on every mirrored document for forensic replay. Anything we surface
// in the UI or feed to an agent must be in a typed field.
// =============================================================================

export interface ProcoreTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;  // seconds
  created_at: number;  // unix epoch
}

export interface ProcoreMe {
  id: number;
  login: string;
  email_address: string;
  name: string;
  is_active: boolean;
}

export interface ProcoreCompany {
  id: number;
  name: string;
  is_active: boolean;
}

export interface ProcoreProject {
  id: number;
  name: string;
  project_number: string | null;
  active: boolean;
  start_date: string | null;
  completion_date: string | null;
  estimated_completion_date: string | null;
  total_value: number | null;
  description: string | null;
  flag: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProcoreRfi {
  id: number;
  number: string;
  subject: string;
  question: { plain_text_body: string | null } | null;
  status: string;
  initiated_at: string | null;
  due_date: string | null;
  received_from: { id: number; name: string } | null;
  assignees: Array<{ id: number; name: string }>;
  cost_impact: { value: string | null } | null;
  schedule_impact: { value: string | null } | null;
  responses: Array<{ id: number; body: string; created_at: string }>;
  updated_at: string;
  created_at: string;
}

export interface ProcoreDailyLog {
  id: number;
  project_id: number;
  date: string;
  weather_conditions: Record<string, unknown> | null;
  manpower_log: Array<Record<string, unknown>>;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProcoreChangeOrder {
  id: number;
  number: string;
  title: string;
  status: string;
  amount: string | null;
  initiated_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProcoreBudgetLineItem {
  id: number;
  budget_view_id: number;
  cost_code: { id: number; code: string; name: string } | null;
  description: string | null;
  original_budget_amount: string | null;
  approved_change_orders: string | null;
  revised_budget: string | null;
  job_to_date_costs: string | null;
  committed_costs: string | null;
  forecast_to_complete: string | null;
  variance: string | null;
  updated_at: string;
}

export interface ProcoreDirectCost {
  id: number;
  vendor: { id: number; name: string } | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: string | null;
  description: string | null;
  status: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProcoreVendor {
  id: number;
  name: string;
  email_address: string | null;
  phone: string | null;
  abbreviated_name: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProcoreSubmittal {
  id: number;
  number: string;
  title: string;
  status: { name: string };
  due_date: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProcoreWebhookEnvelope<T = Record<string, unknown>> {
  event_type: string;
  api_version: string;
  timestamp: string;
  account_id: number;
  user_id: number;
  company_id: number;
  project_id: number | null;
  resource_id: number;
  resource_name: string;
  data: T;
  metadata: {
    domain: string;
    event_id: string;
  };
}

export type ProcoreListResponse<T> = T[];
