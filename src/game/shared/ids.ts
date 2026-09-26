export type SpinnerId = number;
export type RigId = number;

/** Each Spinner fights with exactly one Rig, which shares the Spinner's id. */
export function rigOfSpinner(spinnerId: SpinnerId): RigId {
  return spinnerId;
}

export function spinnerOfRig(rigId: RigId): SpinnerId {
  return rigId;
}
