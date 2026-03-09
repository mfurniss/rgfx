import React, { useRef, useLayoutEffect } from 'react';
import { List, ListItem, ListItemText } from '@mui/material';

interface LogDisplayProps {
  messages: string[];
}

const SCROLL_THRESHOLD = 50;

const LogDisplay: React.FC<LogDisplayProps> = ({ messages }) => {
  const listRef = useRef<HTMLUListElement>(null);
  const prevScrollHeight = useRef(0);

  // Runs synchronously after DOM mutation, before paint — no async race
  useLayoutEffect(() => {
    const el = listRef.current;

    if (!el) {
      return;
    }

    // Was the user at the bottom before new content was added?
    const wasAtBottom =
      prevScrollHeight.current === 0 ||
      prevScrollHeight.current - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;

    prevScrollHeight.current = el.scrollHeight;

    if (wasAtBottom) {
      el.scrollTop = el.scrollHeight;
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
