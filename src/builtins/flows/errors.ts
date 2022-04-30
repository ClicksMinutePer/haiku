export class UIShownError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UIShownError';
    }
}

export class InteractionFlowControl extends Error {
    constructor(message) {
        super(message);
        this.name = 'InteractionFlowControl';
    }
}

export class UserDone extends InteractionFlowControl {
    constructor(message) {
        super(message);
        this.name = 'UserDone';
    }
}

export class UserSkipped extends InteractionFlowControl {
    constructor(message) {
        super(message);
        this.name = 'UserSkipped';
    }
}

export class UserCancelled extends InteractionFlowControl {
    constructor(message) {
        super(message);
        this.name = 'UserCancelled';
    }
}

export class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}