import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    CollegeInfo, ClassInfo, Student, Holiday, ViewType, AttendanceData, 
    AttendanceStatus, DailyAttendance, User, UserRole, WorkableSunday,
    FeeHead, ClassFee, FeePayment, FeeConcession, BackupData,
    Account, JournalEntry, Transaction, VoucherType, ACCOUNT_GROUPS, AccountGroupName
} from '../types';
import { db } from '../services/db';
import { 
    Button, Card, Input, Modal, Select, Spinner, Toast,
    PlusIcon, EditIcon, TrashIcon, UploadIcon, LogoutIcon, MenuIcon, CloseIcon, RupeeIcon, CheckIcon, DownloadIcon, BookOpenIcon
} from '../components/common';

// Helper to generate unique IDs
const generateId = () => `_${Math.random().toString(36).substr(2, 9)}`;

// Helper to get random time in a range, e.g., ('09:00', '10:00')
const getRandomTimeInRange = (start: string, end: string): string => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;
    const randomTotalMinutes = Math.floor(Math.random() * (endTotalMinutes - startTotalMinutes + 1)) + startTotalMinutes;
    const hours = Math.floor(randomTotalMinutes / 60);
    const minutes = randomTotalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);


// --- Sub-Components for Different Views ---

const DashboardHome: React.FC<{ stats: { classes: number; students: number; holidays: number } }> = ({ stats }) => (
    <Card>
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center">
                <p className="text-4xl font-bold">{stats.classes}</p>
                <p className="text-gray-500">Classes</p>
            </Card>
            <Card className="text-center">
                <p className="text-4xl font-bold">{stats.students}</p>
                <p className="text-gray-500">Total Students</p>
            </Card>
            <Card className="text-center">
                <p className="text-4xl font-bold">{stats.holidays}</p>
                <p className="text-gray-500">Holidays</p>
            </Card>
        </div>
    </Card>
);

const CollegeInfoManager: React.FC<{ info: CollegeInfo; onSave: (info: CollegeInfo) => Promise<void> }> = ({ info, onSave }) => {
    const [formData, setFormData] = useState(info);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(info);
    }, [info]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Institute Details</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institute Name</label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <Button onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
            </div>
        </Card>
    );
};

const ClassManager: React.FC<{ classes: ClassInfo[]; onSave: (classes: ClassInfo[]) => Promise<void>; onSelectClass: (id: string) => void }> = ({ classes, onSave, onSelectClass }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClass, setCurrentClass] = useState<Partial<ClassInfo> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const openModal = (cls: Partial<ClassInfo> | null = null) => {
        setCurrentClass(cls || { id: '', name: '' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentClass?.name) return;
        setIsSaving(true);
        let updatedClasses;
        if (currentClass.id) {
            updatedClasses = classes.map(c => c.id === currentClass.id ? { ...c, name: currentClass.name! } : c);
        } else {
            updatedClasses = [...classes, { id: generateId(), name: currentClass.name }];
        }
        await onSave(updatedClasses);
        setIsSaving(false);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure? This will delete the class, its students, and associated fee records.')) {
            onSave(classes.filter(c => c.id !== id));
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Manage Classes</h2>
                <Button onClick={() => openModal()}><PlusIcon className="w-5 h-5"/> Add Class</Button>
            </div>
            <ul className="space-y-2">
                {classes.map(cls => (
                    <li key={cls.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md gap-2">
                        <span className="font-medium">{cls.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="secondary" size="sm" onClick={() => onSelectClass(cls.id)}>View Students</Button>
                            <Button variant="secondary" size="sm" onClick={() => openModal(cls)}><EditIcon /></Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(cls.id)}><TrashIcon /></Button>
                        </div>
                    </li>
                ))}
            </ul>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentClass?.id ? 'Edit Class' : 'Add Class'}>
                <div className="space-y-4">
                    <Input placeholder="Class Name" value={currentClass?.name || ''} onChange={e => setCurrentClass({ ...currentClass, name: e.target.value })} />
                    <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
                </div>
            </Modal>
        </Card>
    );
};

