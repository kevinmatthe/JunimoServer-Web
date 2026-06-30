import { z } from 'zod';

export const playerInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  isOnline: z.boolean(),
});

export const serverStatusSchema = z.object({
  playerCount: z.number(),
  maxPlayers: z.number(),
  steamInviteCode: z.string().nullable().optional(),
  gogInviteCode: z.string().nullable().optional(),
  serverVersion: z.string(),
  isOnline: z.boolean(),
  isReady: z.boolean(),
  lastUpdated: z.string(),
  farmName: z.string().optional().default(''),
  day: z.number().optional().default(0),
  season: z.string().optional().default(''),
  year: z.number().optional().default(0),
  timeOfDay: z.number().optional().default(0),
  farmTypeKey: z.string().optional().default(''),
  isPaused: z.boolean().optional().default(false),
  version: z.number().optional().default(0),
});

export const playersResponseSchema = z.object({
  players: z.array(playerInfoSchema),
  version: z.number().optional().default(0),
});

export const inviteCodeResponseSchema = z.object({
  inviteCode: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

export const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  lastTickMs: z.number().nullable().optional(),
  pendingActions: z.number(),
  gameAvailable: z.boolean().nullable().optional(),
  tickCount: z.number(),
  isFrozen: z.boolean(),
});

export const statsResponseSchema = z.object({
  fps: z.number(),
  tps: z.number(),
  targetTps: z.number().optional().default(0),
  avgTickMs: z.number(),
  memoryMb: z.number(),
  gcGen0: z.number(),
  gcGen1: z.number(),
  gcGen2: z.number(),
  pendingActions: z.number(),
  gameThreadWaitMs: z.number(),
});

export const farmhandInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  isCustomized: z.boolean(),
});

export const farmhandsResponseSchema = z.object({
  farmhands: z.array(farmhandInfoSchema),
  version: z.number().optional().default(0),
});

export const gameSettingsInfoSchema = z.object({
  farmName: z.string(),
  farmType: z.union([z.number(), z.string()]),
  profitMargin: z.number(),
  startingCabins: z.number(),
  spawnMonstersAtNight: z.string(),
});

export const serverRuntimeSettingsInfoSchema = z.object({
  maxPlayers: z.number(),
  cabinStrategy: z.string(),
  separateWallets: z.boolean(),
  existingCabinBehavior: z.string(),
});

export const settingsResponseSchema = z.object({
  game: gameSettingsInfoSchema,
  server: serverRuntimeSettingsInfoSchema,
});

export const cabinInfoSchema = z.object({
  tileX: z.number(),
  tileY: z.number(),
  isHidden: z.boolean(),
  type: z.string(),
  ownerId: z.number(),
  ownerName: z.string(),
  isAssigned: z.boolean(),
});

export const cabinsResponseSchema = z.object({
  strategy: z.string(),
  totalCount: z.number(),
  assignedCount: z.number(),
  availableCount: z.number(),
  cabins: z.array(cabinInfoSchema),
  savedPositionPlayerIds: z.array(z.number()),
});

export const renderingStatusSchema = z.object({
  fps: z.number(),
});

export const screenshotResponseSchema = z.object({
  success: z.boolean(),
  base64Png: z.string().nullable().optional(),
  width: z.number().optional().default(0),
  height: z.number().optional().default(0),
  error: z.string().nullable().optional(),
});

export const authStatusResponseSchema = z.object({
  enabled: z.boolean(),
  authenticatedCount: z.number(),
  pendingCount: z.number(),
  timeoutSeconds: z.number(),
  maxAttempts: z.number(),
});

export const diagnosticsCabinStateSchema = z.object({
  tileX: z.number(),
  tileY: z.number(),
  indoorsName: z.string(),
  ownerId: z.number(),
  ownerName: z.string(),
  ownerIsCustomized: z.boolean(),
  ownerHasUserId: z.boolean(),
  homeLocationOfOwner: z.string(),
  farmhandReferenceDefined: z.boolean(),
  farmhandReferenceUid: z.number(),
  objectCount: z.number(),
  fridgeItemCount: z.number(),
  petCount: z.number(),
  cellarObjectCount: z.number(),
});

export const diagnosticsFarmhandStateSchema = z.object({
  uniqueMultiplayerId: z.number(),
  name: z.string(),
  isCustomized: z.boolean(),
  homeLocation: z.string(),
  lastSleepLocation: z.string(),
  hasUserId: z.boolean(),
});

export const readyCheckStateSchema = z.object({
  id: z.string(),
  numberReady: z.number(),
  numberRequired: z.number(),
  isReady: z.boolean(),
  isLocked: z.boolean(),
});

