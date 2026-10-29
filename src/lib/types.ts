import type { Level, SlotConfig, TimeMode } from "./slots";

export interface RoomPublic extends SlotConfig {
  slug: string;
  title: string;
  description: string;
  organizerName: string;
  timeMode: TimeMode;
  allowNewMembers: boolean;
  isLocked: boolean;
  finalDate: string | null;
  finalSlot: number | null;
  createdAt: string;
}

export interface ParticipantPublic {
  id: string;
  name: string;
  invited: boolean;
  claimed: boolean;
  respondedAt: string | null;
}

export interface ParticipantAdmin extends ParticipantPublic {
  token: string;
  claimedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

/** One availability cell: participant id, date, slot key, level. */
export interface Cell {
  p: string;
  d: string;
  s: number;
  l: Level;
}

export interface Snapshot {
  room: RoomPublic;
  participants: ParticipantPublic[];
  cells: Cell[];
}

export interface AdminSnapshot {
  room: RoomPublic;
  participants: ParticipantAdmin[];
  cells: Cell[];
}

export interface Me {
  id: string;
  name: string;
  token: string;
  respondedAt: string | null;
}
