async function test() {
  const res = await fetch('http://localhost:3000/api/team/requested-leads');
  console.log("Status:", res.status);
  console.log(await res.text());
}
test().catch(e => console.error(e));
