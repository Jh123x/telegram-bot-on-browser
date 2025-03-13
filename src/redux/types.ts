export interface Command {
    command: string;
    response: string;
}

export interface IBotState {
    token: string;
    commands: Command[];
}

export interface BotWithConfig {
    bot: IBotState;
}

