import * as React from 'react';
import { keyframes } from '@emotion/react';

import { Avatar, Box } from '@mui/joy';

const cssScaleKeyframes = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }`;

export function AvatarRing(props: { symbol: string, isRinging: boolean, onClick: () => void }) {
  return (
    <Avatar
      variant='soft' color='neutral'
      onClick={props.onClick}
      sx={{
        '--Avatar-size': { xs: '160px', md: '200px' },
        '--variant-borderWidth': '4px',
        boxShadow: 'md',
        fontSize: { xs: '100px', md: '120px' },
      }}
    >
      <Box
        sx={{
          ...(props.isRinging
            ? { animation: `${cssScaleKeyframes} 1.4s ease-in-out infinite` }
            : {}),
        }}
      >
        {props.symbol}
      </Box>
    </Avatar>
  );
}