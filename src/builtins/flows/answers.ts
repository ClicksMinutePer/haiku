export interface Answer {
    name: string;
    value: any
    children: Answers
}

export default interface Answers {
    [key: string]: Answer | Answer[]
}