export const diagnosticsStateResponseSchema = z.object({
  capturedAt: z.string(),
  otherFarmerUids: z.array(z.number()),
  onlineFarmerCount: z.number(),
  netReady: z.array(readyCheckStateSchema),
  newDaySync: z.object({
    hasStarted: z.boolean(),
    hasFinished: z.boolean(),
    isActive: z.boolean(),
  }),
  activeClickableMenu: z.string().nullable().optional(),
  timeOfDay: z.number(),
  dayOfMonth: z.number(),
  season: z.string(),
  year: z.number(),
  gameMode: z.number(),
  isGameAvailable: z.boolean().nullable().optional(),
  lastTickMs: z.number().nullable().optional(),
  avgGameThreadWaitMs: z.number(),
  cabins: z.array(diagnosticsCabinStateSchema),
  farmhandData: z.array(diagnosticsFarmhandStateSchema),
  disconnectingFarmers: z.array(z.number()),
  farmHouseObjectCount: z.number(),
  farmHouseFurnitureCount: z.number(),
  farmHouseFridgeItemCount: z.number(),
  masterCellarObjectCount: z.number(),
  masterHasFlag: z.boolean().nullable().optional(),
  masterHasEvent: z.boolean().nullable().optional(),
  masterCaveChoice: z.number(),
  masterShadowFriendshipPoints: z.number().nullable().optional(),
  masterDaysPlayed: z.number(),
  masterHasSpouse: z.boolean(),
  masterName: z.string(),
  saveImportFinalizeCount: z.number(),
  failedFields: z.array(z.string()),
});

export const mutationResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable().optional(),
});

export const authTimeoutResponseSchema = mutationResponseSchema.extend({
  timeoutSeconds: z.number(),
  previousTimeoutSeconds: z.number().optional().default(0),
});

export const renderingSetResponseSchema = mutationResponseSchema.extend({
  fps: z.number(),
  previousFps: z.number().optional().default(0),
  message: z.string().nullable().optional(),
});

export const timeSetResponseSchema = mutationResponseSchema.extend({
  timeOfDay: z.number(),
  message: z.string().nullable().optional(),
});

export const clockSpeedResponseSchema = mutationResponseSchema.extend({
  multiplier: z.number().optional().default(0),
  effectiveMs: z.number().optional().default(0),
});

export const roleGrantResponseSchema = mutationResponseSchema.extend({
  playerId: z.number().optional().default(0),
  playerName: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
});

export const farmhandResponseSchema = mutationResponseSchema.extend({
  message: z.string().nullable().optional(),
});

export const newGameResponseSchema = mutationResponseSchema.extend({
  message: z.string().nullable().optional(),
});

export const reloadResponseSchema = mutationResponseSchema.extend({
  message: z.string().nullable().optional(),
});

export const farmTypeInputSchema = z.union([
  z.number().int().min(0).max(6),
  z.string().min(1).max(128),
]);

export const newGameRequestSchema = z.object({
  farmType: farmTypeInputSchema.optional(),
  farmName: z.string().trim().min(1).max(64).optional(),
  startingCabins: z.number().int().min(0).max(20).optional(),
  cabinStrategy: z.enum(['CabinStack', 'FarmhouseStack', 'None']).optional(),
  maxPlayers: z.number().int().min(1).max(32).optional(),
  allowIpConnections: z.boolean().optional(),
  profitMargin: z.number().positive().max(10).optional(),
  separateWallets: z.boolean().optional(),
  confirmText: z.literal('CREATE NEW GAME'),
});

export const setAuthTimeoutInputSchema = z.object({
  value: z.number().int().min(0).max(86400),
});

export const setRenderingInputSchema = z.object({
  fps: z.number().int().min(0).max(120),
});

export const setTimeInputSchema = z.object({
  value: z.number().int().min(600).max(2600),
});

export const setClockSpeedInputSchema = z.object({
  multiplier: z.number().positive().max(1000),
});

export const roleGrantInputSchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    playerId: z.number().int().positive().optional(),
  })
  .refine((value) => Number(Boolean(value.name)) + Number(Boolean(value.playerId)) === 1, {
    message: 'Provide exactly one of name or playerId',
  });

export const deleteFarmhandInputSchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    playerId: z.number().int().positive().optional(),
    confirmText: z.literal('DELETE FARMHAND'),
  })
  .refine((value) => Number(Boolean(value.name)) + Number(Boolean(value.playerId)) === 1, {
    message: 'Provide exactly one of name or playerId',
  });

export const reloadWorldInputSchema = z.object({
  confirmText: z.literal('RELOAD WORLD'),
});

export type ServerStatus = z.infer<typeof serverStatusSchema>;
export type PlayersResponse = z.infer<typeof playersResponseSchema>;
export type InviteCodeResponse = z.infer<typeof inviteCodeResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;
export type FarmhandsResponse = z.infer<typeof farmhandsResponseSchema>;
export type SettingsResponse = z.infer<typeof settingsResponseSchema>;
export type CabinsResponse = z.infer<typeof cabinsResponseSchema>;
export type RenderingStatus = z.infer<typeof renderingStatusSchema>;
export type ScreenshotResponse = z.infer<typeof screenshotResponseSchema>;
export type AuthStatusResponse = z.infer<typeof authStatusResponseSchema>;
export type DiagnosticsStateResponse = z.infer<typeof diagnosticsStateResponseSchema>;
export type AuthTimeoutResponse = z.infer<typeof authTimeoutResponseSchema>;
export type RenderingSetResponse = z.infer<typeof renderingSetResponseSchema>;
export type TimeSetResponse = z.infer<typeof timeSetResponseSchema>;
export type ClockSpeedResponse = z.infer<typeof clockSpeedResponseSchema>;
export type RoleGrantResponse = z.infer<typeof roleGrantResponseSchema>;
export type FarmhandResponse = z.infer<typeof farmhandResponseSchema>;
export type NewGameRequest = z.infer<typeof newGameRequestSchema>;
export type NewGameResponse = z.infer<typeof newGameResponseSchema>;
export type ReloadResponse = z.infer<typeof reloadResponseSchema>;
