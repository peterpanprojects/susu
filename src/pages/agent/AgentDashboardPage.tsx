import React, { useState } from 'react';
import { useSusu } from '../../context/SusuContext';
import { getWeekDays, formatShortDate, getDayOfWeekShort } from '../../utils/dates';
import { Banknote, Users, Calendar, ArrowUpRight, CheckCircle2, Clock, AlertCircle, Plus, RefreshCw, CreditCard, Award, Sliders, ShieldCheck, Key, Layers } from 'lucide-react';
import { InviteMemberModal } from '../../components/agent/InviteMemberModal';
import { ManualPayModal } from '../../components/agent/ManualPayModal';
import { CreateGroupModal } from '../../components/agent/CreateGroupModal';

interface AgentDashboardPageProps {
  onNavigate: (path: string) => void;
}

export const AgentDashboardPage: React.FC<AgentDashboardPageProps> = ({ onNavigate }) => {
  const {
    group,
    groups,
    myGroups,
    activeGroupId,
    setActiveGroupId,
    members,
    schedule,
    payments,
    markCashPayment,
    agentAccount,
    createGroup
  } = useSusu();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [manualPayModalOpen, setManualPayModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [selectedMemberForCash, setSelectedMemberForCash] = useState<string>('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAmount, setNewGroupAmount] = useState(20);
  const [newGroupCurrency, setNewGroupCurrency] = useState('GH₵');

  // If no group exists yet, show setup prompt
  if (!group) {
    return (
      <div style={{ maxWidth: '560px', margin: '3rem auto', padding: '0 1rem' }}>
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--color-emerald-950)' }}>Welcome, Agent!</h1>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            Your account has been verified. Set up your first Susu group to start managing rotating savings and inviting members.
          </p>
          {!showCreateGroup ? (
            <button className="btn-gold" style={{ padding: '0.9rem 2.5rem', fontSize: '1rem' }} onClick={() => setShowCreateGroup(true)}>
              + Create My Susu Group
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newGroupName.trim()) {
                  createGroup(newGroupName.trim(), newGroupAmount, undefined, newGroupCurrency);
                }
              }}
              style={{ textAlign: 'left' }}
            >
              <div className="form-group">
                <label className="form-label">Group Name *</label>
                <input className="form-input" required value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Daily Amount *</label>
                  <input className="form-input" type="number" min={1} required value={newGroupAmount} onChange={e => setNewGroupAmount(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-input" value={newGroupCurrency} onChange={e => setNewGroupCurrency(e.target.value)}>
                    <option value="GH₵">GH₵ (Ghana Cedi)</option>
                    <option value="₦">₦ (Nigerian Naira)</option>
                    <option value="$">$ (US Dollar)</option>
                    <option value="£">£ (British Pound)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem' }}>
                Create Group &amp; Start Managing
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Filter members belonging strictly to current group
  const currentGroupMembers = members.filter((m) => m.groupId === group.id);

  // Determine current active week
  const currentWeek = schedule.find((s) => s.status === 'current') || schedule[0];
  const activeMonday = currentWeek ? currentWeek.weekStartDate : group.cycleStartDate;
  const currentWeekDays = getWeekDays(activeMonday);

  // Expected vs collected calculations strictly for this group for current week
  const totalExpectedThisWeek = group.fixedDailyAmount * 7 * currentGroupMembers.length;
  const currentWeekPayments = payments.filter((p) => p.groupId === group.id && currentWeekDays.includes(p.paymentDate));
  const paidPayments = currentWeekPayments.filter((p) => p.status === 'paid');
  const totalCollectedThisWeek = paidPayments.reduce((acc, p) => acc + p.amount, 0);
  const collectionPercentage = Math.round((totalCollectedThisWeek / (totalExpectedThisWeek || 1)) * 100) || 0;

  // Next payout recipient
  const nextPayoutMember = currentWeek ? currentGroupMembers.find((m) => m.id === currentWeek.memberId) : currentGroupMembers[0];

  const agentGroupsList = myGroups;

  return (
    <div className="agent-dashboard">
      {/* Header Banner */}
      <div className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            <span className="badge-agent">AGENT ORGANIZER PANEL</span>
            {agentGroupsList.length > 1 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '2px 8px' }}>
                <Layers size={14} color="#b45309" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>Switch Circle:</span>
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
                  id="dashboard-group-switcher"
                >
                  {agentGroupsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.currency}{g.fixedDailyAmount}/d)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => onNavigate('/agent/groups')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-emerald-700)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              View All ({agentGroupsList.length})
            </button>
          </div>
          <h1>{group.name}</h1>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem' }}>
            Cycle Start Date: <strong>{group.cycleStartDate}</strong> | Fixed Daily Contribution:{' '}
            <strong style={{ color: 'var(--color-emerald-900)' }}>{group.currency}{group.fixedDailyAmount}/day</strong> (Mon–Sun)
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            className="btn-gold"
            onClick={() => setCreateGroupModalOpen(true)}
            id="btn-create-group-dash"
            title="Create another Susu savings circle"
          >
            <Plus size={16} /> + New Group
          </button>
          <button className="btn-outline" onClick={() => onNavigate('/agent/settings')} title="Set Susu Daily Amount and Cycle">
            <Sliders size={16} /> Set Susu Amount
          </button>
          <button className="btn-outline" onClick={() => onNavigate('/agent/calendar')} title="Schedule Weekly Distribution Table">
            <Calendar size={16} /> Rotation Calendar
          </button>
          <button className="btn-outline" onClick={() => onNavigate('/agent/payment-config')} title="Setup Receiving Momo & Bank Channels">
            <CreditCard size={16} /> Payment Config
          </button>
          <button className="btn-gold" onClick={() => setInviteModalOpen(true)} title="Generate Unique Code & Invite">
            <Plus size={16} /> Invite Member
          </button>
          <button className="btn-primary" onClick={() => setManualPayModalOpen(true)}>
            <Banknote size={16} /> Cash Override
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Collected This Week</span>
            <Banknote size={20} color="var(--color-emerald-700)" />
          </div>
          <div className="metric-value">
            {group.currency}{totalCollectedThisWeek.toLocaleString()}
            <span className="metric-total">/ {group.currency}{totalExpectedThisWeek.toLocaleString()}</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${collectionPercentage}%` }} />
          </div>
          <span className="metric-sub">{collectionPercentage}% collected of week total</span>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Current Payout Recipient</span>
            <Calendar size={20} color="var(--color-gold-600)" />
          </div>
          <div className="metric-value" style={{ fontSize: '1.4rem' }}>
            {nextPayoutMember ? nextPayoutMember.name : 'Unassigned'}
          </div>
          <div className="metric-sub" style={{ color: 'var(--color-gold-700)', fontWeight: 600 }}>
            {currentWeek ? `Week #${currentWeek.weekNumber} Recipient (${group.currency}${currentWeek.expectedPoolAmount.toLocaleString()})` : 'Awaiting members to build cycle'}
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Group Members</span>
            <Users size={20} color="var(--color-emerald-700)" />
          </div>
          <div className="metric-value">
            {members.length} Members
          </div>
          <div className="metric-sub" style={{ color: 'var(--color-emerald-800)', fontWeight: 600 }}>
            {members.length > 0 ? 'Active Rotation Cycle' : 'No members enrolled'}
          </div>
        </div>
      </div>

      {/* Daily Contribution Matrix for Active Week */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>Active Week Payment Matrix (Mon–Sun)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
              Week #{currentWeek?.weekNumber || 1} ({activeMonday} to {currentWeekDays[6]})
            </p>
          </div>
          <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => onNavigate('/agent/payments')}>
            View All Payments Ledger <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member Name</th>
                {currentWeekDays.map((dStr) => (
                  <th key={dStr} style={{ textAlign: 'center' }}>
                    {getDayOfWeekShort(dStr)} <br />
                    <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>{formatShortDate(dStr)}</span>
                  </th>
                ))}
                <th style={{ textAlign: 'right' }}>Week Total</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={currentWeekDays.length + 2} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-slate-500)' }}>
                    No members in this Susu group yet. Click <strong>+ Invite Member</strong> to get started.
                  </td>
                </tr>
              ) : (
                members.map((mem) => {
                const memWeekPayments = payments.filter(
                  (p) => p.memberId === mem.id && currentWeekDays.includes(p.paymentDate)
                );
                const memPaidCount = memWeekPayments.filter((p) => p.status === 'paid').length;
                const memPaidTotal = memPaidCount * group.fixedDailyAmount;

                return (
                  <tr key={mem.id}>
                    <td>
                      <div
                        style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--color-emerald-900)' }}
                        onClick={() => onNavigate(`/agent/members/${mem.id}`)}
                      >
                        {mem.name}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                        Pos #{mem.positionInRotation} in Rotation
                      </span>
                    </td>

                    {currentWeekDays.map((dStr) => {
                      const pay = memWeekPayments.find((p) => p.paymentDate === dStr);
                      const status = pay ? pay.status : 'pending';

                      return (
                        <td key={dStr} style={{ textAlign: 'center' }}>
                          {status === 'paid' ? (
                            <span
                              className="status-pill paid"
                              title={`Paid via ${pay?.paymentMethod === 'cash_override' ? 'Cash' : 'Paystack'}`}
                            >
                              <CheckCircle2 size={12} /> Paid
                            </span>
                          ) : status === 'missed' ? (
                            <span className="status-pill missed">
                              <AlertCircle size={12} /> Missed
                            </span>
                          ) : (
                            <button
                              className="status-pill pending"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedMemberForCash(mem.id);
                                setManualPayModalOpen(true);
                              }}
                              title="Click to mark cash paid"
                            >
                              <Clock size={12} /> Pending
                            </button>
                          )}
                        </td>
                      );
                    })}

                    <td style={{ textAlign: 'right', fontWeight: 800 }}>
                      {group.currency}{memPaidTotal}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rotation Calendar Preview */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>Payout Rotation Builder Summary</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
              1 Member = 1 Payout Week ({currentGroupMembers.length} Total Weeks in Cycle)
            </p>
          </div>
          <button className="btn-gold" style={{ fontSize: '0.85rem' }} onClick={() => onNavigate('/agent/calendar')}>
            Manage Calendar Queue <Calendar size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Week #</th>
                <th>Week Dates (Mon–Sun)</th>
                <th>Scheduled Recipient</th>
                <th>Expected Pool Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((item) => (
                <tr key={item.id}>
                  <td><strong>Week {item.weekNumber}</strong></td>
                  <td>{item.weekStartDate} to {item.weekEndDate}</td>
                  <td><strong>{item.memberName}</strong></td>
                  <td>{group.currency}{item.expectedPoolAmount.toLocaleString()}</td>
                  <td>
                    <span className={`status-pill ${item.status}`}>
                      {item.status === 'paid_out' ? 'Paid Out' : item.status === 'current' ? 'Active Payout Week' : 'Upcoming'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <InviteMemberModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      <ManualPayModal
        isOpen={manualPayModalOpen}
        onClose={() => setManualPayModalOpen(false)}
        defaultMemberId={selectedMemberForCash}
      />
      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        onSuccess={(newId) => setActiveGroupId(newId)}
      />

      <style>{`
        .agent-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .badge-agent {
          background: var(--color-gold-100);
          color: var(--color-gold-700);
          padding: 0.2rem 0.6rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 800;
          display: inline-block;
          margin-bottom: 0.4rem;
        }
        .dashboard-actions {
          display: flex;
          gap: 0.75rem;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .metric-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .metric-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-slate-600);
        }
        .metric-value {
          font-size: 1.8rem;
          font-weight: 800;
          font-family: var(--font-heading);
          color: var(--color-emerald-950);
          margin: 0.5rem 0;
        }
        .metric-total {
          font-size: 1rem;
          color: var(--color-slate-500);
          font-weight: 500;
        }
        .progress-bar-bg {
          background: var(--color-slate-200);
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .progress-bar-fill {
          background: var(--color-emerald-600);
          height: 100%;
          border-radius: 999px;
        }
        .metric-sub {
          font-size: 0.75rem;
          color: var(--color-slate-500);
        }
        @media (max-width: 900px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
