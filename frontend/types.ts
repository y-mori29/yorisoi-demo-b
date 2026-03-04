export enum Screen {
  LOGIN = 'LOGIN',
  FACILITY_LIST = 'FACILITY_LIST',
  PATIENT_LIST = 'PATIENT_LIST',
  RECORDING_CONFIRM = 'RECORDING_CONFIRM',
  RECORDING = 'RECORDING',
  RESULT = 'RESULT',
  PATIENT_DETAIL = 'PATIENT_DETAIL',
  PRESCRIPTION_IMPORT = 'PRESCRIPTION_IMPORT',
}

export interface Facility {
  id: string;
  name: string;
  type: string;
}

export interface Patient {
  id: string;
  facilityId: string;
  name: string;
  dob: string;
  roomNumber?: string;
  status: 'completed' | 'incomplete';
  gender?: string; // Added from API
  kana?: string;   // Added from API
}

export interface User {
  id: string;
  name: string;
}

export interface SoapContent {
  s: string;
  o: string;
  a: string;
  p: string;
}

// V2 Data Models
export interface Summaries {
  internal: string;
  handover: string;
  medical: string;
}

export type JudgmentType = 'shared_not_needed' | 'watch_and_wait' | 'consider_sharing';

export interface SoapResult {
  jobId?: string;
  summaries: Summaries;
  judgment_candidate: JudgmentType;
  soap: SoapContent;
  report_100?: string; // Legacy support or specific summary
  changes_from_last_time?: string; // [NEW] 前回からの変更点
}