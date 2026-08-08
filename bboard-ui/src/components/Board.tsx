// Midnight Counter Board Component
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Backdrop,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Skeleton,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AddIcon from '@mui/icons-material/AddCircleOutlined';
import SecurityIcon from '@mui/icons-material/SecurityOutlined';
import RefreshIcon from '@mui/icons-material/RestartAltOutlined';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import { type CounterDerivedState, type DeployedCounterAPI } from '../../../api/src/index.js';
import { useDeployedBoardContext } from '../hooks/index.js';
import { type BoardDeployment } from '../contexts/index.js';
import { type Observable } from 'rxjs';
import { EmptyCardContent } from './Board.EmptyCardContent.js';
import { CONTRACT_ADDRESS } from '../config/contract.js';

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedCounterAPI, setDeployedCounterAPI] = useState<DeployedCounterAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [counterState, setCounterState] = useState<CounterDerivedState>();
  const [privateAmount, setPrivateAmount] = useState<string>('5');
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);

  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress || CONTRACT_ADDRESS),
    [boardApiProvider],
  );

  const onIncrement = useCallback(async () => {
    try {
      if (deployedCounterAPI) {
        setIsWorking(true);
        await deployedCounterAPI.increment();
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedCounterAPI]);

  const onIncrementPrivate = useCallback(async () => {
    const amt = BigInt(privateAmount || '1');
    try {
      if (deployedCounterAPI) {
        setIsWorking(true);
        await deployedCounterAPI.incrementByPrivateAmount(amt);
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedCounterAPI, privateAmount]);

  const onReset = useCallback(async () => {
    try {
      if (deployedCounterAPI) {
        setIsWorking(true);
        await deployedCounterAPI.reset();
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedCounterAPI]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedCounterAPI) {
      await navigator.clipboard.writeText(deployedCounterAPI.deployedContractAddress);
    } else {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
    }
  }, [deployedCounterAPI]);

  useEffect(() => {
    if (!boardDeployment$) {
      return;
    }
    const subscription = boardDeployment$.subscribe(setBoardDeployment);
    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment$]);

  useEffect(() => {
    if (!boardDeployment) {
      return;
    }
    if (boardDeployment.status === 'in-progress') {
      return;
    }

    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message ? boardDeployment.error.message : 'Unknown error joining/deploying contract',
      );
      setDeployedCounterAPI(undefined);
      return;
    }

    setDeployedCounterAPI(boardDeployment.api);

    const subscription = boardDeployment.api.state$.subscribe({
      next: (state) => {
        setCounterState(state);
      },
      error: (error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment]);

  if (!boardDeployment$) {
    return (
      <Card
        sx={{
          maxWidth: 540,
          margin: 'auto',
          mt: 4,
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          background: '#121624',
        }}
      >
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      </Card>
    );
  }

  const isOwner = counterState?.isOwner ?? false;

  return (
    <Card
      sx={{
        maxWidth: 540,
        margin: 'auto',
        mt: 4,
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        background: '#121624',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <CardHeader
        avatar={
          <Tooltip title={isOwner ? 'You are the last actor' : 'Not last actor'}>
            {isOwner ? <LockOpenIcon color="success" /> : <LockIcon color="action" />}
          </Tooltip>
        }
        action={
          <Tooltip title="Copy Contract Address">
            <IconButton onClick={onCopyContractAddress} color="primary">
              <CopyIcon />
            </IconButton>
          </Tooltip>
        }
        title={
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
            Midnight Counter
          </Typography>
        }
        subheader={
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#90caf9' }}>
            {deployedCounterAPI?.deployedContractAddress ?? CONTRACT_ADDRESS}
          </Typography>
        }
      />

      <CardContent>
        {errorMessage && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              backgroundColor: 'rgba(211, 47, 47, 0.2)',
              border: '1px solid #d32f2f',
            }}
          >
            <Typography variant="body2" color="error">
              {errorMessage}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            my: 1,
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.15), rgba(156, 39, 176, 0.15))',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}
          >
            Current Counter Value
          </Typography>
          <Typography variant="h2" sx={{ fontWeight: 800, color: '#4fc3f7', my: 1 }}>
            {counterState ? counterState.count.toString() : <Skeleton width={100} sx={{ mx: 'auto' }} />}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
            <Chip
              size="small"
              label={`Total Operations: ${counterState ? counterState.totalOperations.toString() : '0'}`}
              color="secondary"
              variant="outlined"
            />
            <Chip
              size="small"
              label={isOwner ? 'Actor: You' : 'Actor: External'}
              color={isOwner ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onIncrement}
            disabled={isWorking}
            sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '1rem' }}
          >
            Public Increment (+1)
          </Button>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ color: '#ce93d8', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <SecurityIcon fontSize="small" /> ZK Private Step Increment
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                type="number"
                label="Private Step Amount (1-100)"
                value={privateAmount}
                onChange={(e) => setPrivateAmount(e.target.value)}
                sx={{ flexGrow: 1 }}
                slotProps={{ htmlInput: { min: 1, max: 100 } }}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={onIncrementPrivate}
                disabled={isWorking}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Increment (ZK)
              </Button>
            </Box>
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          Last Actor: {counterState?.lastActor ? `${counterState.lastActor.substring(0, 10)}...` : 'N/A'}
        </Typography>
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onReset}
          disabled={isWorking || !isOwner}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Reset Counter
        </Button>
      </CardActions>

      <Backdrop open={isWorking} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Card>
  );
};
