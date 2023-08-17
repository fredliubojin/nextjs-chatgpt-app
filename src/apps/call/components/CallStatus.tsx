import * as React from 'react';

import { Box, Typography } from '@mui/joy';

import { InlineError } from '~/common/components/InlineError';

export function CallStatus(props: {
  callerName?: string,
  statusText: string,
  isMicEnabled: boolean,
  isSpeakEnabled: boolean
}) {
  return <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>

    {!!props.callerName && <Typography level='h3' sx={{ textAlign: 'center' }}>
      <b>{props.callerName}</b>
    </Typography>}
    <Typography level='body-md' sx={{ textAlign: 'center' }}>
      {props.statusText}
    </Typography>

    {!props.isMicEnabled && <InlineError
      severity='danger' error='But this browser does not support speech recognition... 🤦‍♀️ - Try Chrome on Windows?' />}

    {!props.isSpeakEnabled && <InlineError
      severity='danger' error='And text-to-speech is not configured... 🤦‍♀️ - Configure it in Settings?' />}

  </Box>;
}