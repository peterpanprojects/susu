import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AgentAccount,
  AgentKycData,
  AgentPaymentConfig,
  AppNotification,
  DailyPayment,
  FeedPost,
  GroupMember,
  LiveSupportConfig,
  PaymentMethod,
  PayoutScheduleWeek,
  SuperAdminPaymentConfig,
  SusuGroup,
  User,
  UserRole
} from '../types/susu';

import { formatDateStr, getNearestMonday } from '../utils/dates';
import { generatePayoutSchedule, reorderRotationQueue, shuffleFutureRotation } from '../utils/rotation';
import { generatePaystackReference } from '../utils/paystack';
import { DatabaseService } from '../services/db';

export interface PlatformSettings {
  agentActivationFee: number;
  currency: string;
  treasuryAccount: string;
}

export interface SusuContextType {
  currentUserRole: UserRole;
  activeMemberId: string;
  activeUser: User;
  group: SusuGroup | null;
  groups: SusuGroup[];
  myGroups: SusuGroup[];
  myMembers: GroupMember[];
  myPayments: DailyPayment[];
  activeGroupId: string;
  setActiveGroupId: (groupId: string) => void;
  members: GroupMember[];
  schedule: PayoutScheduleWeek[];
  payments: DailyPayment[];
  posts: FeedPost[];
  agentAccount: AgentAccount;
  agents: AgentAccount[];
  activeAgentId: string;
  setActiveAgentId: (agentId: string) => void;
  createAgent: (data: Partial<AgentAccount>) => AgentAccount;
  agentPaymentConfig: AgentPaymentConfig;
  platformPaymentConfig: SuperAdminPaymentConfig;
  platformSettings: PlatformSettings;
  setRole: (role: UserRole, memberId?: string) => void;
  createGroup: (name: string, fixedDailyAmount: number, cycleStartDate?: string, currency?: string, agentId?: string) => SusuGroup;
  updateGroupSettings: (settings: Partial<SusuGroup>, groupId?: string) => void;
  updateAgentPaymentConfig: (config: Partial<AgentPaymentConfig>) => void;
  updatePlatformPaymentConfig: (config: Partial<SuperAdminPaymentConfig>) => void;
  updatePlatformSettings: (settings: Partial<PlatformSettings>) => void;
  registerAgentKyc: (kycData: AgentKycData) => void;
  activateAgentAccount: (paymentMethod: string, txRef: string) => void;
  approveAgentKyc: (agentId: string, notes?: string) => void;
  rejectAgentKyc: (agentId: string, reason: string) => void;
  updateAgentAccount: (agentIdOrPartial: string | Partial<AgentAccount>, partial?: Partial<AgentAccount>) => void;
  updateAgentKyc: (agentIdOrKyc: string | Partial<AgentKycData>, kycData?: Partial<AgentKycData>) => void;
  deleteAgent: (agentIdOrOptions?: string | { resetGroup?: boolean }, options?: { resetGroup?: boolean }) => void;
  updateMemberProfile: (memberId: string, partial: Partial<GroupMember>) => void;
  loginWithUniqueCode: (code: string) => boolean;
  inviteMember: (name: string, email: string, phone: string) => { token: string; inviteUrl: string; uniqueCode: string };
  acceptInviteToken: (token: string, name: string, phone: string) => boolean;
  removeMember: (memberId: string) => void;
  deleteGroup: (groupId?: string) => void;
  markCashPayment: (memberId: string, dateStr: string) => void;
  processPayment: (memberId: string, dates: string[], method: PaymentMethod, paystackRef?: string) => void;
  reorderCalendar: (fromIndex: number, toIndex: number) => void;
  shuffleCalendar: () => void;
  addFeedPost: (title: string, body: string, visibility: 'public' | 'group') => void;
  resetDemoData: () => void;
  resetSystemData: () => void;
  getMemberReliability: (memberId: string) => number;
  selectRotationSlot: (memberId: string, targetWeekNumber: number, roleOverride?: UserRole) => { success: boolean; message: string };
  liveSupportConfig: LiveSupportConfig;
  updateLiveSupportConfig: (config: Partial<LiveSupportConfig>) => void;
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  clearAllNotifications: () => void;
}

// One-time purge of legacy cached demo data from localStorage
if (typeof window !== 'undefined') {
  const DEMO_PURGE_FLAG = 'susu_demo_purged_v2';
  if (localStorage.getItem(DEMO_PURGE_FLAG) !== 'true') {
    localStorage.removeItem('susu_platform_live_db_v1');
    localStorage.removeItem('susu_platform_live_db_v2');
    localStorage.removeItem('susu_agent_registry');
    localStorage.removeItem('susu_current_agent_id');
    localStorage.removeItem('susu_current_agent_email');
    localStorage.removeItem('susu_active_agent_id');
    localStorage.removeItem('susu_active_group_id');
    localStorage.removeItem('susu_active_member_id');
    localStorage.removeItem('susu_agent_payment_configs');
    localStorage.setItem(DEMO_PURGE_FLAG, 'true');
  }
}

const STORAGE_KEY = 'susu_platform_live_db_v2';
const AGENT_REGISTRY_KEY = 'susu_agent_registry_v2'; // Map of email -> AgentAccount for ALL agents
const CURRENT_AGENT_ID_KEY = 'susu_current_agent_id'; // Email of currently logged-in agent
const PLATFORM_SETTINGS_KEY = 'susu_platform_settings';

