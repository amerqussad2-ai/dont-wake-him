/** Default mix. Players can change master volume / mute at runtime (M, -, +). */
export const AudioSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.5,
  muted: false,
  /** Step used by the volume keys. */
  volumeStep: 0.1,
} as const;

/** Per-sound timing rules that keep repeated sounds from spamming. */
export const AudioTuning = {
  /** Alarm tick interval (seconds) when calm, and at the start / end of the urgent window. */
  alarmTickCalm: 1,
  alarmTickUrgentStart: 0.5,
  alarmTickUrgentEnd: 0.2,
  /** Heartbeat interval range while noise is in the danger zone. */
  heartbeatSlow: 0.95,
  heartbeatFast: 0.45,
  /** Stereo spread for positional sounds (0 = mono, 1 = full left/right). */
  panSpread: 0.6,
} as const;
