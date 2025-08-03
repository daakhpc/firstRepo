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


// --- Accounting Types ---
export const ACCOUNT_GROUPS = {
    'Assets': { name: 'Assets', type: 'debit' },
    'Liabilities': { name: 'Liabilities', type: 'credit' },
    'Equity': { name: 'Equity', type: 'credit' },
    'Income': { name: 'Income', type: 'credit' },
    'Expenses': { name: 'Expenses', type: 'debit' },
} as const;

export type AccountGroupName = keyof typeof ACCOUNT_GROUPS;

export interface Account {
    id: string;
    name: string;
    group: AccountGroupName;
    openingBalance: number;
    openingBalanceType: 'debit' | 'credit';
    isDefault: boolean; // Cannot be deleted
}

export type VoucherType = 'Payment' | 'Receipt' | 'Journal' | 'Contra';

export interface Transaction {
    accountId: string;
    type: 'debit' | 'credit';
    amount: number;
}

export interface JournalEntry {
    id: string;
    date: string; // YYYY-MM-DD
    voucherType: VoucherType;
    voucherNumber: number;
    narration: string;
    transactions: Transaction[];
    relatedFeePaymentId?: string; // Link to fee payment if applicable
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
    accounts: Account[];
    journalEntries: JournalEntry[];
}

export type ViewType = 'dashboard' | 'college' | 'classes' | 'students' | 'attendance' | 'holidays' | 'users' | 'workableSundays' | 'fees' | 'backup' | 'accounting';