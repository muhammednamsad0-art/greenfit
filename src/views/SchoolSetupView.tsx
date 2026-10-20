import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppState } from '@/lib/types';
import { School, GraduationCap, Users, Hash, Save, Check } from 'lucide-react';

interface SchoolSetupProps {
  state: AppState | null;
  onStateChange: () => void;
}

export function SchoolSetupView({ state, onStateChange }: SchoolSetupProps) {
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');
  const [division, setDivision] = useState('');
  const [studentCount, setStudentCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state) {
      setSchoolName(state.school_name || '');
      setGrade(state.grade || '');
      setDivision(state.division || '');
      setStudentCount(state.student_count || 0);
    }
  }, [state]);

  async function save() {
    if (!state?.user_id) return;
    setSaving(true);
    await supabase
      .from('app_state')
      .update({
        school_name: schoolName,
        grade,
        division,
        student_count: studentCount,
      })
      .eq('user_id', state.user_id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onStateChange();
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 shadow-lg">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-slate-800">School Setup</h3>
            <p className="text-sm text-slate-500">Tell us about your classroom</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* School Name */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <School className="w-4 h-4 text-indigo-500" />
              School Name
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Green Valley High School"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 outline-none text-slate-700 bg-white/70"
            />
          </div>

          {/* Grade */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              Grade
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 outline-none text-slate-700 bg-white/70"
            >
              <option value="">Select grade...</option>
              {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].map((g) => (
                <option key={g} value={g}>{g} Grade</option>
              ))}
            </select>
          </div>

          {/* Division */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-teal-500" />
              Division / Section
            </label>
            <input
              type="text"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="e.g. Section A"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 outline-none text-slate-700 bg-white/70"
            />
          </div>

          {/* Student Count */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-green-500" />
              Student Count
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStudentCount(Math.max(0, studentCount - 1))}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 font-bold text-xl active:scale-90 transition-all"
              >
                -
              </button>
              <input
                type="number"
                value={studentCount}
                onChange={(e) => setStudentCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="min-w-0 flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 outline-none text-slate-700 text-center font-bold text-lg bg-white/70"
              />
              <button
                onClick={() => setStudentCount(studentCount + 1)}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 font-bold text-xl active:scale-90 transition-all"
              >
                +
              </button>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={save}
            disabled={saving}
            className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:shadow-xl'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-5 h-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save School Info'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info card */}
      {schoolName && grade && (
        <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-pop-in">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100">
            <School className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="font-bold text-slate-800">{schoolName}</div>
            <div className="text-sm text-slate-500">
              {grade} Grade{division ? ` · ${division}` : ''} · {studentCount} students
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
