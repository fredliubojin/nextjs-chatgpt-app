import * as React from 'react';

import { Box, ColorPaletteProp, IconButton, Typography, VariantProp } from '@mui/joy';

export const CallButton = (props: {
  Icon: React.FC,
  text: string,
  disabled?: boolean,
  variant?: VariantProp,
  color?: ColorPaletteProp,
  onClick?: () => void
}) =>
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} onClick={() => !props.disabled && props.onClick?.()}>
    <IconButton
      disabled={props.disabled} variant={props.variant || 'solid'} color={props.color}
      sx={{
        '--IconButton-size': '5rem',
        borderRadius: '50%',
        boxShadow: 'md',
      }}>
      <props.Icon />
    </IconButton>
    <Typography level='title-md' variant={props.disabled ? 'soft' : undefined}>
      {props.text}
    </Typography>
  </Box>;