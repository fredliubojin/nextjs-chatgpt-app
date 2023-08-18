import * as React from 'react';

import { useChatLLMDropdown } from './useLLMDropdown';
import { usePersonaIdDropdown } from './usePersonaDropdown';


export function ChatDropdowns(props: {
  conversationId: string | null
}) {

  // state
  const { chatLLMDropdown } = useChatLLMDropdown();
  const { systemPurposeId, personaDropdown } = usePersonaIdDropdown(props.conversationId, true);

  return <>

    {/* Model selector */}
    {chatLLMDropdown}

    {/* Persona selector */}
    {systemPurposeId && personaDropdown}

  </>;
}
