import React from 'react';
import { List, ListItem, ListItemText } from '@mui/material';
import { useStickToBottom } from 'use-stick-to-bottom';

interface LogDisplayProps {
  messages: string[];
}

const LogDisplay: React.FC<LogDisplayProps> = ({ messages }) => {
  const { scrollRef, contentRef } = useStickToBottom();

  return (
    <div
      ref={scrollRef}
      style={{
        maxHeight: 300,
        overflow: 'auto',
      }}
    >
      <div ref={contentRef}>
        <List
          dense
          sx={{
            pl: 2,
            pr: 2,
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
      </div>
    </div>
  );
};

export default LogDisplay;
