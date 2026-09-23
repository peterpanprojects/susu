import React, { useState } from 'react';
import { useSusu } from '../../context/SusuContext';
import {
  ShieldCheck,
  CreditCard,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Save,
  DollarSign,
  Sliders,
  Globe,
  Zap
} from 'lucide-react';
import { SuperAdminPaymentConfig, SystemLog } from '../../types/susu';
import { PaymentGatewayConfigForm } from '../payment/PaymentGatewayConfigForm';

interface MasterPaymentEngineTabProps {
  onAddSystemLog?: (log: SystemLog) => void;
}

export const MasterPaymentEngineTab: React.FC<MasterPaymentEngineTabProps> = ({ onAddSystemLog }) => {
  const { platformPaymentConfig, updatePlatformPaymentConfig, group, payments } = useSusu();

  const [paymentSubTab, setPaymentSubTab] = useState<'provider' | 'master_engine'>('provider');
  const [form, setForm] = useState<SuperAdminPaymentConfig>(platformPaymentConfig);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  // Compute platform-wide financial figures
  const totalPaidTransactions = payments.filter((p) => p.status === 'paid');
  const totalVolumeCollected = totalPaidTransactions.reduce((sum, p) => sum + p.amount, 0);
  const platformRevenue = (totalVolumeCollected * form.globalPlatformFeePercent) / 100;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlatformPaymentConfig(form);
    setSaved(true);
    if (onAddSystemLog) {
      onAddSystemLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'security',
        message: `MASTER PAYMENT CONFIG UPDATED: Primary gateway=${form.activeGateway}, mode=${form.environment}, platform_fee=${form.globalPlatformFeePercent}%, activation_fee=${form.agentActivationFee ?? 150}`,
        source: 'payment-engine-config'
      });
    }
    setTimeout(() => setSaved(false), 3500);
  };

  const handleToggleEmergencyFreeze = () => {
    const nextFreezeState = !form.emergencyPayoutFreeze;
    const updated = { ...form, emergencyPayoutFreeze: nextFreezeState };
    setForm(updated);
    updatePlatformPaymentConfig(updated);

    if (onAddSystemLog) {
      onAddSystemLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: nextFreezeState ? 'error' : 'security',
        message: nextFreezeState
          ? '🚨 CRITICAL ALERT: Super Admin activated GLOBAL OUTBOUND PAYOUT FREEZE across all Susu groups'
          : '✓ RESOLUTION: Super Admin deactivated global emergency payout freeze',
        source: 'emergency-circuit-breaker'
      });
    }
  };

  const toggleCurrency = (curr: string) => {
    const exists = form.supportedCurrencies.includes(curr);
    const updated = exists
      ? form.supportedCurrencies.filter((c) => c !== curr)
      : [...form.supportedCurrencies, curr];
    setForm({ ...form, supportedCurrencies: updated });
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Sub-tab Navigation */}
      <div className="payment-config-tabs-nav" style={{ marginBottom: '1.75rem' }}>
        <button
          type="button"
          className={`payment-config-tab-btn ${paymentSubTab === 'provider' ? 'active' : ''}`}
          onClick={() => setPaymentSubTab('provider')}
        >
          <Sliders size={16} /> Gateway Provider Settings
        </button>
        <button
          type="button"
          className={`payment-config-tab-btn ${paymentSubTab === 'master_engine' ? 'active' : ''}`}
          onClick={() => setPaymentSubTab('master_engine')}
        >
          <Zap size={16} /> Platform Rails & Settlement Engine
        </button>
      </div>

      {paymentSubTab === 'provider' ? (
        <PaymentGatewayConfigForm isSuperAdmin={true} onAddSystemLog={onAddSystemLog} />
      ) : (
        <div>
          {/* SECTION 0: CRITICAL EMERGENCY CIRCUIT BREAKER */}
          <div
            className="card"
        style={{
          background: form.emergencyPayoutFreeze
            ? 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)'
            : 'linear-gradient(135deg, #0A2920 0%, #061B14 100%)',
          border: form.emergencyPayoutFreeze ? '3px solid #ef4444' : '2px solid var(--color-gold-500)',
          color: '#fff',
          padding: '1.5rem 2rem',
          marginBottom: '2rem',
          boxShadow: form.emergencyPayoutFreeze ? '0 0 25px rgba(239, 68, 68, 0.4)' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <AlertTriangle size={22} color={form.emergencyPayoutFreeze ? '#fca5a5' : '#E5A93C'} />
              <span
                style={{
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  color: form.emergencyPayoutFreeze ? '#fca5a5' : 'var(--color-gold-400)'
                }}
              >
                PLATFORM EMERGENCY CIRCUIT BREAKER
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: 0 }}>
              Global Outbound Payout Freeze Switch
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.25rem', maxWidth: '650px' }}>
              When activated, this emergency kill-switch instantly halts all automated bank transfers, Mobile Money 
              payouts, and settlement jobs platform-wide to protect pooled capital in the event of fraud, audit, or banking rail disruption.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: form.emergencyPayoutFreeze ? '#fca5a5' : '#86efac'
              }}
            >
              Status: {form.emergencyPayoutFreeze ? 'FREEZE ACTIVE (HALTED)' : 'NORMAL OPERATIONS'}
            </span>
            <button
              type="button"
              onClick={handleToggleEmergencyFreeze}
              style={{
                background: form.emergencyPayoutFreeze ? '#ef4444' : 'rgba(239, 68, 68, 0.2)',
                color: '#ffffff',
                border: '2px solid #ef4444',
                padding: '0.75rem 1.5rem',
                borderRadius: '999px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: form.emergencyPayoutFreeze ? '0 0 15px #ef4444' : 'none'
              }}
            >
              {form.emergencyPayoutFreeze ? '🚨 Deactivate Emergency Freeze' : '⚠️ Freeze All Platform Payouts'}
            </button>
          </div>
        </div>
      </div>

      {saved && (
        <div
          style={{
            background: 'var(--color-emerald-100)',
            color: 'var(--color-emerald-950)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <CheckCircle2 size={20} color="#047857" />
          Master Platform Payment Configuration updated successfully! Active across all groups and API endpoints.
        </div>
      )}

      {/* Financial Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>
            Master Settlement Gateway
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-emerald-950)', margin: '0.3rem 0', textTransform: 'uppercase' }}>
            {form.activeGateway}
          </div>
          <div style={{ fontSize: '0.75rem', color: form.environment === 'live' ? '#16a34a' : '#d97706', fontWeight: 700 }}>
            Environment: {form.environment === 'live' ? '● PRODUCTION LIVE' : '○ SANDBOX TEST'}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>
            Platform Fee Take ({form.globalPlatformFeePercent}%)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold-700)', margin: '0.3rem 0' }}>
            {group.currency} {platformRevenue.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            Min Fee: {group.currency}{form.minTransactionFee.toFixed(2)} per transaction
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>
            Outbound Settlement Rail
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-emerald-900)', margin: '0.4rem 0' }}>
            {form.payoutDisbursementMethod.replace('_', ' ').toUpperCase()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            Mode: {form.settlementMode.replace('_', ' ')}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* SECTION 1: MASTER GATEWAY ENGINE & ENVIRONMENT */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={20} color="var(--color-emerald-800)" />
                Master Gateway Engine & Payment Rails
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
                Select the primary payment processor for collecting member card & MoMo transactions.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Primary Gateway Provider</label>
              <select
                className="form-select"
                value={form.activeGateway}
                onChange={(e) => setForm({ ...form, activeGateway: e.target.value as any })}
              >
                <option value="paystack">Paystack (Ghana, Nigeria, SA, Kenya) — Recommended</option>
                <option value="flutterwave">Flutterwave (Direct Clearing & Pan-Africa)</option>
                <option value="hubtel">Hubtel MoMo (Ghana Direct Carrier Billing)</option>
                <option value="stripe">Stripe International (USD / EUR / GBP)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Gateway Environment Mode</label>
              <select
                className="form-select"
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value as any })}
              >
                <option value="test">Sandbox / Test Mode (Simulated Money)</option>
                <option value="live">Production / Live Mode (Real Banking Rails)</option>
              </select>
            </div>
          </div>

          {/* Multi-Gateway Failover */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Automated Gateway Failover Circuit</strong>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  Automatically route payment traffic to secondary provider if primary processor experiences downtime.
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.enableMultiGatewayFallback}
                  onChange={(e) => setForm({ ...form, enableMultiGatewayFallback: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-emerald-700)' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {form.enableMultiGatewayFallback ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>

            {form.enableMultiGatewayFallback && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Secondary / Fallback Gateway Provider</label>
                <select
                  className="form-select"
                  value={form.fallbackGateway}
                  onChange={(e) => setForm({ ...form, fallbackGateway: e.target.value as any })}
                >
                  <option value="flutterwave">Flutterwave Fallback</option>
                  <option value="hubtel">Hubtel MoMo Fallback</option>
                  <option value="none">No Secondary Fallback</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: MASTER SECRET CREDENTIALS VAULT */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} color="var(--color-emerald-800)" />
              Master API Keys & Credentials Vault
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
              Encrypted platform credentials used to authenticate payment processor API requests and settlement operations.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Master Public API Key</label>
              <input
                type="text"
                className="form-input"
                value={form.masterPublicKey}
                onChange={(e) => setForm({ ...form, masterPublicKey: e.target.value })}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', display: 'block' }}>
                Sent in frontend client initialization headers.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Master Secret API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  className="form-input"
                  value={form.masterSecretKey}
                  onChange={(e) => setForm({ ...form, masterSecretKey: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem', paddingRight: '2.5rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  style={{ position: 'absolute', right: '10px', top: '12px', background: 'transparent', color: '#666' }}
                >
                  {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', display: 'block' }}>
                Used for transfer disbursement and refund API calls.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Global Webhook Endpoint URL</label>
              <input
                type="text"
                className="form-input"
                value={form.webhookUrl}
                onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Webhook Secret Signature (HMAC)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  className="form-input"
                  value={form.webhookSecret}
                  onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem', paddingRight: '2.5rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  style={{ position: 'absolute', right: '10px', top: '12px', background: 'transparent', color: '#666' }}
                >
                  {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: PLATFORM MONETIZATION & ESCROW TREASURY */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={20} color="var(--color-emerald-800)" />
              Platform Monetization & Escrow Treasury
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
              Define global platform commission cuts and master bank account for pooling escrow funds.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Global Platform Commission Fee (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="15"
                  className="form-input"
                  value={form.globalPlatformFeePercent}
                  onChange={(e) => setForm({ ...form, globalPlatformFeePercent: parseFloat(e.target.value) || 0 })}
                  style={{ width: '120px', fontWeight: 700 }}
                  required
                />
                <span style={{ fontWeight: 600, color: '#444' }}>% of transaction volume</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', display: 'block' }}>
                Platform revenue retained before splitting settlement with groups.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Transaction Fee ({group.currency})</label>
              <input
                type="number"
                step="0.05"
                min="0"
                className="form-input"
                value={form.minTransactionFee}
                onChange={(e) => setForm({ ...form, minTransactionFee: parseFloat(e.target.value) || 0 })}
                style={{ width: '120px', fontWeight: 700 }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem', maxWidth: '340px' }}>
            <label className="form-label">Default Agent Activation Fee ({group.currency})</label>
            <input
              type="number"
              step="1"
              min="1"
              className="form-input"
              value={form.agentActivationFee ?? 150}
              onChange={(e) => setForm({ ...form, agentActivationFee: Number(e.target.value) || 0 })}
              style={{ fontWeight: 700 }}
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', display: 'block' }}>
              This fee is used for every new agent activation checkout and is persisted to the platform config.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Platform Master Treasury Account (Escrow Vault)</label>
            <input
              type="text"
              className="form-input"
              value={form.platformTreasuryAccount}
              onChange={(e) => setForm({ ...form, platformTreasuryAccount: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Automated Payout Settlement Mode</label>
              <select
                className="form-select"
                value={form.settlementMode}
                onChange={(e) => setForm({ ...form, settlementMode: e.target.value as any })}
              >
                <option value="automatic_cron">Automatic Cron (Sunday 23:59 GMT Release)</option>
                <option value="manual_admin_approval">Manual Super Admin Approval Required</option>
                <option value="agent_2fa">Agent 2FA Authorization Required</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Outbound Payout Disbursement Rail</label>
              <select
                className="form-select"
                value={form.payoutDisbursementMethod}
                onChange={(e) => setForm({ ...form, payoutDisbursementMethod: e.target.value as any })}
              >
                <option value="paystack_transfers">Paystack Transfers API (Bank & MoMo)</option>
                <option value="flutterwave_bulk">Flutterwave Bulk Transfers Rail</option>
                <option value="hubtel_momo">Hubtel Direct Mobile Money Bulk Rail</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: RISK, VELOCITY & COMPLIANCE LIMITS */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--color-emerald-800)" />
              Risk Controls, AML & Webhook Security
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
              Platform velocity thresholds and signature verification rules.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Max Daily Contribution Limit per Member ({group.currency})</label>
              <input
                type="number"
                min="100"
                step="500"
                className="form-input"
                value={form.maxDailyTransactionLimit}
                onChange={(e) => setForm({ ...form, maxDailyTransactionLimit: parseInt(e.target.value) || 5000 })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mandatory KYC Pool Threshold ({group.currency})</label>
              <input
                type="number"
                min="1000"
                step="1000"
                className="form-input"
                value={form.maxPoolKycThreshold}
                onChange={(e) => setForm({ ...form, maxPoolKycThreshold: parseInt(e.target.value) || 20000 })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Allowed Webhook Source IP Whitelist</label>
            <input
              type="text"
              className="form-input"
              value={form.webhookIpWhitelist}
              onChange={(e) => setForm({ ...form, webhookIpWhitelist: e.target.value })}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', display: 'block' }}>
              Requests originating from other IP addresses will return HTTP 403 Forbidden.
            </span>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.enforceHmacSignatures}
                onChange={(e) => setForm({ ...form, enforceHmacSignatures: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-emerald-700)' }}
              />
              <span style={{ fontSize: '0.9rem' }}>
                <strong>Strictly Enforce HMAC SHA512 Signatures</strong> on all incoming webhook payloads (`x-paystack-signature`)
              </span>
            </label>
          </div>
        </div>

        {/* SECTION 5: SUPPORTED PLATFORM CURRENCIES */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={20} color="var(--color-emerald-800)" />
              Multi-Currency Platform Matrix
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
              Toggle which regional currency denominations are supported when agents create new Susu groups.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { code: 'GH₵', label: 'GH₵ — Ghanaian Cedi (GHS)' },
              { code: '₦', label: '₦ — Nigerian Naira (NGN)' },
              { code: '$', label: '$ — US Dollar (USD)' },
              { code: '£', label: '£ — British Pound (GBP)' },
              { code: 'KES', label: 'KES — Kenyan Shilling' },
              { code: 'XOF', label: 'XOF — West African CFA Franc' }
            ].map((c) => {
              const isSelected = form.supportedCurrencies.includes(c.code);
              return (
                <div
                  key={c.code}
                  onClick={() => toggleCurrency(c.code)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid var(--color-gold-500)' : '1px solid #cbd5e1',
                    background: isSelected ? 'var(--color-gold-50)' : '#fff',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ accentColor: 'var(--color-gold-600)' }}
                  />
                  {c.label}
                </div>
              );
            })}
          </div>

          <div className="form-group" style={{ marginBottom: 0, maxWidth: '300px' }}>
            <label className="form-label">Base Platform Accounting Currency</label>
            <select
              className="form-select"
              value={form.baseCurrency}
              onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}
            >
              {form.supportedCurrencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Save Button Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="submit"
            className="btn-gold"
            style={{ padding: '0.85rem 2.5rem', fontSize: '1rem' }}
          >
            <Save size={18} /> Save Master Payment Config
          </button>
        </div>
      </form>
    </div>
      )}
    </div>
  );
};
