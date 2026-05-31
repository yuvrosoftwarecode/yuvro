import { createContext, useContext, useMemo, useState, ReactNode, useEffect, useCallback } from "react";
import {
  seedUsers, seedSprints, seedTickets, seedPRs, seedMessages, seedForum,
  seedSquads, seedConnections, seedPendingIncoming, seedNotifications, seedTeams,
  aiUser, ME_ID, AI_ID,
  type User, type Sprint, type Ticket, type PR, type ChatMsg, type ForumThread,
  type Squad, type Team, type Notification, type RoleKey, type TicketStatus, type PRStatus, type SprintMember, type MemberStatus,
} from "./data";

interface CollabState {
  users: User[];
  sprints: Sprint[];
  tickets: Record<string, Ticket[]>;
  prs: Record<string, PR[]>;
  messages: Record<string, ChatMsg[]>;
  forum: Record<string, ForumThread[]>;
  squads: Squad[];
  teams: Team[];
  connections: string[];
  pendingIncoming: string[];
  notifications: Notification[];
  meId: string;
}

interface CollabActions {
  user: (id: string | null | undefined) => User | undefined;
  me: () => User;
  unreadCount: () => number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  pushNotification: (n: Omit<Notification, "id" | "at" | "read">) => void;

  joinSprint: (sprintId: string, role: RoleKey) => void;
  startSprint: (sprintId: string) => void;
  submitSprint: (sprintId: string) => void;

  updateTicket: (sprintId: string, ticketId: string, patch: Partial<Ticket>) => void;
  setTicketStatus: (sprintId: string, ticketId: string, status: TicketStatus) => void;
  addCommit: (sprintId: string, ticketId: string, msg: string) => void;

  raisePR: (sprintId: string, ticketId: string, title: string, description: string) => string;
  setPRStatus: (sprintId: string, prId: string, status: PRStatus, feedback?: string) => void;
  addPRComment: (sprintId: string, prId: string, line: number, text: string) => void;
  replyPRComment: (sprintId: string, prId: string, commentId: string, text: string) => void;
  pushPRCommit: (sprintId: string, prId: string, msg: string) => void;
  mergePR: (sprintId: string, prId: string) => void;

  sendMessage: (sprintId: string, text: string) => void;
  addThread: (sprintId: string | undefined, title: string, body: string, tag: ForumThread["tag"]) => string;
  upvoteThread: (sprintId: string | undefined, threadId: string) => void;
  replyThread: (sprintId: string | undefined, threadId: string, text: string) => void;

  createSquad: (name: string, visibility: Squad["visibility"]) => string;
  inviteToSquad: (squadId: string, userId: string) => void;
  removeFromSquad: (squadId: string, userId: string) => void;
  leaveSquad: (squadId: string) => void;
  disbandSquad: (squadId: string) => void;

  connect: (userId: string) => void;
  acceptConnect: (userId: string) => void;
  ignoreConnect: (userId: string) => void;

  createTeam: (input: { sprintId: string; name: string; myRole: RoleKey; invites: { userId: string; role: RoleKey }[]; openRoles: { role: RoleKey; note?: string }[] }) => string;
}

const Ctx = createContext<(CollabState & CollabActions) | null>(null);

