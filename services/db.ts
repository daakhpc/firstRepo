import { 
    CollegeInfo, ClassInfo, Student, Holiday, AttendanceData, User, WorkableSunday, 
    FeeHead, ClassFee, FeePayment, FeeConcession, OpeningBalance, Expenditure,
    AccountCategory, Account, IncomeEntry
} from '../types';

const DB_PREFIX = 'attendanceApp_';

// --- User ID management ---
let currentUserId: string | null = null;

const setDbUser = (userId: string | null) => {
  currentUserId = userId;
}

// --- LocalStorage Wrapper ---
// A tenant-aware key generator. For global data (like users), userId should be null.
const getKey = (baseKey: string, userId: string | null = currentUserId) => {
    if (userId) {
        return `${DB_PREFIX}${userId}_${baseKey}`;
    }
    return `${DB_PREFIX}${baseKey}`; // For global data like the user list
}

const getFromLS = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage`, error);
    return defaultValue;
  }
};

const setInLS = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage`, error);
  }
};


// --- API Simulation Layer ---
const simulateDB = <T,>(action: () => T, latency: number = 200): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const result = action();
            resolve(result);
        }, latency);
    });
};

const defaultSuperAdmin: User = { 
  id: 'superadmin_001', 
  email: 'superadmin@app.com', 
  password: 'superpassword', 
  role: 'superadmin' 
};

// This function creates default data for a new admin user if it doesn't exist.
const getScopedData = <T>(key: string, defaultValue: T): T => {
    const userKey = getKey(key);
    return getFromLS(userKey, defaultValue);
}

const saveScopedData = <T>(key: string, data: T) => {
    const userKey = getKey(key);
    setInLS(userKey, data);
}

export const db = {
  // Sets the current user for all subsequent DB operations
  setCurrentUser: (user: User | null) => {
    setDbUser(user?.id ?? null);
  },

  // College Info
  getCollegeInfo: (): Promise<CollegeInfo> => 
    simulateDB(() => getScopedData('collegeInfo', { name: 'My Institute', address: '123 Education Lane' })),
  
  saveCollegeInfo: (info: CollegeInfo): Promise<void> => 
    simulateDB(() => saveScopedData('collegeInfo', info)),

  // Classes
  getClasses: (): Promise<ClassInfo[]> => 
    simulateDB(() => getScopedData('classes', [])),

  saveClasses: (classes: ClassInfo[]): Promise<void> => 
    simulateDB(() => saveScopedData('classes', classes)),

  // Students
  getStudents: (): Promise<Student[]> => 
    simulateDB(() => getScopedData('students', [])),

  saveStudents: (students: Student[]): Promise<void> => 
    simulateDB(() => saveScopedData('students', students)),

  // Holidays
  getHolidays: (): Promise<Holiday[]> => 
    simulateDB(() => getScopedData('holidays', [])),
    
  saveHolidays: (holidays: Holiday[]): Promise<void> => 
    simulateDB(() => saveScopedData('holidays', holidays)),
  
  // Workable Sundays
  getWorkableSundays: (): Promise<WorkableSunday[]> => 
    simulateDB(() => getScopedData('workableSundays', [])),
    
  saveWorkableSundays: (sundays: WorkableSunday[]): Promise<void> => 
    simulateDB(() => saveScopedData('workableSundays', sundays)),

  // Attendance
  getAttendance: (): Promise<AttendanceData> => 
    simulateDB(() => getScopedData('attendance', {})),
    
  saveAttendance: (attendance: AttendanceData): Promise<void> => 
    simulateDB(() => saveScopedData('attendance', attendance), 500),

  // --- Fee Management ---
  getFeeHeads: (): Promise<FeeHead[]> =>
    simulateDB(() => getScopedData('feeHeads', [])),

  saveFeeHeads: (feeHeads: FeeHead[]): Promise<void> =>
    simulateDB(() => saveScopedData('feeHeads', feeHeads)),

  getClassFees: (): Promise<ClassFee[]> =>
    simulateDB(() => getScopedData('classFees', [])),
  
  saveClassFees: (classFees: ClassFee[]): Promise<void> =>
    simulateDB(() => saveScopedData('classFees', classFees)),

  getFeePayments: (): Promise<FeePayment[]> =>
    simulateDB(() => getScopedData('feePayments', [])),

  saveFeePayments: (payments: FeePayment[]): Promise<void> =>
    simulateDB(() => saveScopedData('feePayments', payments)),

  getFeeConcessions: (): Promise<FeeConcession[]> =>
    simulateDB(() => getScopedData('feeConcessions', [])),
    
  saveFeeConcessions: (concessions: FeeConcession[]): Promise<void> =>
    simulateDB(() => saveScopedData('feeConcessions', concessions)),

  // --- Day Book & Accounting ---
  getAccountCategories: (): Promise<AccountCategory[]> =>
    simulateDB(() => getScopedData('accountCategories', [])),

  saveAccountCategories: (categories: AccountCategory[]): Promise<void> =>
    simulateDB(() => saveScopedData('accountCategories', categories)),

  getAccounts: (): Promise<Account[]> =>
    simulateDB(() => getScopedData('accounts', [])),

  saveAccounts: (accounts: Account[]): Promise<void> =>
    simulateDB(() => saveScopedData('accounts', accounts)),

  getIncomeEntries: (): Promise<IncomeEntry[]> =>
    simulateDB(() => getScopedData('incomeEntries', [])),
    
  saveIncomeEntries: (entries: IncomeEntry[]): Promise<void> =>
    simulateDB(() => saveScopedData('incomeEntries', entries)),

  getOpeningBalances: (): Promise<OpeningBalance[]> =>
    simulateDB(() => getScopedData('openingBalances', [])),

  saveOpeningBalances: (balances: OpeningBalance[]): Promise<void> =>
    simulateDB(() => saveScopedData('openingBalances', balances)),

  getExpenditures: (): Promise<Expenditure[]> =>
    simulateDB(() => getScopedData('expenditures', [])),

  saveExpenditures: (expenditures: Expenditure[]): Promise<void> =>
    simulateDB(() => saveScopedData('expenditures', expenditures)),

  // Users (Global, not scoped)
  getUsers: (): Promise<User[]> => 
    simulateDB(() => {
        const users = getFromLS<User[]>(getKey('users', null), []);
        if (users.length === 0) {
          users.push(defaultSuperAdmin);
          setInLS(getKey('users', null), users);
        }
        return users;
    }),
    
  saveUsers: (users: User[]): Promise<void> => 
    simulateDB(() => setInLS(getKey('users', null), users)),
};