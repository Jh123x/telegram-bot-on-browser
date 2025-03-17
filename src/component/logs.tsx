import { TableContainer, TableRow, Table, TableHead, TableBody, TableCell } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { BotWithConfig, Response } from '../redux/types';

export const LogBox = () => {
    const logs = useSelector<BotWithConfig, Response[]>((state) => state.bot.response)
    return <>
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>UserID</TableCell>
                        <TableCell>Message</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {
                        logs.map((response: Response) => {
                            return <TableRow>
                                <TableCell>{response.Date.toISOString()}</TableCell>
                                <TableCell>{response.FromUser}</TableCell>
                                <TableCell>{`${response.UserID}`}</TableCell>
                                <TableCell>{response.Message}</TableCell>
                            </TableRow>
                        })
                    }
                </TableBody>
            </Table>
        </TableContainer>
    </>
}