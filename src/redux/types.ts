import { Program } from "../interfaces/program.ts";

export interface IBotState {
    token: string;
    programs: Program[];
    response: Response[];
    users: User[];
    selectedUserId?: number | null;
    autoStart?: boolean;
    hydrated?: boolean;
}

export interface User {
    Username: string
    UserID: number
}

export interface BotWithConfig {
    bot: IBotState;
}

export interface Response {
    FromUser: string
    UserID: number
    Message: string
    TimeStamp: number
    fromBot?: boolean
}
