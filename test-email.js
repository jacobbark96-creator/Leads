const email = "jake@example.com";
fetch("http://localhost:3000/api/send-advisor-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    clientEmail: email,
    clientName: "Jake",
    advisorId: "some-uuid",
    isNewAssignment: false
  })
}).then(res => res.json()).then(console.log).catch(console.error);
