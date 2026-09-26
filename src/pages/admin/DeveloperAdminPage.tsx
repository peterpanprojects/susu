import React, { useState } from 'react';
import { useSusu } from '../../context/SusuContext';
import { ShieldCheck, Layers, Users, CreditCard, Activity, AlertTriangle, RefreshCw, Plus, Sliders, UserCheck, Edit, Eye, FileText, X } from 'lucide-react';
import { GroupMember, AgentAccount } from '../../types/susu';

interface DeveloperAdminPageProps {
  initialTab?: 'overview' | 'agents' | 'groups' | 'users' | 'vault' | 'payments';
  onNavigate: (path: string) => void;
}

export const DeveloperAdminPage: React.FC<DeveloperAdminPageProps> = ({ initialTab = 'overview', onNavigate }) => {
  const { group, members, payments, schedule, updateGroupSettings, deleteGroup, resetSystemData, setRole, platformPaymentConfig, activeUser, agents, groups, setActiveAgentId, approveAgentKyc } = useSusu();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [agentStatusFilter, setAgentStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [adminLightboxImg, setAdminLightboxImg] = useState<{ label: string; src: string } | null>(null);

  React.useEffect(() => { setRole('super_admin'); }, []);
  React.useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  // FIXED - MEMOIZED (no more OOM)
  const totalPaidTransactions = React.useMemo(() => payments.filter(p => p.status === 'paid'), [payments]);
  const totalVolumeCollected = React.useMemo(() => totalPaidTransactions.reduce((sum, p) => sum + p.amount, 0), [totalPaidTransactions]);
  const totalPayoutPool = React.useMemo(() => schedule.reduce((sum, s) => sum + s.expectedPoolAmount, 0), [schedule]);
  const platformCommission = React.useMemo(() => totalVolumeCollected * 0.02, [totalVolumeCollected]);
  const displayCurrency = group?.currency || 'GH₵';

  const filteredAgents = React.useMemo(() => agents.filter((agent) => {
    const term = agentSearchTerm.toLowerCase().trim();
    if (term) {
      const ok = agent.firstName.toLowerCase().includes(term) || agent.surname.toLowerCase().includes(term) || agent.email?.toLowerCase().includes(term);
      if (!ok) return false;
    }
    if (agentStatusFilter === 'verified') return agent.adminApprovalStatus === 'verified';
    if (agentStatusFilter === 'pending') return agent.adminApprovalStatus === 'pending_admin_approval';
    if (agentStatusFilter === 'rejected') return agent.adminApprovalStatus === 'rejected';
    return true;
  }), [agents, agentSearchTerm, agentStatusFilter]);

  // FIXED - LIGHTWEIGHT PREVIEW (does NOT load base64 image until you click View)
  const renderDocumentPreview = (label: string, src?: string) => {
    if (!src) return null;
    return (
      <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '0.45rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          <button type="button" onClick={() => setAdminLightboxImg({ label, src })} style={{ background: '#065f46', color: '#fff', border: 'none', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.7rem' }}>View</button>
        </div>
        <div style={{ height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: '0.7rem', flexDirection: 'column' }}>
          <FileText size={18} /> {label}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="card" style={{ background: 'linear-gradient(135deg, #061B14 0%, #0A2920 100%)', color: '#fff', border: '2px solid var(--color-gold-500)', padding: '2rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff' }}>Platform Administration Console - FIXED</h1>
        <p>Authenticated as: {activeUser?.name || 'Super Admin'} | {displayCurrency} {totalVolumeCollected.toLocaleString()} Volume | {agents.length} Agents | {groups.length} Groups</p>
        <p style={{ color: '#22c55e', marginTop: '0.5rem' }}>✅ OOM Fix Active: Images load only on click</p>
      </div>

      {adminLightboxImg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setAdminLightboxImg(null)}>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', maxWidth: '90vw', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><strong>{adminLightboxImg.label}</strong><button onClick={() => setAdminLightboxImg(null)}><X size={18} /></button></div>
            <img src={adminLightboxImg.src} alt={adminLightboxImg.label} style={{ maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      <div className="card">
        <h3>Agents ({filteredAgents.length})</h3>
        <input value={agentSearchTerm} onChange={e => setAgentSearchTerm(e.target.value)} placeholder="Search agents..." className="form-input" style={{ width: '100%', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {filteredAgents.map(agent => (
            <div key={agent.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <strong>{agent.kycData?.fullName || `${agent.firstName} ${agent.surname}`}</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{agent.email}</div>
              <div style={{ marginTop: '0.5rem' }}>
                <span className={`status-pill ${agent.adminApprovalStatus === 'verified'? 'active' : 'pending'}`}>{agent.adminApprovalStatus}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                {renderDocumentPreview('ID Front', agent.kycData?.idCardFrontUrl)}
                {renderDocumentPreview('ID Back', agent.kycData?.idCardBackUrl)}
                {renderDocumentPreview('Selfie', agent.kycData?.selfieUrl)}
                {renderDocumentPreview('Biz Cert', agent.kycData?.businessCertificateUrl)}
              </div>
              <button onClick={() => approveAgentKyc(agent.id, 'Verified by Super Admin')} className="btn-gold" style={{ marginTop: '0.5rem', width: '100%' }}>Approve</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};