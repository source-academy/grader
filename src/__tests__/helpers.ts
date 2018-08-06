import { Library } from '../index'

export function awsEventFactory(library: Library) {
  return (graderPrograms: string[], studentProgram: string) => ({
    library, graderPrograms, studentProgram
  })
}
