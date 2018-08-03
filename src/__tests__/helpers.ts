export function awsEventFactory(chapter: number) {
  return (graderPrograms: string[], studentProgram: string) => ({
    chapter, graderPrograms, studentProgram
  })
}
