import React, { useState } from "react"
import { BotWithConfig, User } from "../redux/types";
import { useSelector } from "react-redux";
import { Button, Input, MenuItem, Select, Typography } from "@mui/material";
import { BrowserBot } from "../interfaces/bot";


export const CustomChat = ({ bot }: { bot?: BrowserBot }) => {
    const users = useSelector<BotWithConfig, User[]>((state) => state.bot.users);
    const [currUserID, setCurrUserID] = useState<number>(0)
    const [message, setCurrMessage] = useState<string>("")

    return <>
        <Typography variant="h3">Send a Custom message</Typography>
        <Typography variant="body1">
            You can only send messages to users you have received messages from.
        </Typography>
        <Select
            sx={{ margin: '10px' }}
            defaultValue={1}
            value={currUserID}
            onChange={(e) => {
                const target: number = e.target.value as number
                setCurrUserID(target)
                e.preventDefault();
            }}
        >
            <MenuItem value={0} disabled={true} key="default-value">Select a value</MenuItem>
            {users.map((user) => <MenuItem value={user.UserID} key={`${user.UserID}-${user.Username}`}>{user.Username}</MenuItem>)}
        </Select>
        <Input
            value={message}
            onChange={(e) => setCurrMessage(e.target.value)}
            sx={{ margin: '10px' }}
        />
        <Button
            sx={{ margin: '10px' }}
            variant="contained"
            color="success"
            onClick={() => {
                if (currUserID === 0 || !bot) return
                const botVal = bot!
                botVal.sendMessage(currUserID, message)
                setCurrMessage("")
            }}
        >Send</Button>
    </>
}