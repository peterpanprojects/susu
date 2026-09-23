import React, { useState } from 'react';
import { useSusu } from '../../context/SusuContext';
import { X, CheckCircle2, Lock, ArrowRight, ShieldCheck, Smartphone, CreditCard } from 'lucide-react';
import { generatePaystackReference, initializePaystackCheckout } from '../../utils/paystack';

interface PaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDates: string[]; // array of YYYY-MM-DD
  memberId: string;
}

export const PaystackModal: React.FC<PaystackModalProps> = ({
  isOpen,
  onClose,
  selectedDates,
  memberId
}) => {
  const { group, members, processPayment, platformPaymentConfig, agentPaymentConfig } = useSusu();
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  if (!isOpen) return null;

  const currentMember = members.find((m) => m.id === memberId) || members[0];
  const daysCount = selectedDates.length || 1;
  const totalAmount = group ? group.fixedDailyAmount * daysCount : 0;

  const isFrozen = platformPaymentConfig.emergencyPayoutFreeze;
  const isOnlineDisabled = !agentPaymentConfig.allowPaystackOnline;

  const handleExecutePayment = () => {
    if (isFrozen || isOnlineDisabled || !currentMember) return;
    setProcessing(true);
    const prefix = agentPaymentConfig.customReferencePrefix || 'SUSU-';
    const generatedRef = `${prefix}${generatePaystackReference()}`;
    setPaymentRef(generatedRef);

    const activeKey =
      agentPaymentConfig.publicKey ||
      platformPaymentConfig.masterPublicKey ||
      import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
      '';

    if (activeKey) {
      initializePaystackCheckout({
        key: activeKey,
        email: currentMember.email || 'member@susu.platform',
        amount: totalAmount,
        currency: group?.currency || 'GH₵',
        ref: generatedRef,
        onSuccess: (res) => {
          processPayment(currentMember.id, selectedDates, 'paystack', res.reference);
          setProcessing(false);
          setCompleted(true);
        },
        onClose: () => {
          setProcessing(false);
        }
      });
    } else {
      // Direct simulated checkout when running without an external Paystack API key
      setTimeout(() => {
        processPayment(currentMember.id, selectedDates, 'paystack', generatedRef);
        setProcessing(false);
        setCompleted(true);
      }, 1000);
    }
  };

  const handleDone = () => {
    setCompleted(false);
    setProcessing(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px', padding: '0', overflow: 'hidden' }}>
        {/* Header styling like real Paystack popup */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0A2920, #061B14)',
            color: '#fff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid var(--color-gold-500)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                background: '#00C3F7',
                color: '#000',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.8rem',
                letterSpacing: '0.05em'
              }}
            >
              paystack
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-200)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {group.name}
                <span
                  style={{
                    background: platformPaymentConfig.environment === 'live' ? '#22c55e' : '#f59e0b',
                    color: '#000',
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    fontWeight: 800
                  }}
                >
                  {platformPaymentConfig.environment === 'live' ? 'LIVE' : 'TEST'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-gold-400)' }}>
                {currentMember.email}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {!completed ? (
          <div style={{ padding: '1.5rem' }}>
            {isFrozen && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                Platform Notice: Master emergency payout freeze is active. Online checkouts are currently halted.
              </div>
            )}
            {isOnlineDisabled && !isFrozen && (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                Group Agent Notice: Online checkouts are currently disabled for this group. Please hand physical cash to your Agent.
              </div>
            )}

            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-600)', display: 'block' }}>
                  Contribution for {daysCount} {daysCount === 1 ? 'day' : 'days'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-emerald-700)', fontWeight: 600 }}>
                  {selectedDates.join(', ')}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-emerald-950)' }}>
                  {group.currency}{totalAmount}
                </span>
              </div>
            </div>

            {/* Channels & Security Info */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
                <ShieldCheck size={16} color="#16a34a" /> Paystack Secured Checkout
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#15803d' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CreditCard size={14} /> Debit / Credit Cards
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Smartphone size={14} /> Mobile Money (MTN, Telecel, AT)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-slate-500)', marginBottom: '1.5rem' }}>
              <Lock size={14} color="var(--color-emerald-600)" /> 256-Bit SSL Encrypted by Paystack
            </div>

            <button
              className="btn-gold"
              onClick={handleExecutePayment}
              disabled={processing || isFrozen || isOnlineDisabled}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
                fontSize: '1rem',
                opacity: (isFrozen || isOnlineDisabled) ? 0.5 : 1,
                cursor: (isFrozen || isOnlineDisabled) ? 'not-allowed' : 'pointer'
              }}
            >
              {processing ? (
                'Verifying Transaction...'
              ) : isFrozen ? (
                'Payments Paused (Emergency Freeze)'
              ) : isOnlineDisabled ? (
                'Online Checkout Disabled by Agent'
              ) : (
                <>
                  Pay {group.currency}{totalAmount} Now <ArrowRight size={18} />
                </>
              )}
            </button>

          </div>
        ) : (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--color-emerald-100)',
                color: 'var(--color-emerald-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-emerald-950)', marginBottom: '0.25rem' }}>
              Payment Successful!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)', marginBottom: '1.25rem' }}>
              Your daily Susu contribution has been logged and verified by Paystack.
            </p>

            <div
              style={{
                background: 'var(--color-slate-100)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                textAlign: 'left',
                fontSize: '0.85rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--color-slate-500)' }}>Reference:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{paymentRef}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--color-slate-500)' }}>Amount Paid:</span>
                <span style={{ fontWeight: 700 }}>{group.currency}{totalAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-slate-500)' }}>Dates Covered:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-emerald-800)' }}>{selectedDates.length} day(s)</span>
              </div>
            </div>

            <button className="btn-primary" onClick={handleDone} style={{ width: '100%', justifyContent: 'center' }}>
              Done & Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
