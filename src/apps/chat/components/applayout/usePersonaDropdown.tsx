import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { ListItemButton, ListItemDecorator } from '@mui/joy';
import CallIcon from '@mui/icons-material/Call';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';

import { SystemPurposeId, SystemPurposes } from '../../../../data';

import { AppBarDropdown } from '~/common/layout/AppBarDropdown';
import { launchAppCall } from '~/common/routing';
import { maySpeechRecognitionWork } from '~/common/components/useSpeechRecognition';
import { useChatStore } from '~/common/state/store-chats';
import { useUIPreferencesStore } from '~/common/state/store-ui';


function AppBarPersonaDropdown(props: {
  systemPurposeId: SystemPurposeId | null,
  setSystemPurposeId: (systemPurposeId: SystemPurposeId | null) => void,
  onCallPersona?: () => void,
}) {

  // external state
  const { experimentalLabs, zenMode } = useUIPreferencesStore(state => ({
    experimentalLabs: state.experimentalLabs,
    zenMode: state.zenMode,
  }), shallow);

  const handleSystemPurposeChange = (_event: any, value: SystemPurposeId | null) => props.setSystemPurposeId(value);

  const showPersonaCall = !!props.onCallPersona && experimentalLabs;

  const enablePersonaCall = !!props.systemPurposeId && maySpeechRecognitionWork();

  return (
    <AppBarDropdown
      items={SystemPurposes} showSymbols={zenMode !== 'cleaner'}
      value={props.systemPurposeId} onChange={handleSystemPurposeChange}
      appendOption={showPersonaCall ? <>

        <ListItemButton disabled={!enablePersonaCall} key='menu-call-persona' onClick={props.onCallPersona}>
          <ListItemDecorator>{enablePersonaCall ? <PhoneForwardedIcon color='success' /> : <CallIcon color='warning' />}</ListItemDecorator>
          Call
        </ListItemButton>

      </> : undefined}
    />
  );

}

export function usePersonaIdDropdown(conversationId: string | null, enableCalling: boolean) {
  // external state
  const { systemPurposeId } = useChatStore(state => {
    const conversation = state.conversations.find(conversation => conversation.id === conversationId);
    return {
      systemPurposeId: conversation?.systemPurposeId ?? null,
    };
  }, shallow);

  const personaDropdown = React.useMemo(() =>
      <AppBarPersonaDropdown
        systemPurposeId={systemPurposeId}
        setSystemPurposeId={(systemPurposeId) => {
          if (conversationId && systemPurposeId)
            useChatStore.getState().setSystemPurposeId(conversationId, systemPurposeId);
        }}
        onCallPersona={enableCalling ? () => {
          systemPurposeId && conversationId && launchAppCall(conversationId, systemPurposeId);
        } : undefined}
      />,
    [conversationId, enableCalling, systemPurposeId],
  );

  return { systemPurposeId, personaDropdown };
}