/**
 * The named things a Rig can do on the frame a hit lands (outcomeFx.json → rigViews):
 * - none: only the physics.
 * - squash: flatten along the hit direction (the honest impact).
 * - keepForm: hold the attack form a beat past contact (the needle pierces through).
 * - snapTip: the needle shatters and the body drops back to round at once.
 * - snapArm: the claw's arm is cut and retracts at once.
 * - parryFlash: the shell's rim flashes white (the parry halo).
 * - wrap: the claw is drawn wrapped around the victim's rim for the pull.
 * - pull: stretched along the line toward the grabber.
 * - crush: slammed flat and wide.
 * - bounce: a small upward pop (the weight rebounds).
 * - retract: the arm withdraws without a fight.
 */
export const outcomeEffectNames = ['none', 'squash', 'keepForm', 'snapTip', 'snapArm', 'parryFlash', 'wrap', 'pull', 'crush', 'bounce', 'retract'] as const;

export type OutcomeEffectName = (typeof outcomeEffectNames)[number];
