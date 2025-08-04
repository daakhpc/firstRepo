export interface CollegeInfo {
  name: string;
  address: string;
}

export interface ClassInfo {
  id: string;
  name:string;
}

export interface Student {
  id: string;
  studentId: string; // The user-facing ID
  name: string;
  fatherName: string;
  motherName: string;
  classId: string;
}

export type AttendanceStatus = 'P' | 'A' | 'L' | 'H' | ''; // Present, Absent, Leave, Holiday

export interface DailyAttendance {
  status: AttendanceStatus;
  inTime: string;
  outTime: string;
}

export interface AttendanceRecord {
  [date: string]: // YYYY-MM-DD
  DailyAttendance;
}

export interface AttendanceData {
  [studentId: string]: AttendanceRecord;
}


export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface WorkableSunday {
    id: string;
    date: string; // YYYY-MM-DD
}

// --- Fee Management Types ---
export interface FeeHead {
    id: string;
    name: string;
}

export interface ClassFee {
    id: string;
    classId: string;
    feeHeadId: string;
    amount: number;
}

export interface FeeConcession {
    id: string;
    studentId: string;
    classFeeId: string; // Links to the specific fee assignment
    concessionAmount: number;
}

export interface FeePayment {
    id: string;
    studentId: string;
    classFeeId: string;
    amountPaid: number;
    paymentDate: string; // YYYY-MM-DD
    remarks?: string;
}

// --- Day Book & Accounting Types ---
export interface AccountCategory {
  id: string;
  name: string;
  isSystem?: boolean; // To protect class categories
}

export interface Account {
  id: string;
  name: string;
  fatherName?: string;
  mobile?: string;
  categoryId: string;
  isStudentAccount?: boolean;
  studentId?: string;
}

export interface IncomeEntry {
    id: string;
    date: string; // YYYY-MM-DD
    accountId: string;
    amount: number;
    remarks?: string;
}

export interface OpeningBalance {
    id: string; // YYYY-MM-DD
    amount: number;
    type: 'credit' | 'debit';
}

export interface Expenditure {
    id: string;
    date: string; // YYYY-MM-DD
    accountId: string;
    amount: number;
    remarks?: string;
}


export type UserRole = 'superadmin' | 'admin';

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface BackupData {
    collegeInfo: CollegeInfo;
    classes: ClassInfo[];
    students: Student[];
    holidays: Holiday[];
    workableSundays: WorkableSunday[];
    attendance: AttendanceData;
    feeHeads: FeeHead[];
    classFees: ClassFee[];
    feePayments: FeePayment[];
    feeConcessions: FeeConcession[];
    openingBalances: OpeningBalance[];
    expenditures: Expenditure[];
    accountCategories: AccountCategory[];
    accounts: Account[];
    incomeEntries: IncomeEntry[];
}

export type ViewType = 'dashboard' | 'college' | 'classes' | 'students' | 'attendance' | 'holidays' | 'users' | 'workableSundays' | 'fees' | 'backup' | 'daybook' | 'accounts';