const INITIAL_SUPER_ADMIN_USER: User = {
  id: 'usr-super-admin',
  name: 'Super Administrator',
  email: import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'admin@susu.platform',
  phone: '',
  role: 'super_admin',
  avatarUrl: ''
};

const INITIAL_AGENT_USER: User = {
  id: 'usr-agent-1',
  name: 'Agent Organizer',
  email: '',
  phone: '',
  role: 'agent',
  avatarUrl: ''
};

export const INITIAL_AGENT_PAYMENT_CONFIG: AgentPaymentConfig = {
  provider: 'paystack',
  paymentMode: 'live',
  gatewayStatus: 'active',
  storeCheckoutType: 'Direct online payments',
  publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
  secretKey: import.meta.env.VITE_PAYSTACK_SECRET_KEY || '',
  webhookSecret: '',
  enableDirectStoreProcessing: true,
  minResellerTopUp: 10.0,
  payoutMethod: 'momo',
  momoProvider: 'MTN',
  momoNumber: '',
  momoAccountName: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  bankBranch: '',
  allowPaystackOnline: true,
  allowCashOverride: true,
  allowBankTransfer: true,
  agentCommissionPercent: 1.5,
  dailyCutoffTime: '22:00',
  gracePeriodHours: 24,
  autoSendSmsReceipts: true,
  requireCashReceiptProof: false,
  paystackSubaccountCode: '',
  customReferencePrefix: 'SUSU-'
};

export const INITIAL_PLATFORM_PAYMENT_CONFIG: SuperAdminPaymentConfig = {
  provider: 'paystack',
  paymentMode: 'live',
  gatewayStatus: 'active',
  storeCheckoutType: 'Direct online payments',
  publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
  secretKey: import.meta.env.VITE_PAYSTACK_SECRET_KEY || '',
  enableDirectStoreProcessing: true,
  minResellerTopUp: 10.0,
  activeGateway: 'paystack',
  environment: 'live',
  masterPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
  masterSecretKey: import.meta.env.VITE_PAYSTACK_SECRET_KEY || '',
  webhookSecret: '',
  webhookUrl: '',
  enableMultiGatewayFallback: false,
  fallbackGateway: 'none',
  globalPlatformFeePercent: 2.0,
  minTransactionFee: 0.50,
  agentActivationFee: 150,
  platformTreasuryAccount: '',
  settlementMode: 'automatic_cron',
  payoutDisbursementMethod: 'paystack_transfers',
  emergencyPayoutFreeze: false,
  supportedCurrencies: ['GH₵', '₦', '$', '£'],
  baseCurrency: 'GH₵',
  maxDailyTransactionLimit: 10000,
  maxPoolKycThreshold: 50000,
  enforceHmacSignatures: true,
  webhookIpWhitelist: ''
};

export const INITIAL_PLATFORM_SETTINGS: PlatformSettings = {
  agentActivationFee: 150,
  currency: 'GH₵',
  treasuryAccount: ''
};

export const EMPTY_AGENT_ACCOUNT: AgentAccount = {
  id: '',
  firstName: '',
  surname: '',
  email: '',
  phone: '',
  isOtpVerified: false,
  isKycSubmitted: false,
  isActivated: false,
  activationFeeAmount: 150,
  adminApprovalStatus: 'rejected',
  licenseNumber: '',
  kycData: undefined
};

export const INITIAL_AGENTS: AgentAccount[] = [];

export const INITIAL_AGENT_ACCOUNT: AgentAccount = EMPTY_AGENT_ACCOUNT;

