export interface ColumnSchema {
  name: string;
  dtype: string;
  nullable: boolean;
  null_pct: number;
  sample_values: string[];
}

export interface DatasetSchema {
  row_count: number;
  columns: ColumnSchema[];
}

export interface DatasetMeta {
  original_filename: string;
  uploaded_at: string;
  user_description: string;
}

export interface ProfileKeyColumns {
  amount: string | null;
  date: string | null;
  actor: string | null;
  category: string | null;
}

export interface ProfileMetric {
  name: string;
  definition: string;
}

export interface Profile {
  domain: string;
  entity_grain: string;
  key_columns: ProfileKeyColumns;
  metrics_of_interest: ProfileMetric[];
  expected_seasonality: string;
  anomaly_hints: string[];
  glossary: Record<string, string>;
}

export interface DatasetResponse {
  dataset_id: string;
  schema: DatasetSchema;
  meta: DatasetMeta;
  profile: Profile | null;
  profile_error: string | null;
}
