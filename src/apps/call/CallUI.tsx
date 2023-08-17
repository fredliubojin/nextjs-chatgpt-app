import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { Box, Card, Chip, Typography } from '@mui/joy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';
import MicOffIcon from '@mui/icons-material/MicOff';

import { DLLMId } from '~/modules/llms/llm.types';
import { SystemPurposeId, SystemPurposes } from '../../data';

import { Link } from '~/common/components/Link';
import { SpeechResult, useSpeechRecognition } from '~/common/components/useSpeechRecognition';
import { createDMessage, DMessage, useChatStore } from '~/common/state/store-chats';
import { usePlaySoundUrlLoop } from '~/common/util/audioUtils';

import { AvatarRing } from './components/AvatarRing';
import { CallButton } from './components/CallButton';
import { CallStatus } from './components/CallStatus';
import { streamChat, VChatMessageIn } from '~/modules/llms/llm.client';


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
  const [personaTextInterim, setPersonaTextInterim] = React.useState<string | null>(null);

  // external state
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
      const transcribed = result.transcript.trim();
      if (transcribed.length >= 1)
        setCallMessages(messages => [...messages, createDMessage('user', transcribed)]);
    }
  }, []);
  const { isSpeechEnabled, isRecordingAudio, startRecording, stopRecording } = useSpeechRecognition(onSpeechResultCallback, 1000);

  // derived state
  const isRinging = stage === 'ring';
  const isConnected = stage === 'connected';
  const isDeclined = stage === 'declined';
  const isEnded = stage === 'ended';
  const isMicEnabled = isSpeechEnabled;
  const isSpeakEnabled = true;
  const isEnabled = isMicEnabled && isSpeakEnabled;


  /// RINGING

  // play the ringtone
  usePlaySoundUrlLoop(isRinging ? '/sounds/rising-pops.mp3' : null, 300, 2800);


  /// CONNECTED

  // const onReceivedMessage = React.useCallback((message: DMessage) => {
  //   setCallMessages(messages => [...messages, message]);
  // }, []);

  const handleCallStop = () => {
    stopRecording();
    setStage('ended');
  };

  // [E] begin call
  React.useEffect(() => {
    if (isConnected)
      setCallMessages([createDMessage('assistant', 'Hello?')]);
  }, [isConnected]);

  // [E] continuous speech recognition
  const shouldStartRecording = isConnected && speechInterim === null && !isRecordingAudio;
  React.useEffect(() => {
    if (shouldStartRecording)
      startRecording();
  }, [shouldStartRecording, startRecording]);

  // [E] generate a new streaming chat
  React.useEffect(() => {
    if (!isConnected || callMessages.length < 1)
      return;
    if (callMessages[callMessages.length - 1].role === 'assistant')
      return;

    // Telephone Call 'PROMPT'
    // FIXME: can easily run ouf of tokens - if this gets traction, we'll fix it
    const callPrompt: VChatMessageIn[] = [
      { role: 'system', content: 'You are having a phone call. Your response style is brief and to the point, and according to your personality, defined below.' },
      ...messages.map(message => ({ role: message.role, content: message.text })),
      { role: 'system', content: 'You are now on the phone call related to the chat above. Respect your personality and answer with short, friendly and accurate thoughtful lines.' },
      ...callMessages.map(message => ({ role: message.role, content: message.text })),
    ];

    // perform completion
    const abortController = new AbortController();
    let finalText = '';
    let error: any | null = null;
    streamChat(props.llmId, callPrompt, abortController.signal, (updatedMessage: Partial<DMessage>) => {
      const text = updatedMessage.text;
      if (text) {
        finalText = text;
        setPersonaTextInterim(text);
      }
    }).catch(err => {
      error = err;
    }).finally(() => {
      setPersonaTextInterim(null);
      setCallMessages(messages => [...messages, createDMessage('assistant', finalText + (error ? ` (ERROR: ${error.message || error.toString()})` : ''))]);
    });

    return () => {
      abortController.abort();
    };
  }, [isConnected, callMessages, messages, props.llmId]);

  return <>

    <Typography level='h1' sx={{ fontSize: '3rem', textAlign: 'center' }}>
      Hello
    </Typography>

    <AvatarRing symbol={persona?.symbol || '?'} isRinging={isRinging} onClick={() => setAvatarClicked(avatarClicked + 1)} />

    <CallStatus
      callerName={persona?.title || 'Unknown'}
      statusText={isRinging ? 'is calling you...' : isDeclined ? 'call declined' : isEnded ? 'call ended' : 'on the line'}
      isMicEnabled={isMicEnabled} isSpeakEnabled={isSpeakEnabled}
    />

    {/* Two speakers bubbles */}
    {(isConnected || isEnded) && <Card sx={{ minHeight: '10dvh', maxHeight: '30dvh', overflow: 'auto', width: '100%', p: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {callMessages.slice(-2).map((message, _index) =>
          <Chip key={message.id}
                color={message.role === 'assistant' ? 'primary' : 'primary'}
                variant={message.role === 'assistant' ? 'solid' : undefined}
                sx={{ alignSelf: message.role === 'assistant' ? 'start' : 'end', whiteSpace: 'break-spaces' }}
          >
            {message.text}
          </Chip>,
        )}
        {/* Persona Interim */}
        {!!personaTextInterim && <Chip color='primary' variant='soft' sx={{ alignSelf: 'start', whiteSpace: 'break-spaces' }}>
          {personaTextInterim}
        </Chip>}
        {/* Human Interim */}
        {speechInterim !== null && <Chip color='neutral' variant='solid' sx={{ alignSelf: 'end', whiteSpace: 'break-spaces' }}>
          {speechInterim?.transcript}
          <i>{speechInterim?.interimTranscript}</i>
        </Chip>}
      </Box>
    </Card>}

    {/* Call Buttons */}
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-evenly' }}>
      {isRinging && <CallButton Icon={CallEndIcon} text='Decline' color='danger' onClick={() => setStage('declined')} />}
      {isRinging && isEnabled && <CallButton Icon={CallIcon} text='Accept' color='success' variant='soft' onClick={() => setStage('connected')} />}
      {isConnected && <CallButton Icon={CallEndIcon} text='Hang up' color='danger' onClick={handleCallStop} />}
      {isConnected && <CallButton Icon={MicOffIcon} onClick={() => setMicMuted(muted => !muted)}
                                  text={micMuted ? 'Muted' : 'Mute'} color={micMuted ? 'warning' : undefined} variant={micMuted ? 'solid' : 'outlined'} />}
      {(isEnded || isDeclined) && <Link noLinkStyle href='/'><CallButton Icon={ArrowBackIcon} text='Back' variant='soft' /></Link>}
      {(isEnded || isDeclined) && <CallButton Icon={CallIcon} text='Call Again' color='success' variant='soft' onClick={() => setStage('connected')} />}
    </Box>

    {/* DEBUG state */}
    {avatarClicked > 10 && (avatarClicked % 2 === 0) && <Card variant='outlined' sx={{ maxHeight: '25dvh', overflow: 'auto', whiteSpace: 'pre', py: 0, width: '100%' }}>
      {JSON.stringify({ isSpeechEnabled, isRecordingAudio, speechInterim }, null, 2)}
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