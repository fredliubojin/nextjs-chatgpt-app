import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { Box, Card, Typography } from '@mui/joy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';
import MicOffIcon from '@mui/icons-material/MicOff';
import { SystemPurposeId, SystemPurposes } from '../../data';
import { EXPERIMENTAL_speakTextStream } from '~/modules/elevenlabs/elevenlabs.client';
import { streamChat, VChatMessageIn } from '~/modules/llms/llm.client';

import { Link } from '~/common/components/Link';
import { SpeechResult, useSpeechRecognition } from '~/common/components/useSpeechRecognition';
import { createDMessage, DMessage, useChatStore } from '~/common/state/store-chats';
import { playSoundUrl, usePlaySoundUrl } from '~/common/util/audioUtils';

import { AvatarRing } from './components/AvatarRing';
import { CallButton } from './components/CallButton';
import { CallStatus } from './components/CallStatus';
import { TranscriptMessage } from './components/TranscriptMessage';
import { conversationTitle } from '../chat/components/applayout/ConversationItem';
import { useChatLLMDropdown } from '../chat/components/applayout/useLLMDropdown';


export function CallUI(props: {
  conversationId: string,
  personaId: string,
}) {

  // state
  const [avatarClicked, setAvatarClicked] = React.useState<number>(0);
  const [stage, setStage] = React.useState<'ring' | 'declined' | 'connected' | 'ended'>('ring');
  const [micMuted, setMicMuted] = React.useState(false);
  const [callMessages, setCallMessages] = React.useState<DMessage[]>([]);
  const [personaTextInterim, setPersonaTextInterim] = React.useState<string | null>(null);
  const [callElapsedTime, setCallElapsedTime] = React.useState<string>('00:00');
  const responseAbortController = React.useRef<AbortController | null>(null);

  // external state
  const { chatLLMId, chatLLMDropdown } = useChatLLMDropdown();
  const { chatTitle, messages } = useChatStore(state => {
    const conversation = state.conversations.find(conversation => conversation.id === props.conversationId);
    return {
      chatTitle: conversation ? conversationTitle(conversation) : 'no conversation',
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
  const { isSpeechEnabled, isRecordingAudio, isRecordingSpeech, startRecording, stopRecording } = useSpeechRecognition(onSpeechResultCallback, 1000);

  // derived state
  const isRinging = stage === 'ring';
  const isConnected = stage === 'connected';
  const isDeclined = stage === 'declined';
  const isEnded = stage === 'ended';


  /// RINGING

  // play the ringtone
  usePlaySoundUrl(isRinging ? '/sounds/chat-ringtone.mp3' : null, 300, 2800 * 2);


  /// CONNECTED

  // const onReceivedMessage = React.useCallback((message: DMessage) => {
  //   setCallMessages(messages => [...messages, message]);
  // }, []);

  const handleCallStop = () => {
    stopRecording();
    setStage('ended');
  };

  // [E] begin call - rising edge of isConnected
  React.useEffect(() => {
    if (!isConnected) return;

    const firstMessage: string = ['Hello?', 'Hey!'][Math.random() > 0.5 ? 1 : 0];
    setCallMessages([createDMessage('assistant', firstMessage)]);

    // show the call timer
    setCallElapsedTime('00:00');
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      setCallElapsedTime(`${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // [E] call begin/end sounds
  React.useEffect(() => {
    !isRinging && playSoundUrl(isConnected ? '/sounds/chat-begin.mp3' : '/sounds/chat-end.mp3');
  }, [isRinging, isConnected]);

  // [E] continuous speech recognition (reload)
  const shouldStartRecording = isConnected && speechInterim === null && !isRecordingAudio;
  React.useEffect(() => {
    if (shouldStartRecording)
      startRecording();
  }, [shouldStartRecording, startRecording]);

  // [E] persona streaming response - upon new user message
  React.useEffect(() => {
    // only act when we have a new user message
    if (!isConnected || callMessages.length < 1 || callMessages[callMessages.length - 1].role !== 'user')
      return;
    switch (callMessages[callMessages.length - 1].text) {
      // do not respond
      case 'Stop.':
        return;
      // command: close the call
      case 'Goodbye.':
        setStage('ended');
        return;
      // command: regenerate answer
      case 'Retry.':
      case 'Try again.':
        setCallMessages(messages => messages.slice(0, messages.length - 2));
        return;
      // command: restart chat
      case 'Restart.':
        setCallMessages([]);
        return;
    }

    // bail if no llm selected
    if (!chatLLMId) return;

    // 'prompt' for a "telephone call"
    // FIXME: can easily run ouf of tokens - if this gets traction, we'll fix it
    const callPrompt: VChatMessageIn[] = [
      { role: 'system', content: 'You are having a phone call. Your response style is brief and to the point, and according to your personality, defined below.' },
      ...messages.map(message => ({ role: message.role, content: message.text })),
      { role: 'system', content: 'You are now on the phone call related to the chat above. Respect your personality and answer with short, friendly and accurate thoughtful lines.' },
      ...callMessages.map(message => ({ role: message.role, content: message.text })),
    ];

    // perform completion
    responseAbortController.current = new AbortController();
    let finalText = '';
    let error: any | null = null;
    streamChat(chatLLMId, callPrompt, responseAbortController.current.signal, (updatedMessage: Partial<DMessage>) => {
      const text = updatedMessage.text?.trim();
      if (text) {
        finalText = text;
        setPersonaTextInterim(text);
      }
    }).catch((err: DOMException) => {
      if (err?.name !== 'AbortError')
        error = err;
    }).finally(() => {
      setPersonaTextInterim(null);
      setCallMessages(messages => [...messages, createDMessage('assistant', finalText + (error ? ` (ERROR: ${error.message || error.toString()})` : ''))]);
      EXPERIMENTAL_speakTextStream(finalText).then();
    });

    return () => {
      responseAbortController.current?.abort();
      responseAbortController.current = null;
    };
  }, [isConnected, callMessages, chatLLMId, messages]);

  // [E] Message interrupter
  const abortTrigger = isConnected && isRecordingSpeech;
  React.useEffect(() => {
    if (abortTrigger && responseAbortController.current) {
      responseAbortController.current.abort();
      responseAbortController.current = null;
    }
    // TODO.. abort current speech
  }, [abortTrigger]);


  // more derived state
  const personaName = persona?.title ?? 'Unknown';
  const isMicEnabled = isSpeechEnabled;
  const isSpeakEnabled = true;
  const isEnabled = isMicEnabled && isSpeakEnabled;


  return <>

    <Box sx={{display:'flex', flexDirection:'column', alignItems:'center'}}>
      <Typography level='h1' sx={{ fontSize: { xs: '2.5rem', md: '3rem' }, textAlign: 'center', mx: 2 }}>
        {isConnected ? personaName : 'Hello'}
      </Typography>
      {chatLLMDropdown}
    </Box>

    <AvatarRing symbol={persona?.symbol || '?'} isRinging={isRinging} onClick={() => setAvatarClicked(avatarClicked + 1)} />

    <CallStatus
      callerName={isConnected ? undefined : personaName}
      statusText={isRinging ? 'is calling you...' : isDeclined ? 'call declined' : isEnded ? 'call ended' : callElapsedTime}
      regardingText={chatTitle}
      isMicEnabled={isMicEnabled} isSpeakEnabled={isSpeakEnabled}
    />

    {/* Messages */}
    {(isConnected || isEnded) && (
      <Card variant='soft' sx={{
        minHeight: '15dvh', maxHeight: '24dvh',
        overflow: 'auto',
        width: '100%',
        borderRadius: 'lg',
        flexDirection: 'column-reverse',
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column-reverse', gap: 1 }}>
          {/* Listening... */}
          <TranscriptMessage
            text={<>{speechInterim?.transcript ? speechInterim.transcript + ' ' : ''}<i>{speechInterim?.interimTranscript}</i></>}
            role='user' variant={isRecordingSpeech ? 'solid' : 'outlined'}
          />

          {/* Persona partial */}
          {!!personaTextInterim && <TranscriptMessage role='assistant' text={personaTextInterim} variant='solid' color='neutral' />}

          {/* Messages (all in reverse order, for column-reverse to work) */}
          {callMessages.slice(-6).reverse().map((message) =>
            <TranscriptMessage key={message.id} role={message.role} text={message.text} variant={message.role === 'assistant' ? 'solid' : 'soft'} color='neutral' />,
          )}
        </Box>
      </Card>
    )}

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