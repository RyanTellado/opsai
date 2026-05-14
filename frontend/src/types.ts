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

export interface DatasetResponse {
  dataset_id: string;
  schema: DatasetSchema;
  meta: DatasetMeta;
  profile?: unknown;
}
