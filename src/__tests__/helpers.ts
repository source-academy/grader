import { AwsEvent, Library, TestCase } from '../index'


type PartialAwsEvent = {
  prependProgram: string
  studentProgram: string,
  postpendProgram: string,
  testCases: TestCase[]
}

export function awsEventFactory(library: Library) {
  return (awsEvent: PartialAwsEvent): AwsEvent => (
    {
      library: library,
      prependProgram: awsEvent.prependProgram,
      studentProgram: awsEvent.studentProgram,
      postpendProgram: awsEvent.postpendProgram,
      testCases: awsEvent.testCases,
    })
}
