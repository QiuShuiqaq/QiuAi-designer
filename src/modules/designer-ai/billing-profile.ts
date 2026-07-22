import { shallowRef } from 'vue';

import type { DesignerAiBillingProfile } from './ai-points';

export const designerAiBillingProfile = shallowRef<DesignerAiBillingProfile | null>(null);

export function setDesignerAiBillingProfile(profile?: DesignerAiBillingProfile | null) {
  designerAiBillingProfile.value = profile || null;
}

export function getDesignerAiBillingProfile() {
  return designerAiBillingProfile.value;
}