export const INITIAL_LIVE_SUPPORT_CONFIG: LiveSupportConfig = {
  provider: 'rezolv',
  enabled: true,
  apiKey: import.meta.env.VITE_REZOLV_API_KEY || '',
  welcomeMessage: 'Hello! How can we help you with your Susu account today?',
  autoReply: true
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
const INITIAL_POSTS: FeedPost[] = [];

const SusuContext = createContext<SusuContextType | undefined>(undefined);

export const SusuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('susu_current_role') as UserRole;
    return saved || 'visitor';
  });
  const [activeMemberId, setActiveMemberIdState] = useState<string>(() => {
    return localStorage.getItem('susu_active_member_id') || '';
  });

  const setActiveMemberId = (id: string) => {
    setActiveMemberIdState(id);
    if (id) {
      localStorage.setItem('susu_active_member_id', id);
    } else {
      localStorage.removeItem('susu_active_member_id');
    }
  };

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    const saved = localStorage.getItem(PLATFORM_SETTINGS_KEY);
    if (saved) {
      try { return {...INITIAL_PLATFORM_SETTINGS,...JSON.parse(saved) }; } catch {}
    }
    const main = localStorage.getItem(STORAGE_KEY);
    if (main) {
      try {
        const p = JSON.parse(main);
        if (p.platformPaymentConfig?.agentActivationFee) {
          return {...INITIAL_PLATFORM_SETTINGS, agentActivationFee: p.platformPaymentConfig.agentActivationFee };
        }
      } catch {}
    }
    return INITIAL_PLATFORM_SETTINGS;
  });

  const updatePlatformSettings = (settings: Partial<PlatformSettings>) => {
    setPlatformSettings(prev => {
      const next = {...prev,...settings };
      localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
    // Also sync to platformPaymentConfig for backwards compat
    setPlatformPaymentConfig(prev => ({...prev, agentActivationFee: settings.agentActivationFee?? prev.agentActivationFee }));
  };

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { const parsed = JSON.parse(saved); if (parsed.notifications) return parsed.notifications; } catch {}
    }
    return INITIAL_NOTIFICATIONS;
  });

  const markNotificationAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id? {...n, read: true } : n));
  const markAllNotificationsAsRead = () => setNotifications(prev => prev.map(n => ({...n, read: true })));
  const addNotification = (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const newNotif: AppNotification = {...notification, id: `notif-${Date.now()}`, read: false, createdAt: Date.now() };
    setNotifications(prev => [newNotif,...prev]);
  };
  const clearAllNotifications = () => setNotifications([]);

  const [liveSupportConfig, setLiveSupportConfig] = useState<LiveSupportConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { const parsed = JSON.parse(saved); if (parsed.liveSupportConfig) return {...INITIAL_LIVE_SUPPORT_CONFIG,...parsed.liveSupportConfig }; } catch {}
    }
    return INITIAL_LIVE_SUPPORT_CONFIG;
  });
  const updateLiveSupportConfig = (config: Partial<LiveSupportConfig>) => setLiveSupportConfig(prev => ({...prev,...config }));

  // ── Multi-Agent Registry: each agent keyed by email ──
  const [agentRegistry, setAgentRegistry] = useState<Record<string, AgentAccount>>(() => {
    const regStr = localStorage.getItem(AGENT_REGISTRY_KEY);
    if (regStr) { try { return JSON.parse(regStr); } catch {} }
    return {};
  });

  const [agents, setAgents] = useState<AgentAccount[]>(() => {
    const agentMap = new Map<string, AgentAccount>();

    // 1. Layer on agents from old STORAGE_KEY
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.agents)) {
          parsed.agents.forEach((a: AgentAccount) => { if (a.id) agentMap.set(a.id, a); });
        } else if (parsed.agentAccount && parsed.agentAccount.id) {
          agentMap.set(parsed.agentAccount.id, parsed.agentAccount);
        }
      } catch {}
    }

    // 2. Layer on agents from registry (most recent data wins)
    const regStr = localStorage.getItem(AGENT_REGISTRY_KEY);
    if (regStr) {
      try {
        const registry = JSON.parse(regStr);
        const registryAgents = Object.values(registry) as AgentAccount[];
        registryAgents.forEach(a => { if (a.id) agentMap.set(a.id, a); });
      } catch {}
    }

    return Array.from(agentMap.values());
  });

  const [currentAgentId, setCurrentAgentIdState] = useState<string>(() => {
    return localStorage.getItem(CURRENT_AGENT_ID_KEY) || '';
  });

  const [activeAgentId, setActiveAgentIdState] = useState<string>(() => {
    const currentEmail = localStorage.getItem(CURRENT_AGENT_ID_KEY);
    if (currentEmail) {
      const regStr = localStorage.getItem(AGENT_REGISTRY_KEY);
      if (regStr) {
        try {
          const registry = JSON.parse(regStr);
          if (registry[currentEmail]) return registry[currentEmail].id;
        } catch {}
      }
    }
    return localStorage.getItem('susu_active_agent_id') || '';
  });

  const setActiveAgentId = (agentId: string) => {
    setActiveAgentIdState(agentId);
    localStorage.setItem('susu_active_agent_id', agentId);
    localStorage.setItem('susu_current_agent_id', agentId);
    // Also update current agent email in registry
    const agent = agents.find(a => a.id === agentId);
    if (agent?.email) {
      const emailKey = agent.email.toLowerCase();
      localStorage.setItem('susu_current_agent_email', emailKey);
      setCurrentAgentIdState(agentId);
    }
    // STRICT MULTI-AGENT ISOLATION: Validate and switch activeGroupId to this agent's circle
    const agentGroups = groups.filter(g => g.agentId === agentId);
    if (agentGroups.length > 0) {
      const isCurrentValid = agentGroups.some(g => g.id === activeGroupId);
      if (!isCurrentValid) {
        setActiveGroupIdState(agentGroups[0].id);
        localStorage.setItem('susu_active_group_id', agentGroups[0].id);
      }
    } else {
      setActiveGroupIdState('');
      localStorage.setItem('susu_active_group_id', '');
    }
  };

  const agentAccount: AgentAccount = (() => {
    // 1. Try from agents array by activeAgentId
    if (activeAgentId) {
      const fromArray = agents.find(a => a.id === activeAgentId);
      if (fromArray) return fromArray;
    }
    // 2. Try from registry by current email
    const currentEmail = localStorage.getItem(CURRENT_AGENT_ID_KEY);
    if (currentEmail && agentRegistry[currentEmail]) return agentRegistry[currentEmail];
    // 3. Fallback
    return agents[0] || EMPTY_AGENT_ACCOUNT;
  })();

  // ── Sync agents array to registry whenever agents change ──
  useEffect(() => {
    const updated: Record<string, AgentAccount> = {};
    agents.forEach(agent => {
      if (agent.email) {
        updated[agent.email.toLowerCase()] = agent;
      }
    });
    setAgentRegistry(updated);
    localStorage.setItem(AGENT_REGISTRY_KEY, JSON.stringify(updated));
  }, [agents]);

  const [groups, setGroups] = useState<SusuGroup[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.groups) && parsed.groups.length > 0) return parsed.groups;
        if (parsed.group) return [parsed.group];
      } catch {}
    }
    return [];
  });

  const [activeGroupId, setActiveGroupIdState] = useState<string>(() => {
    const savedActive = localStorage.getItem('susu_active_group_id');
    if (savedActive) return savedActive;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeGroupId) return parsed.activeGroupId;
        if (parsed.group?.id) return parsed.group.id;
        if (Array.isArray(parsed.groups) && parsed.groups[0]?.id) return parsed.groups[0].id;
      } catch {}
    }
    return '';
  });

  const setActiveGroupId = (groupId: string) => {
    setActiveGroupIdState(groupId);
    localStorage.setItem('susu_active_group_id', groupId);
  };

  const [members, setMembers] = useState<GroupMember[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { const parsed = JSON.parse(saved); if (parsed.members) return parsed.members; } catch {} }
    return [];
  });

  const [payments, setPayments] = useState<DailyPayment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { const parsed = JSON.parse(saved); if (parsed.payments) return parsed.payments; } catch {} }
    return [];
  });

  const [posts, setPosts] = useState<FeedPost[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { const parsed = JSON.parse(saved); if (parsed.posts) return parsed.posts; } catch {} }
    return INITIAL_POSTS;
  });

  // STRICT MULTI-AGENT ISOLATION: Resolve active group strictly without cross-agent leaking
  const group: SusuGroup | null = (() => {
    if (groups.length === 0) return null;
    if (currentUserRole === 'agent') {
      const agentGroups = groups.filter(g => g.agentId === activeAgentId);
      if (agentGroups.length === 0) return null; // STRICT: If agent has no circles, group is null. Never leak another agent's group!
      const selected = agentGroups.find(g => g.id === activeGroupId);
      if (selected) return selected;
      return agentGroups[0];
    }
    if (currentUserRole === 'member') {
      const activeMember = members.find(m => m.id === activeMemberId) || members[0];
      if (activeMember?.groupId) {
        const memberGroup = groups.find(g => g.id === activeMember.groupId);
        if (memberGroup) return memberGroup;
      }
      const selected = groups.find(g => g.id === activeGroupId);
      return selected || groups[0] || null;
    }
    const selected = groups.find(g => g.id === activeGroupId);
    return selected || groups[0] || null;
  })();

  const myGroups = groups.filter(g => g.agentId === activeAgentId);
  const myGroupIds = new Set(myGroups.map(g => g.id));
  const myMembers = members.filter(m => m.groupId && myGroupIds.has(m.groupId));
  const myPayments = payments.filter(p => p.groupId && myGroupIds.has(p.groupId));

  // STRICT MULTI-AGENT ISOLATION: Key agent payment configs per agent ID
  const [agentPaymentConfigs, setAgentPaymentConfigs] = useState<Record<string, AgentPaymentConfig>>(() => {
    const saved = localStorage.getItem('susu_agent_payment_configs');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      try {
        const p = JSON.parse(legacy);
        if (p.agentPaymentConfig) return { default: { ...INITIAL_AGENT_PAYMENT_CONFIG, ...p.agentPaymentConfig } };
      } catch {}
    }
    return {};
  });

  const agentPaymentConfig: AgentPaymentConfig = (() => {
    if (activeAgentId && agentPaymentConfigs[activeAgentId]) {
      return agentPaymentConfigs[activeAgentId];
    }
    if (currentUserRole === 'member' && group?.agentId && agentPaymentConfigs[group.agentId]) {
      return agentPaymentConfigs[group.agentId];
    }
    return INITIAL_AGENT_PAYMENT_CONFIG;
  })();

  const updateAgentPaymentConfig = (config: Partial<AgentPaymentConfig>) => {
    const aid = activeAgentId || 'default';
    setAgentPaymentConfigs(prev => {
      const current = prev[aid] || INITIAL_AGENT_PAYMENT_CONFIG;
      const updated = { ...prev, [aid]: { ...current, ...config } };
      try {
        localStorage.setItem('susu_agent_payment_configs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const [platformPaymentConfig, setPlatformPaymentConfig] = useState<SuperAdminPaymentConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.platformPaymentConfig) return {...INITIAL_PLATFORM_PAYMENT_CONFIG,...parsed.platformPaymentConfig, agentActivationFee: parsed.platformPaymentConfig.agentActivationFee || INITIAL_PLATFORM_SETTINGS.agentActivationFee };
      } catch {}
    }
    return {...INITIAL_PLATFORM_PAYMENT_CONFIG, agentActivationFee: platformSettings.agentActivationFee };
  });

  const [schedule, setSchedule] = useState<PayoutScheduleWeek[]>([]);
  useEffect(() => {
    if (!group) { setSchedule([]); return; }
    // Strictly isolate rotation schedule to members of this specific group
    const groupMembers = members.filter(m => m.groupId === group.id);
    setSchedule(generatePayoutSchedule(group.id, group.cycleStartDate, groupMembers, group.fixedDailyAmount));
  }, [group, members]);

  const [isDbLoaded, setIsDbLoaded] = useState(false);

  useEffect(() => {
    DatabaseService.loadState().then((dbState) => {
      setGroups(dbState.groups || (dbState.group ? [dbState.group] : []));
      setMembers(dbState.members || []);
      setPayments(dbState.payments || []);
      setPosts(dbState.posts || []);
      setAgents(dbState.agents || (dbState.agentAccount ? [dbState.agentAccount] : []));
      if (dbState.agentPaymentConfigs && Object.keys(dbState.agentPaymentConfigs).length > 0) {
        setAgentPaymentConfigs(prev => ({ ...prev, ...dbState.agentPaymentConfigs }));
      } else if (dbState.agentPaymentConfig) {
        setAgentPaymentConfigs(prev => ({ ...prev, default: dbState.agentPaymentConfig! }));
      }
      if (dbState.platformPaymentConfig) {
        setPlatformPaymentConfig(dbState.platformPaymentConfig);
        if (dbState.platformPaymentConfig.agentActivationFee) {
          setPlatformSettings(prev => ({...prev, agentActivationFee: dbState.platformPaymentConfig.agentActivationFee }));
        }
      }
      if (dbState.liveSupportConfig) setLiveSupportConfig(dbState.liveSupportConfig);
      if (dbState.notifications?.length) setNotifications(dbState.notifications);
      setIsDbLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isDbLoaded) return;
    const stateToSave = {
      group,
      groups,
      activeGroupId,
      members,
      payments,
      posts,
      agentAccount,
      agents,
      agentPaymentConfig,
      agentPaymentConfigs,
      platformPaymentConfig,
      liveSupportConfig,
      notifications
    };
    DatabaseService.persistState(stateToSave as any).catch(err => console.warn('DB sync:', err));
    localStorage.setItem('susu_current_role', currentUserRole);
  }, [isDbLoaded, group, groups, activeGroupId, members, payments, posts, agentAccount, agents, agentPaymentConfig, agentPaymentConfigs, platformPaymentConfig, liveSupportConfig, notifications, currentUserRole]);

  // FIXED: Derive Active User correctly - Super Admin NEVER shows agent name
  const getActiveUser = (): User => {
    if (currentUserRole === 'super_admin') {
      return {
       ...INITIAL_SUPER_ADMIN_USER,
        name: 'Super Administrator',
        email: import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'admin@susu.platform',
        role: 'super_admin',
        id: 'usr-super-admin'
      };
    }
    if (currentUserRole === 'agent') {
      const agentName = agentAccount.kycData?.fullName || [agentAccount.firstName, agentAccount.surname].filter(Boolean).join(' ').trim();
      return {
        id: agentAccount.id,
        name: agentName || 'Agent Organizer',
        email: agentAccount.email || INITIAL_AGENT_USER.email,
        phone: agentAccount.phone || INITIAL_AGENT_USER.phone,
        role: 'agent',
        avatarUrl: agentAccount.avatarUrl || agentAccount.kycData?.selfieUrl || (agentAccount.email ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(agentAccount.email)}` : INITIAL_AGENT_USER.avatarUrl)
      };
    }
    if (currentUserRole === 'visitor') {
      return { id: 'usr-visitor', name: 'Guest Visitor', email: 'guest@example.com', phone: '', role: 'visitor' };
    }
    const mem = members.find((m) => m.id === activeMemberId) || members[0];
    if (!mem) return { id: 'usr-member-guest', name: 'Member', email: '', phone: '', role: 'member' };
    return { id: mem.userId, name: mem.name, email: mem.email, phone: mem.phone, role: 'member', avatarUrl: mem.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mem.name)}` };
  };

  const setRole = (role: UserRole, memberId?: string) => {
    setCurrentUserRole(role);
    localStorage.setItem('susu_current_role', role);
    if (role === 'member') {
      const resolved = memberId || activeMemberId || members[0]?.id || '';
      setActiveMemberId(resolved);
    }
  };

  const createGroup = (name: string, fixedDailyAmount: number, cycleStartDate?: string, currency?: string, agentId?: string): SusuGroup => {
    const currentAgentId = localStorage.getItem('susu_current_agent_id') || activeAgentId || '';
    const assignedAgentId = agentId || (currentUserRole === 'agent' ? currentAgentId : (agentAccount?.id || agents[0]?.id || ''));
    const newGroup: SusuGroup = {
      id: `group-${Date.now()}`,
      agentId: assignedAgentId,
      name,
      fixedDailyAmount,
      currency: currency || 'GH₵',
      cycleStartDate: cycleStartDate || getNearestMonday(),
      status: 'active',
      createdAt: formatDateStr(new Date()),
      paystackPublicKey: ''
    };
    setGroups(prev => [newGroup, ...prev]);
    setActiveGroupId(newGroup.id);
    DatabaseService.createGroup(newGroup).catch(err => console.error('DatabaseService createGroup error:', err));
    return newGroup;
  };

  const updateGroupSettings = (settings: Partial<SusuGroup>, groupId?: string) => {
    const targetId = groupId || activeGroupId || group?.id;
    if (!targetId) return;
    setGroups(prev => prev.map(g => g.id === targetId ? { ...g, ...settings } : g));
  };

  const updatePlatformPaymentConfig = (config: Partial<SuperAdminPaymentConfig>) => {
    setPlatformPaymentConfig(prev => ({...prev,...config }));
    if (config.agentActivationFee!== undefined) {
      updatePlatformSettings({ agentActivationFee: config.agentActivationFee });
    }
  };

  const createAgent = (data: Partial<AgentAccount>): AgentAccount => {
    const newId = `agt-${Date.now()}`;
    const newAgent: AgentAccount = {
      ...INITIAL_AGENT_ACCOUNT,
      id: newId,
      licenseNumber: `SUSU-AGT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      activationFeeAmount: platformSettings.agentActivationFee,
      ...data
    };
    setAgents(prev => [newAgent, ...prev]);
    setActiveAgentId(newId);
    localStorage.setItem('susu_current_agent_id', newId);
    // Register in agent registry by email
    if (newAgent.email) {
      const emailKey = newAgent.email.toLowerCase();
      localStorage.setItem('susu_current_agent_email', emailKey);
    }
    return newAgent;
  };

  const registerAgentKyc = (kycData: AgentKycData) => {
    setAgents(prev => prev.map(a => {
      if (a.id === activeAgentId) {
        return {
          ...a,
          kycData,
          isKycSubmitted: true,
          licenseNumber: a.licenseNumber && !a.licenseNumber.includes('Pending') ? a.licenseNumber : `SUSU-AGT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
        };
      }
      return a;
    }));
  };

  const activateAgentAccount = (paymentMethod: string, txRef: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === activeAgentId) {
        return {
          ...a,
          isActivated: true,
          activationPaidAt: new Date().toISOString(),
          activationTxRef: txRef,
          adminApprovalStatus: 'pending_admin_approval',
          licenseNumber: a.licenseNumber && !a.licenseNumber.includes('Pending') ? a.licenseNumber : `SUSU-AGT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
        };
      }
      return a;
    }));
  };

  const approveAgentKyc = (agentId: string, notes?: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        return {
          ...a,
          adminApprovalStatus: 'verified',
          adminApprovedAt: new Date().toISOString(),
          adminReviewNotes: notes || 'KYC verified and approved by Admin.',
          licenseNumber: a.licenseNumber && !a.licenseNumber.includes('Pending') ? a.licenseNumber : `SUSU-AGT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
        };
      }
      return a;
    }));
  };

  const rejectAgentKyc = (agentId: string, reason: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        return {
          ...a,
          adminApprovalStatus: 'rejected',
          adminReviewNotes: reason
        };
      }
      return a;
    }));
  };

  const updateAgentAccount = (
    agentIdOrPartial: string | Partial<AgentAccount>,
    partial?: Partial<AgentAccount>
  ) => {
    if (typeof agentIdOrPartial === 'string') {
      const targetId = agentIdOrPartial;
      const data = partial || {};
      setAgents(prev => prev.map(a => a.id === targetId ? { ...a, ...data } : a));
    } else {
      const data = agentIdOrPartial;
      const targetId = data.id || activeAgentId;
      setAgents(prev => prev.map(a => a.id === targetId ? { ...a, ...data } : a));
    }
  };

  const updateAgentKyc = (
    agentIdOrKyc: string | Partial<AgentKycData>,
    kycData?: Partial<AgentKycData>
  ) => {
    const targetId = typeof agentIdOrKyc === 'string' ? agentIdOrKyc : activeAgentId;
    const data = typeof agentIdOrKyc === 'string' ? (kycData || {}) : agentIdOrKyc;
    setAgents(prev => prev.map(a => {
      if (a.id === targetId) {
        const existingKyc = a.kycData || {
          fullName: `${a.firstName} ${a.surname}`.trim() || 'Agent Organizer',
          dob: '1990-01-01',
          cityCountry: 'Accra, Ghana',
          gender: 'female' as const,
          idCardType: 'ecowas_card' as const,
          idCardNumber: 'GHA-000000000-0',
          digitalAddress: 'GA-000-0000',
          residentialAddress: 'Accra, Ghana',
          occupation: 'Merchant / Agent',
          maritalStatus: 'single' as const,
          status: 'verified' as const
        };
        return { ...a, kycData: { ...existingKyc, ...data } };
      }
      return a;
    }));
  };

  const deleteAgent = (
    agentIdOrOptions?: string | { resetGroup?: boolean },
    options?: { resetGroup?: boolean }
  ) => {
    let targetId = activeAgentId;
    let shouldResetGroup = false;

    if (typeof agentIdOrOptions === 'string') {
      targetId = agentIdOrOptions;
      shouldResetGroup = options?.resetGroup ?? false;
    } else if (agentIdOrOptions && typeof agentIdOrOptions === 'object') {
      shouldResetGroup = agentIdOrOptions.resetGroup ?? false;
    }

    const targetAgent = agents.find(a => a.id === targetId);
    if (targetAgent?.email) {
      setAgentRegistry(prev => {
        const next = { ...prev };
        delete next[targetAgent.email.toLowerCase()];
        localStorage.setItem(AGENT_REGISTRY_KEY, JSON.stringify(next));
        return next;
      });
    }
    DatabaseService.deleteAgent(targetId).catch(err => console.warn('Delete agent err:', err));

    setAgents(prev => {
      return prev.filter(a => a.id !== targetId);
    });

    if (targetId === activeAgentId) {
      const remaining = agents.filter(a => a.id !== targetId);
      const nextId = remaining[0]?.id || '';
      setActiveAgentId(nextId);
    }

    if (shouldResetGroup) {
      const agentGroups = groups.filter(g => g.agentId === targetId);
      agentGroups.forEach(ag => deleteGroup(ag.id));
    }
  };
  const updateMemberProfile = (memberId: string, partial: Partial<GroupMember>) => setMembers(prev => prev.map(m => m.id === memberId? {...m,...partial } : m));
  const loginWithUniqueCode = (code: string): boolean => {
    const trimmed = code.trim().toUpperCase();
    const found = members.find(m => (m.uniqueCode && m.uniqueCode.toUpperCase() === trimmed) || (m.inviteToken && m.inviteToken.toLowerCase() === code.trim().toLowerCase()));
    if (found) { setRole('member', found.id); return true; }
    return false;
  };
  const inviteMember = (name: string, email: string, phone: string) => {
    if (!group) {
      throw new Error('Please select or create a Susu group first before inviting members.');
    }
    const token = `invite-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const randomCode = `SUSU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newMemberId = `mem-${Date.now()}`;
    const groupMembers = members.filter(m => m.groupId === group.id);
    const position = groupMembers.length + 1;
    const newMember: GroupMember = {
      id: newMemberId,
      groupId: group.id,
      userId: `usr-${newMemberId}`,
      name,
      email,
      phone,
      inviteStatus: 'pending',
      inviteToken: token,
      uniqueCode: randomCode,
      joinedAt: formatDateStr(new Date()),
      positionInRotation: position,
      reliabilityScore: 100,
      slotLocked: false
    };
    setMembers(prev => [...prev, newMember]);
    return { token, inviteUrl: `${window.location.origin}/invite/${token}`, uniqueCode: randomCode };
  };

  const acceptInviteToken = (token: string, name: string, phone: string): boolean => {
    let found = false;
    setMembers(prev => prev.map(m => { if (m.inviteToken === token) { found = true; return {...m, name: name || m.name, phone: phone || m.phone, inviteStatus: 'active', slotLocked: true }; } return m; }));
    return found;
  };

  const removeMember = (memberId: string) => setMembers(prev => {
    const target = prev.find(m => m.id === memberId);
    if (!target) return prev;
    const targetGroupId = target.groupId;
    const remaining = prev.filter(m => m.id !== memberId);
    let groupPos = 1;
    return remaining.map(m => {
      if (m.groupId === targetGroupId) {
        const updated = { ...m, positionInRotation: groupPos };
        groupPos++;
        return updated;
      }
      return m;
    });
  });

  const deleteGroup = (groupId?: string) => {
    const targetId = groupId || activeGroupId || group?.id;
    if (!targetId) return;
    setGroups(prev => prev.filter(g => g.id !== targetId));
    setMembers(prev => prev.filter(m => m.groupId !== targetId));
    setPayments(prev => prev.filter(p => p.groupId !== targetId));
    DatabaseService.deleteGroup(targetId).catch(err => console.warn('DB delete group err:', err));
    if (activeGroupId === targetId) {
      const remainingAgentGroups = groups.filter(g => g.id !== targetId && g.agentId === activeAgentId);
      setActiveGroupId(remainingAgentGroups[0]?.id || '');
    }
  };

  const markCashPayment = (memberId: string, dateStr: string) => {
    setPayments(prev => {
      const existingIdx = prev.findIndex(p => p.memberId === memberId && p.paymentDate === dateStr);
      const updated = [...prev];
      if (existingIdx >= 0) updated[existingIdx] = {...updated[existingIdx], status: 'paid', paymentMethod: 'cash_override', paidAt: new Date().toISOString() };
      else updated.push({ id: `pay-${memberId}-${dateStr}`, groupId: group?.id || '', memberId, paymentDate: dateStr, amount: group?.fixedDailyAmount || 0, status: 'paid', paymentMethod: 'cash_override', paidAt: new Date().toISOString() });
      return updated;
    });
  };

  const processPayment = (memberId: string, dates: string[], method: PaymentMethod, paystackRef?: string) => {
    const ref = paystackRef || generatePaystackReference();
    const paidTimestamp = new Date().toISOString();
    setPayments(prev => {
      const updated = [...prev];
      dates.forEach(dStr => {
        const idx = updated.findIndex(p => p.memberId === memberId && p.paymentDate === dStr);
        if (idx >= 0) updated[idx] = {...updated[idx], status: 'paid', paymentMethod: method, paystackReference: ref, paidAt: paidTimestamp };
        else updated.push({ id: `pay-${memberId}-${dStr}`, groupId: group?.id || '', memberId, paymentDate: dStr, amount: group?.fixedDailyAmount || 0, status: 'paid', paymentMethod: method, paystackReference: ref, paidAt: paidTimestamp });
      });
      return updated;
    });
  };

  const reorderCalendar = (fromIndex: number, toIndex: number) => {
    if (!group) return;
    const currentWeekIdx = schedule.findIndex(s => s.status === 'current');
    const safeCurrentIdx = currentWeekIdx >= 0 ? currentWeekIdx : 0;
    const groupMembers = members.filter(m => m.groupId === group.id);
    const reorderedGroupMembers = reorderRotationQueue(groupMembers, fromIndex, toIndex, safeCurrentIdx);
    setMembers(prev => {
      const others = prev.filter(m => m.groupId !== group.id);
      return [...others, ...reorderedGroupMembers];
    });
  };

  const shuffleCalendar = () => {
    if (!group) return;
    const currentWeekIdx = schedule.findIndex(s => s.status === 'current');
    const safeCurrentIdx = currentWeekIdx >= 0 ? currentWeekIdx : 0;
    const groupMembers = members.filter(m => m.groupId === group.id);
    const shuffledGroupMembers = shuffleFutureRotation(groupMembers, safeCurrentIdx);
    setMembers(prev => {
      const others = prev.filter(m => m.groupId !== group.id);
      return [...others, ...shuffledGroupMembers];
    });
  };

  const selectRotationSlot = (memberId: string, targetWeekNumber: number, roleOverride?: UserRole) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return { success: false, message: 'Member not found' };

    const effectiveRole = roleOverride || currentUserRole;
    const isMemberRole = effectiveRole === 'member';
    const isSlotLocked = member.slotLocked ?? (member.inviteStatus === 'active' && !!member.positionInRotation);

    // If role is member and slot has already been selected/locked, prevent changes
    if (isMemberRole && isSlotLocked) {
      return {
        success: false,
        message: 'Your rotation slot is permanently locked. Once a member selects a slot, it cannot be changed again. Please contact your Susu Agent Organizer if you require an adjustment.'
      };
    }

    const currentWeekIdx = schedule.findIndex(s => s.status === 'current');
    const safeCurrentWeekNumber = currentWeekIdx >= 0 ? currentWeekIdx + 1 : 1;
    if (targetWeekNumber <= safeCurrentWeekNumber && currentWeekIdx >= 0) {
      return { success: false, message: `Week #${targetWeekNumber} is active or completed and cannot be selected.` };
    }

    setMembers(prevMembers => {
      const occupant = prevMembers.find(m => m.groupId === member.groupId && m.positionInRotation === targetWeekNumber && m.id !== memberId);
      return prevMembers.map(m => {
        if (m.id === memberId) return { ...m, positionInRotation: targetWeekNumber, slotLocked: true };
        if (occupant && m.id === occupant.id) return { ...m, positionInRotation: member.positionInRotation };
        return m;
      });
    });
    return { success: true, message: `Successfully locked in Week #${targetWeekNumber}. Slot is confirmed.` };
  };

  const addFeedPost = (title: string, body: string, visibility: 'public' | 'group') => {
    const authorName = currentUserRole === 'super_admin'? 'Super Admin' : (group?.name? `${group.name} Organizer` : 'Agent Organizer');
    const authorRole = currentUserRole === 'super_admin'? 'platform' : 'agent';
    setPosts(prev => [{ id: `post-${Date.now()}`, authorName, authorRole, title, body, publishedAt: new Date().toISOString(), visibility, likesCount: 0 },...prev]);
  };

  const resetSystemData = () => {
    setGroups([]);
    setActiveGroupId('');
    setMembers([]);
    setPayments([]);
    setPosts([]);
    setNotifications([]);
    setAgents([]);
    setActiveAgentId('');
    setAgentPaymentConfigs({});
    try { localStorage.removeItem('susu_agent_payment_configs'); } catch {}
    setPlatformPaymentConfig({ ...INITIAL_PLATFORM_PAYMENT_CONFIG, agentActivationFee: platformSettings.agentActivationFee });
    setCurrentUserRole('visitor');
    setActiveMemberId('');
    localStorage.removeItem('susu_current_role');
    localStorage.removeItem('susu_active_member_id');
    localStorage.removeItem('susu_active_group_id');
    localStorage.removeItem('susu_active_agent_id');
    localStorage.removeItem('susu_current_agent_id');
    localStorage.removeItem('susu_current_agent_email');
    localStorage.removeItem(AGENT_REGISTRY_KEY);
    localStorage.removeItem(CURRENT_AGENT_ID_KEY);
    localStorage.removeItem(STORAGE_KEY);
    setAgentRegistry({});
    setCurrentAgentIdState('');
    DatabaseService.purgeDatabase().catch(e => console.warn(e));
  };
  const resetDemoData = resetSystemData;
  const getMemberReliability = (memberId: string): number => {
    const memberPayments = payments.filter(p => p.memberId === memberId);
    if (!memberPayments.length) return 100;
    return Math.round((memberPayments.filter(p => p.status === 'paid').length / memberPayments.length) * 100);
  };

  return (
    <SusuContext.Provider value={{
      currentUserRole, activeMemberId, activeUser: getActiveUser(), group, groups, myGroups, myMembers, myPayments, activeGroupId, setActiveGroupId, members, schedule, payments, posts,
      agentAccount, agents, activeAgentId, setActiveAgentId, createAgent, agentPaymentConfig, platformPaymentConfig, platformSettings,
      setRole, createGroup, updateGroupSettings, updateAgentPaymentConfig, updatePlatformPaymentConfig, updatePlatformSettings,
      registerAgentKyc, activateAgentAccount, approveAgentKyc, rejectAgentKyc, updateAgentAccount, updateAgentKyc, deleteAgent,
      updateMemberProfile, loginWithUniqueCode, inviteMember, acceptInviteToken, removeMember, deleteGroup,
      markCashPayment, processPayment, reorderCalendar, shuffleCalendar, addFeedPost, resetDemoData, resetSystemData,
      getMemberReliability, selectRotationSlot, liveSupportConfig, updateLiveSupportConfig,
      notifications, markNotificationAsRead, markAllNotificationsAsRead, addNotification, clearAllNotifications
    }}>
      {children}
    </SusuContext.Provider>
  );
};

export const useSusu = (): SusuContextType => {
  const context = useContext(SusuContext);
  if (!context) throw new Error('useSusu must be used within a SusuProvider');
  return context;
};