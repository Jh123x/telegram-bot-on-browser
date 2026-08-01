import { Flow } from "../interfaces/flow.ts";

export interface IBotState {
    token: string;
    flows: Flow[];
    response: Response[];
    users: User[];
    selectedUserId?: number | null;
    autoStart?: boolean;
    // How often the bot polls Telegram for new updates, in seconds.
    pollRate?: number;
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
