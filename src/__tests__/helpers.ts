import { AwsEvent, Library, Testcase } from '../index'

type PartialAwsEvent = {
  prependProgram: string
  studentProgram: string
  postpendProgram: string
  testcases: Testcase[]
}

export function awsEventFactory(library: Library) {
  return (awsEvent: PartialAwsEvent): AwsEvent => ({
    language: 'javascript',
    library: library,
    prependProgram: awsEvent.prependProgram,
    studentProgram: awsEvent.studentProgram,
    postpendProgram: awsEvent.postpendProgram,
    testcases: awsEvent.testcases,
  })
}