const StudentManager: React.FC<{ students: Student[]; classes: ClassInfo[]; classId: string; onSave: (students: Student[]) => Promise<void>; onBack: () => void; }> = ({ students, classes, classId, onSave, onBack }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const openModal = (student: Partial<Student> | null = null) => {
        setCurrentStudent(student || { id: '', studentId: '', name: '', fatherName: '', motherName: '', classId });
        setIsModalOpen(true);
    };
    
    const handleSave = async () => {
        if (!currentStudent?.name || !currentStudent.studentId) return;
        setIsSaving(true);
        let updatedStudents;
        if (currentStudent.id) {
            updatedStudents = students.map(s => s.id === currentStudent.id ? { ...currentStudent as Student } : s);
        } else {
            updatedStudents = [...students, { ...currentStudent, id: generateId(), classId } as Student];
        }
        await onSave(updatedStudents);
        setIsSaving(false);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure? This will delete the student and their fee payment records.')) {
            onSave(students.filter(s => s.id !== id));
        }
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').slice(1);
            const newStudents = lines.map(line => {
                const [studentId, name, fatherName, motherName] = line.split(',');
                if (studentId && name && fatherName && motherName) {
                    return { id: generateId(), studentId: studentId.trim(), name: name.trim(), fatherName: fatherName.trim(), motherName: motherName.trim(), classId };
                }
                return null;
            }).filter(Boolean) as Student[];

            if(newStudents.length > 0) {
                 await onSave([...students, ...newStudents]);
                 alert(`${newStudents.length} students added successfully.`);
            } else {
                 alert('Could not parse CSV or file is empty. Expected format: StudentId,Name,FatherName,MotherName');
            }
        };
        reader.readAsText(file);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const currentClassName = classes.find(c => c.id === classId)?.name || '...';
    const classStudents = students.filter(s => s.classId === classId);

    return (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                <div>
                    <Button onClick={onBack} variant="secondary" className="mb-2">&larr; Back to Classes</Button>
                    <h2 className="text-2xl font-bold">Students in {currentClassName}</h2>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                     <Button onClick={() => fileInputRef.current?.click()}><UploadIcon/> Bulk Add</Button>
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                     <Button onClick={() => openModal()}><PlusIcon /> Add Student</Button>
                </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-600">
                            <th className="p-2">Student ID</th><th className="p-2">Name</th><th className="p-2 hidden md:table-cell">Father's Name</th><th className="p-2 hidden md:table-cell">Mother's Name</th><th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classStudents.map(s => (
                            <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="p-2">{s.studentId}</td><td className="p-2">{s.name}</td><td className="p-2 hidden md:table-cell">{s.fatherName}</td><td className="p-2 hidden md:table-cell">{s.motherName}</td>
                                <td className="p-2 flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => openModal(s)}><EditIcon/></Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)}><TrashIcon/></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentStudent?.id ? 'Edit Student' : 'Add Student'}>
                <div className="space-y-4">
                    <Input placeholder="Student ID" value={currentStudent?.studentId || ''} onChange={e => setCurrentStudent({ ...currentStudent, studentId: e.target.value })} />
                    <Input placeholder="Full Name" value={currentStudent?.name || ''} onChange={e => setCurrentStudent({ ...currentStudent, name: e.target.value })} />
                    <Input placeholder="Father's Name" value={currentStudent?.fatherName || ''} onChange={e => setCurrentStudent({ ...currentStudent, fatherName: e.target.value })} />
                    <Input placeholder="Mother's Name" value={currentStudent?.motherName || ''} onChange={e => setCurrentStudent({ ...currentStudent, motherName: e.target.value })} />
                    <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
                </div>
            </Modal>
        </Card>
    );
};


const HolidayManager: React.FC<{ holidays: Holiday[]; onSave: (holidays: Holiday[]) => Promise<void> }> = ({ holidays, onSave }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentHoliday, setCurrentHoliday] = useState<Partial<Holiday> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const openModal = (holiday: Partial<Holiday> | null = null) => {
        setCurrentHoliday(holiday || { id: '', date: '', name: '' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentHoliday?.name || !currentHoliday.date) return;
        setIsSaving(true);
        let updatedHolidays;
        if (currentHoliday.id) {
            updatedHolidays = holidays.map(h => h.id === currentHoliday.id ? { ...currentHoliday as Holiday } : h);
        } else {
            updatedHolidays = [...holidays, { ...currentHoliday, id: generateId() } as Holiday];
        }
        await onSave(updatedHolidays.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setIsSaving(false);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure?')) {
            onSave(holidays.filter(h => h.id !== id));
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Manage Holidays</h2>
                <Button onClick={() => openModal()}><PlusIcon /> Add Holiday</Button>
            </div>
            <ul className="space-y-2">
                {holidays.map(h => (
                    <li key={h.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md gap-2">
                        <div>
                            <span className="font-medium">{h.name}</span>
                            <span className="text-sm text-gray-500 ml-0 sm:ml-2">({new Date(h.date + 'T00:00:00').toLocaleDateString()})</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="secondary" size="sm" onClick={() => openModal(h)}><EditIcon /></Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(h.id)}><TrashIcon /></Button>
                        </div>
                    </li>
                ))}
            </ul>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentHoliday?.id ? 'Edit Holiday' : 'Add Holiday'}>
                <div className="space-y-4">
                    <Input placeholder="Holiday Name" value={currentHoliday?.name || ''} onChange={e => setCurrentHoliday({ ...currentHoliday, name: e.target.value })} />
                    <Input type="date" value={currentHoliday?.date || ''} onChange={e => setCurrentHoliday({ ...currentHoliday, date: e.target.value })} />
                    <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
                </div>
            </Modal>
        </Card>
    );
};

const AttendanceManager: React.FC<{ 
    collegeInfo: CollegeInfo;
    classes: ClassInfo[]; 
    students: Student[]; 
    holidays: Holiday[];
    workableSundays: WorkableSunday[]; 
    attendance: AttendanceData; 
    onSave: (data: AttendanceData) => Promise<void>;
    onUpdateHolidays: (holidays: Holiday[]) => Promise<void>;
}> = ({ collegeInfo, classes, students, holidays, workableSundays, attendance, onSave, onUpdateHolidays }) => {
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [sheet, setSheet] = useState<any>(null);
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
    const [liveAttendance, setLiveAttendance] = useState<AttendanceData>(attendance);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLiveAttendance(attendance);
    }, [attendance]);

    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const defaultMonth = `${yyyy}-${mm}`;
        setStartMonth(defaultMonth);
        setEndMonth(defaultMonth);
    }, []);
    
    const calculateDuration = (inTime: string, outTime: string): string => {
        if (!inTime || !outTime) return '-';
        try {
            const start = new Date(`1970-01-01T${inTime}:00`);
            const end = new Date(`1970-01-01T${outTime}:00`);
            if (end <= start) return '-';
            let diff = (end.getTime() - start.getTime()) / 1000 / 60; // diff in minutes
            const hours = Math.floor(diff / 60);
            const minutes = Math.floor(diff % 60);
            return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
        } catch (e) {
            return '-';
        }
    }

    const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
    const workableSundaySet = useMemo(() => new Set(workableSundays.map(ws => ws.date)), [workableSundays]);

    const handleGenerateSheet = () => {
        if (!selectedClassId || !startMonth || !endMonth) {
            alert('Please select a class and month range.');
            return;
        }

        const classStudents = students.filter(s => s.classId === selectedClassId).sort((a, b) => a.name.localeCompare(b.name));
        
        const months = [];
        let currentDate = new Date(startMonth + '-01T00:00:00');
        const lastDate = new Date(endMonth + '-01T00:00:00');
        
        while (currentDate <= lastDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthName = currentDate.toLocaleString('default', { month: 'long' });
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            months.push({ year, month, monthName, days });
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        const newAttendance = JSON.parse(JSON.stringify(liveAttendance));

        classStudents.forEach(student => {
            if (!newAttendance[student.id]) {
                newAttendance[student.id] = {};
            }

            const studentWorkingDays: string[] = [];
            months.forEach(month => {
                month.days.forEach((day: number) => {
                    const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (newAttendance[student.id][dateStr]) {
                        return; // Skip if data already exists
                    }
                    const date = new Date(dateStr + 'T00:00:00');
                    const isSunday = date.getDay() === 0;
                    const isWorkableSunday = workableSundaySet.has(dateStr);
                    const isHoliday = holidaySet.has(dateStr);
                    if (!((isSunday && !isWorkableSunday) || isHoliday)) {
                        studentWorkingDays.push(dateStr);
                    }
                });
            });

            if (studentWorkingDays.length > 0) {
                const totalWorkingDays = studentWorkingDays.length;
                const targetPercentage = 0.80 + Math.random() * 0.10; // 80% to 90%
                const presentCount = Math.floor(totalWorkingDays * targetPercentage);
                const remainingDays = totalWorkingDays - presentCount;
                const absentCount = Math.round(remainingDays * 2 / 3);
                const leaveCount = remainingDays - absentCount;

                let statuses: AttendanceStatus[] = [
                    ...Array(presentCount).fill('P'),
                    ...Array(absentCount).fill('A'),
                    ...Array(leaveCount).fill('L')
                ];

                // Shuffle statuses
                for (let i = statuses.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
                }
                
                studentWorkingDays.forEach((dateStr, index) => {
                    const status = statuses[index];
                    if (status === 'P') {
                        newAttendance[student.id][dateStr] = {
                            status: 'P',
                            inTime: getRandomTimeInRange('09:00', '10:00'),
                            outTime: getRandomTimeInRange('16:00', '17:00'),
                        };
                    } else {
                        newAttendance[student.id][dateStr] = {
                            status,
                            inTime: '',
                            outTime: '',
                        };
                    }
                });
            }
        });

        setLiveAttendance(newAttendance);
        setSheet({ students: classStudents, months });
        setCurrentMonthIndex(0);
    };

    const getAttendanceForDay = useCallback((studentId: string, dateStr: string): DailyAttendance => {
        return liveAttendance[studentId]?.[dateStr] || { status: '', inTime: '', outTime: '' };
    }, [liveAttendance]);


    const overallSummary = useMemo(() => {
        if (!sheet) return [];
        
        return sheet.students.map((student: Student) => {
            let totalPresent = 0, totalAbsent = 0, totalLeave = 0, totalWorkingDays = 0;

            sheet.months.forEach((month: any) => {
                month.days.forEach((day: number) => {
                    const date = new Date(month.year, month.month, day);
                    const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isWorkableSunday = workableSundaySet.has(dateStr);
                    const dayOfWeek = date.getDay();

                    if ((dayOfWeek !== 0 || isWorkableSunday) && !holidaySet.has(dateStr)) { 
                        totalWorkingDays++;
                        const dailyData = getAttendanceForDay(student.id, dateStr);
                        if (dailyData.status === 'P') totalPresent++;
                        else if (dailyData.status === 'A') totalAbsent++;
                        else if (dailyData.status === 'L') totalLeave++;
                    }
                });
            });
            
            const percentage = totalWorkingDays > 0 ? ((totalPresent / totalWorkingDays) * 100).toFixed(2) : "0.00";

            return {
                studentId: student.id,
                studentName: student.name,
                studentIdentifier: student.studentId,
                totalPresent,
                totalAbsent,
                totalLeave,
                totalWorkingDays,
                percentage
            };
        });
    }, [sheet, getAttendanceForDay, holidaySet, workableSundaySet]);


    const handleAttendanceChange = (studentId: string, dateStr: string, field: keyof DailyAttendance, value: string) => {
        const updatedAttendance = JSON.parse(JSON.stringify(liveAttendance));
        const baseData = getAttendanceForDay(studentId, dateStr);
        
        if (!updatedAttendance[studentId]) updatedAttendance[studentId] = {};
        
        const newDailyData: DailyAttendance = { ...baseData, ...(updatedAttendance[studentId][dateStr] || {}), [field]: value };

        if (field === 'status') {
            if (value === 'P') {
                newDailyData.inTime = newDailyData.inTime || getRandomTimeInRange('09:00', '10:00');
                newDailyData.outTime = newDailyData.outTime || getRandomTimeInRange('16:00', '17:00');
            } else {
                newDailyData.inTime = '';
                newDailyData.outTime = '';
            }
        }
        updatedAttendance[studentId][dateStr] = newDailyData;
        setLiveAttendance(updatedAttendance);
    };

    const handleStatusCycle = (studentId: string, dateStr: string) => {
        const currentStatus = getAttendanceForDay(studentId, dateStr).status;
        // Cycle: P -> A -> L -> P ...
        const cycle: AttendanceStatus[] = ['P', 'A', 'L'];
        const currentIndex = cycle.indexOf(currentStatus);
        
        // If status is not P, A, or L (e.g., it's ''), start the cycle at P. Otherwise, move to the next item.
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % cycle.length;
        const nextStatus = cycle[nextIndex];
        
        handleAttendanceChange(studentId, dateStr, 'status', nextStatus);
    };

    const handleSaveAttendance = async () => {
        setIsSaving(true);
        await onSave(liveAttendance);
        setIsSaving(false);
    };
    
    const handlePrint = () => window.print();

    const handleDateHeaderClick = async (dateStr: string) => {
        const existingHoliday = holidays.find(h => h.date === dateStr);
        if (existingHoliday) {
            if (window.confirm(`'${existingHoliday.name}' is set on this day. Do you want to remove it and mark it as a working day?`)) {
                setIsSaving(true);
                await onUpdateHolidays(holidays.filter(h => h.id !== existingHoliday.id));
                setIsSaving(false);
            }
        } else {
            const holidayName = window.prompt("Enter holiday name for this date:");
            if (holidayName && holidayName.trim() !== "") {
                const newHoliday: Holiday = { id: generateId(), date: dateStr, name: holidayName.trim() };
                const updatedHolidays = [...holidays, newHoliday].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setIsSaving(true);
                await onUpdateHolidays(updatedHolidays);
                setIsSaving(false);
            }
        }
    };

    const getMonthlySummary = useCallback((studentId: string, month: any) => {
        if (!sheet) return { present: 0, absent: 0, leave: 0, workingDays: 0, percentage: "0.00" };
        let present = 0, absent = 0, leave = 0, workingDays = 0;
        month.days.forEach((day: number) => {
            const date = new Date(month.year, month.month, day);
            const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = date.getDay();
            const isWorkableSunday = workableSundaySet.has(dateStr);
            if ((dayOfWeek !== 0 || isWorkableSunday) && !holidaySet.has(dateStr)) { 
                workingDays++;
                const dailyData = getAttendanceForDay(studentId, dateStr);
                if (dailyData.status === 'P') present++;
                else if (dailyData.status === 'A') absent++;
                else if (dailyData.status === 'L') leave++;
            }
        });
        const percentage = workingDays > 0 ? ((present / workingDays) * 100).toFixed(2) : "0.00";
        return { present, absent, leave, workingDays, percentage };
    }, [sheet, getAttendanceForDay, holidaySet, workableSundaySet]);

    const attendanceLabels = [{ key: 'status', label: 'ST' }, { key: 'inTime', label: 'IN' }, { key: 'outTime', label: 'OT' }, { key: 'duration', label: 'DR' }];

    return (
        <Card className="print-content">
            <div className="hidden mb-6 text-center print-header">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{collegeInfo.name}</h2>
                <p className="text-sm text-gray-500">{collegeInfo.address}</p>
                {selectedClassId && <p className="text-lg font-semibold mt-2">Attendance Sheet for: {classes.find(c => c.id === selectedClassId)?.name}</p>}
            </div>

            <h2 className="text-2xl font-bold mb-4 no-print">Attendance Sheet</h2>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg no-print">
                <div className="flex-grow w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1">Class</label>
                    <Select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                        <option value="">Select a class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </div>
                <div className="flex-grow w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1">From Month</label>
                    <Input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} />
                </div>
                <div className="flex-grow w-full sm:w-auto">
                    <label className="block text-sm font-medium mb-1">To Month</label>
                    <Input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} />
                </div>
                <Button onClick={handleGenerateSheet} className="w-full sm:w-auto">Generate Sheet</Button>
            </div>

            {sheet && sheet.months.length > 0 && (
                <div>
                    {currentMonthIndex < sheet.months.length ? (
                        (() => {
                            const month = sheet.months[currentMonthIndex];
                            if (!month) return null;
                            
                            // Get user-defined holidays for the month
                            const userDefinedMonthHolidays = holidays.filter(h => h.date.startsWith(`${month.year}-${String(month.month + 1).padStart(2, '0')}`));

                            // Get Sunday holidays for the month
                            const sundayHolidaysInMonth: Holiday[] = [];
                            month.days.forEach((day: number) => {
                                const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const date = new Date(dateStr + 'T00:00:00');
                                if (date.getDay() === 0 && !workableSundaySet.has(dateStr)) {
                                    sundayHolidaysInMonth.push({
                                        id: `sunday_${dateStr}`,
                                        date: dateStr,
                                        name: 'Sunday'
                                    });
                                }
                            });

                            // Combine and sort all holidays for display
                            const allMonthHolidays = [...userDefinedMonthHolidays, ...sundayHolidaysInMonth]
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                            return (
                            <div>
                                <div key={`${month.year}-${month.month}`}>
                                    <h3 className="text-xl font-bold mb-4 text-center">{month.monthName} {month.year}</h3>
                                    <div className="overflow-x-auto custom-scrollbar border dark:border-gray-600 rounded-lg">
                                        <table className="w-full text-xs text-center whitespace-nowrap border-separate border-spacing-0">
                                            <thead className="bg-gray-200 dark:bg-gray-700 font-semibold align-middle text-[10px]">
                                                <tr>
                                                    <th className="p-0.5 border-b border-r dark:border-gray-600 text-left sticky left-0 bg-gray-200 dark:bg-gray-700 z-20 w-12 min-w-[48px]">DT</th>
                                                    {month.days.map((d: number) => {
                                                        const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                                        const date = new Date(dateStr + 'T00:00:00');
                                                        const dayInitial = date.toLocaleDateString('en-US', { weekday: 'short' })[0];
                                                        
                                                        const isDeclaredHoliday = holidaySet.has(dateStr);
                                                        const isWorkableSunday = workableSundaySet.has(dateStr);
                                                        const isSunday = date.getDay() === 0;

                                                        let thClass = 'p-0.5 border-b border-r dark:border-gray-600 w-9';
                                                        let title = 'Click to add holiday';
                                                        let isClickable = true;

                                                        if (isDeclaredHoliday) {
                                                            thClass += ' bg-yellow-200 dark:bg-yellow-800/50';
                                                            title = holidays.find(h => h.date === dateStr)?.name || 'Holiday';
                                                        } else if (isSunday && !isWorkableSunday) {
                                                            thClass += ' bg-red-200 dark:bg-red-800/60';
                                                            title = 'Sunday';
                                                        } else if (isWorkableSunday) {
                                                            title = 'Workable Sunday';
                                                            isClickable = false;
                                                        }
                                                        
                                                        if(isClickable) {
                                                            thClass += ' cursor-pointer transition-colors duration-200 hover:bg-gray-300 dark:hover:bg-gray-600';
                                                        }

                                                        return (
                                                            <th key={`${month.monthName}-${d}`} className={thClass} onClick={() => isClickable && handleDateHeaderClick(dateStr)} title={title}>
                                                                <div>{d}</div><div className="font-normal">({dayInitial})</div>
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sheet.students.map((s: Student, index: number) => {
                                                    const summary = getMonthlySummary(s.id, month);
                                                    const percentageColorClass = parseFloat(summary.percentage) < 75 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
                                                    return (
                                                        <React.Fragment key={s.id}>
                                                            <tr className="border-t-2 border-gray-400 dark:border-gray-500">
                                                                <td colSpan={1 + month.days.length} className="p-0.5 bg-gray-100 dark:bg-gray-800/50">
                                                                    <div className="flex justify-between items-center w-full text-[11px]">
                                                                        <div className="flex items-center gap-1 font-bold whitespace-nowrap">
                                                                            <span>{index + 1}.</span>
                                                                            <div className="text-left ml-1">
                                                                                <div>{s.name}</div>
                                                                                <div className="font-normal text-gray-500">ID: {s.studentId}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right p-0.5 text-[10px]">
                                                                            <div className="flex justify-end items-center gap-x-2 gap-y-1 flex-wrap">
                                                                                <span>Total: <strong>{summary.workingDays}</strong></span>
                                                                                <span className="text-green-600">P: <strong>{summary.present}</strong></span>
                                                                                <span className="text-red-600">A: <strong>{summary.absent}</strong></span>
                                                                                <span className="text-blue-600">L: <strong>{summary.leave}</strong></span>
                                                                                <span>%: <strong className={percentageColorClass}>{summary.percentage}%</strong></span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {attendanceLabels.map(({key, label}) => {
                                                                const rowClass = `h-8 hover:bg-gray-50 dark:hover:bg-gray-700/50`;
                                                                return (
                                                                <tr key={`${s.id}-${key}`} className={rowClass}>
                                                                    <td className="p-0.5 border-b border-r dark:border-gray-600 text-left font-semibold sticky left-0 bg-white dark:bg-gray-800 z-10 w-12 min-w-[48px]">{label}</td>
                                                                    {month.days.map((d: number) => {
                                                                        const dateStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                                                        const isDeclaredHoliday = holidaySet.has(dateStr);
                                                                        const isWorkableSunday = workableSundaySet.has(dateStr);
                                                                        const isSunday = new Date(dateStr + 'T00:00:00').getDay() === 0;

                                                                        if (isDeclaredHoliday) return <td key={dateStr} className="p-0 border-b border-r dark:border-gray-600 align-middle bg-yellow-100 dark:bg-yellow-800/50 font-bold text-center text-xs">{key === 'status' ? 'HD' : '-'}</td>;
                                                                        if (isSunday && !isWorkableSunday) return <td key={dateStr} className="p-0 border-b border-r dark:border-gray-600 align-middle bg-red-100 dark:bg-red-900/50 font-bold text-center text-xs">{key === 'status' ? 'HD' : '-'}</td>;
                                                                        
                                                                        const dailyData = getAttendanceForDay(s.id, dateStr);
                                                                        const isPresent = dailyData.status === 'P';
                                                                        let cellClass = 'p-0 border-b border-r dark:border-gray-600 align-middle';

                                                                        if (key === 'status') {
                                                                            if (dailyData.status === 'P') cellClass += ' bg-green-100 dark:bg-green-800/50'; else if (dailyData.status === 'A') cellClass += ' bg-red-100 dark:bg-red-800/50'; else if (dailyData.status === 'L') cellClass += ' bg-blue-100 dark:bg-blue-800/50';
                                                                            return (
                                                                                <td
                                                                                    key={dateStr}
                                                                                    className={`${cellClass} cursor-pointer`}
                                                                                    onClick={() => handleStatusCycle(s.id, dateStr)}
                                                                                    title={`Status: ${dailyData.status || 'Not set'}. Click to change.`}
                                                                                >
                                                                                    <div className="w-full h-full flex items-center justify-center font-semibold">
                                                                                        {dailyData.status}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        } else if (key === 'inTime' || key === 'outTime') {
                                                                            return <td key={dateStr} className={cellClass}>
                                                                                <input 
                                                                                    type="text"
                                                                                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                                                                                    title="Enter time in 24-hour HH:MM format"
                                                                                    placeholder="HH:MM"
                                                                                    value={dailyData[key] || ''} 
                                                                                    onChange={(e) => handleAttendanceChange(s.id, dateStr, key, e.target.value)} 
                                                                                    disabled={!isPresent} 
                                                                                    className="bg-transparent w-full h-full outline-none border-0 text-center text-[11px] disabled:cursor-not-allowed p-0"
                                                                                />
                                                                            </td>;
                                                                        } else if (key === 'duration') {
                                                                             return <td key={dateStr} className={`${cellClass} text-[11px] text-center`}>{calculateDuration(dailyData.inTime, dailyData.outTime)}</td>;
                                                                        }
                                                                        return null;
                                                                    })}
                                                                </tr>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                     {allMonthHolidays.length > 0 && (
                                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg no-print">
                                            <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Holidays in {month.monthName}</h4>
                                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                                {allMonthHolidays.map(h => <li key={h.id}><strong>{new Date(h.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}:</strong> {h.name}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                            )
                        })()
                    ) : (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-center">Overall Attendance Progress</h3>
                            <div className="overflow-x-auto custom-scrollbar border dark:border-gray-600 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-200 dark:bg-gray-700 font-semibold align-middle">
                                        <tr>
                                            <th className="p-3">S.No.</th>
                                            <th className="p-3">Student Name</th>
                                            <th className="p-3">Student ID</th>
                                            <th className="p-3 text-center">Total Working Days</th>
                                            <th className="p-3 text-center text-green-600">Present</th>
                                            <th className="p-3 text-center text-red-600">Absent</th>
                                            <th className="p-3 text-center text-blue-600">Leave</th>
                                            <th className="p-3 text-center">Attendance %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overallSummary.map((summary, index) => {
                                            const percentageColorClass = parseFloat(summary.percentage) < 75 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400 font-bold';
                                            return (
                                            <tr key={summary.studentId} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <td className="p-3">{index + 1}</td>
                                                <td className="p-3 font-medium">{summary.studentName}</td>
                                                <td className="p-3">{summary.studentIdentifier}</td>
                                                <td className="p-3 text-center">{summary.totalWorkingDays}</td>
                                                <td className="p-3 text-center">{summary.totalPresent}</td>
                                                <td className="p-3 text-center">{summary.totalAbsent}</td>
                                                <td className="p-3 text-center">{summary.totalLeave}</td>
                                                <td className={`p-3 text-center ${percentageColorClass}`}>{summary.percentage}%</td>
                                            </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                   
                    <div className="mt-4 border-t pt-4 flex justify-center flex-wrap gap-2 no-print">
                        {sheet.months.map((m: any, index: number) => (
                             <Button
                                key={`${m.year}-${m.month}`}
                                onClick={() => setCurrentMonthIndex(index)}
                                variant={currentMonthIndex === index ? 'primary' : 'secondary'}
                                size="sm"
                            >
                                {m.monthName} {m.year}
                            </Button>
                        ))}
                        <Button
                            onClick={() => setCurrentMonthIndex(sheet.months.length)}
                            variant={currentMonthIndex === sheet.months.length ? 'primary' : 'secondary'}
                            size="sm"
                        >
                            Overall Progress
                        </Button>
                    </div>

                    <div className="mt-6 flex justify-between items-center no-print">
                        <div className="flex gap-2">
                             <Button
                                onClick={() => setCurrentMonthIndex(i => i - 1)}
                                disabled={currentMonthIndex <= 0}
                                variant="secondary"
                            >
                                &larr; Previous
                            </Button>
                            <Button
                                onClick={() => setCurrentMonthIndex(i => i + 1)}
                                disabled={currentMonthIndex >= sheet.months.length}
                                variant="secondary"
                            >
                                Next &rarr;
                            </Button>
                        </div>
                        <div className="flex justify-end gap-4">
                            <Button variant="secondary" onClick={handlePrint}>Print as PDF</Button>
                            <Button onClick={handleSaveAttendance} isLoading={isSaving}>Save All Changes</Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

const WorkableSundayManager: React.FC<{ workableSundays: WorkableSunday[]; onSave: (sundays: WorkableSunday[]) => Promise<void> }> = ({ workableSundays, onSave }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const openModal = () => {
        setCurrentDate('');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentDate) {
            alert("Please select a date.");
            return;
        };

        const date = new Date(currentDate + 'T00:00:00');
        if (date.getDay() !== 0) {
            alert('The selected date is not a Sunday.');
            return;
        }

        if (workableSundays.some(ws => ws.date === currentDate)) {
            alert('This Sunday is already marked as workable.');
            return;
        }

        setIsSaving(true);
        const newWorkableSunday: WorkableSunday = { id: generateId(), date: currentDate };
        const updatedSundays = [...workableSundays, newWorkableSunday].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        await onSave(updatedSundays);
        setIsSaving(false);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to remove this workable Sunday?')) {
            onSave(workableSundays.filter(ws => ws.id !== id));
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Manage Workable Sundays</h2>
                <Button onClick={openModal}><PlusIcon /> Add Workable Sunday</Button>
            </div>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Mark specific Sundays as regular working days. They will be treated as normal days on the attendance sheet, not as holidays.</p>
            <ul className="space-y-2">
                {workableSundays.map(ws => (
                    <li key={ws.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md gap-2">
                        <span className="font-medium">{new Date(ws.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <div className="flex-shrink-0">
                           <Button variant="danger" size="sm" onClick={() => handleDelete(ws.id)}><TrashIcon /></Button>
                        </div>
                    </li>
                ))}
                {workableSundays.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No workable Sundays have been added yet.</p>
                )}
            </ul>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Workable Sunday">
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select a Sunday</label>
                        <Input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} />
                    </div>
                    <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
                </div>
            </Modal>
        </Card>
    );
};

const UserManager: React.FC<{ users: User[]; currentUser: User; onSave: (users: User[]) => Promise<void> }> = ({ users, currentUser, onSave }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUserForm, setCurrentUserForm] = useState<Partial<User> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const openModal = (user: Partial<User> | null = null) => {
        setCurrentUserForm(user || { id: '', email: '', password: '', role: 'admin' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentUserForm?.email || !currentUserForm.password) {
            alert("Email and password are required.");
            return;
        }
        setIsSaving(true);
        let updatedUsers;
        if (currentUserForm.id) {
            // Prevent changing the role of the default superadmin
            const originalUser = users.find(u => u.id === currentUserForm.id);
            if (originalUser?.email === 'superadmin@app.com' && currentUserForm.role !== 'superadmin') {
                alert('Cannot change the role of the default superadmin.');
                setIsSaving(false);
                return;
            }
            updatedUsers = users.map(u => u.id === currentUserForm.id ? { ...u, ...currentUserForm } as User : u);
        } else {
            if (users.some(u => u.email === currentUserForm.email)) {
                alert("A user with this email already exists.");
                setIsSaving(false);
                return;
            }
            updatedUsers = [...users, { ...currentUserForm, id: generateId(), role: 'admin' } as User];
        }
        await onSave(updatedUsers);
        setIsSaving(false);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        const userToDelete = users.find(u => u.id === id);
        if (userToDelete?.role === 'superadmin') {
            alert("Super admin accounts cannot be deleted.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            onSave(users.filter(u => u.id !== id));
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Manage Users</h2>
                <Button onClick={() => openModal()}><PlusIcon /> Add Admin User</Button>
            </div>
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b dark:border-gray-600">
                            <th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="p-2">{u.email}</td>
                                <td className="p-2 capitalize">{u.role}</td>
                                <td className="p-2 flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => openModal(u)}><EditIcon/></Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(u.id)} disabled={u.role === 'superadmin'}><TrashIcon/></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentUserForm?.id ? 'Edit User' : 'Add User'}>
                <div className="space-y-4">
                    <Input type="email" placeholder="Email" value={currentUserForm?.email || ''} onChange={e => setCurrentUserForm({ ...currentUserForm, email: e.target.value })} disabled={!!currentUserForm?.id}/>
                    <Input type="text" placeholder="Password" value={currentUserForm?.password || ''} onChange={e => setCurrentUserForm({ ...currentUserForm, password: e.target.value })} />
                     {currentUserForm?.id && users.find(u=>u.id===currentUserForm?.id)?.email !== 'superadmin@app.com' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                            <Select value={currentUserForm?.role || 'admin'} onChange={e => setCurrentUserForm({ ...currentUserForm, role: e.target.value as UserRole })}>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                            </Select>
                        </div>
                    )}
                    <Button onClick={handleSave} isLoading={isSaving}>Save</Button>
                </div>
            </Modal>
        </Card>
    );
};

const BackupRestoreManager: React.FC<{
    allData: BackupData;
    onRestore: (data: BackupData) => Promise<void>;
}> = ({ allData, onRestore }) => {
    const [isRestoring, setIsRestoring] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDownload = () => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(allData, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `attendance_backup_${date}.json`;
        link.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);

                const requiredKeys: (keyof BackupData)[] = [
                    'collegeInfo', 'classes', 'students', 'holidays', 'workableSundays', 'attendance', 
                    'feeHeads', 'classFees', 'feePayments', 'feeConcessions', 'accounts', 'journalEntries'
                ];
                const hasAllKeys = requiredKeys.every(key => key in data);

                if (!hasAllKeys) {
                    alert('Invalid backup file. The file is missing required data sections.');
                    return;
                }
                
                if (window.confirm('Are you sure you want to restore? This will overwrite ALL existing data and cannot be undone.')) {
                    setIsRestoring(true);
                    await onRestore(data);
                }

            } catch (error) {
                console.error("Error parsing backup file:", error);
                alert("Failed to read or parse the backup file. Please ensure it's a valid JSON file from this application.");
                setIsRestoring(false);
            } finally {
                if(fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Backup & Restore</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Download a complete backup of your data or restore the application from a previously saved backup file. Restoring will overwrite all current data.</p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleDownload} variant="secondary">
                    <DownloadIcon className="w-5 h-5" /> Download Backup
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} isLoading={isRestoring}>
                    <UploadIcon className="w-5 h-5" /> Restore from Backup
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleFileSelect}
                />
            </div>
        </Card>
    );
};


const ConcessionManagerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    classFees: ClassFee[];
    feeHeads: FeeHead[];
    feeConcessions: FeeConcession[];
    onSave: (concessions: FeeConcession[]) => Promise<void>;
}> = ({ isOpen, onClose, student, classFees, feeHeads, feeConcessions, onSave }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [localConcessions, setLocalConcessions] = useState<Record<string, number>>({});

    useEffect(() => {
        if (isOpen && student) {
            const studentConcessions = feeConcessions.filter(fc => fc.studentId === student.id);
            const concessionsMap = studentConcessions.reduce((acc, curr) => {
                acc[curr.classFeeId] = curr.concessionAmount;
                return acc;
            }, {} as Record<string, number>);
            setLocalConcessions(concessionsMap);
        }
    }, [isOpen, student, feeConcessions]);

    if (!student) return null;

    const studentClassFees = classFees.filter(cf => cf.classId === student.classId);

    const handleConcessionChange = (classFeeId: string, amount: number, maxAmount: number) => {
        const validAmount = Math.max(0, Math.min(amount, maxAmount));
        setLocalConcessions(prev => ({ ...prev, [classFeeId]: validAmount }));
    };

    const handleSaveConcessions = async () => {
        setIsSaving(true);
        const otherStudentConcessions = feeConcessions.filter(fc => fc.studentId !== student.id);
        const newStudentConcessions: FeeConcession[] = [];

        for (const classFeeId in localConcessions) {
            const concessionAmount = localConcessions[classFeeId];
            if (concessionAmount > 0) {
                 const existing = feeConcessions.find(fc => fc.studentId === student.id && fc.classFeeId === classFeeId);
                 if (existing) {
                     newStudentConcessions.push({ ...existing, concessionAmount });
                 } else {
                     newStudentConcessions.push({
                         id: generateId(),
                         studentId: student.id,
                         classFeeId: classFeeId,
                         concessionAmount: concessionAmount
                     });
                 }
            }
        }
        await onSave([...otherStudentConcessions, ...newStudentConcessions]);
        setIsSaving(false);
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Concession for ${student.name}`} size="lg">
            <div className="space-y-4">
                <p className="text-sm text-gray-500">Enter the concession amount for each fee head. This amount will be deducted from the total fee due.</p>
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {studentClassFees.map(cf => {
                        const feeHead = feeHeads.find(fh => fh.id === cf.feeHeadId);
                        const concessionValue = localConcessions[cf.id] || 0;
                        return (
                            <div key={cf.id} className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <label className="font-medium">{feeHead?.name || 'Unknown Fee'}</label>
                                    <span className="text-sm text-gray-500 ml-2">(Total: {cf.amount})</span>
                                </div>
                                <Input
                                    type="number"
                                    className="w-32"
                                    placeholder="0.00"
                                    value={concessionValue}
                                    onChange={e => handleConcessionChange(cf.id, parseFloat(e.target.value) || 0, cf.amount)}
                                    max={cf.amount}
                                    min={0}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSaveConcessions} isLoading={isSaving}>Save Concessions</Button>
                </div>
            </div>
        </Modal>
    );
};


const FeeManager: React.FC<{
    classes: ClassInfo[];
    students: Student[];
    feeHeads: FeeHead[];
    classFees: ClassFee[];
    feePayments: FeePayment[];
    feeConcessions: FeeConcession[];
    accounts: Account[];
    journalEntries: JournalEntry[];
    onSaveFeeHeads: (data: FeeHead[]) => Promise<void>;
    onSaveClassFees: (data: ClassFee[]) => Promise<void>;
    onSaveFeePayments: (data: FeePayment[]) => Promise<void>;
    onSaveFeeConcessions: (data: FeeConcession[]) => Promise<void>;
    onSaveJournalEntry: (entry: Omit<JournalEntry, 'id' | 'voucherNumber'>) => Promise<void>;
}> = ({ 
    classes, students, feeHeads, classFees, feePayments, feeConcessions, accounts, journalEntries,
    onSaveFeeHeads, onSaveClassFees, onSaveFeePayments, onSaveFeeConcessions, onSaveJournalEntry 
}) => {
    
    type FeeManagerTab = 'heads' | 'assignments' | 'payments';
    const [activeTab, setActiveTab] = useState<FeeManagerTab>('payments');

    // State for Fee Heads
    const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
    const [currentHead, setCurrentHead] = useState<Partial<FeeHead> | null>(null);

    // State for Fee Assignments
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [currentClassFee, setCurrentClassFee] = useState<Partial<ClassFee> | null>(null);
    const [selectedClassIdForAssign, setSelectedClassIdForAssign] = useState<string>('');
    
    // State for Payments
    const [selectedClassIdForPayment, setSelectedClassIdForPayment] = useState<string>('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [newPayment, setNewPayment] = useState<{classFeeId: string, amount: string, date: string, remarks: string}>({classFeeId: '', amount: '', date: new Date().toISOString().split('T')[0], remarks: ''});
    
    // State for Concessions
    const [isConcessionModalOpen, setIsConcessionModalOpen] = useState(false);
    const [studentForConcession, setStudentForConcession] = useState<Student | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    // --- Fee Head Logic ---
    const openHeadModal = (head: Partial<FeeHead> | null = null) => {
        setCurrentHead(head || { id: '', name: '' });
        setIsHeadModalOpen(true);
    };

    const handleSaveHead = async () => {
        if (!currentHead?.name) return;
        setIsSaving(true);
        const updated = currentHead.id 
            ? feeHeads.map(h => h.id === currentHead.id ? { ...h, name: currentHead.name as string } : h)
            : [...feeHeads, { id: generateId(), name: currentHead.name }];
        await onSaveFeeHeads(updated);
        setIsSaving(false);
        setIsHeadModalOpen(false);
    };
    
    const handleDeleteHead = (id: string) => {
        if (classFees.some(cf => cf.feeHeadId === id)) {
            alert('Cannot delete this fee head because it is assigned to one or more classes.');
            return;
        }
        if (window.confirm('Are you sure?')) {
            onSaveFeeHeads(feeHeads.filter(h => h.id !== id));
        }
    };

    // --- Fee Assignment Logic ---
    const openAssignModal = (cf: Partial<ClassFee> | null = null) => {
        setCurrentClassFee(cf || { id: '', classId: selectedClassIdForAssign, feeHeadId: '', amount: 0 });
        setIsAssignModalOpen(true);
    };

    const handleSaveAssignment = async () => {
        const { classId, feeHeadId, amount } = currentClassFee || {};
        if (!classId || !feeHeadId || !amount || amount <= 0) {
            alert('Please select a fee head and enter a valid amount.');
            return;
        }

        const isDuplicate = classFees.some(cf => cf.classId === classId && cf.feeHeadId === feeHeadId && cf.id !== currentClassFee?.id);
        if (isDuplicate) {
            alert('This fee head is already assigned to this class.');
            return;
        }

        setIsSaving(true);
        const updated = currentClassFee.id
            ? classFees.map(cf => cf.id === currentClassFee.id ? { ...currentClassFee as ClassFee } : cf)
            : [...classFees, { ...currentClassFee as Omit<ClassFee, 'id'>, id: generateId() } as ClassFee];
        await onSaveClassFees(updated);
        setIsSaving(false);
        setIsAssignModalOpen(false);
    };

    const handleDeleteAssignment = (id: string) => {
        if (window.confirm('Are you sure? This may affect student payment records.')) {
            onSaveClassFees(classFees.filter(cf => cf.id !== id));
        }
    };
    
    // --- Payment Logic ---
    const openPaymentModal = (student: Student) => {
        setSelectedStudent(student);
        setNewPayment({classFeeId: '', amount: '', date: new Date().toISOString().split('T')[0], remarks: ''});
        setIsPaymentModalOpen(true);
    };

    const handleSavePayment = async () => {
        const { classFeeId, amount, date } = newPayment;
        const parsedAmount = parseFloat(amount);
        if (!classFeeId || !amount || parsedAmount <= 0 || !date) {
            alert('Please select a fee, enter a valid amount and date.');
            return;
        }
        
        setIsSaving(true);

        // Find accounts for journal entry
        const cashAccount = accounts.find(a => a.name === 'Cash in Hand');
        const feeIncomeAccount = accounts.find(a => a.name === 'Tuition Fees');
        if (!cashAccount || !feeIncomeAccount) {
            alert('Default accounts (Cash in Hand, Tuition Fees) not found. Please set them up in the Accounting module.');
            setIsSaving(false);
            return;
        }

        const newPaymentId = generateId();
        const newPaymentRecord: FeePayment = {
            id: newPaymentId,
            studentId: selectedStudent!.id,
            classFeeId: classFeeId,
            amountPaid: parsedAmount,
            paymentDate: date,
            remarks: newPayment.remarks,
        };
        await onSaveFeePayments([...feePayments, newPaymentRecord]);
        
        const feeHeadName = feeHeads.find(fh => fh.id === classFees.find(cf => cf.id === classFeeId)?.feeHeadId)?.name || 'Fee';
        const studentName = selectedStudent?.name || 'Student';
        const studentIdentifier = selectedStudent?.studentId || 'ID';
        
        // Create journal entry
        await onSaveJournalEntry({
            date: date,
            voucherType: 'Receipt',
            narration: `Fee received from ${studentName} (${studentIdentifier}) for ${feeHeadName}. ${newPayment.remarks || ''}`,
            transactions: [
                { accountId: cashAccount.id, type: 'debit', amount: parsedAmount },
                { accountId: feeIncomeAccount.id, type: 'credit', amount: parsedAmount }
            ],
            relatedFeePaymentId: newPaymentId
        });

        setIsSaving(false);
        setNewPayment({classFeeId: '', amount: '', date: new Date().toISOString().split('T')[0], remarks: ''});
    };
    
    const handleDeletePayment = (id: string) => {
        if (window.confirm('Are you sure you want to delete this payment record? This will also delete the associated accounting entry.')) {
            // Note: This simple delete doesn't re-validate accounting integrity.
            // For a real-world app, deletion of posted vouchers is usually disallowed.
            onSaveFeePayments(feePayments.filter(p => p.id !== id));
        }
    }

    const openConcessionModal = (student: Student) => {
        setStudentForConcession(student);
        setIsConcessionModalOpen(true);
    };

    const TabButton: React.FC<{tabId: FeeManagerTab, children: React.ReactNode}> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === tabId ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
            {children}
        </button>
    );

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Fee Management</h2>
            <div className="border-b mb-6 flex space-x-4">
                <TabButton tabId="payments">Student Payments</TabButton>
                <TabButton tabId="assignments">Fee Assignments</TabButton>
                <TabButton tabId="heads">Fee Heads</TabButton>
            </div>

            {/* Fee Heads Tab */}
            {activeTab === 'heads' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Fee Heads</h3>
                        <Button onClick={() => openHeadModal()}><PlusIcon /> Add Head</Button>
                    </div>
                    <ul className="space-y-2">
                        {feeHeads.map(h => (
                            <li key={h.id} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                                <span className="font-medium">{h.name}</span>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => openHeadModal(h)}><EditIcon/></Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDeleteHead(h.id)}><TrashIcon/></Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Modal isOpen={isHeadModalOpen} onClose={() => setIsHeadModalOpen(false)} title={currentHead?.id ? 'Edit Fee Head' : 'Add Fee Head'}>
                        <Input placeholder="Fee Head Name" value={currentHead?.name || ''} onChange={e => setCurrentHead({...currentHead, name: e.target.value})} />
                        <Button onClick={handleSaveHead} isLoading={isSaving} className="mt-4">Save</Button>
                    </Modal>
                </div>
            )}

            {/* Fee Assignments Tab */}
            {activeTab === 'assignments' && (
                <div>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-xl font-semibold">Assign Fees to Classes</h3>
                        <div className="w-full sm:w-64">
                            <Select value={selectedClassIdForAssign} onChange={e => setSelectedClassIdForAssign(e.target.value)}>
                                <option value="">-- Select a Class --</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                    </div>
                    {selectedClassIdForAssign && (
                        <div>
                            <Button onClick={() => openAssignModal()} className="mb-4"><PlusIcon /> Assign New Fee</Button>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="border-b dark:border-gray-600"><tr><th className="p-2">Fee Head</th><th className="p-2">Amount</th><th className="p-2">Actions</th></tr></thead>
                                    <tbody>
                                        {classFees.filter(cf => cf.classId === selectedClassIdForAssign).map(cf => {
                                            const head = feeHeads.find(h => h.id === cf.feeHeadId);
                                            return (
                                            <tr key={cf.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="p-2">{head?.name || 'N/A'}</td>
                                                <td className="p-2">{formatCurrency(cf.amount)}</td>
                                                <td className="p-2 flex gap-2">
                                                    <Button variant="secondary" size="sm" onClick={() => openAssignModal(cf)}><EditIcon/></Button>
                                                    <Button variant="danger" size="sm" onClick={() => handleDeleteAssignment(cf.id)}><TrashIcon/></Button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={currentClassFee?.id ? 'Edit Fee Assignment' : 'Assign Fee'}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Fee Head</label>
                                <Select value={currentClassFee?.feeHeadId || ''} onChange={e => setCurrentClassFee({...currentClassFee, feeHeadId: e.target.value})}>
                                    <option value="">-- Select --</option>
                                    {feeHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </Select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">Amount</label>
                                <Input type="number" placeholder="Amount" value={currentClassFee?.amount || ''} onChange={e => setCurrentClassFee({...currentClassFee, amount: parseFloat(e.target.value) || 0})} />
                            </div>
                            <Button onClick={handleSaveAssignment} isLoading={isSaving}>Save Assignment</Button>
                        </div>
                    </Modal>
                </div>
            )}
            
            {/* Student Payments Tab */}
            {activeTab === 'payments' && (
                 <div>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-xl font-semibold">Student Payment Status</h3>
                         <div className="w-full sm:w-64">
                            <Select value={selectedClassIdForPayment} onChange={e => setSelectedClassIdForPayment(e.target.value)}>
                                <option value="">-- Select a Class --</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                    </div>
                    {selectedClassIdForPayment && (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="border-b dark:border-gray-600"><tr><th className="p-2">Name</th><th className="p-2">Student ID</th><th className="p-2">Total Due</th><th className="p-2">Total Paid</th><th className="p-2">Balance</th><th className="p-2">Actions</th></tr></thead>
                                <tbody>
                                    {students.filter(s => s.classId === selectedClassIdForPayment).map(s => {
                                        const applicableFees = classFees.filter(cf => cf.classId === s.classId);
                                        const totalFeeAmount = applicableFees.reduce((sum, cf) => sum + cf.amount, 0);
                                        const studentConcessions = feeConcessions.filter(fc => fc.studentId === s.id);
                                        const totalConcession = studentConcessions.reduce((sum, fc) => {
                                            // Ensure concession is for a fee that is still applicable to the class
                                            if (applicableFees.some(af => af.id === fc.classFeeId)) {
                                                return sum + fc.concessionAmount;
                                            }
                                            return sum;
                                        }, 0);
                                        
                                        const totalDue = totalFeeAmount - totalConcession;
                                        const studentPayments = feePayments.filter(fp => fp.studentId === s.id);
                                        const totalPaid = studentPayments.reduce((sum, fp) => sum + fp.amountPaid, 0);
                                        const balance = totalDue - totalPaid;
                                        const balanceColor = balance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                        
                                        return (
                                        <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-2 font-medium">{s.name}</td>
                                            <td className="p-2">{s.studentId}</td>
                                            <td className="p-2">{formatCurrency(totalDue)}</td>
                                            <td className="p-2">{formatCurrency(totalPaid)}</td>
                                            <td className={`p-2 font-semibold ${balanceColor}`}>{formatCurrency(balance)}</td>
                                            <td className="p-2 flex flex-wrap gap-2">
                                                <Button size="sm" onClick={() => openPaymentModal(s)}>Payments</Button>
                                                <Button size="sm" variant="secondary" onClick={() => openConcessionModal(s)}>Concession</Button>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                 </div>
            )}
            
            <ConcessionManagerModal 
                isOpen={isConcessionModalOpen}
                onClose={() => setIsConcessionModalOpen(false)}
                student={studentForConcession}
                classFees={classFees}
                feeHeads={feeHeads}
                feeConcessions={feeConcessions}
                onSave={onSaveFeeConcessions}
            />

            {/* Student Payment Details Modal */}
            {selectedStudent && (
                 <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Fee Details for ${selectedStudent.name}`} size="xl">
                    <div className="space-y-6">
                        {/* Summary Section */}
                        <div>
                            <h4 className="font-semibold text-lg mb-2">Fee Summary</h4>
                            <div className="grid grid-cols-5 gap-2 font-semibold bg-gray-100 dark:bg-gray-700 p-2 rounded-t-md text-sm">
                                <span>Fee Head</span>
                                <span className="text-right">Total</span>
                                <span className="text-right">Concession</span>
                                <span className="text-right">Paid</span>
                                <span className="text-right">Balance</span>
                            </div>
                            <div className="border border-t-0 dark:border-gray-600 rounded-b-md p-2 space-y-1">
                                {classFees.filter(cf => cf.classId === selectedStudent.classId).map(cf => {
                                    const headName = feeHeads.find(h => h.id === cf.feeHeadId)?.name || 'N/A';
                                    const concession = feeConcessions.find(fc => fc.studentId === selectedStudent.id && fc.classFeeId === cf.id)?.concessionAmount || 0;
                                    const amountPaidForHead = feePayments.filter(p => p.studentId === selectedStudent.id && p.classFeeId === cf.id).reduce((sum, p) => sum + p.amountPaid, 0);
                                    const balance = cf.amount - concession - amountPaidForHead;
                                    const balanceColor = balance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                    return (
                                        <div key={cf.id} className="grid grid-cols-5 gap-2 text-sm">
                                            <span>{headName}</span>
                                            <span className="text-right">{formatCurrency(cf.amount)}</span>
                                            <span className="text-right text-yellow-600">{formatCurrency(concession)}</span>
                                            <span className="text-right">{formatCurrency(amountPaidForHead)}</span>
                                            <span className={`text-right font-medium ${balanceColor}`}>{formatCurrency(balance)}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* New Payment Section */}
                         <div>
                            <h4 className="font-semibold text-lg mb-2">Add New Payment</h4>
                             <div className="flex flex-col sm:flex-row gap-4 items-end p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div className="flex-1 w-full"><label className="text-sm">Fee Type</label><Select value={newPayment.classFeeId} onChange={e => setNewPayment({...newPayment, classFeeId: e.target.value})}>
                                    <option value="">-- Select --</option>
                                    {classFees.filter(cf => cf.classId === selectedStudent.classId).map(cf => <option key={cf.id} value={cf.id}>{feeHeads.find(h=>h.id===cf.feeHeadId)?.name}</option>)}
                                </Select></div>
                                <div className="flex-1 w-full"><label className="text-sm">Amount</label><Input type="number" placeholder="0.00" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} /></div>
                                <div className="flex-1 w-full"><label className="text-sm">Date</label><Input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} /></div>
                                <div className="flex-1 w-full"><label className="text-sm">Remarks</label><Input placeholder="Optional" value={newPayment.remarks} onChange={e => setNewPayment({...newPayment, remarks: e.target.value})} /></div>
                                <Button onClick={handleSavePayment} isLoading={isSaving}>Add</Button>
                            </div>
                         </div>
                        
                        {/* Payment History Section */}
                        <div>
                            <h4 className="font-semibold text-lg mb-2">Payment History</h4>
                             <div className="overflow-y-auto max-h-48 custom-scrollbar border rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700"><tr><th className="p-2">Date</th><th className="p-2">Fee Head</th><th className="p-2">Amount Paid</th><th className="p-2">Remarks</th><th className="p-2"></th></tr></thead>
                                    <tbody>
                                        {feePayments.filter(p => p.studentId === selectedStudent.id).map(p => {
                                            const classFee = classFees.find(cf => cf.id === p.classFeeId);
                                            const headName = classFee ? feeHeads.find(h => h.id === classFee.feeHeadId)?.name : 'N/A';
                                            return (
                                            <tr key={p.id} className="border-b dark:border-gray-700">
                                                <td className="p-2">{new Date(p.paymentDate + 'T00:00:00').toLocaleDateString()}</td>
                                                <td className="p-2">{headName}</td>
                                                <td className="p-2">{formatCurrency(p.amountPaid)}</td>
                                                <td className="p-2">{p.remarks}</td>
                                                <td className="p-2"><Button size="sm" variant="danger" onClick={() => handleDeletePayment(p.id)} disabled={journalEntries.some(je => je.relatedFeePaymentId === p.id)}><TrashIcon className="w-4 h-4"/></Button></td>
                                            </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                </Modal>
            )}

        </Card>
    );
};

const AccountingManager: React.FC<{
    accounts: Account[];
    journalEntries: JournalEntry[];
    students: Student[];
    classes: ClassInfo[];
    onSaveAccounts: (data: Account[]) => Promise<void>;
    onSaveJournalEntry: (entry: Omit<JournalEntry, 'id' | 'voucherNumber'>) => Promise<void>;
}> = ({ accounts, journalEntries, students, classes, onSaveAccounts, onSaveJournalEntry }) => {
    
    type AccountingTab = 'daybook' | 'accounts' | 'ledger' | 'trial_balance';
    const [activeTab, setActiveTab] = useState<AccountingTab>('daybook');

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [currentAccount, setCurrentAccount] = useState<Partial<Account> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Daybook state
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const dailyJournalEntries = useMemo(() => journalEntries.filter(entry => entry.date === selectedDate).sort((a,b) => b.voucherNumber - a.voucherNumber), [journalEntries, selectedDate]);
    const accountsById = useMemo(() => accounts.reduce((acc, curr) => { acc[curr.id] = curr; return acc; }, {} as Record<string, Account>), [accounts]);
    
    // Voucher modal state
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [voucherType, setVoucherType] = useState<VoucherType>('Payment');

    // Ledger report state
    const [ledgerAccountId, setLedgerAccountId] = useState<string>('');
    const [ledgerStartDate, setLedgerStartDate] = useState('');
    const [ledgerEndDate, setLedgerEndDate] = useState('');

    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        setLedgerStartDate(firstDay);
        setLedgerEndDate(today.toISOString().split('T')[0]);
    }, []);

    const handleSaveAccount = async () => {
        if (!currentAccount?.name || !currentAccount.group) {
            alert('Account name and group are required.');
            return;
        }
        setIsSaving(true);
        let updatedAccounts;
        if (currentAccount.id) {
            updatedAccounts = accounts.map(a => a.id === currentAccount.id ? { ...currentAccount as Account } : a);
        } else {
            updatedAccounts = [...accounts, { ...currentAccount, id: generateId(), isDefault: false } as Account];
        }
        await onSaveAccounts(updatedAccounts);
        setIsSaving(false);
        setIsAccountModalOpen(false);
    };

    const openAccountModal = (acc: Partial<Account> | null = null) => {
        setCurrentAccount(acc || { id: '', name: '', group: 'Expenses', openingBalance: 0, openingBalanceType: 'debit' });
        setIsAccountModalOpen(true);
    };

    const openVoucherModal = (type: VoucherType) => {
        setVoucherType(type);
        setIsVoucherModalOpen(true);
    };

    const TabButton: React.FC<{tabId: AccountingTab, children: React.ReactNode}> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === tabId ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
            {children}
        </button>
    );

    const ledgerReportData = useMemo(() => {
        if (!ledgerAccountId) return null;
        const selectedAccount = accounts.find(a => a.id === ledgerAccountId);
        if (!selectedAccount) return null;
        
        let balance = selectedAccount.openingBalanceType === 'debit' ? selectedAccount.openingBalance : -selectedAccount.openingBalance;
        const transactions = [];

        // Opening Balance
        if (selectedAccount.openingBalance > 0) {
            transactions.push({
                date: 'Opening',
                narration: 'Opening Balance',
                debit: selectedAccount.openingBalanceType === 'debit' ? selectedAccount.openingBalance : 0,
                credit: selectedAccount.openingBalanceType === 'credit' ? selectedAccount.openingBalance : 0,
                balance: balance
            });
        }

        journalEntries
            .filter(je => je.date >= ledgerStartDate && je.date <= ledgerEndDate)
            .sort((a,b) => a.date.localeCompare(b.date) || a.voucherNumber - b.voucherNumber)
            .forEach(je => {
                je.transactions.forEach(t => {
                    if (t.accountId === ledgerAccountId) {
                        const amount = t.type === 'debit' ? t.amount : -t.amount;
                        balance += amount;
                        transactions.push({
                            date: je.date,
                            narration: je.narration,
                            debit: t.type === 'debit' ? t.amount : 0,
                            credit: t.type === 'credit' ? t.amount : 0,
                            balance: balance
                        });
                    }
                });
            });

        return { accountName: selectedAccount.name, transactions, finalBalance: balance };

    }, [ledgerAccountId, ledgerStartDate, ledgerEndDate, accounts, journalEntries]);

    const trialBalanceData = useMemo(() => {
        const balances: Record<string, {name: string, group: AccountGroupName, balance: number}> = {};
        
        accounts.forEach(acc => {
            balances[acc.id] = { 
                name: acc.name, 
                group: acc.group,
                balance: acc.openingBalanceType === 'debit' ? acc.openingBalance : -acc.openingBalance
            };
        });

        journalEntries.forEach(je => {
            je.transactions.forEach(t => {
                if (balances[t.accountId]) {
                    const amount = t.type === 'debit' ? t.amount : -t.amount;
                    balances[t.accountId].balance += amount;
                }
            });
        });
        
        const sortedBalances = Object.values(balances).sort((a,b) => a.name.localeCompare(b.name));
        const totalDebits = sortedBalances.reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0);
        const totalCredits = sortedBalances.reduce((sum, acc) => sum + (acc.balance < 0 ? -acc.balance : 0), 0);

        return { balances: sortedBalances, totalDebits, totalCredits };

    }, [accounts, journalEntries]);

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Accounting</h2>
            <div className="border-b mb-6 flex space-x-4 custom-scrollbar overflow-x-auto">
                <TabButton tabId="daybook">Day Book</TabButton>
                <TabButton tabId="accounts">Chart of Accounts</TabButton>
                <TabButton tabId="ledger">Ledger Report</TabButton>
                <TabButton tabId="trial_balance">Trial Balance</TabButton>
            </div>
            
            {activeTab === 'accounts' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Chart of Accounts</h3>
                        <Button onClick={() => openAccountModal()}><PlusIcon /> Add Account</Button>
                    </div>
                    <div className="space-y-6">
                        {Object.entries(ACCOUNT_GROUPS).map(([groupId, groupInfo]) => (
                            <div key={groupId}>
                                <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">{groupInfo.name}</h4>
                                <ul className="space-y-2">
                                {accounts.filter(a => a.group === groupId).map(acc => (
                                    <li key={acc.id} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                                        <div>
                                            <span className="font-medium">{acc.name}</span>
                                            <span className="text-sm text-gray-500 ml-2">(Op. Balance: {formatCurrency(acc.openingBalance)} {acc.openingBalanceType})</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {!acc.isDefault && <Button variant="secondary" size="sm" onClick={() => openAccountModal(acc)}><EditIcon/></Button>}
                                        </div>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title={currentAccount?.id ? 'Edit Account' : 'Add Account'}>
                        <div className="space-y-4">
                            <Input placeholder="Account Name" value={currentAccount?.name || ''} onChange={e => setCurrentAccount({...currentAccount, name: e.target.value})} />
                            <Select value={currentAccount?.group || ''} onChange={e => setCurrentAccount({...currentAccount, group: e.target.value as AccountGroupName})}>
                                {Object.entries(ACCOUNT_GROUPS).map(([key, val]) => <option key={key} value={key}>{val.name}</option>)}
                            </Select>
                            <Input type="number" placeholder="Opening Balance" value={currentAccount?.openingBalance ?? ''} onChange={e => setCurrentAccount({...currentAccount, openingBalance: parseFloat(e.target.value) || 0})} />
                            <Select value={currentAccount?.openingBalanceType || 'debit'} onChange={e => setCurrentAccount({...currentAccount, openingBalanceType: e.target.value as 'debit' | 'credit'})}>
                                <option value="debit">Debit</option>
                                <option value="credit">Credit</option>
                            </Select>
                        <Button onClick={handleSaveAccount} isLoading={isSaving} className="mt-4">Save</Button>
                        </div>
                    </Modal>
                </div>
            )}

            {activeTab === 'daybook' && (
                <div>
                     <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                        <h3 className="text-xl font-semibold">Day Book</h3>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => openVoucherModal('Payment')} variant="danger">New Payment</Button>
                            <Button size="sm" onClick={() => openVoucherModal('Receipt')} variant="primary">New Receipt</Button>
                            <Button size="sm" onClick={() => openVoucherModal('Journal')} variant="secondary">New Journal</Button>
                            <Button size="sm" onClick={() => openVoucherModal('Contra')} variant="secondary">New Contra</Button>
                        </div>
                        <div className="w-full md:w-auto">
                            <label className="block text-sm font-medium mb-1">Select Date</label>
                            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full"/>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {dailyJournalEntries.map(entry => (
                             <Card key={entry.id} className="p-0">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center rounded-t-lg">
                                    <div className="font-bold text-lg">{entry.voucherType} <span className="text-sm font-normal text-gray-500">#{entry.voucherNumber}</span></div>
                                    <div className="font-semibold">{entry.date}</div>
                                </div>
                                <div className="p-3">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {entry.transactions.map((t, index) => (
                                                <tr key={index}>
                                                    <td className="p-1 w-12">{t.type === 'debit' ? 'Dr.' : 'Cr.'}</td>
                                                    <td className="p-1">{accountsById[t.accountId]?.name || 'Unknown Account'}</td>
                                                    <td className="p-1 text-right font-mono">{t.type === 'debit' ? formatCurrency(t.amount) : ''}</td>
                                                    <td className="p-1 text-right font-mono">{t.type === 'credit' ? formatCurrency(t.amount) : ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 p-1 italic">
                                        (Narration: {entry.narration})
                                    </p>
                                </div>
                            </Card>
                        ))}
                         {dailyJournalEntries.length === 0 && <p className="text-center text-gray-500 py-8">No transactions for this day.</p>}
                    </div>
                </div>
            )}
            
            {activeTab === 'ledger' && (
                <div>
                     <h3 className="text-xl font-semibold mb-4">Ledger Report</h3>
                     <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div className="flex-grow w-full sm:w-auto">
                            <label className="block text-sm font-medium mb-1">Account</label>
                            <Select value={ledgerAccountId} onChange={e => setLedgerAccountId(e.target.value)}>
                                <option value="">Select an account</option>
                                {accounts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                        <div className="flex-grow w-full sm:w-auto">
                            <label className="block text-sm font-medium mb-1">From Date</label>
                            <Input type="date" value={ledgerStartDate} onChange={e => setLedgerStartDate(e.target.value)} />
                        </div>
                        <div className="flex-grow w-full sm:w-auto">
                            <label className="block text-sm font-medium mb-1">To Date</label>
                            <Input type="date" value={ledgerEndDate} onChange={e => setLedgerEndDate(e.target.value)} />
                        </div>
                    </div>
                    {ledgerReportData && (
                        <Card>
                            <h4 className="text-lg font-bold mb-3">Ledger for: {ledgerReportData.accountName}</h4>
                             <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-200 dark:bg-gray-700"><tr><th className="p-2">Date</th><th className="p-2">Particulars</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th><th className="p-2 text-right">Balance</th></tr></thead>
                                    <tbody>
                                        {ledgerReportData.transactions.map((row, i) => (
                                            <tr key={i} className="border-b dark:border-gray-700">
                                                <td className="p-2">{row.date}</td>
                                                <td className="p-2">{row.narration}</td>
                                                <td className="p-2 text-right">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                                <td className="p-2 text-right">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                                <td className="p-2 text-right font-semibold">{formatCurrency(Math.abs(row.balance))} {row.balance >= 0 ? 'Dr' : 'Cr'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="font-bold bg-gray-100 dark:bg-gray-800">
                                        <tr>
                                            <td colSpan={4} className="p-2 text-right">Closing Balance</td>
                                            <td className="p-2 text-right">{formatCurrency(Math.abs(ledgerReportData.finalBalance))} {ledgerReportData.finalBalance >= 0 ? 'Dr' : 'Cr'}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {activeTab === 'trial_balance' && (
                <div>
                     <h3 className="text-xl font-semibold mb-4">Trial Balance</h3>
                     <Card>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-200 dark:bg-gray-700"><tr><th className="p-2">Account</th><th className="p-2">Group</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th></tr></thead>
                                <tbody>
                                    {trialBalanceData.balances.map((row) => (
                                        <tr key={row.name} className="border-b dark:border-gray-700">
                                            <td className="p-2 font-medium">{row.name}</td>
                                            <td className="p-2">{row.group}</td>
                                            <td className="p-2 text-right">{row.balance > 0 ? formatCurrency(row.balance) : '-'}</td>
                                            <td className="p-2 text-right">{row.balance < 0 ? formatCurrency(-row.balance) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold text-lg bg-gray-100 dark:bg-gray-800">
                                    <tr>
                                        <td colSpan={2} className="p-2 text-right">Total</td>
                                        <td className="p-2 text-right">{formatCurrency(trialBalanceData.totalDebits)}</td>
                                        <td className="p-2 text-right">{formatCurrency(trialBalanceData.totalCredits)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                             {Math.abs(trialBalanceData.totalDebits - trialBalanceData.totalCredits) > 0.01 && (
                                <p className="text-red-500 font-bold text-center mt-4">Totals do not match! Difference: {formatCurrency(Math.abs(trialBalanceData.totalDebits - trialBalanceData.totalCredits))}</p>
                             )}
                        </div>
                     </Card>
                </div>
            )}
            
            <VoucherFormModal 
                isOpen={isVoucherModalOpen}
                onClose={() => setIsVoucherModalOpen(false)}
                voucherType={voucherType}
                onSave={onSaveJournalEntry}
                accounts={accounts}
            />
        </Card>
    );
};

// VoucherFormModal component
const VoucherFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    voucherType: VoucherType;
    onSave: (entry: Omit<JournalEntry, 'id' | 'voucherNumber'>) => Promise<void>;
    accounts: Account[];
}> = ({ isOpen, onClose, voucherType, onSave, accounts }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [narration, setNarration] = useState('');
    const [transactions, setTransactions] = useState<Array<{id: string, accountId: string, debit: string, credit: string}>>([
        { id: generateId(), accountId: '', debit: '', credit: '' },
        { id: generateId(), accountId: '', debit: '', credit: '' }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDate(new Date().toISOString().split('T')[0]);
            setNarration('');
            setTransactions([
                { id: generateId(), accountId: '', debit: '', credit: '' },
                { id: generateId(), accountId: '', debit: '', credit: '' }
            ]);
        }
    }, [isOpen, voucherType]);

    const handleTransactionChange = (id: string, field: 'accountId' | 'debit' | 'credit', value: string) => {
        setTransactions(prev => prev.map(t => {
            if (t.id === id) {
                if (field === 'debit' && value) return {...t, debit: value, credit: ''};
                if (field === 'credit' && value) return {...t, credit: value, debit: ''};
                return {...t, [field]: value};
            }
            return t;
        }));
    };

    const addTransactionRow = () => {
        setTransactions(prev => [...prev, { id: generateId(), accountId: '', debit: '', credit: '' }]);
    };
    
    const removeTransactionRow = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const totalDebit = useMemo(() => transactions.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0), [transactions]);
    const totalCredit = useMemo(() => transactions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0), [transactions]);

    const handleSave = async () => {
        if (Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit === 0) {
            alert('Total debits must equal total credits, and cannot be zero.');
            return;
        }

        const finalTransactions: Transaction[] = transactions
            .map(t => {
                const debit = parseFloat(t.debit) || 0;
                const credit = parseFloat(t.credit) || 0;
                if (!t.accountId || (debit === 0 && credit === 0)) return null;
                return {
                    accountId: t.accountId,
                    type: debit > 0 ? 'debit' : 'credit',
                    amount: debit > 0 ? debit : credit
                }
            })
            .filter((t): t is Transaction => t !== null);
        
        if (finalTransactions.length < 2) {
            alert('At least two transaction lines are required.');
            return;
        }

        setIsSaving(true);
        await onSave({
            date,
            voucherType,
            narration,
            transactions: finalTransactions
        });
        setIsSaving(false);
        onClose();
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`New ${voucherType} Voucher`} size="xl">
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm mb-1">Date</label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-2 text-left">Account</th>
                                <th className="p-2 text-right w-32">Debit</th>
                                <th className="p-2 text-right w-32">Credit</th>
                                <th className="p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id}>
                                    <td className="p-1">
                                        <Select value={t.accountId} onChange={e => handleTransactionChange(t.id, 'accountId', e.target.value)}>
                                            <option value="">-- Select Account --</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </Select>
                                    </td>
                                    <td className="p-1"><Input type="number" className="text-right" placeholder="0.00" value={t.debit} onChange={e => handleTransactionChange(t.id, 'debit', e.target.value)} /></td>
                                    <td className="p-1"><Input type="number" className="text-right" placeholder="0.00" value={t.credit} onChange={e => handleTransactionChange(t.id, 'credit', e.target.value)} /></td>
                                    <td className="p-1 text-center"><Button size="sm" variant="danger" onClick={() => removeTransactionRow(t.id)}><TrashIcon className="w-4 h-4"/></Button></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="font-bold bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <td className="p-2 text-right">Total</td>
                                <td className="p-2 text-right">{formatCurrency(totalDebit)}</td>
                                <td className="p-2 text-right">{formatCurrency(totalCredit)}</td>
                                <td className="p-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <Button size="sm" variant="secondary" onClick={addTransactionRow}><PlusIcon className="w-4 h-4"/> Add Row</Button>
                {Math.abs(totalDebit-totalCredit) > 0.01 && <p className="text-sm text-red-500 text-center">Totals do not match.</p>}


                 <div>
                    <label className="block text-sm mb-1">Narration</label>
                    <Input placeholder="Transaction details..." value={narration} onChange={e => setNarration(e.target.value)} />
                </div>
                 <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving}>Save Voucher</Button>
                </div>
            </div>
        </Modal>
    );
}

// --- Main Dashboard Component ---
interface DashboardProps { 
    currentUser: User;
    onLogout: () => void; 
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout }) => {
    const isSuperAdmin = currentUser.role === 'superadmin';
    const [view, setView] = useState<ViewType>(isSuperAdmin ? 'users' : 'dashboard');
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Data states
    const [collegeInfo, setCollegeInfo] = useState<CollegeInfo>({ name: '', address: '' });
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [workableSundays, setWorkableSundays] = useState<WorkableSunday[]>([]);
    const [attendance, setAttendance] = useState<AttendanceData>({});
    const [users, setUsers] = useState<User[]>([]);
    const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
    const [classFees, setClassFees] = useState<ClassFee[]>([]);
    const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
    const [feeConcessions, setFeeConcessions] = useState<FeeConcession[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

    
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                // Superadmin only needs user data
                if (isSuperAdmin) {
                    const usersData = await db.getUsers();
                    setUsers(usersData);
                } else {
                // Admin users get their own scoped data
                    const [
                        info, classesData, studentsData, holidaysData, workableSundaysData, attendanceData,
                        feeHeadsData, classFeesData, feePaymentsData, feeConcessionsData, accountsData,
                        journalEntriesData
                    ] = await Promise.all([
                        db.getCollegeInfo(), db.getClasses(), db.getStudents(), db.getHolidays(), 
                        db.getWorkableSundays(), db.getAttendance(), db.getFeeHeads(), db.getClassFees(), db.getFeePayments(),
                        db.getFeeConcessions(), db.getAccounts(), db.getJournalEntries()
                    ]);
                    setCollegeInfo(info); setClasses(classesData); setStudents(studentsData); 
                    setHolidays(holidaysData); setWorkableSundays(workableSundaysData); setAttendance(attendanceData);
                    setFeeHeads(feeHeadsData); setClassFees(classFeesData); setFeePayments(feePaymentsData);
                    setFeeConcessions(feeConcessionsData); 
                    setJournalEntries(journalEntriesData);
                    
                    if (accountsData.length === 0) {
                        const defaultAccounts: Account[] = [
                            { id: generateId(), name: 'Cash in Hand', group: 'Assets', openingBalance: 0, openingBalanceType: 'debit', isDefault: true },
                            { id: generateId(), name: 'Bank Account', group: 'Assets', openingBalance: 0, openingBalanceType: 'debit', isDefault: true },
                            { id: generateId(), name: 'Capital Account', group: 'Equity', openingBalance: 0, openingBalanceType: 'credit', isDefault: true },
                            { id: generateId(), name: 'Tuition Fees', group: 'Income', openingBalance: 0, openingBalanceType: 'credit', isDefault: true },
                            { id: generateId(), name: 'Late Fees', group: 'Income', openingBalance: 0, openingBalanceType: 'credit', isDefault: true },
                            { id: generateId(), name: 'Salaries', group: 'Expenses', openingBalance: 0, openingBalanceType: 'debit', isDefault: true },
                            { id: generateId(), name: 'Rent', group: 'Expenses', openingBalance: 0, openingBalanceType: 'debit', isDefault: true },
                            { id: generateId(), name: 'Utilities', group: 'Expenses', openingBalance: 0, openingBalanceType: 'debit', isDefault: true },
                        ];
                        setAccounts(defaultAccounts);
                        await db.saveAccounts(defaultAccounts);
                    } else {
                        setAccounts(accountsData);
                    }
                }
            } catch (error) {
                console.error("Failed to load data", error); showToast("Failed to load data from storage.", 'error');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [currentUser]); // Reload data when user changes

    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

    const handleSaveCollegeInfo = async (info: CollegeInfo) => {
        await db.saveCollegeInfo(info); setCollegeInfo(info); showToast('Institute info updated!', 'success');
    };

    const handleSaveClasses = async (updatedClasses: ClassInfo[]) => {
        const deletedClassIds = classes.filter(c => !updatedClasses.some(uc => uc.id === c.id)).map(c => c.id);
        if (deletedClassIds.length > 0) {
            // Delete students of deleted classes
            const updatedStudents = students.filter(s => !deletedClassIds.includes(s.classId));
            await handleSaveStudents(updatedStudents); // This will cascade delete payments
            // Delete class fee assignments
            const updatedClassFees = classFees.filter(cf => !deletedClassIds.includes(cf.classId));
            await handleSaveClassFees(updatedClassFees);
        }
        await db.saveClasses(updatedClasses); setClasses(updatedClasses); showToast('Classes updated!', 'success');
    };

    const handleSaveStudents = async (updatedStudents: Student[]) => {
        const deletedStudentIds = students.filter(s => !updatedStudents.some(us => us.id === s.id)).map(s => s.id);
        if (deletedStudentIds.length > 0) {
            // Delete payments of deleted students
            const updatedFeePayments = feePayments.filter(fp => !deletedStudentIds.includes(fp.studentId));
            await handleSaveFeePayments(updatedFeePayments);
             // Delete concessions of deleted students
            const updatedFeeConcessions = feeConcessions.filter(fc => !deletedStudentIds.includes(fc.studentId));
            await handleSaveFeeConcessions(updatedFeeConcessions);
            // Delete related journal entries
            const paymentIdsToDelete = feePayments.filter(fp => deletedStudentIds.includes(fp.studentId)).map(fp => fp.id);
            const updatedJournalEntries = journalEntries.filter(je => !je.relatedFeePaymentId || !paymentIdsToDelete.includes(je.relatedFeePaymentId));
            await handleSaveJournalEntries(updatedJournalEntries);
        }
        await db.saveStudents(updatedStudents); setStudents(updatedStudents); showToast('Students updated!', 'success');
    };
    
    const handleSaveHolidays = async (updatedHolidays: Holiday[]) => {
        await db.saveHolidays(updatedHolidays); setHolidays(updatedHolidays); showToast('Holidays updated!', 'success');
    };
    
    const handleSaveWorkableSundays = async (updatedSundays: WorkableSunday[]) => {
        await db.saveWorkableSundays(updatedSundays); 
        setWorkableSundays(updatedSundays); 
        showToast('Workable Sundays updated!', 'success');
    };

    const handleSaveAttendance = async (data: AttendanceData) => {
        await db.saveAttendance(data); setAttendance(data); showToast('Attendance saved!', 'success');
    };
    
    const handleSaveUsers = async (updatedUsers: User[]) => {
        await db.saveUsers(updatedUsers); setUsers(updatedUsers); showToast('Users updated!', 'success');
    }

    const handleSaveFeeHeads = async (data: FeeHead[]) => {
        await db.saveFeeHeads(data); setFeeHeads(data); showToast('Fee Heads updated!', 'success');
    };
    const handleSaveClassFees = async (data: ClassFee[]) => {
        await db.saveClassFees(data); setClassFees(data); showToast('Fee Assignments updated!', 'success');
    };
    const handleSaveFeePayments = async (data: FeePayment[]) => {
        await db.saveFeePayments(data); setFeePayments(data);
        if (data.length < feePayments.length) {
            // This means a deletion occurred
            const deletedPaymentIds = feePayments.filter(p => !data.some(dp => dp.id === p.id)).map(p => p.id);
            const updatedJournalEntries = journalEntries.filter(je => !je.relatedFeePaymentId || !deletedPaymentIds.includes(je.relatedFeePaymentId));
            await handleSaveJournalEntries(updatedJournalEntries);
        }
        showToast('Payments updated!', 'success');
    };
    const handleSaveFeeConcessions = async (data: FeeConcession[]) => {
        await db.saveFeeConcessions(data); setFeeConcessions(data); showToast('Concessions updated!', 'success');
    };
    const handleSaveAccounts = async (data: Account[]) => {
        await db.saveAccounts(data); setAccounts(data); showToast('Accounts updated!', 'success');
    };
    const handleSaveJournalEntries = async (data: JournalEntry[]) => {
        await db.saveJournalEntries(data); setJournalEntries(data); showToast('Journal updated!', 'success');
    };

    const handleSaveNewJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'voucherNumber'>) => {
        const lastVoucherNumber = journalEntries.reduce((max, je) => Math.max(max, je.voucherNumber), 0);
        const newEntry: JournalEntry = {
            ...entry,
            id: generateId(),
            voucherNumber: lastVoucherNumber + 1
        };
        const updatedJournalEntries = [...journalEntries, newEntry];
        await handleSaveJournalEntries(updatedJournalEntries);
    };

    const handleRestoreData = async (data: BackupData) => {
        try {
            await db.saveCollegeInfo(data.collegeInfo);
            await db.saveClasses(data.classes);
            await db.saveStudents(data.students);
            await db.saveHolidays(data.holidays);
            await db.saveWorkableSundays(data.workableSundays);
            await db.saveAttendance(data.attendance);
            await db.saveFeeHeads(data.feeHeads);
            await db.saveClassFees(data.classFees);
            await db.saveFeePayments(data.feePayments);
            await db.saveFeeConcessions(data.feeConcessions);
            await db.saveAccounts(data.accounts || []);
            await db.saveJournalEntries(data.journalEntries || []);
    
            showToast('Data restored successfully! The page will now reload.', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
    
        } catch (error) {
            console.error("Error during data restoration:", error);
            showToast('An error occurred during restoration.', 'error');
        }
    };


    const handleSelectClassForStudents = (id: string) => { setSelectedClassId(id); setView('students'); };
    
    const stats = useMemo(() => ({ classes: classes.length, students: students.length, holidays: holidays.length }), [classes, students, holidays]);
    
    const renderView = () => {
        if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        
        if (isSuperAdmin) {
            return <UserManager users={users} currentUser={currentUser} onSave={handleSaveUsers} />;
        }
        
        switch (view) {
            case 'college': return <CollegeInfoManager info={collegeInfo} onSave={handleSaveCollegeInfo} />;
            case 'classes': return <ClassManager classes={classes} onSave={handleSaveClasses} onSelectClass={handleSelectClassForStudents}/>;
            case 'students': return selectedClassId ? <StudentManager students={students} classes={classes} classId={selectedClassId} onSave={handleSaveStudents} onBack={() => { setView('classes'); setSelectedClassId(null); }} /> : <div>Please select a class first.</div>;
            case 'holidays': return <HolidayManager holidays={holidays} onSave={handleSaveHolidays} />;
            case 'workableSundays': return <WorkableSundayManager workableSundays={workableSundays} onSave={handleSaveWorkableSundays} />;
            case 'attendance': return <AttendanceManager collegeInfo={collegeInfo} classes={classes} students={students} holidays={holidays} workableSundays={workableSundays} attendance={attendance} onSave={handleSaveAttendance} onUpdateHolidays={handleSaveHolidays} />;
            case 'backup': {
                const allData: BackupData = {
                    collegeInfo, classes, students, holidays, workableSundays, 
                    attendance, feeHeads, classFees, feePayments, feeConcessions,
                    accounts, journalEntries
                };
                return <BackupRestoreManager allData={allData} onRestore={handleRestoreData} />;
            }
            case 'fees': return <FeeManager classes={classes} students={students} feeHeads={feeHeads} classFees={classFees} feePayments={feePayments} feeConcessions={feeConcessions} accounts={accounts} journalEntries={journalEntries} onSaveFeeHeads={handleSaveFeeHeads} onSaveClassFees={handleSaveClassFees} onSaveFeePayments={handleSaveFeePayments} onSaveFeeConcessions={handleSaveFeeConcessions} onSaveJournalEntry={handleSaveNewJournalEntry} />;
            case 'accounting': return <AccountingManager accounts={accounts} journalEntries={journalEntries} students={students} classes={classes} onSaveAccounts={handleSaveAccounts} onSaveJournalEntry={handleSaveNewJournalEntry} />;
            case 'users': return <p>Access denied.</p>; // Should not be reachable for admins
            default: return <DashboardHome stats={stats} />;
        }
    };
    
    const navItems: { id: ViewType, label: string, adminOnly?: boolean }[] = [
        { id: 'dashboard', label: 'Dashboard', adminOnly: true },
        { id: 'college', label: 'Institute Info', adminOnly: true },
        { id: 'classes', label: 'Classes & Students', adminOnly: true },
        { id: 'attendance', label: 'Attendance', adminOnly: true },
        { id: 'holidays', label: 'Holidays', adminOnly: true },
        { id: 'workableSundays', label: 'Workable Sundays', adminOnly: true },
        { id: 'fees', label: 'Fee Management', adminOnly: true },
        { id: 'accounting', label: 'Accounting', adminOnly: true },
        { id: 'backup', label: 'Backup & Restore', adminOnly: true },
    ];
    
    const superAdminNavItems: { id: ViewType, label: string }[] = [
        { id: 'users', label: 'Manage Users' }
    ];

    const handleNavClick = (viewId: ViewType) => {
        setView(viewId);
        if (viewId !== 'students') {
            setSelectedClassId(null);
        }
        if (viewId === 'classes') {
            setView('classes'); // Special case to show class list, from which one can select students.
        }
        setIsSidebarOpen(false);
    }

    const displayedNavItems = isSuperAdmin ? superAdminNavItems : navItems;

    return (
        <div className="relative min-h-screen md:flex bg-gray-100 dark:bg-gray-900">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black opacity-50 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg p-4 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col no-print`}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 truncate" title={isSuperAdmin ? "Super Admin" : collegeInfo.name}>
                        {isSuperAdmin ? "Super Admin" : collegeInfo.name}
                    </h1>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800 dark:hover:text-white"><CloseIcon /></button>
                </div>
                <nav className="flex-1">
                    {displayedNavItems.map(item => (
                        <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full text-left px-3 py-2 rounded-md font-medium transition-colors mb-1 ${view === item.id || (view === 'students' && item.id === 'classes') ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="border-t dark:border-gray-700 pt-4 mt-4">
                     <p className="text-sm text-gray-600 dark:text-gray-400">Logged in as:</p>
                     <p className="font-semibold truncate">{currentUser.email}</p>
                     <button onClick={onLogout} className="w-full text-left px-3 py-2 mt-2 rounded-md font-medium transition-colors hover:bg-red-100 dark:hover:bg-red-900 text-red-700 flex items-center gap-2">
                        <LogoutIcon className="w-5 h-5" /> Logout
                    </button>
                </div>

            </aside>
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 h-screen overflow-y-auto print-container">
                 <div className="flex items-center mb-4 md:hidden no-print">
                     <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"><MenuIcon /></button>
                     <h2 className="text-lg font-semibold ml-4">{[...navItems, ...superAdminNavItems].find(i => i.id === view)?.label}</h2>
                 </div>
                {renderView()}
            </main>
        </div>
    );
};

export default Dashboard;