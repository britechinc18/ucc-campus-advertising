export const controlActions = [
  ['registration', 'Account registration', false],
  ['businessCreation', 'Business creation', true],
  ['profileEdits', 'Profile edits', true],
  ['personalPosting', 'Personal advert posting', true],
  ['businessPosting', 'Business advert posting', true],
  ['advertEdits', 'Advert edits', true],
] as const;
export type ControlAction = (typeof controlActions)[number][0];
export type ControlMode = 'open' | 'approval' | 'paused';
export interface PlatformControls {
  enabled: boolean;
  registration: 'open' | 'paused';
  businessCreation: ControlMode;
  profileEdits: ControlMode;
  personalPosting: ControlMode;
  businessPosting: ControlMode;
  advertEdits: ControlMode;
  postingLimits: boolean;
  pauseMessage: string;
}
export const defaultControls: PlatformControls = {
  enabled: false,
  registration: 'open',
  businessCreation: 'open',
  profileEdits: 'open',
  personalPosting: 'open',
  businessPosting: 'open',
  advertEdits: 'open',
  postingLimits: false,
  pauseMessage: 'This action is temporarily paused. Please try again later.',
};
type PolicySettings = {
  platform_controls?: PlatformControls | null;
  auto_publish: boolean;
  posting_limits_enabled?: boolean;
};
export function controlMode(settings: PolicySettings, action: ControlAction): ControlMode {
  const controls = settings.platform_controls;
  // Null supports older API clients and existing review settings during rollout.
  if (!controls) {
    return ['personalPosting', 'businessPosting', 'advertEdits'].includes(action) &&
      !settings.auto_publish
      ? 'approval'
      : 'open';
  }
  return controls.enabled ? controls[action] : 'open';
}
export function postingLimitsEnabled(settings: PolicySettings) {
  return settings.platform_controls
    ? settings.platform_controls.enabled && settings.platform_controls.postingLimits
    : !!settings.posting_limits_enabled;
}
export function pauseMessage(settings: PolicySettings) {
  return settings.platform_controls?.pauseMessage || defaultControls.pauseMessage;
}
export function postingAction(kind?: string, editing = false): ControlAction {
  return editing ? 'advertEdits' : kind === 'business' ? 'businessPosting' : 'personalPosting';
}