export function CollabProvider({ children }: { children: ReactNode }) {
  const [users] = useState<User[]>([...seedUsers, aiUser]);
  const [sprints, setSprints] = useState<Sprint[]>(seedSprints);
  const [tickets, setTickets] = useState<Record<string, Ticket[]>>(seedTickets);
  const [prs, setPRs] = useState<Record<string, PR[]>>(seedPRs);
  const [messages, setMessages] = useState<Record<string, ChatMsg[]>>(seedMessages);
  const [forum, setForum] = useState<Record<string, ForumThread[]>>(seedForum);
  const [squads, setSquads] = useState<Squad[]>(seedSquads);
  const [teams, setTeams] = useState<Team[]>(seedTeams);
  const [connections, setConnections] = useState<string[]>(seedConnections);
  const [pendingIncoming, setPendingIncoming] = useState<string[]>(seedPendingIncoming);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);

  // tick to refresh countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const user = useCallback((id: string | null | undefined) => {
    if (!id) return undefined;
    if (id === AI_ID) return aiUser;
    return users.find(u => u.id === id);
  }, [users]);

  const me = useCallback(() => users.find(u => u.id === ME_ID)!, [users]);

  const unreadCount = useCallback(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const pushNotification = (n: Omit<Notification, "id" | "at" | "read">) =>
    setNotifications(ns => [{ ...n, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), read: false }, ...ns]);

  const joinSprint = (sprintId: string, role: RoleKey) => {
    setSprints(sp => sp.map(s => {
      if (s.id !== sprintId) return s;
      const members: SprintMember[] = [...s.members];
      const openIdx = members.findIndex(m => m.role === role && m.status === "open");
      if (openIdx >= 0) members[openIdx] = { userId: ME_ID, role, status: "joined" };
      else members.push({ userId: ME_ID, role, status: "joined" });
      return { ...s, members, meId: role };
    }));
    pushNotification({ type: "sprint-invite", message: `You joined as ${role}.`, link: `/collaboration/sprint/${sprintId}/workspace` });
  };

  const startSprint = (sprintId: string) => {
    const now = Date.now();
    setSprints(sp => sp.map(s => s.id === sprintId ? { ...s, status: "In Progress", startedAt: now, deadlineAt: now + s.durationDays * 24 * 60 * 60 * 1000, members: s.members.map(m => m.status === "open" && s.aiAutoFill ? { ...m, userId: null, status: "ai" as MemberStatus } : m) } : s));
    pushNotification({ type: "sprint-started", message: `Sprint started. Timer running.`, link: `/collaboration/sprint/${sprintId}/workspace` });
  };

  const submitSprint = (sprintId: string) => {
    setSprints(sp => sp.map(s => s.id === sprintId ? { ...s, status: "Completed", submittedAt: Date.now() } : s));
    pushNotification({ type: "sprint-submitted", message: `Sprint submitted. Report generating...`, link: `/collaboration/sprint/${sprintId}/report/individual` });
    setTimeout(() => pushNotification({ type: "report-ready", message: `Your sprint report is ready.`, link: `/collaboration/sprint/${sprintId}/report/individual` }), 3000);
  };

  const updateTicket = (sprintId: string, ticketId: string, patch: Partial<Ticket>) =>
    setTickets(ts => ({ ...ts, [sprintId]: ts[sprintId].map(t => t.id === ticketId ? { ...t, ...patch } : t) }));

  const setTicketStatus = (sprintId: string, ticketId: string, status: TicketStatus) =>
    updateTicket(sprintId, ticketId, { status });

  const addCommit = (sprintId: string, ticketId: string, msg: string) => {
    setTickets(ts => ({ ...ts, [sprintId]: ts[sprintId].map(t => t.id === ticketId ? { ...t, commits: [...t.commits, { msg, at: "just now", authorId: ME_ID }], status: t.status === "Not Started" ? "In Progress" : t.status } : t) }));
  };

  const raisePR = (sprintId: string, ticketId: string, title: string, description: string) => {
    const id = `${sprintId}-pr-${Date.now()}`;
    const ticket = tickets[sprintId].find(t => t.id === ticketId);
    const pr: PR = {
      id, ticketId, sprintId, authorId: ME_ID, title, description, status: "Pending Review",
      diff: [
        { type: "ctx", text: `// ${ticketId}`, line: 1 },
        { type: "add", text: `// ${title}`, line: 2 },
        ...(ticket?.starter.split("\n").slice(0, 6).map((l, i) => ({ type: "add" as const, text: l, line: 3 + i })) ?? []),
      ],
      comments: [], commits: (ticket?.commits ?? []).map(c => ({ msg: c.msg, at: c.at })), raisedAt: "just now",
    };
    setPRs(p => ({ ...p, [sprintId]: [pr, ...p[sprintId]] }));
    updateTicket(sprintId, ticketId, { prId: id });
    pushNotification({ type: "pr-review", message: `You raised PR on ${ticketId}.`, link: `/collaboration/sprint/${sprintId}/workspace?tab=pr` });
    return id;
  };

  const setPRStatus = (sprintId: string, prId: string, status: PRStatus, feedback?: string) =>
    setPRs(p => ({ ...p, [sprintId]: p[sprintId].map(pr => pr.id === prId ? { ...pr, status, overallFeedback: feedback ?? pr.overallFeedback } : pr) }));

  const addPRComment = (sprintId: string, prId: string, line: number, text: string) =>
    setPRs(p => ({ ...p, [sprintId]: p[sprintId].map(pr => pr.id === prId ? { ...pr, comments: [...pr.comments, { id: `c-${Date.now()}`, line, authorId: ME_ID, text, replies: [] }] } : pr) }));

  const replyPRComment = (sprintId: string, prId: string, commentId: string, text: string) =>
    setPRs(p => ({ ...p, [sprintId]: p[sprintId].map(pr => pr.id === prId ? { ...pr, comments: pr.comments.map(c => c.id === commentId ? { ...c, replies: [...c.replies, { authorId: ME_ID, text }] } : c) } : pr) }));

  const pushPRCommit = (sprintId: string, prId: string, msg: string) =>
    setPRs(p => ({ ...p, [sprintId]: p[sprintId].map(pr => pr.id === prId ? { ...pr, commits: [...pr.commits, { msg, at: "just now" }], status: "Pending Review" as PRStatus } : pr) }));

  const mergePR = (sprintId: string, prId: string) => {
    const pr = prs[sprintId].find(p => p.id === prId);
    setPRs(p => ({ ...p, [sprintId]: p[sprintId].map(x => x.id === prId ? { ...x, status: "Merged" as PRStatus } : x) }));
    if (pr) setTicketStatus(sprintId, pr.ticketId, "Completed");
  };

  const sendMessage = (sprintId: string, text: string) => {
    const msg: ChatMsg = { id: `m-${Date.now()}`, sprintId, authorId: ME_ID, text, at: "now" };
    setMessages(m => ({ ...m, [sprintId]: [...(m[sprintId] ?? []), msg] }));
  };

  const addThread = (sprintId: string | undefined, title: string, body: string, tag: ForumThread["tag"]) => {
    const id = `t-${Date.now()}`;
    const thread: ForumThread = { id, sprintId, title, body, tag, authorId: ME_ID, upvotes: 0, at: "now", replies: [] };
    const key = sprintId ?? "global";
    setForum(f => ({ ...f, [key]: [thread, ...(f[key] ?? [])] }));
    return id;
  };

  const upvoteThread = (sprintId: string | undefined, threadId: string) => {
    const key = sprintId ?? "global";
    setForum(f => ({ ...f, [key]: (f[key] ?? []).map(t => t.id === threadId ? { ...t, upvotes: t.upvotes + 1 } : t) }));
  };

  const replyThread = (sprintId: string | undefined, threadId: string, text: string) => {
    const key = sprintId ?? "global";
    setForum(f => ({ ...f, [key]: (f[key] ?? []).map(t => t.id === threadId ? { ...t, replies: [...t.replies, { id: `r-${Date.now()}`, authorId: ME_ID, text, at: "now", upvotes: 0 }] } : t) }));
  };

  const createSquad = (name: string, visibility: Squad["visibility"]) => {
    const id = `sq-${Date.now()}`;
    setSquads(s => [...s, { id, name, ownerId: ME_ID, visibility, memberIds: [ME_ID], pendingIds: [] }]);
    return id;
  };
  const inviteToSquad = (squadId: string, userId: string) =>
    setSquads(s => s.map(sq => sq.id === squadId ? { ...sq, pendingIds: [...sq.pendingIds, userId] } : sq));
  const removeFromSquad = (squadId: string, userId: string) =>
    setSquads(s => s.map(sq => sq.id === squadId ? { ...sq, memberIds: sq.memberIds.filter(id => id !== userId) } : sq));
  const leaveSquad = (squadId: string) =>
    setSquads(s => s.map(sq => sq.id === squadId ? { ...sq, memberIds: sq.memberIds.filter(id => id !== ME_ID) } : sq));
  const disbandSquad = (squadId: string) => setSquads(s => s.filter(sq => sq.id !== squadId));

  const connect = (userId: string) => {
    pushNotification({ type: "connection", message: `Connection request sent.`, link: "/collaboration/connections" });
  };
  const acceptConnect = (userId: string) => {
    setPendingIncoming(p => p.filter(id => id !== userId));
    setConnections(c => [...c, userId]);
  };
  const ignoreConnect = (userId: string) =>
    setPendingIncoming(p => p.filter(id => id !== userId));

  const createTeam: CollabActions["createTeam"] = ({ sprintId, name, myRole, invites, openRoles }) => {
    const id = `tm-${Date.now()}`;
    const team: Team = {
      id, sprintId, name, status: "Recruiting", ownerId: ME_ID,
      memberIds: [ME_ID],
      invites: invites.map(i => ({ ...i, status: "pending" as const })),
      openRoles,
      createdAt: Date.now(),
    };
    setTeams(t => [team, ...t]);
    joinSprint(sprintId, myRole);
    invites.forEach(i => pushNotification({ type: "sprint-invite", message: `Invite sent to ${user(i.userId)?.name ?? i.userId} for ${i.role}.`, link: `/collaboration/sprint/${sprintId}` }));
    openRoles.forEach(r => pushNotification({ type: "role-request", message: `Public request posted: ${r.role}.`, link: `/collaboration/sprint/${sprintId}` }));
    return id;
  };

  const value = useMemo<CollabState & CollabActions>(() => ({
    users, sprints, tickets, prs, messages, forum, squads, teams, connections, pendingIncoming, notifications, meId: ME_ID,
    user, me, unreadCount, markAllRead, markRead, pushNotification,
    joinSprint, startSprint, submitSprint,
    updateTicket, setTicketStatus, addCommit,
    raisePR, setPRStatus, addPRComment, replyPRComment, pushPRCommit, mergePR,
    sendMessage, addThread, upvoteThread, replyThread,
    createSquad, inviteToSquad, removeFromSquad, leaveSquad, disbandSquad,
    connect, acceptConnect, ignoreConnect,
    createTeam,
  }), [users, sprints, tickets, prs, messages, forum, squads, teams, connections, pendingIncoming, notifications, user, me, unreadCount]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCollab() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCollab outside CollabProvider");
  return v;
}

export function fmtCountdown(deadline: number | undefined) {
  if (!deadline) return { text: "—", tone: "muted" as const, ended: false };
  const ms = deadline - Date.now();
  if (ms <= 0) return { text: "⏱ Sprint Ended", tone: "destructive" as const, ended: true };
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const tone = ms < 2 * 3600000 ? "destructive" : ms < 24 * 3600000 ? "warning" : "muted";
  return { text: `${d}d ${h}h ${m}m ${s}s`, tone, ended: false };
}
