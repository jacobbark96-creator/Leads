const presencesArray = [
  { last_active_at: '2026-05-18T09:18:39.294Z' },
  { last_active_at: '2026-05-18T09:24:19.439Z' }
];

const mostRecentPresence = presencesArray.reduce((latest, current) => {
  const currentActive = new Date(current.last_active_at || 0).getTime();
  const latestActive = new Date(latest.last_active_at || 0).getTime();
  return currentActive > latestActive ? current : latest;
}, presencesArray[0]);

console.log(mostRecentPresence);
