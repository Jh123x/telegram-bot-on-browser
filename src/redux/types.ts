export interface Command {
    command: string;
    response: string;
}

export interface IBotState {
    token: string;
    commands: Command[];
    response: Response[];
}

export interface BotWithConfig {
    bot: IBotState;
}

export interface Response {
    FromUser: string
    UserID: number
    Message: string
    TimeStamp: number
}
