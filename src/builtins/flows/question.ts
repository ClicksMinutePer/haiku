import FlowAnswers from './answers';
import * as FlowTypes from './types';

export interface FlowQuestion {
    question: string
    id: string
    name: string
    type: FlowTypes.FlowType
    required?: boolean
    multiple?: boolean
    subQuestions?: FlowQuestion[]
    dependsOn?: (answers: FlowAnswers, parentAnswer: any) => boolean
}