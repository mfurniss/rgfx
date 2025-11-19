import React from 'react';
import { Paper, List, ListItem, ListItemText } from '@mui/material';

interface LogDisplayProps {
  messages: string[];
}

const LogDisplay: React.FC<LogDisplayProps> = ({ messages }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <List
        dense
        sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.default', borderRadius: 1 }}
      >
        {messages.length > 0 ? (
          messages.map((msg, idx) => (
            <ListItem key={idx}>
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
    </Paper>
  );
};

export default LogDisplay;
