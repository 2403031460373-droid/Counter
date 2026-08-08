// Midnight Counter Empty Card Content UI
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CardActions, CardContent, IconButton, Tooltip, Typography, Box } from '@mui/material';
import CounterAddIcon from '@mui/icons-material/PlusOneOutlined';
import CreateBoardIcon from '@mui/icons-material/AddCircleOutlined';
import JoinBoardIcon from '@mui/icons-material/AddLinkOutlined';
import { TextPromptDialog } from './TextPromptDialog';
import { CONTRACT_ADDRESS } from '../config/contract.js';

export interface EmptyCardContentProps {
  onCreateBoardCallback: () => void;
  onJoinBoardCallback: (contractAddress: ContractAddress) => void;
}

export const EmptyCardContent: React.FC<Readonly<EmptyCardContentProps>> = ({
  onCreateBoardCallback,
  onJoinBoardCallback,
}) => {
  const [textPromptOpen, setTextPromptOpen] = useState(false);

  return (
    <React.Fragment>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography align="center" variant="h1" color="primary.main" sx={{ mb: 2 }}>
          <CounterAddIcon fontSize="large" sx={{ fontSize: '3.5rem' }} />
        </Typography>
        <Typography
          data-testid="board-posted-message"
          align="center"
          variant="h6"
          color="text.primary"
          sx={{ mb: 1, fontWeight: 600 }}
        >
          Midnight ZK Counter DApp
        </Typography>
        <Typography align="center" variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Deploy a new Counter contract or join an existing contract on Midnight preprod/preview testnet.
        </Typography>
        <Box
          sx={{
            p: 1.5,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 2,
            border: '1px dashed rgba(255,255,255,0.2)',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Target Contract Address Placeholder:
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#90caf9' }}>
            {CONTRACT_ADDRESS}
          </Typography>
        </Box>
      </CardContent>
      <CardActions disableSpacing sx={{ justifyContent: 'center', pb: 3 }}>
        <Tooltip title="Deploy new Counter Contract">
          <IconButton data-testid="board-deploy-btn" onClick={onCreateBoardCallback} color="primary" size="large">
            <CreateBoardIcon sx={{ fontSize: '2rem' }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Join existing Counter Contract">
          <IconButton
            data-testid="board-join-btn"
            onClick={() => {
              setTextPromptOpen(true);
            }}
            color="secondary"
            size="large"
          >
            <JoinBoardIcon sx={{ fontSize: '2rem' }} />
          </IconButton>
        </Tooltip>
      </CardActions>
      <TextPromptDialog
        prompt="Enter contract address"
        isOpen={textPromptOpen}
        onCancel={() => {
          setTextPromptOpen(false);
        }}
        onSubmit={(text) => {
          setTextPromptOpen(false);
          onJoinBoardCallback(text);
        }}
      />
    </React.Fragment>
  );
};
