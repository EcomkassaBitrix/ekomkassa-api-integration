export interface Employee {
  id: string;
  name: string;
}

export interface SlotSettings {
  title: string;
  logo_url: string | null;
  base_url: string | null;
  timezone: string;
  step_min: number;
  horizon_days: number;
  min_notice_hours: number;
  reschedule_deadline_hours: number;
  max_per_day: number;
  link_days: number;
  source_category_id: string | null;
  source_stage_id: string | null;
  classifier_field: string | null;
  link_field: string | null;
  start_field: string | null;
  target_stage_id: string | null;
  create_task: boolean;
  task_title: string;
  create_calendar_event: boolean;
  check_bitrix_busy: boolean;
  department_id: string | null;
  employees: Employee[];
  assigner_mode: 'deal' | 'user';
  assigner_user_id: string | null;
}

export interface SlotService {
  id: number;
  name: string;
  match_values: string[];
  duration_min: number;
  buffer_min: number;
  work_days: number[];
  work_from: string;
  work_to: string;
  is_default: boolean;
  is_active: boolean;
}

export interface CrmFieldMeta {
  code: string;
  title: string;
  type: string;
  multiple: boolean;
  items: { id: string; value: string }[];
}

export interface Meta {
  settings: SlotSettings;
  services: SlotService[];
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  fields: CrmFieldMeta[];
  errors: string[];
}

export interface Stage {
  id: string;
  name: string;
}

export interface BitrixUser {
  id: string;
  name: string;
  position: string;
}

export const WEEKDAYS = [
  { n: 1, label: 'Пн' },
  { n: 2, label: 'Вт' },
  { n: 3, label: 'Ср' },
  { n: 4, label: 'Чт' },
  { n: 5, label: 'Пт' },
  { n: 6, label: 'Сб' },
  { n: 7, label: 'Вс' },
];

export const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
