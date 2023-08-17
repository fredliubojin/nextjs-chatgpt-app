import * as React from 'react';
import { useRouter } from 'next/router';
import { shallow } from 'zustand/shallow';

import { Avatar, Box, Card, Chip, Typography } from '@mui/joy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';
import MicOffIcon from '@mui/icons-material/MicOff';

import { DLLMId } from '~/modules/llms/llm.types';
import { SystemPurposeId, SystemPurposes } from '../../data';

import { InlineError } from '~/common/components/InlineError';
import { SpeechResult, useSpeechRecognition } from '~/common/components/useSpeechRecognition';
import { createDMessage, DMessage, useChatStore } from '~/common/state/store-chats';
import { cssScaleKeyframes } from '~/common/theme';

import { CallButton } from './CallButton';
import { usePlaySoundUrlLoop } from '~/common/util/audioUtils';


export function CallUI(props: {
  conversationId: string,
  personaId: string,
  llmId: DLLMId
}) {

  // state
  const [avatarClicked, setAvatarClicked] = React.useState<number>(0);
  const [stage, setStage] = React.useState<'ring' | 'declined' | 'connected' | 'ended'>('ring');
  const [micMuted, setMicMuted] = React.useState(false);
  const [callMessages, setCallMessages] = React.useState<DMessage[]>([]);

  // external state
  const { replace: routerReplace } = useRouter();
  const { messages } = useChatStore(state => {
    const conversation = state.conversations.find(conversation => conversation.id === props.conversationId);
    return {
      messages: conversation ? conversation.messages : [],
    };
  }, shallow);
  const persona = SystemPurposes[props.personaId as SystemPurposeId] ?? undefined;

  // hooks and speech
  const [speechInterim, setSpeechInterim] = React.useState<SpeechResult | null>(null);
  const onSpeechResultCallback = React.useCallback((result: SpeechResult) => {
    setSpeechInterim(result.done ? null : { ...result });
    if (result.done) {
      const userSpokenMessage = result.transcript.trim();
      if (userSpokenMessage.length >= 1)
        setCallMessages(messages => [...messages, createDMessage('user', result.transcript.trim())]);
      // setSpeechText();
    }
  }, []);
  const speechReco = useSpeechRecognition(onSpeechResultCallback, 1000);

  // derived state
  const isRinging = stage === 'ring';
  const isConnected = stage === 'connected';
  const isDeclined = stage === 'declined';
  const isEnded = stage === 'ended';
  const isMicEnabled = speechReco.isSpeechEnabled;
  const isSpeakEnabled = true;
  const isEnabled = isMicEnabled && isSpeakEnabled;


  const onReceivedMessage = React.useCallback((message: DMessage) => {
    setCallMessages(messages => [...messages, message]);
  }, []);


  const handleCallAccepted = () => {
    setStage('connected');
    onReceivedMessage(createDMessage('assistant', 'Hello?'));
    // speechReco.toggleRecording();
  };

  const handleCallDeclined = () => {
    setStage('declined');
  };

  const handleCallEnd = () => {
    setStage('ended');
  };

  const handleToggleMute = () => setMicMuted(!micMuted);

  // play the ringtone
  usePlaySoundUrlLoop(isRinging ? '/sounds/rising-pops.mp3' : null, 300, 2800);

  // auto-restart speech recognition if it stops
  React.useEffect(() => {
    console.log('ue');
    if (isConnected && speechInterim === null && !speechReco.isRecordingAudio) {
      console.log('toggle', { speechInterim, isRecordingAudio: speechReco.isRecordingAudio });
      speechReco.toggleRecording();
    }
  }, [isConnected, speechInterim, speechReco]);


  return <>

    <Typography level='h1' sx={{ fontSize: '3rem', textAlign: 'center' }}>
      Hello
    </Typography>

    <Avatar variant='soft' color='neutral' onClick={() => setAvatarClicked(avatarClicked + 1)} sx={{
      '--Avatar-size': '160px',
      '--variant-borderWidth': '4px',
      boxShadow: 'md',
      fontSize: '100px',
    }}>
      <Box sx={{
        ...(isRinging ? { animation: `${cssScaleKeyframes} 1.4s ease-in-out infinite` } : {}),
      }}>
        {persona?.symbol}
      </Box>
    </Avatar>

    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1, mb: isRinging ? 3 : 0 }}>
      <Typography level='h3' sx={{ textAlign: 'center' }}>
        <b>{persona?.title}</b>
      </Typography>
      <Typography level='body-md' sx={{ textAlign: 'center' }}>
        {isRinging ? 'is calling you...' : isDeclined ? 'call declined' : isEnded ? 'call ended' : 'on the line'}
      </Typography>
      {!isMicEnabled && <InlineError severity='danger' error='But this browser does not support speech recognition... 🤦‍♀️ - Try Chrome on Windows?' />}
      {!isSpeakEnabled && <InlineError severity='danger' error='And text-to-speech is not configured... 🤦‍♀️ - Configure it in Settings?' />}
    </Box>

    {/* Two speakers bubbles */}
    {(isConnected || isEnded) && <Card sx={{ minHeight: '10dvh', maxHeight: '30dvh', overflow: 'auto', width: '100%', p: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {callMessages.slice(-2).map((message, _index) =>
          <Chip key={message.id}
                color={message.role === 'assistant' ? 'primary' : 'primary'}
                variant={message.role === 'assistant' ? 'solid' : undefined}
                sx={{ alignSelf: message.role === 'assistant' ? 'start' : 'end' }}
          >
            {message.text}
          </Chip>,
        )}
        {/* Message I'm speaking */}
        <Chip color='neutral' variant='solid' sx={{ alignSelf: 'end' }}>
          {speechInterim?.transcript}
          <i>{speechInterim?.interimTranscript}</i>
        </Chip>
        {/* Fake End Message */}
        {isEnded && <Chip color='danger' variant='solid' sx={{ alignSelf: 'end' }}>
          Goodbye
        </Chip>}
      </Box>
    </Card>}

    {/* Call Buttons */}
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-evenly' }}>
      {isRinging && <CallButton Icon={CallEndIcon} text='Decline' color='danger' onClick={handleCallDeclined} />}
      {isRinging && isEnabled && <CallButton Icon={CallIcon} text='Accept' color='success' variant='soft' onClick={handleCallAccepted} />}
      {isConnected && <CallButton Icon={CallEndIcon} text='Hang up' color='danger' onClick={handleCallEnd} />}
      {isConnected && <CallButton Icon={MicOffIcon} onClick={handleToggleMute}
                                  text={micMuted ? 'Muted' : 'Mute'} color={micMuted ? 'warning' : undefined} variant={micMuted ? 'solid' : 'outlined'} />}
      {(isEnded || isDeclined) && <CallButton Icon={ArrowBackIcon} text='Back' variant='soft' onClick={() => routerReplace('/')} />}
      {(isEnded || isDeclined) && <CallButton Icon={CallIcon} text='Call Again' color='success' variant='soft' onClick={handleCallAccepted} />}
    </Box>

    {/* DEBUG state */}
    {avatarClicked > 10 && <Card variant='outlined' sx={{ maxHeight: '25dvh', overflow: 'auto', whiteSpace: 'pre', py: 0, width: '100%' }}>
      {JSON.stringify({ speechReco, speechInterim }, null, 2)}
    </Card>}

    {/*{isEnded && <Card variant='solid' size='lg' color='primary'>*/}
    {/*  <CardContent>*/}
    {/*    <Typography>*/}
    {/*      Please rate the call quality, 1 to 5 - Just a Joke*/}
    {/*    </Typography>*/}
    {/*  </CardContent>*/}
    {/*</Card>}*/}

  </>;
}