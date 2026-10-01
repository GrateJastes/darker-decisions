import { gameDataSchema, type GameData } from "./schema";
import wiki20260927 from "./snapshots/wiki-2026-09-27.json";

export const snapshots: readonly GameData[] = [gameDataSchema.parse(wiki20260927)];

export const currentData: GameData = snapshots[snapshots.length - 1]!;

export * from "./schema";
