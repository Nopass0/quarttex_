// Test how JavaScript handles null in conditions

const device1 = { firstConnectionAt: null };
const device2 = { firstConnectionAt: undefined };
const device3 = { firstConnectionAt: "2025-07-22T17:05:14.170Z" };
const device4 = {};

console.log("device1.firstConnectionAt:", device1.firstConnectionAt);
console.log("!!device1.firstConnectionAt:", !!device1.firstConnectionAt);
console.log("device1.firstConnectionAt == null:", device1.firstConnectionAt == null);
console.log("device1.firstConnectionAt === null:", device1.firstConnectionAt === null);

console.log("\ndevice2.firstConnectionAt:", device2.firstConnectionAt);
console.log("!!device2.firstConnectionAt:", !!device2.firstConnectionAt);

console.log("\ndevice3.firstConnectionAt:", device3.firstConnectionAt);
console.log("!!device3.firstConnectionAt:", !!device3.firstConnectionAt);

console.log("\ndevice4.firstConnectionAt:", (device4 as any).firstConnectionAt);
console.log("!!device4.firstConnectionAt:", !!(device4 as any).firstConnectionAt);