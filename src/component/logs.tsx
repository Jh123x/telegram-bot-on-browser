import { TableContainer, TableRow, Table, TableHead, TableBody, TableCell } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { BotWithConfig, Response } from '../redux/types';

export const LogBox = () => {
    const logs = useSelector<BotWithConfig, Response[]>((state) => state.bot.response)
    return <>
        <TableContainer style={{ maxHeight: "100%", overflow: 'scroll' }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell key="date">Date</TableCell>
                        <TableCell key="username">User</TableCell>
                        <TableCell key="user-id">UserID</TableCell>
                        <TableCell key="message">Message</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {logs.map((response: Response) => {
                        const date = new Date(response.TimeStamp)
                        return <TableRow key={response.TimeStamp}>
                            <TableCell>{date.toISOString()}</TableCell>
                            <TableCell>{response.FromUser}</TableCell>
                            <TableCell>{`${response.UserID}`}</TableCell>
                            <TableCell>{response.Message}</TableCell>
                        </TableRow>
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    </>
}