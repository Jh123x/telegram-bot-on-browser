import { Avatar, Box, Paper, Typography, Stack } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { BotWithConfig, Response } from '../redux/types';

const avatarColors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#db2777"];

export const LogBox = () => {
    const logs = useSelector<BotWithConfig, Response[]>((state) => state.bot.response)
    return <Box>
        <Typography variant="h3">Messages</Typography>
        <Box
            sx={{
                maxHeight: 420,
                overflowY: 'auto',
                bgcolor: '#f7f7f8',
                borderRadius: 2,
                p: 2,
            }}
        >
            {logs.length === 0 &&
                <Typography variant="body2">No messages yet — start the bot and wait for users to message you.</Typography>
            }
            {logs.map((response: Response, index: number) => {
                const time = new Date(response.TimeStamp)
                return (
                    <Stack
                        key={`${response.TimeStamp}-${response.FromUser}-${response.UserID}-${index}`}
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                        sx={{ mb: 1.5 }}
                        data-testid={`chat-row-${index}`}
                    >
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: avatarColors[response.UserID % avatarColors.length],
                                fontSize: 16,
                            }}
                        >
                            {response.FromUser.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" component="span" fontWeight="bold">
                                {response.FromUser}
                            </Typography>{" "}
                            <Typography variant="caption" component="span" color="text.secondary">
                                ({response.UserID})
                            </Typography>{" "}
                            <Typography variant="caption" component="span" color="text.secondary">
                                {time.toLocaleTimeString()}
                            </Typography>
                            <Box>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 1,
                                        display: 'inline-block',
                                        maxWidth: '70%',
                                        bgcolor: 'white',
                                        borderRadius: 2,
                                        mt: 0.5,
                                    }}
                                >
                                    <Typography variant="body2">{response.Message}</Typography>
                                </Paper>
                            </Box>
                        </Box>
                    </Stack>
                )
            })}
        </Box>
    </Box>
}
