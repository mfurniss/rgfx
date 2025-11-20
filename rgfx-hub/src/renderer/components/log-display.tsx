import React, { useRef, useEffect } from 'react';
import { List, ListItem, ListItemText } from '@mui/material';

interface LogDisplayProps {
  messages: string[];
}

const LogDisplay: React.FC<LogDisplayProps> = ({ messages }) => {
  const listRef = useRef<HTMLUListElement>(null);
  const bufferRef = useRef(50);

  // Tick down buffer every 500ms, minimum 50
  useEffect(() => {
    const interval = setInterval(() => {
      bufferRef.current = Math.max(50, bufferRef.current - 50);
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Increase buffer and scroll on new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    bufferRef.current += 50;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < bufferRef.current;

    if (isAtBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <List
      ref={listRef}
      dense
      sx={{
        pl: 2,
        pr: 2,
        maxHeight: 300,
        overflow: 'auto',
        bgcolor: 'background.default',
        borderRadius: 1,
      }}
    >
      {messages.length > 0 ? (
        messages.map((msg, idx) => (
          <ListItem key={idx} sx={{ p: 0, m: 0 }}>
            <ListItemText
              primary={msg}
              slotProps={{
                primary: {
                  variant: 'body2',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                },
              }}
            />
          </ListItem>
        ))
      ) : (
        <ListItem>
          <ListItemText
            primary="No log messages yet"
            slotProps={{
              primary: {
                variant: 'body2',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: 'text.secondary',
              },
            }}
          />
        </ListItem>
      )}
    </List>
  );
};

export default LogDisplay;
