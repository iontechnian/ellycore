export default async function(timeOfDay: string) {
  const name = await getName();
  return `Good ${timeOfDay}, ${name}!`;
}
