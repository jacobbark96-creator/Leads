const nums = ['+447123456789', '07987654321'];
const orQuery = nums.map(n => `phone.ilike.%${n.replace(/[^\d]/g, '').slice(-10)}`).join(',');
console.log(orQuery);
