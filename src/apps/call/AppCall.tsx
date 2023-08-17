import * as React from 'react';
import { useRouter } from 'next/router';

import { Container, Sheet } from '@mui/joy';

import { AppCallQueryParams } from '~/common/routing';
import { InlineError } from '~/common/components/InlineError';

import { CallUI } from './CallUI';


export function AppCall() {
  // external state
  const { query } = useRouter();

  // derived state
  const { conversationId, personaId, llmId } = query as any as AppCallQueryParams;
  const validInput = !!conversationId && !!personaId && !!llmId;

  return (
    <Sheet variant='solid' color='neutral' invertedColors sx={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      flexGrow: 1,
      overflowY: 'auto',
      minHeight: 96,
    }}>
      <Container disableGutters maxWidth='sm' sx={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        minHeight: '80dvh', justifyContent: 'space-evenly',
        gap: { xs: 2, md: 5 },
      }}>
        {validInput
          ? <CallUI conversationId={conversationId} personaId={personaId} llmId={llmId} />
          : <InlineError error={`Something went wrong. ${JSON.stringify(query)}`} />
        }
      </Container>
    </Sheet>
  );
}