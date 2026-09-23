import React from 'react';
import { useSusu } from '../../context/SusuContext';
import { Calendar, Lock, ArrowUp, ArrowDown, Shuffle, Info, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getWeekDateRangeFormatted } from '../../utils/dates';

export const RotationCalendarPage: React.FC = () => {
  const {
    schedule,
    members,
    group,
    groups,
    myGroups,
    activeGroupId,
    setActiveGroupId,
    reorderCalendar,
    shuffleCalendar
  } = useSusu();

  const agentGroupsList = myGroups;

  if (!group) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-slate-500)' }}>
        No group found. Please create or select a Susu group first.
      </div>
    );
  }

  const currentWeekIdx = schedule.findIndex((s) => s.status === 'current');
  const safeCurrentIdx = currentWeekIdx >= 0 ? currentWeekIdx : 0;

  return (
    <div className="rotation-calendar-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <span className="badge-agent">PAYOUT ROTATION BUILDER</span>
            {agentGroupsList.length > 1 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '2px 8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>Circle:</span>
                <select
                  value={activeGroupId || group.id}
                  onChange={(e) => setActiveGroupId(e.target.value)}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-emerald-950)',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '2px 4px'
                  }}
                >
                  {agentGroupsList.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.currency}{g.fixedDailyAmount}/d)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 0.35rem 0' }}>Weekly Payout Rotation Calendar</h1>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem', margin: 0 }}>
            Circle: <strong>{group.name}</strong> · 1 Member = 1 Week = 1 Payout. Total {schedule.length} weeks in Cycle starting <strong>{group.cycleStartDate}</strong>.
          </p>
        </div>

        <button className="btn-gold" onClick={() => shuffleCalendar()}>
          <Shuffle size={16} /> Random Shuffle Future Weeks
        </button>
      </div>

      {/* Lock Notice Banner */}
      <div
        style={{
          background: 'var(--color-emerald-50)',
          border: '1px solid var(--color-emerald-300)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: 'var(--color-emerald-950)'
        }}
      >
        <ShieldCheck size={24} color="var(--color-emerald-700)" />
        <div>
          <strong>Strict Rotation Protection Rules Active:</strong>
          <br />
          Past and current active payout weeks (Weeks 1 to #{safeCurrentIdx + 1}) are <strong>locked 🔒</strong> to preserve recipient payout guarantees. Only future upcoming weeks can be reordered by the Agent.
        </div>
      </div>

      {/* Rotation Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Week #</th>
                <th>Mon–Sun Date Range</th>
                <th>Assigned Payout Recipient</th>
                <th>Expected Pool Amount</th>
                <th>Payout Status</th>
                <th style={{ textAlign: 'right' }}>Reorder Position</th>
              </tr>
            </thead>
            <tbody>
              {schedule.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-slate-500)' }}>
                    No payout rotation scheduled yet. Invite members to your group to automatically generate weekly payout turns.
                  </td>
                </tr>
              ) : (
                schedule.map((week, idx) => {
                  const isLocked = idx <= safeCurrentIdx;
                  const dateRangeText = getWeekDateRangeFormatted(week.weekStartDate);

                  return (
                    <tr
                      key={week.id}
                      style={{
                        backgroundColor: week.status === 'current' ? 'var(--color-gold-100)' : undefined
                      }}
                    >
                    <td>
                      <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
                        Week {week.weekNumber}
                      </strong>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
                        {dateRangeText}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                        {week.weekStartDate} → {week.weekEndDate}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-emerald-950)', fontSize: '1rem' }}>
                        {week.memberName}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--color-emerald-800)', fontSize: '1.05rem' }}>
                        {group.currency}{week.expectedPoolAmount.toLocaleString()}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${week.status}`}>
                        {isLocked && <Lock size={12} />}
                        {week.status === 'paid_out' ? 'Paid Out (Locked)' : week.status === 'current' ? 'Active Current Week (Locked)' : 'Upcoming'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {!isLocked ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem' }}>
                          <button
                            className="btn-outline"
                            style={{ padding: '0.3rem 0.5rem' }}
                            disabled={idx <= safeCurrentIdx + 1}
                            onClick={() => reorderCalendar(idx, idx - 1)}
                            title="Move Up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            className="btn-outline"
                            style={{ padding: '0.3rem 0.5rem' }}
                            disabled={idx >= schedule.length - 1}
                            onClick={() => reorderCalendar(idx, idx + 1)}
                            title="Move Down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', fontStyle: 'italic' }}>
                          🔒 Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
